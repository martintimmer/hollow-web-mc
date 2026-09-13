import { CH, CHH } from ".";
import type { Chunk } from ".";
import { BLOCK_MAP, isSolid, isOpaque } from "../blocks";
import type { GameState } from "../state/gameState";

export const ckey = (cx: number, cz: number): string => `${cx},${cz}`;

export const coordKey = (x: number, y: number, z: number): string => `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;

export function getChunk(s: GameState, cx: number, cz: number): Chunk | undefined {
  return s.chunks.get(ckey(cx, cz));
}

export function getBlock(s: GameState, x: number, y: number, z: number): number {
  x = Math.floor(x);
  y = Math.floor(y);
  z = Math.floor(z);
  if (y < 0) return 5; // Stone bedrock base
  if (y >= CHH) return 0; // Air
  const c = s.chunks.get(ckey(x >> 4, z >> 4));
  return c ? c.data[y * 256 + (z & 15) * 16 + (x & 15)] : 0;
}

export function setRaw(s: GameState, x: number, y: number, z: number, id: number): void {
  x = Math.floor(x);
  y = Math.floor(y);
  z = Math.floor(z);
  if (y < 0 || y >= CHH) return;
  const c = s.chunks.get(ckey(x >> 4, z >> 4));
  if (!c) return;
  c.data[y * 256 + (z & 15) * 16 + (x & 15)] = id;
  if (id && y > c.maxY) c.maxY = y;
}

export function setBlock(s: GameState, x: number, y: number, z: number, id: number): void {
  setRaw(s, x, y, z, id);
  const k = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
  s.edits.set(k, id);
  if (s.editsByChunk) {
    const cx = Math.floor(x / CH), cz = Math.floor(z / CH);
    const ck = `${cx},${cz}`;
    let cm = s.editsByChunk.get(ck);
    if (!cm) { cm = new Map(); s.editsByChunk.set(ck, cm); }
    cm.set(k, id);
  }
  registerEmitter(s, x, y, z, id);
}

export function isSolidAt(s: GameState, x: number, y: number, z: number): boolean {
  const b = getBlock(s, x, y, z);
  return isSolid(b);
}

export function isOpaqueAt(s: GameState, x: number, y: number, z: number): boolean {
  const b = getBlock(s, x, y, z);
  return isOpaque(b);
}

export function isPassableAt(s: GameState, x: number, y: number, z: number): boolean {
  const b = getBlock(s, x, y, z);
  return b === 0 || (!isSolid(b) && b !== 39 && b !== 40);
}

export function isSafeSpawn(s: GameState, x: number, y: number, z: number): boolean {
  const foot = getBlock(s, x, y, z);
  const head = getBlock(s, x, y + 1, z);
  const under = getBlock(s, x, y - 1, z);
  const footSolid = isSolid(foot);
  const headSolid = isSolid(head);
  const underSolid = isSolid(under);
  return underSolid && !footSolid && !headSolid && under !== 39 && under !== 40;
}

export function registerEmitter(s: GameState, x: number, y: number, z: number, id: number): void {
  const k = `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
  const b = BLOCK_MAP.get(id);
  if (b && (b.glow || b.lightPower || (b as { light?: number }).light)) {
    s.emitters.set(k, {
      x: Math.floor(x) + 0.5,
      y: Math.floor(y) + 0.5,
      z: Math.floor(z) + 0.5,
      col: b.lightCol || 0xffd489,
      dist: b.lightDist || 16,
      power: b.lightPower || 1.2,
      id
    });
    s.lanterns.set(k, [Math.floor(x) + 0.5, Math.floor(y) + 0.5, Math.floor(z) + 0.5]);
    const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
    const c = getChunk(s, cx, cz);
    if (c) {
      if (!c.emitterKeys) c.emitterKeys = [];
      c.emitterKeys.push(k);
    }
  } else {
    s.emitters.delete(k);
    s.lanterns.delete(k);
  }
}
