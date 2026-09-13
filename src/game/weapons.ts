import type { BlockDef } from "./blocks";

export type WeaponKind = "sword" | "axe" | "pickaxe" | "shovel" | "hoe";

export interface WeaponInfo {
  kind: WeaponKind;
  material: string;
  damage: number;
  speed: number;
}

interface TierStats {
  damage: Record<WeaponKind, number>;
  speed: Record<WeaponKind, number>;
}

const STATS: Record<string, TierStats> = {
  wooden: {
    damage: { sword: 4, axe: 7, pickaxe: 2, shovel: 2.5, hoe: 1 },
    speed: { sword: 1.6, axe: 0.8, pickaxe: 1.2, shovel: 1, hoe: 1 }
  },
  golden: {
    damage: { sword: 5, axe: 7, pickaxe: 2, shovel: 2.5, hoe: 1 },
    speed: { sword: 1.6, axe: 1, pickaxe: 1.2, shovel: 1, hoe: 1 }
  },
  stone: {
    damage: { sword: 5, axe: 9, pickaxe: 3, shovel: 3.5, hoe: 1 },
    speed: { sword: 1.6, axe: 0.8, pickaxe: 1.2, shovel: 1, hoe: 2 }
  },
  iron: {
    damage: { sword: 6, axe: 9, pickaxe: 4, shovel: 4.5, hoe: 1 },
    speed: { sword: 1.6, axe: 0.9, pickaxe: 1.2, shovel: 1, hoe: 3 }
  },
  diamond: {
    damage: { sword: 7, axe: 9, pickaxe: 5, shovel: 5.5, hoe: 1 },
    speed: { sword: 1.6, axe: 1, pickaxe: 1.2, shovel: 1, hoe: 4 }
  },
  netherite: {
    damage: { sword: 8, axe: 10, pickaxe: 6, shovel: 6.5, hoe: 1 },
    speed: { sword: 1.6, axe: 1, pickaxe: 1.2, shovel: 1, hoe: 4 }
  }
};

const FIST_COOLDOWN_MS = 400;

export function getWeaponInfo(def: Pick<BlockDef, "name"> | null | undefined): WeaponInfo | null {
  const m = /^(wooden|golden|stone|iron|diamond|netherite)\s+(sword|axe|pickaxe|shovel|hoe)s?$/i.exec((def?.name || "").trim());
  if (!m) return null;
  const material = m[1].toLowerCase();
  const kind = m[2].toLowerCase() as WeaponKind;
  const tier = STATS[material];
  if (!tier) return null;
  return { kind, material, damage: tier.damage[kind], speed: tier.speed[kind] };
}

export function isWeapon(def: Pick<BlockDef, "name"> | null | undefined): boolean {
  return getWeaponInfo(def) !== null;
}

export function meleeCooldownMs(info: WeaponInfo | null): number {
  if (!info || info.speed <= 0) return FIST_COOLDOWN_MS;
  return Math.round(1000 / info.speed);
}

export function meleeDamage(heldId: number, getDef: (id: number) => Pick<BlockDef, "name"> | undefined, creative: boolean): number {
  if (creative) return 999;
  if (!heldId) return 1;
  return getWeaponInfo(getDef(heldId))?.damage ?? 1;
}

export interface MobLootDrop {
  id: number;
  min: number;
  max: number;
}

export interface MobLoot {
  xp: number;
  drops: MobLootDrop[];
}

export const MOB_LOOT: Record<string, MobLoot> = {
  zombie: { xp: 5, drops: [{ id: 1108, min: 0, max: 2 }] },
  skeleton: { xp: 5, drops: [{ id: 727, min: 0, max: 2 }, { id: 1170, min: 0, max: 2 }] },
  spider: { xp: 5, drops: [{ id: 1135, min: 0, max: 2 }] },
  creeper: { xp: 5, drops: [{ id: 941, min: 0, max: 2 }] },
  pigman: { xp: 5, drops: [{ id: 926, min: 0, max: 1 }, { id: 1108, min: 0, max: 1 }] },
  ghast: { xp: 5, drops: [{ id: 918, min: 0, max: 1 }, { id: 941, min: 0, max: 2 }] }
};

export function rollMobDrops(type: string, rand: () => number = Math.random): Array<{ id: number; count: number }> {
  const loot = MOB_LOOT[type];
  if (!loot) return [];
  const out: Array<{ id: number; count: number }> = [];
  for (const d of loot.drops) {
    const count = d.min + Math.floor(rand() * (d.max - d.min + 1));
    if (count > 0) out.push({ id: d.id, count });
  }
  return out;
}
