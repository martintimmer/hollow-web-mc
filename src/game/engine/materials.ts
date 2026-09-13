import * as THREE from "three";

export interface GameMaterials {
  matMerged: THREE.MeshLambertMaterial;
  matOpaque: THREE.MeshLambertMaterial;
  matFoliage: THREE.MeshLambertMaterial;
  matGlow: THREE.MeshBasicMaterial;
  matTrans: THREE.MeshLambertMaterial;
}

export function createGameMaterials(tex: THREE.Texture): GameMaterials {
  // 1. Merged Solid/Foliage Material
  const matMerged = new THREE.MeshLambertMaterial({
    map: tex,
    vertexColors: true,
    transparent: false,
    alphaTest: 0.30,
    depthTest: true,
    depthWrite: true,
    side: THREE.FrontSide
  });

  // 2. Rigid Opaque Solid Blocks
  const matOpaque = new THREE.MeshLambertMaterial({
    map: tex,
    vertexColors: true,
    depthTest: true,
    depthWrite: true,
    side: THREE.FrontSide
  });

  // 3. Animated Foliage & Leaves with gentle wind sway
  const matFoliage = new THREE.MeshLambertMaterial({
    map: tex,
    vertexColors: true,
    transparent: true,
    alphaTest: 0.35,
    depthTest: true,
    depthWrite: true,
    side: THREE.FrontSide
  });
  matFoliage.userData.uTime = { value: 0 };
  matFoliage.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = matFoliage.userData.uTime;
    shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <begin_vertex>',
      `#include <begin_vertex>
      float windSway = sin(uTime * 1.8 + position.x * 0.45 + position.z * 0.45) * cos(uTime * 1.2 + position.y * 0.35);
      transformed.x += windSway * 0.035;
      transformed.z += windSway * 0.025;`
    );
  };

  // 4. Glowing Light-Emitting Blocks (fog-immune: flames read at any distance)
  const matGlow = new THREE.MeshBasicMaterial({ map: tex, depthTest: true, depthWrite: true, alphaTest: 0.08, side: THREE.DoubleSide, fog: false });

  // 5. Transparent Cutouts & Liquids
  const matTrans = new THREE.MeshLambertMaterial({
    map: tex,
    vertexColors: true,
    transparent: true,
    alphaTest: 0.05,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  return { matMerged, matOpaque, matFoliage, matGlow, matTrans };
}

export function createSkyDome(): THREE.Mesh {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 20), new THREE.ShaderMaterial({
    uniforms: {
      zen:   { value: new THREE.Color(0x2b6bcc) },
      hor:   { value: new THREE.Color(0xcfe2f0) },
      glow:  { value: new THREE.Color(0xff8c42) },
      sdir:  { value: new THREE.Vector3(0, 1, 0) },
      warm:  { value: 0.0 },
      night: { value: 0.0 }
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main(){
        vWorldPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      precision highp float;
      uniform vec3 zen;
      uniform vec3 hor;
      uniform vec3 glow;
      uniform vec3 sdir;
      uniform float warm;
      uniform float night;
      varying vec3 vWorldPos;

      void main(){
        vec3 d = normalize(vWorldPos);
        float up = clamp(d.y, 0.0, 1.0);
        vec3 col = mix(hor, zen, pow(up, 0.55));
        if (d.y < 0.0) col = mix(hor, hor * 0.45, clamp(-d.y * 2.0, 0.0, 1.0));

        float sd = clamp(dot(d, normalize(sdir)), 0.0, 1.0);
        col += glow * pow(sd, 6.0) * 0.45 * warm;
        col += glow * pow(sd, 35.0) * 0.55 * warm;

        gl_FragColor = vec4(col, 1.0);
      }`,
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false
  }));
  sky.renderOrder = -100;
  return sky;
}

export function createLightingRig(scene: THREE.Scene, shadowsOn: boolean) {
  const amb = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(amb);

  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x555555, 0.55);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.castShadow = shadowsOn;
  sun.shadow.mapSize.set(512, 512);
  const SH_RAD = 64;
  sun.shadow.camera.left = -SH_RAD;
  sun.shadow.camera.right = SH_RAD;
  sun.shadow.camera.top = SH_RAD;
  sun.shadow.camera.bottom = -SH_RAD;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 400;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.01;
  sun.shadow.camera.updateProjectionMatrix();
  scene.add(sun);
  scene.add(sun.target);

  const MAX_POINT_LIGHTS = 25;
  const lights: THREE.PointLight[] = [];
  for (let i = 0; i < MAX_POINT_LIGHTS; i++) {
    const l = new THREE.PointLight(0xffa238, 0, 18, 2.0);
    scene.add(l);
    lights.push(l);
  }

  return { amb, hemi, sun, lights };
}
