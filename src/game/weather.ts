// Hollowpine Dynamic Weather System
// Instanced precipitation (rain/snow) around the player. Fall runs fully in
// the vertex shader (uTime + per-instance hash speed): per frame the CPU only
// writes uniforms + mesh position, so no matrix recomputation or buffer upload.
import * as THREE from "three";

const RAIN_COUNT = 300;
const FALL_HEIGHT = 22;

export interface WeatherSystem {
  mesh: THREE.InstancedMesh;
  update: (
    dt: number,
    playerX: number,
    playerY: number,
    playerZ: number,
    weather: "clear" | "rain" | "snow" | "thunder",
    isColdBiome: boolean,
    underCover?: boolean
  ) => void;
  destroy: () => void;
}

export function createWeatherSystem(scene: THREE.Scene): WeatherSystem {
  const geom = new THREE.CylinderGeometry(0.015, 0.015, 0.65, 4);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x99ccff,
    transparent: true,
    opacity: 0,
    depthWrite: false
  });
  const uniforms = {
    uTime: { value: 0 },
    uFall: { value: 1 },
  };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.uniforms.uFall = uniforms.uFall;
    sh.vertexShader = "uniform float uTime;\nuniform float uFall;\n" + sh.vertexShader.replace(
      "#include <project_vertex>",
      [
        "vec4 mvPosition = vec4( transformed, 1.0 );",
        "#ifdef USE_INSTANCING",
        "  mvPosition = instanceMatrix * mvPosition;",
        "  float ridx = float(gl_InstanceID);",
        "  float spd = 17.0 * uFall;",
        "  float cyc = mod(mvPosition.y - uTime * spd + 2.0, " + FALL_HEIGHT.toFixed(1) + ");",
        "  mvPosition.y += (cyc - 2.0) - mvPosition.y;",
        "  mvPosition.x += sin(uTime * 0.7 + ridx * 1.7) * 0.6;",
        "  mvPosition.z += cos(uTime * 0.6 + ridx * 2.3) * 0.6;",
        "#endif",
        "mvPosition = modelViewMatrix * mvPosition;",
        "gl_Position = projectionMatrix * mvPosition;",
      ].join("\n")
    );
  };

  const mesh = new THREE.InstancedMesh(geom, mat, RAIN_COUNT);
  mesh.frustumCulled = false;
  mesh.visible = false;
  scene.add(mesh);

  const dummy = new THREE.Object3D();
  let snowy = false;

  function layout(snow: boolean) {
    snowy = snow;
    for (let i = 0; i < RAIN_COUNT; i++) {
      dummy.position.set(
        (Math.random() - 0.5) * 28,
        Math.random() * 20 - 2,
        (Math.random() - 0.5) * 28
      );
      if (snow) dummy.scale.set(1.5, 0.25, 1.5);
      else dummy.scale.set(1.0, 1.0, 1.0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  layout(false);

  function update(
    dt: number,
    px: number,
    py: number,
    pz: number,
    weather: "clear" | "rain" | "snow" | "thunder",
    isColdBiome: boolean,
    underCover = false
  ) {
    const active = weather !== "clear";
    const wantSnow = active && (isColdBiome || weather === "snow");
    if (wantSnow !== snowy) layout(wantSnow);
    uniforms.uTime.value += dt;
    uniforms.uFall.value = wantSnow ? 0.25 : 0.45;

    const targetOp = !active || underCover ? 0 : wantSnow ? 0.85 : 0.55;
    const op = mat.opacity + Math.max(-dt * 1.5, Math.min(dt * 1.5, targetOp - mat.opacity));
    mat.opacity = op;
    if (op < 0.02) {
      if (mesh.visible) mesh.visible = false;
      return;
    }
    mesh.visible = true;
    mesh.position.set(px, py, pz);
    mat.color.setHex(wantSnow ? 0xffffff : (weather === "thunder" ? 0x7799bb : 0xaad4f5));
  }

  function destroy() {
    scene.remove(mesh);
    geom.dispose();
    mat.dispose();
  }

  return { mesh, update, destroy };
}
