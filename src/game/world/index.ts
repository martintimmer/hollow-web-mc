/* World constants, world-type presets & chunk shape (extracted from Game.tsx — R1.3) */
import type { Mesh } from "three";

// Voxel world dimensions
export const CH = 16, CHH = 128;
export const GROUND = 64, SEA = 62, SNOWLINE = 95;

// Player physics tuning (vanilla Java Minecraft values)
export const PR = 0.3, PH = 1.8, EYE = 1.62;
export const WALK = 4.317, SPRINT = 5.612, FLY = 10.9, GRAV = 32, JUMP = 8.4;

export interface WorldType {
  label: string;
  scale: number;
  hill: number;
  mtn: number;
  temp: number;
  island: number;
}

export const TYPES: Record<string, WorldType> = {
  standard: { label: "Standard", scale: 1, hill: 1, mtn: 1, temp: 0, island: 0 }
};

export interface Chunk {
  data: Uint16Array;
  cx: number;
  cz: number;
  maxY: number;
  meshes: Mesh[] | null;
  emitterKeys?: string[];
  /** Per-voxel stair facing (facing+1, 0 = no stair facing) indexed by y*256 + lz*16 + lx. */
  dirs?: Uint16Array;
  /** Bumped on every buildMesh request — used to drop stale async worker results. */
  version?: number;
  /** Primary biome ID of this chunk (sampled at chunk center) */
  biomeId?: string;
}
