// Hollowpine — Experience Points (wiki-model: orb tiers, level curve 0-30+).
// Pure math + pooled 3D orbs (Sprite pool with magnet behavior).

import * as THREE from "three";

/** TOTAL XP required to reach level `l` — wiki totals: diffs are 2L+7 (0-15), 5L-38 (16-30), 9L-158 (31+). */
export function xpForLevel(l: number): number {
  if (l <= 0) return 0;
  if (l <= 16) return l * l + 6 * l;                       // sum_{i=0}^{l-1} (2i+7) → L1=7 … L16=352
  if (l <= 31) {
    const n = l - 16, hi = l - 1;                          // diffs 16..l-1
    const sumL = ((16 + hi) * n) / 2;
    return 352 + 5 * sumL - 38 * n;                        // L30 = 1395
  }
  const n = l - 30, hi = l - 1;                            // diffs 30..l-1 (9L-158)
  const sumL = ((30 + hi) * n) / 2;
  return 1395 + 9 * sumL - 158 * n;                        // L31 = 1507 …
}

export function levelForXp(xp: number): { level: number; into: number; span: number } {
  let level = 0;
  while (xp >= xpForLevel(level + 1) && level < 400) level++;
  const floorXp = xpForLevel(level);
  return { level, into: xp - floorXp, span: Math.max(1, xpForLevel(level + 1) - floorXp) };
}

/** Splits an XP amount into wiki-standard orb tiers. */
export function splitOrbs(amount: number): number[] {
  const order = [2477, 1237, 617, 307, 149, 73, 37, 17, 7, 3, 1];
  const res: number[] = [];
  let remaining = amount;
  for (const v of order) {
    while (remaining >= v) {
      res.push(v);
      remaining -= v;
    }
  }
  if (remaining > 0) res.push(remaining);
  return res;
}

/** Standard XP gains (wiki tables). */
export const ORE_XP: Record<number, number> = {
  30: 1,     // coal ore: 0-2
  31: 1,     // iron ore: n/a (0.7 smelt) — hand=1
  32: 2,     // gold ore: n/a — hand=1, smelt=1
  33: 3,     // redstone ore: 1-5
  34: 3,     // lapis: 2-5
  35: 5,     // diamond: 3-7
  36: 5      // emerald: 3-7
};

export const SMELT_XP: Record<number, number> = {
  47: 1.0, 45: 1.0, 42: 1.0, // gold/emerald/diamond-ish (block ids in engine smelt map)
  6: 0.1,                     // cobblestone → stone
  10: 0.35                    // sand → glass (glass ~0.35)
};

const ORB_COLORS = [0x7dff4f, 0x61e83c, 0x9dff6a];

export interface XpSystem {
  readonly total: number;
  add: (amount: number, pos?: THREE.Vector3) => void;
  collectOrb: (amount: number) => void;
  spawnOrbs: (x: number, y: number, z: number, amount: number) => void;
  update: (dt: number, playerPos: THREE.Vector3) => number; // returns xp gained this frame
  orbs: THREE.Group;
}

export function createXpSystem(scene: THREE.Scene): XpSystem {
  const group = new THREE.Group();
  scene.add(group);

  const POOL = 28;
  const sprites: THREE.Sprite[] = [];
  const values: number[] = [];
  const lives: number[] = [];
  const slot: THREE.SpriteMaterial[] = [];

  const tex = (() => {
    const cv = document.createElement("canvas");
    cv.width = 16; cv.height = 16;
    const ctx = cv.getContext("2d")!;
    const g = ctx.createRadialGradient(8, 8, 1, 8, 8, 8);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.35, "#c8ff9a");
    g.addColorStop(0.7, "#61e83c");
    g.addColorStop(1, "rgba(70,200,60,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 16);
    const t = new THREE.CanvasTexture(cv);
    return t;
  })();

  for (let i = 0; i < POOL; i++) {
    const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, color: ORB_COLORS[i % 3] });
    const sp = new THREE.Sprite(m);
    sp.scale.set(0.34, 0.34, 1);
    sp.visible = false;
    group.add(sp);
    sprites.push(sp); values.push(0); lives.push(-1); slot.push(m);
  }
  let cursor = 0;
  let total = 0;

  const spawnOrbs = (x: number, y: number, z: number, amount: number) => {
    // wiki split: highest orb values first (1,3,7,17,37,73,149,307,617,1237,2477)
    const order = [2477, 1237, 617, 307, 149, 73, 37, 17, 7, 3, 1];
    for (const v of order) {
      while (amount >= v) {
        const idx = cursor = (cursor + 1) % POOL;
        const sp = sprites[idx];
        sp.visible = true;
        sp.position.set(x + (Math.random() - 0.5) * 0.5, y + 0.4 + Math.random() * 0.3, z + (Math.random() - 0.5) * 0.5);
        values[idx] = v;
        lives[idx] = 9;
        sp.scale.set(0.2 + v / 60 + 0.1, 0.2 + v / 60 + 0.1, 1);
        amount -= v;
      }
    }
    if (amount > 0) {
      const idx = cursor = (cursor + 1) % POOL;
      const sp = sprites[idx];
      sp.visible = true;
      sp.position.set(x + 0.5, y + 0.6, z + 0.5);
      values[idx] = amount;
      lives[idx] = 9;
    }
  };

  let gained = 0;
  const tmp = new THREE.Vector3();

  function update(dt: number, playerPos: THREE.Vector3): number {
    gained = 0;
    for (let i = 0; i < POOL; i++) {
      if (lives[i] < 0) continue;
      // magnet: accelerate toward player within 24m, fast within 3m
      tmp.set(playerPos.x - sprites[i].position.x, playerPos.y + 0.6 - sprites[i].position.y, playerPos.z - sprites[i].position.z);
      const d = tmp.length();
      if (d > 30) { lives[i] = -1; sprites[i].visible = false; continue; }
      lives[i] -= dt;
      const t = Math.min(1, dt * (d < 3 ? 7 : 2.2)) / Math.max(d, 0.05);
      sprites[i].position.addScaledVector(tmp, t);
      if (d < 0.6) {
        total += values[i];

        gained += values[i];
        lives[i] = -1;
        sprites[i].visible = false;
        continue;
      }
      if (lives[i] <= 0) { lives[i] = -1; sprites[i].visible = false; }
      const k = Math.min(1, lives[i] / 3);
      slot[i].opacity = k;
    }
    return gained;
  }

  const add = (amount: number, pos?: THREE.Vector3) => {
    if (!pos) { total += amount; }
    else spawnOrbs(pos.x, pos.y, pos.z, amount);
  };
  const collectOrb = (amount: number) => { total += amount; };

  return {
    get total() { return total; },
    add, collectOrb, spawnOrbs, update, orbs: group
  };
}
