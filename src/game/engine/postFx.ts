import * as THREE from "three";

export interface PostFxSettings {
  dof: boolean;
  dofStrength: number;
  ca: boolean;
  caStrength: number;
  bokeh: boolean;
  bloom: number;
  grade: boolean;
  gradeWidth: number;
}

export interface PostFx {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  sceneRT: THREE.WebGLRenderTarget;
  dofRT: THREE.WebGLRenderTarget;
  bloomRTa: THREE.WebGLRenderTarget;
  bloomRTb: THREE.WebGLRenderTarget;
  dofMaterial: THREE.ShaderMaterial;
  bloomBrightMaterial: THREE.ShaderMaterial;
  bloomBlurMaterial: THREE.ShaderMaterial;
  presentMaterial: THREE.ShaderMaterial;
  quad: THREE.Mesh;
  quadScene: THREE.Scene;
  quadCam: THREE.OrthographicCamera;
  settings: PostFxSettings;
  focus: number;
  targetFocus: number;
  fade: number;
  lastT: number;
}

const _size = new THREE.Vector2();

const MAX_FOCUS = 10;

export type ColorGamut = "srgb" | "display-p3" | "rec709";

let gamutSpacesDefined = false;
function defineGamutSpaces(): void {
  if (gamutSpacesDefined) return;
  gamutSpacesDefined = true;
  const cm = THREE.ColorManagement as unknown as {
    define: (spaces: Record<string, unknown>) => void;
    getTransfer: (cs: string) => string;
  };
  const srgbTransfer = cm.getTransfer(THREE.SRGBColorSpace);
  cm.define({
    "display-p3": {
      primaries: [0.680, 0.320, 0.265, 0.690, 0.150, 0.060],
      whitePoint: [0.3127, 0.3290],
      transfer: srgbTransfer,
      toXYZ: new THREE.Matrix3().set(
        0.4865709, 0.2656677, 0.1982173,
        0.2289746, 0.6917385, 0.0792869,
        0.0000000, 0.0459386, 1.0439444
      ),
      fromXYZ: new THREE.Matrix3().set(
        2.4934969, -1.3315442, -0.1864892,
        -0.8294890, 1.7626641, 0.0229913,
        0.0358458, -0.0761724, 0.9568845
      ),
      luminanceCoefficients: [0.2289746, 0.6917385, 0.0792869],
      outputColorSpaceConfig: { drawingBufferColorSpace: "display-p3" }
    },
    rec709: {
      primaries: [0.640, 0.330, 0.300, 0.600, 0.150, 0.060],
      whitePoint: [0.3127, 0.3290],
      transfer: srgbTransfer,
      toXYZ: new THREE.Matrix3().set(
        0.4123908, 0.3575843, 0.1804808,
        0.2126390, 0.7151687, 0.0721923,
        0.0193308, 0.1191948, 0.9505322
      ),
      fromXYZ: new THREE.Matrix3().set(
        3.2409699, -1.5373832, -0.4986108,
        -0.9692436, 1.8759675, 0.0415551,
        0.0556301, -0.2039770, 1.0569715
      ),
      luminanceCoefficients: [0.2126, 0.7152, 0.0722],
      outputColorSpaceConfig: { drawingBufferColorSpace: "srgb" }
    }
  });
}

export function applyColorGamut(renderer: THREE.WebGLRenderer | null | undefined, gamut: string): void {
  if (!renderer) return;
  try {
    defineGamutSpaces();
    if (gamut === "rec709" || gamut === "display-p3") {
      renderer.outputColorSpace = gamut as THREE.ColorSpace;
    } else {
      renderer.outputColorSpace = THREE.SRGBColorSpace;
    }
    const bufferSpace = gamut === "display-p3" ? "display-p3" : "srgb";
    (renderer.getContext() as unknown as { drawingBufferColorSpace: string }).drawingBufferColorSpace = bufferSpace;
  } catch {}
}

const DOF_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;

const BLOOM_BRIGHT_FRAG = /* glsl */ `
uniform sampler2D tSrc;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tSrc, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float k = smoothstep(0.55, 1.0, l);
  gl_FragColor = vec4(c * k, 1.0);
}`;

const BLOOM_BLUR_FRAG = /* glsl */ `
uniform sampler2D tSrc;
uniform vec2 dir;
varying vec2 vUv;
void main() {
  vec3 c = texture2D(tSrc, vUv).rgb * 0.2270270270;
  vec2 o1 = dir * 1.3846153846;
  vec2 o2 = dir * 3.2307692308;
  c += texture2D(tSrc, vUv + o1).rgb * 0.3162162162;
  c += texture2D(tSrc, vUv - o1).rgb * 0.3162162162;
  c += texture2D(tSrc, vUv + o2).rgb * 0.0702702703;
  c += texture2D(tSrc, vUv - o2).rgb * 0.0702702703;
  gl_FragColor = vec4(c, 1.0);
}`;

const DOF_FRAG = /* glsl */ `
uniform sampler2D tDiffuse;
uniform sampler2D tDepth;
uniform vec2 offsets[8];
uniform vec2 vogel[16];
uniform vec2 texel;
uniform float cameraNear;
uniform float cameraFar;
uniform float focus;
uniform float fade;
uniform float focusScale;
uniform float maxRadius;
uniform float uCircular;
varying vec2 vUv;

float linearDepth(float z) {
  float zN = 2.0 * z - 1.0;
  return 2.0 * cameraNear * cameraFar / (cameraFar + cameraNear - zN * (cameraFar - cameraNear));
}

void main() {
  float d = linearDepth(texture2D(tDepth, vUv).x);
  float coc = clamp(abs(d - focus) / max(focus, 1.0), 0.0, 1.0) * fade * focusScale;
  float rad = coc * maxRadius;
  vec3 center = texture2D(tDiffuse, vUv).rgb;
  if (rad < 0.5) {
    gl_FragColor = vec4(center, 1.0);
    return;
  }
  vec3 acc = center;
  float wsum = 1.0;
  // Gather taps are soft-clamped: HDR sun/flame energy must not flood the
  // blur buffer (it mixes back over the whole frame). The dedicated bloom
  // pass handles HDR glow; defocus stays energy-plausible for LDR content.
  if (uCircular > 0.5) {
    for (int i = 0; i < 16; i++) {
      vec2 suv = vUv + vogel[i] * rad * texel;
      float sd = linearDepth(texture2D(tDepth, suv).x);
      float w = step(abs(sd - d), max(abs(d - focus), 1.0) * 0.5 + 0.5);
      acc += min(texture2D(tDiffuse, suv).rgb, vec3(4.0)) * w;
      wsum += w;
    }
  } else {
    for (int i = 0; i < 8; i++) {
      vec2 suv = vUv + offsets[i] * rad * texel;
      float sd = linearDepth(texture2D(tDepth, suv).x);
      float w = step(abs(sd - d), max(abs(d - focus), 1.0) * 0.5 + 0.5);
      acc += min(texture2D(tDiffuse, suv).rgb, vec3(4.0)) * w;
      wsum += w;
    }
  }
  gl_FragColor = vec4(acc / wsum, 1.0);
}`;

// Composite + chromatic aberration present pass. Mixes the sharp full-res frame
// with the half-res lens blur by per-pixel circle of confusion so in-focus detail
// stays pixel-sharp while defocus areas get the bokeh gather.
const PRESENT_FRAG = /* glsl */ `
uniform sampler2D tSharp;
uniform sampler2D tBlur;
uniform sampler2D tBloom;
uniform float bloomStrength;
uniform vec3 uWB;
uniform sampler2D tDepth;
uniform vec2 texel;
uniform float amount;
uniform float dofMix;
uniform float cameraNear;
uniform float cameraFar;
uniform float focus;
uniform float fade;
uniform float focusScale;
uniform float baseBlur;
uniform float uGain;
uniform float uWinWidth;
uniform float uGradeOn;
varying vec2 vUv;

float linearDepth(float z) {
  float zN = 2.0 * z - 1.0;
  return 2.0 * cameraNear * cameraFar / (cameraFar + cameraNear - zN * (cameraFar - cameraNear));
}

void main() {
  vec3 col;
  float dofF = 0.0;
  if (amount > 0.0005) {
    vec2 d = vUv - 0.5;
    float m = pow(length(d), 1.5) * amount * 20.0;
    vec2 rr = texel * m;
    col.r = texture2D(tSharp, vUv + d * rr).r;
    col.g = texture2D(tSharp, vUv).g;
    col.b = texture2D(tSharp, vUv - d * rr).b;
  } else {
    col = texture2D(tSharp, vUv).rgb;
  }
  if (dofMix > 0.5) {
    float dep = linearDepth(texture2D(tDepth, vUv).x);
    float coc = clamp(abs(dep - focus) / max(focus, 1.0), 0.0, 1.0);
    float blur = coc * fade * focusScale;
    float f = smoothstep(0.02, 0.45, blur + baseBlur * smoothstep(0.02, 0.05, blur));
    dofF = f;
    if (f > 0.004) {
      col = mix(col, texture2D(tBlur, vUv).rgb, f);
    }
  }
  col += texture2D(tBloom, vUv).rgb * bloomStrength;
  col *= uWB;
  // Capture-window grade (L1 latitude): gain positions metered mid at 0.18,
  // width sets shoulder hardness — narrow EV clips hard, wide EV holds all.
  // Grade-ON owns exposure+curve (present renders with NoToneMapping);
  // grade-OFF keeps the classic Neutral path below untouched.
  if (uGradeOn > 0.5) {
    col *= uGain;
    float hw = max(uWinWidth * 0.5, 0.5);
    float shoulder = clamp(uWinWidth / 17.0, 0.0, 1.0);
    float kk = mix(8.0, 1.0, shoulder);
    float tk = tanh(kk);
    vec3 rel = log2(max(col, vec3(1e-6)) / 0.18);
    vec3 crel = hw * tanh(rel / hw * kk) / tk;
    col = 0.18 * exp2(crel);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  // Perceptual-10-bit finish: interleaved gradient noise dither breaks the
  // 8-bit contour lines in sky gradients into invisible film-like grain.
  // Defocused regions upscale from the half-res gather target, so they get
  // proportionally stronger grain to mask posterization (4-5-bit look).
  float ign = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  gl_FragColor.rgb += (ign - 0.5) * (1.5 / 255.0) * (1.0 + dofF * 10.0);
}`;

const RING_DIRS: Array<[number, number]> = [
  [1.0, 0.0], [0.70710678, 0.70710678], [0.0, 1.0], [-0.70710678, 0.70710678],
  [-1.0, 0.0], [-0.70710678, -0.70710678], [0.0, -1.0], [0.70710678, -0.70710678]
];

const GOLDEN_ANGLE = 2.39996323;
const VOGEL_DIRS: Array<[number, number]> = Array.from({ length: 16 }, (_, i) => {
  const r = Math.sqrt((i + 0.5) / 16);
  const a = i * GOLDEN_ANGLE;
  return [Math.cos(a) * r, Math.sin(a) * r];
});

function makeDepthTexture(w: number, h: number): THREE.DepthTexture {
  const dt = new THREE.DepthTexture(w, h);
  dt.type = THREE.UnsignedIntType;
  return dt;
}

export function createPostFx(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  settings?: Partial<PostFxSettings>
): PostFx {
  renderer.getDrawingBufferSize(_size);
  const w = Math.max(1, _size.x), h = Math.max(1, _size.y);
  const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);

  // Full-res scene target (color + depth in one pass): HalfFloat keeps sky
  // gradients at 10-bit+ precision so sunsets don't band; final dither in
  // present re-quantizes gracefully to the 8-bit canvas.
  const sceneRT = new THREE.WebGLRenderTarget(w, h, { depthBuffer: true, type: THREE.HalfFloatType });
  sceneRT.texture.minFilter = THREE.LinearFilter;
  sceneRT.texture.magFilter = THREE.LinearFilter;
  sceneRT.texture.generateMipmaps = false;
  sceneRT.depthTexture = makeDepthTexture(w, h);
  // Half-res gather target: blur needs no resolution.
  const dofRT = new THREE.WebGLRenderTarget(hw, hh, { type: THREE.HalfFloatType });
  // Quarter-res bloom ping-pong targets: glow needs even less.
  const qw = Math.max(1, w >> 2), qh = Math.max(1, h >> 2);
  const bloomRTa = new THREE.WebGLRenderTarget(qw, qh);
  const bloomRTb = new THREE.WebGLRenderTarget(qw, qh);
  bloomRTa.texture.minFilter = THREE.LinearFilter;
  bloomRTa.texture.magFilter = THREE.LinearFilter;
  bloomRTa.texture.generateMipmaps = false;
  bloomRTb.texture.minFilter = THREE.LinearFilter;
  bloomRTb.texture.magFilter = THREE.LinearFilter;
  bloomRTb.texture.generateMipmaps = false;

  const bloomBrightMaterial = new THREE.ShaderMaterial({
    vertexShader: DOF_VERT,
    fragmentShader: BLOOM_BRIGHT_FRAG,
    uniforms: {
      tSrc: { value: null },
    },
    depthTest: false,
    depthWrite: false
  });

  const bloomBlurMaterial = new THREE.ShaderMaterial({
    vertexShader: DOF_VERT,
    fragmentShader: BLOOM_BLUR_FRAG,
    uniforms: {
      tSrc: { value: null },
      dir: { value: new THREE.Vector2(1 / qw, 0) },
    },
    depthTest: false,
    depthWrite: false
  });

  const dofMaterial = new THREE.ShaderMaterial({
    vertexShader: DOF_VERT,
    fragmentShader: DOF_FRAG,
    uniforms: {
      tDiffuse: { value: null },
      tDepth: { value: null },
      offsets: { value: RING_DIRS.map(([x, y]) => new THREE.Vector2(x, y)) },
      vogel: { value: VOGEL_DIRS.map(([x, y]) => new THREE.Vector2(x, y)) },
      texel: { value: new THREE.Vector2(1 / hw, 1 / hh) },
      cameraNear: { value: camera.near },
      cameraFar: { value: camera.far },
      focus: { value: 8 },
      fade: { value: 0 },
      focusScale: { value: 0 },
      maxRadius: { value: 10 },
      uCircular: { value: 0 }
    },
    depthTest: false,
    depthWrite: false
  });

  const presentMaterial = new THREE.ShaderMaterial({
    vertexShader: DOF_VERT,
    fragmentShader: PRESENT_FRAG,
    uniforms: {
      tSharp: { value: null },
      tBlur: { value: null },
      tBloom: { value: null },
      bloomStrength: { value: 0 },
      uWB: { value: new THREE.Vector3(1, 1, 1) },
      tDepth: { value: null },
      texel: { value: new THREE.Vector2(1 / w, 1 / h) },
      amount: { value: 0 },
      dofMix: { value: 0 },
      cameraNear: { value: camera.near },
      cameraFar: { value: camera.far },
      focus: { value: 8 },
      fade: { value: 0 },
      focusScale: { value: 0 },
      baseBlur: { value: 0.04 },
      uGain: { value: 1 },
      uWinWidth: { value: 17 },
      uGradeOn: { value: 0 }
    },
    depthTest: false,
    depthWrite: false
  });

  const quadScene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), presentMaterial);
  quad.frustumCulled = false;
  quadScene.add(quad);

  const fx: PostFx = {
    renderer, scene, camera,
    sceneRT, dofRT,
    bloomRTa, bloomRTb,
    dofMaterial, bloomBrightMaterial, bloomBlurMaterial, presentMaterial,
    quad, quadScene,
    quadCam: new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1),
    settings: { dof: false, dofStrength: 0.4, ca: false, caStrength: 0.25, bokeh: false, bloom: 0.9, grade: false, gradeWidth: 17, ...settings },
    focus: 8,
    targetFocus: -1,
    fade: 0,
    lastT: performance.now()
  };
  applyUniforms(fx);
  return fx;
}

function applyUniforms(fx: PostFx): void {
  fx.dofMaterial.uniforms.maxRadius.value = 4 + fx.settings.dofStrength * 24;
  fx.dofMaterial.uniforms.uCircular.value = fx.settings.bokeh ? 1 : 0;
  fx.presentMaterial.uniforms.baseBlur.value = fx.settings.dofStrength * 0.10;
  fx.presentMaterial.uniforms.amount.value = fx.settings.ca ? fx.settings.caStrength : 0;
}

export function updatePostFx(fx: PostFx | null | undefined, settings: PostFxSettings): void {
  if (!fx) return;
  fx.settings = { ...settings };
  applyUniforms(fx);
}

export function setPostFxWhiteBalance(fx: PostFx | null | undefined, r: number, g: number, b: number): void {
  if (!fx) return;
  (fx.presentMaterial.uniforms.uWB.value as THREE.Vector3).set(r, g, b);
}

export function setPostFxGrade(fx: PostFx | null | undefined, gain: number, widthStops: number): void {
  if (!fx) return;
  try {
    fx.presentMaterial.uniforms.uGain.value = Number.isFinite(gain) && gain > 0 ? gain : 1;
    fx.presentMaterial.uniforms.uWinWidth.value = Math.max(1, Math.min(17, widthStops || 17));
  } catch {}
}

export function setPostFxFocus(fx: PostFx, distance: number): void {
  fx.targetFocus = distance > 0 ? distance : -1;
}

export function isDofActive(fx: PostFx | null | undefined): boolean {
  return !!fx && fx.settings.dof;
}

function resizeTargets(fx: PostFx, w: number, h: number): void {
  const hw = Math.max(1, w >> 1), hh = Math.max(1, h >> 1);
  const qw = Math.max(1, w >> 2), qh = Math.max(1, h >> 2);
  fx.sceneRT.setSize(w, h);
  fx.sceneRT.depthTexture?.dispose();
  fx.sceneRT.depthTexture = makeDepthTexture(w, h);
  fx.sceneRT.dispose();
  fx.dofRT.setSize(hw, hh);
  fx.dofRT.dispose();
  fx.bloomRTa.setSize(qw, qh);
  fx.bloomRTa.dispose();
  fx.bloomRTb.setSize(qw, qh);
  fx.bloomRTb.dispose();
  fx.dofMaterial.uniforms.texel.value.set(1 / hw, 1 / hh);
  fx.presentMaterial.uniforms.texel.value.set(1 / w, 1 / h);
}

export function resizePostFx(fx: PostFx | null | undefined): void {
  if (!fx) return;
  fx.renderer.getDrawingBufferSize(_size);
  resizeTargets(fx, Math.max(1, _size.x), Math.max(1, _size.y));
}

export function renderPostFx(fx: PostFx): boolean {
  const { settings } = fx;
  const bloomStr = settings.bloom || 0;
  const gradeOn = !!settings.grade && (settings.gradeWidth || 17) < 17;
  if (!settings.dof && !settings.ca && bloomStr <= 0.001 && !gradeOn) return false;

  const r = fx.renderer;
  r.getDrawingBufferSize(_size);
  const w = Math.max(1, _size.x), h = Math.max(1, _size.y);
  if (fx.sceneRT.width !== w || fx.sceneRT.height !== h) resizeTargets(fx, w, h);

  const now = performance.now();
  const dt = Math.min((now - fx.lastT) / 1000, 0.1);
  fx.lastT = now;
  const k = Math.min(1, dt * 8);
  fx.fade += ((fx.targetFocus > 0 ? 1 : 0) - fx.fade) * k;
  if (fx.targetFocus > 0) {
    const target = Math.min(Math.max(fx.targetFocus, 0.5), MAX_FOCUS);
    fx.focus += (target - fx.focus) * k;
  }
  const focusScale = Math.pow(Math.max(0, 1 - fx.focus / MAX_FOCUS), 1.5);
  // When the achievable blur radius is sub-texel (focus at/near MAX_FOCUS, sky, or low
  // strength) the DOF result is indistinguishable from the sharp frame — skip the depth
  // pre-pass, gather, and canvas copy entirely instead of paying for an invisible effect.
  const maxRadius = 4 + settings.dofStrength * 24;
  const dofActive = settings.dof && fx.fade * focusScale * maxRadius > 1.0;
  if (!dofActive && !settings.ca && !gradeOn) return false;
  // skip invisible CA as well (half-res already quarters the cost, but sub-texel CA is invisible)
  if (!dofActive && settings.ca && settings.caStrength * Math.min(w, h) < 1.0) return false;

  // Scene renders once into the full-res target — color + depth together.
  // Identical programs to the no-postfx path; output conversion happens in present.
  r.setRenderTarget(fx.sceneRT);
  r.render(fx.scene, fx.camera);

  let input: THREE.Texture = fx.sceneRT.texture;
  if (dofActive) {
    const u = fx.dofMaterial.uniforms;
    u.tDiffuse.value = fx.sceneRT.texture;
    u.tDepth.value = fx.sceneRT.depthTexture;
    u.cameraNear.value = fx.camera.near;
    u.cameraFar.value = fx.camera.far;
    u.focus.value = fx.focus;
    u.fade.value = fx.fade;
    u.focusScale.value = focusScale;
    u.maxRadius.value = maxRadius;
    fx.quad.material = fx.dofMaterial;
    r.setRenderTarget(fx.dofRT);
    r.render(fx.quadScene, fx.quadCam);
    input = fx.dofRT.texture;
  }

  const pu = fx.presentMaterial.uniforms;
  pu.tSharp.value = fx.sceneRT.texture;
  pu.tBlur.value = input;
  if (bloomStr > 0.001) {
    const bw = Math.max(1, w >> 2), bh = Math.max(1, h >> 2);
    if (fx.bloomRTa.width !== bw || fx.bloomRTa.height !== bh) {
      fx.bloomRTa.setSize(bw, bh);
      fx.bloomRTb.setSize(bw, bh);
    }
    fx.bloomBrightMaterial.uniforms.tSrc.value = fx.sceneRT.texture;
    fx.quad.material = fx.bloomBrightMaterial;
    r.setRenderTarget(fx.bloomRTa);
    r.render(fx.quadScene, fx.quadCam);
    fx.bloomBlurMaterial.uniforms.tSrc.value = fx.bloomRTa.texture;
    fx.bloomBlurMaterial.uniforms.dir.value.set(1 / bw, 0);
    fx.quad.material = fx.bloomBlurMaterial;
    r.setRenderTarget(fx.bloomRTb);
    r.render(fx.quadScene, fx.quadCam);
    fx.bloomBlurMaterial.uniforms.tSrc.value = fx.bloomRTb.texture;
    fx.bloomBlurMaterial.uniforms.dir.value.set(0, 1 / bh);
    r.setRenderTarget(fx.bloomRTa);
    r.render(fx.quadScene, fx.quadCam);
    pu.tBloom.value = fx.bloomRTa.texture;
  } else {
    pu.tBloom.value = fx.sceneRT.texture;
  }
  pu.bloomStrength.value = bloomStr;
  pu.tDepth.value = fx.sceneRT.depthTexture;
  pu.cameraNear.value = fx.camera.near;
  pu.cameraFar.value = fx.camera.far;
  pu.focus.value = fx.focus;
  pu.fade.value = fx.fade;
  pu.focusScale.value = focusScale;
  pu.baseBlur.value = dofActive ? settings.dofStrength * 0.10 * focusScale : 0;
  pu.dofMix.value = dofActive ? 1 : 0;
  pu.amount.value = settings.ca ? settings.caStrength : 0;
  (pu.uGradeOn as { value: number }).value = gradeOn ? 1 : 0;
  fx.quad.material = fx.presentMaterial;
  r.setRenderTarget(null);
  const prevTone = r.toneMapping;
  if (gradeOn) r.toneMapping = THREE.NoToneMapping;
  try {
    r.render(fx.quadScene, fx.quadCam);
  } finally {
    if (gradeOn) r.toneMapping = prevTone;
  }
  return true;
}

export function renderWithPostFx(
  fx: PostFx | null | undefined,
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera
): void {
  if (!fx || !renderPostFx(fx)) renderer.render(scene, camera);
}

export function disposePostFx(fx: PostFx | null | undefined): void {
  if (!fx) return;
  fx.sceneRT.depthTexture?.dispose();
  fx.sceneRT.dispose();
  fx.dofRT.dispose();
  fx.bloomRTa.dispose();
  fx.bloomRTb.dispose();
  fx.dofMaterial.dispose();
  fx.bloomBrightMaterial.dispose();
  fx.bloomBlurMaterial.dispose();
  fx.presentMaterial.dispose();
  fx.quad.geometry.dispose();
}
