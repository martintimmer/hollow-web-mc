import * as THREE from "three";
import type { GameState } from "../state/gameState";
import { makePrimedTntShell, makeBlastFx } from "../visuals";
import { getBlock, getChunk } from "../world/chunkData";
import { calculateCraterBlocks } from "./regionMutations";
import type { BlockEditDelta } from "./regionMutations";

export function primeTnt(
  s: GameState,
  x: number,
  y: number,
  z: number,
  fuse = 1.8,
  callbacks: {
    edit: (x: number, y: number, z: number, id: number) => void;
    playIgnite: () => void;
    showToast?: (m: string) => void;
  }
): void {
  if (s.tnts.some(t => t.x === x && t.y === y && t.z === z)) return;
  if (getBlock(s, x, y, z) === 45) callbacks.edit(x, y, z, 0);
  callbacks.playIgnite();

  const mesh = makePrimedTntShell();
  mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
  s.scene?.add(mesh);
  s.tnts.push({ x, y, z, mesh, born: performance.now(), fuse });
  if (fuse >= 1) callbacks.showToast?.("💥 TNT primed! Stand back…");
}

export function explode(
  s: GameState,
  cx: number,
  cy: number,
  cz: number,
  callbacks: {
    primeTnt: (x: number, y: number, z: number, fuse: number) => void;
    dryUpFluids: (x: number, y: number, z: number, id: number) => void;
    buildMesh: (cx: number, cz: number) => void;
    damagePlayer: (rawAmount: number) => void;
    playExplode: () => void;
    onBatchEdit?: (batch: BlockEditDelta[]) => void;
  },
  R = 4
): void {
  const { batch, tntChain, dirtyChunks } = calculateCraterBlocks(s, cx, cy, cz, R);

  // Trigger chain reactions
  for (const tnt of tntChain) {
    callbacks.primeTnt(tnt.x, tnt.y, tnt.z, 0.25 + Math.random() * 0.55);
  }

  // Dry up fluids for water/lava blocks
  for (const b of batch) {
    if (b.prevBlockId === 39 || b.prevBlockId === 40) {
      callbacks.dryUpFluids(b.x, b.y, b.z, b.prevBlockId);
    }
  }

  // Batched remeshing
  dirtyChunks.forEach(k => {
    const [ccx, ccz] = k.split(",").map(Number);
    if (getChunk(s, ccx, ccz)) callbacks.buildMesh(ccx, ccz);
  });

  // Release trapped liquids
  for (const bEd of batch) {
    const dirs = [[0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
    for (const [dx, dy, dz] of dirs) {
      const adj = getBlock(s, bEd.x + dx, bEd.y + dy, bEd.z + dz);
      if (adj === 39 || adj === 40) {
        s.liquidQ.push([bEd.x + dx, bEd.y + dy, bEd.z + dz, adj, 0]);
      }
    }
  }

  callbacks.onBatchEdit?.(batch);

  // Visual blast sphere + point light
  callbacks.playExplode();
  if (s.scene) {
    const { mesh: boom, light } = makeBlastFx(R * 5);
    boom.position.set(cx + 0.5, cy + 0.5, cz + 0.5);
    s.scene.add(boom);
    light.position.copy(boom.position);
    s.scene.add(light);
    s.explosions.push({ mesh: boom, light, born: performance.now() });
  }

  s.shakeT = Math.max(s.shakeT, 0.45);

  // Player damage & knockback
  if (!s.creative && !s.dead) {
    const d = Math.hypot(s.player.x - (cx + 0.5), (s.player.y + 0.9) - (cy + 0.5), s.player.z - (cz + 0.5));
    const power = Math.max(0, 1 - d / (R + 2.5));
    const dmg = Math.round(power * power * 24);
    if (dmg > 0) callbacks.damagePlayer(dmg);
    if (d > 0.01 && d < R * 2.2) {
      const kb = (1 - d / (R * 2.2)) * 14;
      s.player.vx += ((s.player.x - (cx + 0.5)) / d) * kb;
      s.player.vz += ((s.player.z - (cz + 0.5)) / d) * kb;
      s.player.vy += Math.min(9, kb * 0.6);
      s.player.ground = false;
      s.fallPeakY = Math.max(s.fallPeakY, s.player.y);
    }
  }
}

export function processTnt(
  s: GameState,
  now: number,
  _dt: number,
  callbacks: {
    explode: (x: number, y: number, z: number) => void;
  }
): void {
  for (let i = s.tnts.length - 1; i >= 0; i--) {
    const t = s.tnts[i];
    const elapsed = (now - t.born) / 1000;
    if (elapsed >= t.fuse) {
      s.scene?.remove(t.mesh);
      t.mesh.geometry.dispose();
      (t.mesh.material as THREE.Material).dispose();
      s.tnts.splice(i, 1);
      callbacks.explode(t.x, t.y, t.z);
      continue;
    }
    const blink = Math.sin((elapsed / t.fuse) * Math.PI * (8 + elapsed * 10)) > 0;
    (t.mesh.material as THREE.MeshBasicMaterial).color.setHex(blink ? 0xffffff : 0xdd3311);
    t.mesh.scale.setScalar(1.02 + Math.sin((elapsed / t.fuse) * Math.PI) * 0.08);
  }

  for (let i = s.explosions.length - 1; i >= 0; i--) {
    const fx = s.explosions[i];
    const age = (now - fx.born) / 1000;
    const life = 0.5;
    if (age >= life) {
      s.scene?.remove(fx.mesh);
      if (fx.light) s.scene?.remove(fx.light);
      fx.mesh.geometry.dispose();
      (fx.mesh.material as THREE.Material).dispose();
      s.explosions.splice(i, 1);
      continue;
    }
    const p = age / life;
    fx.mesh.scale.setScalar(0.4 + p * 4.4);
    (fx.mesh.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - p);
    if (fx.light) fx.light.intensity = 60 * (1 - p);
  }
}
