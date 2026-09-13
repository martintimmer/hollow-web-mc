import * as THREE from "three";
import { makeClouds, createVoxelCelestialBox, createMoonHalo } from "../visuals";
import { createCelestialTexture } from "./atlas";
import { isFence, isSlab } from "../blocks";
import {
  createHeldBlockMesh,
  createHeldBowMesh,
  createHeldFenceMesh,
  createHeldSlabMesh,
  createHeldSwordMesh,
  createHeldPickaxeMesh,
  createHeldSpriteFromImage,
  createHeldTorchMesh,
  createHeldLargeGrassMesh,
  createHeldTropicalBushMesh,
  createHeldCrossBillboardMesh,
  createHeldWebMesh,
  createHeldPortalMesh
} from "./heldItem";
import { isCustomAssetBlock, loadCustomAssetModel } from "../customAssets";
import { buildSpecLUT, enableSpecular, setSpecularEnabled } from "./specular";

export function initMaterials(tex: THREE.CanvasTexture) {
  const matOpaque = new THREE.MeshLambertMaterial({
    map: tex,
    vertexColors: true,
    depthTest: true,
    depthWrite: true,
    shadowSide: THREE.FrontSide
  });

  const matFoliage = new THREE.MeshLambertMaterial({
    map: tex,
    vertexColors: true,
    depthTest: true,
    depthWrite: true,
    alphaTest: 0.15,
    transparent: false
  });

  const matTrans = new THREE.MeshLambertMaterial({
    map: tex,
    vertexColors: true,
    depthTest: true,
    depthWrite: false,
    transparent: true,
    opacity: 0.82
  });

  const matGlow = new THREE.MeshBasicMaterial({
    map: tex,
    vertexColors: true,
    depthTest: true,
    depthWrite: true,
    alphaTest: 0.15,
    side: THREE.DoubleSide
  });

  return { matOpaque, matFoliage, matTrans, matGlow };
}

export function createPlayerArm(isLeftHand = false) {
  const armGroup = new THREE.Group();
  if (isLeftHand) {
    armGroup.position.set(-0.30, -0.28, -0.45);
    armGroup.rotation.set(-0.32, 0.20, -0.10);
  } else {
    armGroup.position.set(0.30, -0.28, -0.45);
    armGroup.rotation.set(-0.32, -0.20, 0.10);
  }

  const sleeveMat = new THREE.MeshBasicMaterial({ color: 0x1d70b8, depthTest: true, depthWrite: true, toneMapped: false });
  const sleeveGeom = new THREE.BoxGeometry(0.12, 0.26, 0.12);
  const sleeveMesh = new THREE.Mesh(sleeveGeom, sleeveMat);
  sleeveMesh.position.set(0, -0.06, 0);
  if (isLeftHand) sleeveMesh.visible = false;
  armGroup.add(sleeveMesh);

  const handMat = new THREE.MeshBasicMaterial({ color: 0xc2875b, depthTest: true, depthWrite: true, toneMapped: false });
  const handGeom = new THREE.BoxGeometry(0.11, 0.14, 0.11);
  const handMesh = new THREE.Mesh(handGeom, handMat);
  handMesh.position.set(0, 0.12, 0);
  if (isLeftHand) handMesh.visible = false;
  armGroup.add(handMesh);

  const heldItemGroup = new THREE.Group();
  heldItemGroup.position.set(isLeftHand ? -0.02 : 0.02, 0.14, -0.06);
  armGroup.add(heldItemGroup);

  return { armGroup, sleeveMesh, handMesh, heldItemGroup };
}

export function updateArmHeldItem(
  heldItemGroup: THREE.Group,
  sleeveMesh: THREE.Mesh,
  handMesh: THREE.Mesh,
  blockId: number,
  tex: THREE.CanvasTexture | null,
  isoThumbs: Map<number, string>,
  isLeftHand = false
) {
  heldItemGroup.userData.heldBlockId = blockId;
  while (heldItemGroup.children.length > 0) {
    const child = heldItemGroup.children[0];
    heldItemGroup.remove(child);
    if (child instanceof THREE.Mesh && child.geometry) {
      child.geometry.dispose();
    }
  }

  if (blockId <= 0 || (!tex && !isCustomAssetBlock(blockId))) {
    heldItemGroup.visible = false;
    if (!isLeftHand) {
      sleeveMesh.visible = true;
      handMesh.visible = true;
    } else {
      sleeveMesh.visible = false;
      handMesh.visible = false;
    }
    return;
  }

  heldItemGroup.visible = true;
  sleeveMesh.visible = false;
  handMesh.visible = false;
  heldItemGroup.position.set(isLeftHand ? -0.02 : 0.02, -0.10, -0.06);

  if (isCustomAssetBlock(blockId)) {
    const requestedId = blockId;
    loadCustomAssetModel(blockId).then((model) => {
      if (!model || heldItemGroup.userData.heldBlockId !== requestedId) return;
      const held = model.clone(true);
      held.rotation.set(0.3, isLeftHand ? 0.6 : -0.6, isLeftHand ? -0.2 : 0.2);
      held.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(held);
      const size = bounds.getSize(new THREE.Vector3());
      const maxSize = Math.max(size.x, size.y, size.z, 0.0001);
      held.scale.multiplyScalar(0.22 / maxSize);
      held.updateMatrixWorld(true);
      const fitted = new THREE.Box3().setFromObject(held);
      const center = fitted.getCenter(new THREE.Vector3());
      held.position.x -= center.x;
      held.position.y -= fitted.min.y;
      held.position.z -= center.z;
      held.position.x += isLeftHand ? -0.04 : 0.04;
      held.position.y += 0.02;
      held.position.z -= 0.06;
      if (!(model as any).userData?.voxel) {
        held.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.frustumCulled = false;
          const srcMats = Array.isArray((object as THREE.Mesh).material) ? (object as THREE.Mesh).material as THREE.Material[] : [(object as THREE.Mesh).material as THREE.Material];
          const newMats = (srcMats as any[]).map((src: any) => {
            const map = src.map as THREE.Texture | null | undefined;
            if (map) {
              map.magFilter = THREE.NearestFilter;
              map.minFilter = THREE.NearestFilter;
              map.generateMipmaps = false;
              (map as any).colorSpace = THREE.SRGBColorSpace;
              map.needsUpdate = true;
            }
            return new THREE.MeshBasicMaterial({
              map: map || null,
              color: src.color ? src.color.clone() : new THREE.Color(0xffffff),
              side: THREE.DoubleSide,
              transparent: false,
              opacity: 1,
              depthTest: true,
              depthWrite: true,
              toneMapped: false
            });
          });
          (object as THREE.Mesh).material = (newMats.length === 1 ? newMats[0] : newMats) as any;
        });
      }
      heldItemGroup.add(held);
    }).catch(() => undefined);
    return;
  }
  if (!tex) return;

  const isSword = blockId === 887 || blockId === 938 || blockId === 958 || blockId === 1040 || blockId === 1134 || blockId === 1158 || blockId === 130;
  const isPickaxe = blockId === 885 || blockId === 936 || blockId === 956 || blockId === 1037 || blockId === 1132 || blockId === 1156 || blockId === 131;

  if (blockId === 730) {
    // Bow: curved 3D model in the right hand.
    const bow = createHeldBowMesh();
    heldItemGroup.add(bow);
  } else if (isSword) {
    const sword = createHeldSwordMesh();
    heldItemGroup.add(sword);
  } else if (isPickaxe) {
    const pickaxe = createHeldPickaxeMesh();
    heldItemGroup.add(pickaxe);
  } else if (blockId === 80 || blockId === 81 || blockId === 84) {
    const tile = blockId === 81 ? 82 : (blockId === 84 ? 86 : 81);
    const torch = createHeldTorchMesh(tex, tile, isLeftHand, blockId);
    heldItemGroup.add(torch);
    heldItemGroup.visible = true;
    // Push the torch down toward the bottom corner and closer to the camera so
    // it emerges from the screen edge instead of floating ahead in mid-air.
    heldItemGroup.position.set(isLeftHand ? -0.30 : 0.30, -0.20, -0.34);
    sleeveMesh.visible = false;
    handMesh.visible = false;
  } else if (blockId === 134 || blockId === 135 || blockId === 136) {
    const dataUri = isoThumbs.get(blockId);
    if (dataUri) {
      const sprite = createHeldSpriteFromImage(dataUri, 0.15, 0.15);
      sprite.scale.set(1.6, 1.6, 1.6);
      sprite.position.set(isLeftHand ? -0.04 : 0.04, 0.02, -0.06);
      heldItemGroup.add(sprite);
    } else {
      const fallbackMat = new THREE.MeshBasicMaterial({
        color: blockId === 135 ? 0x3f76e4 : (blockId === 136 ? 0xff7722 : 0x8a8a8a),
        transparent: false, depthTest: true, depthWrite: true
      });
      const fb = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 0.15), fallbackMat);
      fb.scale.set(1.6, 1.6, 1.6);
      fb.position.set(isLeftHand ? -0.04 : 0.04, 0.02, -0.06);
      heldItemGroup.add(fb);
    }
  } else if (isFence(blockId)) {
    const fenceMesh = createHeldFenceMesh(blockId, tex);
    if (fenceMesh) {
      fenceMesh.scale.set(1.3, 1.3, 1.3);
      fenceMesh.position.set(isLeftHand ? -0.04 : 0.04, 0.01, -0.06);
      fenceMesh.rotation.set(0.2, isLeftHand ? 0.6 : -0.6, isLeftHand ? -0.15 : 0.15);
      heldItemGroup.add(fenceMesh);
    }
  } else if (blockId === 1204 || blockId === 98) {
    const portalMesh = createHeldPortalMesh(tex);
    if (portalMesh) {
      portalMesh.scale.set(1.4, 1.4, 1.4);
      portalMesh.position.set(isLeftHand ? -0.04 : 0.04, -0.02, -0.06);
      portalMesh.rotation.set(0.15, isLeftHand ? 0.6 : -0.6, isLeftHand ? -0.1 : 0.1);
      heldItemGroup.add(portalMesh);
    }
  } else if (blockId === 1202 || blockId === 1203) {
    const bushMesh = createHeldTropicalBushMesh(tex);
    if (bushMesh) {
      bushMesh.scale.set(1.4, 1.4, 1.4);
      bushMesh.position.set(isLeftHand ? -0.04 : 0.04, -0.02, -0.06);
      bushMesh.rotation.set(0.15, isLeftHand ? 0.6 : -0.6, isLeftHand ? -0.1 : 0.1);
      heldItemGroup.add(bushMesh);
    }
  } else if (blockId === 1200 || blockId === 1201) {
    const grassMesh = createHeldLargeGrassMesh(tex);
    if (grassMesh) {
      grassMesh.scale.set(1.4, 1.4, 1.4);
      grassMesh.position.set(isLeftHand ? -0.04 : 0.04, -0.02, -0.06);
      grassMesh.rotation.set(0.15, isLeftHand ? 0.6 : -0.6, isLeftHand ? -0.1 : 0.1);
      heldItemGroup.add(grassMesh);
    }
  } else if (blockId === 259 || blockId === 1207 || blockId === 1208) {
    const webMesh = createHeldWebMesh(299, blockId === 1207 ? 1 : (blockId === 1208 ? 4 : 2), tex);
    if (webMesh) {
      webMesh.scale.set(1.4, 1.4, 1.4);
      webMesh.position.set(isLeftHand ? -0.04 : 0.04, 0.01, -0.06);
      webMesh.rotation.set(0.15, isLeftHand ? 0.6 : -0.6, isLeftHand ? -0.1 : 0.1);
      heldItemGroup.add(webMesh);
    }
  } else if (blockId === 124 || blockId === 125 || blockId === 126 || blockId === 361 || blockId === 429 || blockId === 658) {
    const tile = blockId === 124 ? 129 : (blockId === 125 ? 130 : (blockId === 126 ? 131 : (blockId === 361 ? 421 : (blockId === 429 ? 496 : 806))));
    const plantMesh = createHeldCrossBillboardMesh(tile, tex);
    if (plantMesh) {
      plantMesh.scale.set(1.4, 1.4, 1.4);
      plantMesh.position.set(isLeftHand ? -0.04 : 0.04, 0.01, -0.06);
      plantMesh.rotation.set(0.15, isLeftHand ? 0.6 : -0.6, isLeftHand ? -0.1 : 0.1);
      heldItemGroup.add(plantMesh);
    }
  } else if (isSlab(blockId)) {
    const slabMesh = createHeldSlabMesh(blockId, tex);
    if (slabMesh) {
      slabMesh.scale.set(1.5, 1.5, 1.5);
      slabMesh.position.set(isLeftHand ? -0.04 : 0.04, 0.02, -0.06);
      slabMesh.rotation.set(0.3, isLeftHand ? 0.6 : -0.6, isLeftHand ? -0.2 : 0.2);
      heldItemGroup.add(slabMesh);
    }
  } else {
    const blockMesh = createHeldBlockMesh(blockId, tex);
    if (blockMesh) {
      blockMesh.scale.set(1.5, 1.5, 1.5);
      blockMesh.position.set(isLeftHand ? -0.04 : 0.04, 0.02, -0.06);
      blockMesh.rotation.set(0.3, isLeftHand ? 0.6 : -0.6, isLeftHand ? -0.2 : 0.2);
      heldItemGroup.add(blockMesh);
    } else {
      const dataUri = isoThumbs.get(blockId);
      if (dataUri) {
        const sprite = createHeldSpriteFromImage(dataUri, 0.15, 0.15);
        sprite.scale.set(1.6, 1.6, 1.6);
        sprite.position.set(isLeftHand ? -0.04 : 0.04, 0.02, -0.06);
        heldItemGroup.add(sprite);
      }
    }
  }
}

export function initCelestialSky(scene: THREE.Scene, vnoise: (x: number, y: number) => number) {
  const celestialTex = createCelestialTexture();
  const sunBox = createVoxelCelestialBox(celestialTex, scene, 0, 44);
  (sunBox.material as THREE.MeshBasicMaterial).color.setRGB(10, 9.6, 8.2);
  const moonBox = createVoxelCelestialBox(celestialTex, scene, 1, 36);
  const moonHalo = createMoonHalo(scene, 64);

  const sg = new THREE.BufferGeometry(), sp: number[] = [];
  for (let i = 0; i < 950; i++) {
    const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, rr = Math.sqrt(1 - u * u);
    sp.push(Math.cos(a) * rr * 390, Math.abs(u) * 390, Math.sin(a) * rr * 390);
  }
  sg.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({
    color: 0xdfe8ff,
    size: 2.4,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: true,
    fog: false
  }));
  stars.renderOrder = 0;
  scene.add(stars);

  const clouds = makeClouds(vnoise);
  scene.add(clouds);

  return { sunBox, moonBox, moonHalo, stars, clouds };
}

export function shadowConfigFor(t: "basic" | "detailed" | "advanced") {
  return t === "basic" ? { type: THREE.BasicShadowMap, res: 512, rad: 64 } :
    t === "detailed" ? { type: THREE.PCFShadowMap, res: 768, rad: 48 } :
    { type: THREE.PCFSoftShadowMap, res: 1024, rad: 40 };
}

export interface BlockMaterials {
  matMerged: THREE.MeshLambertMaterial;
  matOpaque: THREE.MeshLambertMaterial;
  matFoliage: THREE.MeshLambertMaterial;
  matGrass: THREE.MeshLambertMaterial;
  matGlow: THREE.MeshBasicMaterial;
  matTrans: THREE.MeshLambertMaterial;
  specLUT: THREE.DataTexture;
}

export function createBlockMaterials(
  tex: THREE.CanvasTexture,
  specularEnabled = true,
  specularStrength = 1.0
): BlockMaterials {
  const matMerged = new THREE.MeshLambertMaterial({
    map: tex,
    vertexColors: true,
    transparent: false,
    alphaTest: 0.30,
    depthTest: true,
    depthWrite: true,
    side: THREE.FrontSide
  });

  const matOpaque = new THREE.MeshLambertMaterial({
    map: tex,
    vertexColors: true,
    depthTest: true,
    depthWrite: true,
    side: THREE.FrontSide
  });

  const matFoliage = new THREE.MeshLambertMaterial({
    map: tex,
    vertexColors: true,
    transparent: true,
    alphaTest: 0.35,
    depthTest: true,
    depthWrite: true,
    side: THREE.DoubleSide
  });
  matFoliage.userData.uTime = { value: 0 };
  matFoliage.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = matFoliage.userData.uTime;
    shader.vertexShader = "uniform float uTime;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      float windSway = sin(uTime * 1.8 + position.x * 0.45 + position.z * 0.45) * cos(uTime * 1.2 + position.y * 0.35);
      transformed.x += windSway * 0.035;
      transformed.z += windSway * 0.025;`
    );
  };

  const matGrass = new THREE.MeshLambertMaterial({
    map: tex,
    vertexColors: true,
    transparent: true,
    alphaTest: 0.35,
    depthTest: true,
    depthWrite: true,
    side: THREE.DoubleSide
  });
  matGrass.userData.uTime = { value: 0 };
  matGrass.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = matGrass.userData.uTime;
    shader.vertexShader = "uniform float uTime;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      float windH = fract(uv.y * 32.0);
      float windGust = sin(uTime * 1.25 + position.x * 0.21 + position.z * 0.21);
      float windRipple = sin(uTime * 2.55 + position.z * 0.37 - position.x * 0.29);
      float windBend = (windGust * 0.72 + windRipple * 0.28) * (windH * windH);
      transformed.x += windBend * 0.20;
      transformed.z += windBend * 0.12;`
    );
  };

  const matGlow = new THREE.MeshBasicMaterial({ map: tex, depthTest: true, depthWrite: true, alphaTest: 0.08, side: THREE.DoubleSide, fog: false });
  matGlow.userData.uTime = { value: 0 };
  matGlow.userData.uFlame = { value: [88, 89, 105, 766].map((tile) => {
    const col = tile % 32, row = Math.floor(tile / 32);
    return new THREE.Vector4(col / 32, (col + 1) / 32, (32 - row - 1) / 32, (32 - row) / 32);
  }) };
  matGlow.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = matGlow.userData.uTime;
    shader.uniforms.uFlame = matGlow.userData.uFlame;
    shader.vertexShader = "uniform float uTime;\nuniform vec4 uFlame[4];\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
      float flameMask = 0.0;
      for (int fi = 0; fi < 4; fi++) {
        vec4 fr = uFlame[fi];
        if (uv.x > fr.x && uv.x < fr.y && uv.y > fr.z && uv.y < fr.w) flameMask = 1.0;
      }
      float flameWob = sin(uTime * 0.9 + position.x * 4.0 + position.z * 3.0) + 0.5 * sin(uTime * 1.5 + position.y * 7.0);
      transformed.x += flameWob * 0.035 * flameMask;
      transformed.z += cos(uTime * 0.77 + position.x * 2.0 - position.z * 4.0) * 0.03 * flameMask;
      transformed.y += sin(uTime * 1.1 + position.z * 5.0) * 0.02 * flameMask;`
    );
  };

  const matTrans = new THREE.MeshLambertMaterial({
    map: tex,
    vertexColors: true,
    transparent: true,
    alphaTest: 0.05,
    depthTest: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const specLUT = buildSpecLUT();
  enableSpecular(matMerged, specLUT);
  enableSpecular(matOpaque, specLUT);
  enableSpecular(matTrans, specLUT);
  setSpecularEnabled([matMerged, matOpaque, matTrans], specularEnabled, specularStrength);

  return { matMerged, matOpaque, matFoliage, matGrass, matGlow, matTrans, specLUT };
}

export function createSceneLights(
  scene: THREE.Scene,
  shadowsOn: boolean,
  shadowTier: "basic" | "detailed" | "advanced"
) {
  const amb = new THREE.AmbientLight(0xffffff, 0.35);
  scene.add(amb);

  const hemi = new THREE.HemisphereLight(0xcfe6ff, 0x555555, 0.55);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.castShadow = shadowsOn;
  const cfg = shadowConfigFor(shadowTier);
  sun.shadow.mapSize.set(cfg.res, cfg.res);
  const SH_RAD = cfg.rad;
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

export function createSkyDome(scene: THREE.Scene): THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial> {
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
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false
  }));
  sky.renderOrder = -100;
  scene.add(sky);
  return sky;
}
