import * as THREE from "three";
import { BLOCKS, type BlockDef } from "../blocks";
import { ATLAS_TILES } from "./chunkMesh";

// Per-block-tile sun-glint lookup: R = specular strength 0..1, G = shininess 0..1
// (shader maps G to an 8..160 Blinn-Phong exponent). Water and glass/metals shine
// strongly, stone-family moderately, everything else (wood, dirt, plants) is matte.

const MATTE: [number, number] = [0, 0];

function classifySpec(name: string, def: BlockDef): [number, number] {
  const n = name.toLowerCase();
  if (def.liquid === "water") return [1.0, 0.02];
  if (/\b(glass|ice)\b/.test(n)) return [0.9, 0.3];
  if (/(block of (iron|gold|diamond|emerald|copper|lapis|redstone|coal|netherite))|((iron|gold|diamond|emerald|copper|lapis|redstone|netherite)[a-z ]*(block|ore))/.test(n)) return [0.8, 0.45];
  if (/(stone|cobble|deepslate|granite|diorite|andesite|obsidian|bedrock|ore|quartz|brick|terracotta|concrete|calcite|tuff|dripstone|basalt|blackstone|amethyst|prismarine|netherrack|end stone|ancient debris)/.test(n)) return [0.35, 0.08];
  return MATTE;
}

export function buildSpecLUT(): THREE.DataTexture {
  const size = ATLAS_TILES;
  const data = new Uint8Array(size * size * 4);
  for (const b of BLOCKS) {
    const [spec, shin] = classifySpec(b.name, b);
    if (spec <= 0) continue;
    for (const tile of [b.side, b.top, b.bottom]) {
      if (tile === undefined || tile < 0 || tile >= size * size) continue;
      const tx = tile % size;
      const ty = (tile / size) | 0;
      // the shader's tile-index math (31 - floor(vMapUv.y*32)) already undoes the
      // atlas flipY, so the LUT is filled directly at (ty, tx) — DataTexture has flipY=false
      const idx = (ty * size + tx) * 4;
      data[idx] = Math.round(spec * 255);
      data[idx + 1] = Math.round(shin * 255);
      data[idx + 3] = 255;
    }
  }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

export function enableSpecular(mat: THREE.Material, lut: THREE.DataTexture): void {
  const ud = (mat.userData ??= {}) as Record<string, { value: unknown }>;
  if (ud.uSpecMap) return;
  ud.uSpecMap = { value: lut };
  ud.uSpecStrength = { value: 0 };
  ud.uSunDirView = { value: new THREE.Vector3(0, 1, 0) };
  ud.uSunColor = { value: new THREE.Color(0, 0, 0) };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uSpecMap = ud.uSpecMap;
    shader.uniforms.uSpecStrength = ud.uSpecStrength;
    shader.uniforms.uSunDirView = ud.uSunDirView;
    shader.uniforms.uSunColor = ud.uSunColor;
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        "uniform sampler2D uSpecMap;\nuniform float uSpecStrength;\nuniform vec3 uSunDirView;\nuniform vec3 uSunColor;\n#include <common>"
      )
      .replace(
        "vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;",
        `vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
  {
    vec2 tileUV = floor(vMapUv * ${ATLAS_TILES}.0);
    tileUV.y = ${ATLAS_TILES - 1}.0 - tileUV.y;
    float tileIdx = tileUV.x + tileUV.y * ${ATLAS_TILES}.0;
    vec2 lutUv = (vec2(mod(tileIdx, ${ATLAS_TILES}.0), floor(tileIdx / ${ATLAS_TILES}.0)) + 0.5) / ${ATLAS_TILES}.0;
    vec2 specData = texture2D(uSpecMap, lutUv).rg;
    if (specData.r > 0.004 && uSpecStrength > 0.004) {
      vec3 viewDir = normalize(vViewPosition);
      float nl = clamp(dot(normal, uSunDirView), 0.0, 1.0);
      float shininess = mix(8.0, 160.0, specData.g);
      vec3 halfDir = normalize(uSunDirView + viewDir);
      float specAngle = pow(max(dot(normal, halfDir), 0.0), shininess);
      float fresnel = pow(1.0 - clamp(dot(normal, viewDir), 0.0, 1.0), 5.0);
      float specW = mix(specData.r, 1.0, fresnel * 0.7);
      outgoingLight += uSunColor * (specW * uSpecStrength * specAngle * smoothstep(0.0, 0.1, nl));
    }
  }`
      );
  };
}

export function setSpecularEnabled(
  mats: Array<THREE.Material | null | undefined>,
  on: boolean,
  strength = 1
): void {
  const v = on ? Math.max(0, Math.min(1, strength)) : 0;
  for (const m of mats) {
    const ud = (m?.userData ?? {}) as Record<string, { value: unknown } | undefined>;
    if (ud.uSpecStrength) ud.uSpecStrength.value = v;
  }
}
