// Hollowpine Sim — catalogue projection (M2+ trees & blocks registry mirror).
// One source of truth: entries derive live data (no hand-maintained list drift).
// Importing this module is side-effect-free (no DOM/deps beyond game modules).

import { BLOCK_MAP, isItemOnly } from "../game/blocks";
import { PROFESSIONS } from "../game/villagers";
import { STYLES, HOUSE_DESIGN_META } from "../game/terrain/structures";

export type CatalogGroup = "trees" | "blocks" | "houses" | "features" | "mobs" | "villagers" | "entities" | "san_andreas";

export interface ParamsField {
  type: "number" | "select";
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ value: string; label: string }>;
  default: number | string;
}

export interface CatalogEntry {
  catalogId: string;
  group: CatalogGroup;
  label: string;
  params: Record<string, ParamsField>;
  blueprintFile?: string;
}

/** San Andreas / Grove Street catalogue */
export const SAN_ANDREAS_CATALOG: CatalogEntry[] = [
  {
    catalogId: "sa:cj_house",
    group: "san_andreas",
    label: "CJ's House (The Johnson House) — 2-Story Craftsman Residence",
    blueprintFile: "bp_cj_house_grove_st.json",
    params: {}
  },
  {
    catalogId: "sa:cj_garage",
    group: "san_andreas",
    label: "CJ's Attached Garage — 1-Car Rollup Door Concrete Garage",
    blueprintFile: "bp_cj_garage_grove_st.json",
    params: {}
  },
  {
    catalogId: "sa:sweets_house",
    group: "san_andreas",
    label: "Sweet's House — Single-Story Green Terracotta Ranch House",
    blueprintFile: "bp_sweets_house_grove_st.json",
    params: {}
  },
  {
    catalogId: "sa:fan_palm",
    group: "san_andreas",
    label: "California Fan Palm — Segmented Trunk & Drooping Fronds",
    blueprintFile: "bp_fan_palm_grove_st.json",
    params: {}
  },
  {
    catalogId: "sa:utility_pole",
    group: "san_andreas",
    label: "Wooden Utility Pole — Dual Crossarms & Power Transformer",
    blueprintFile: "bp_utility_pole_grove_st.json",
    params: {}
  },
  {
    catalogId: "sa:grove_culdesac",
    group: "san_andreas",
    label: "Grove Street Cul-de-Sac — Complete Neighborhood Scene Assembly",
    params: {}
  }
];

/**
 * Tree catalogue — every tree type in the game + its parameterised variations.
 * Cross-checked against trees.ts exports (drift-guarded in sim:test).
 */
export const TREE_CATALOG: CatalogEntry[] = [
  { catalogId: "tree.oak.classic", group: "trees", label: "Green Oak — classic (layered canopy)", params: { height: { type: "number", min: 4, max: 16, step: 1, default: 9 }, layers: { type: "number", min: 1, max: 5, step: 1, default: 4 } } },
  { catalogId: "tree.oak.giant", group: "trees", label: "Green Oak — giant (boring h12 × l5)", params: { height: { type: "number", min: 8, max: 16, step: 1, default: 12 }, layers: { type: "number", min: 2, max: 5, step: 1, default: 5 } } },
  { catalogId: "tree.cherry", group: "trees", label: "Cherry Blossom", params: { height: { type: "number", min: 3, max: 8, step: 1, default: 5 } } },
  { catalogId: "tree.maple", group: "trees", label: "Crimson Maple", params: { height: { type: "number", min: 4, max: 10, step: 1, default: 7 } } },
  { catalogId: "tree.aspen", group: "trees", label: "Golden Aspen", params: { height: { type: "number", min: 4, max: 12, step: 1, default: 7 } } },
  { catalogId: "tree.warped", group: "trees", label: "Warped Tree", params: { height: { type: "number", min: 3, max: 8, step: 1, default: 5 } } },
  { catalogId: "tree.bamboo", group: "trees", label: "Bamboo Grove", params: { height: { type: "number", min: 4, max: 10, step: 1, default: 6 } } },
  { catalogId: "tree.redwood", group: "trees", label: "Redwood", params: { height: { type: "number", min: 10, max: 24, step: 1, default: 16 } } },
  { catalogId: "tree.dark_oak", group: "trees", label: "Dark Oak", params: { height: { type: "number", min: 4, max: 12, step: 1, default: 8 } } },
  { catalogId: "tree.mushroom.red", group: "trees", label: "Huge Mushroom — red", params: { height: { type: "number", min: 4, max: 12, step: 1, default: 7 } } },
  { catalogId: "tree.mushroom.brown", group: "trees", label: "Huge Mushroom — brown", params: { height: { type: "number", min: 4, max: 12, step: 1, default: 7 } } },
  { catalogId: "tree.birch", group: "trees", label: "Birch", params: { height: { type: "number", min: 4, max: 10, step: 1, default: 6 } } },
  { catalogId: "tree.mangrove", group: "trees", label: "Mangrove", params: { height: { type: "number", min: 4, max: 12, step: 1, default: 7 } } },
  { catalogId: "tree.acacia", group: "trees", label: "Acacia", params: { height: { type: "number", min: 4, max: 10, step: 1, default: 6 } } },
  { catalogId: "tree.palm", group: "trees", label: "Palm", params: { height: { type: "number", min: 4, max: 10, step: 1, default: 6 } } },
  { catalogId: "tree.meadow", group: "trees", label: "Meadow Tree", params: { height: { type: "number", min: 3, max: 8, step: 1, default: 5 } } },
  { catalogId: "tree.alpine", group: "trees", label: "Alpine Pine", params: { height: { type: "number", min: 5, max: 14, step: 1, default: 9 } } },
  { catalogId: "tree.jungle", group: "trees", label: "Jungle — canopy tier", params: { height: { type: "number", min: 4, max: 18, step: 1, default: 12 } } },
  { catalogId: "tree.jungle.emergent", group: "trees", label: "Jungle — emergent giant", params: { height: { type: "number", min: 10, max: 24, step: 1, default: 20 } } },
  { catalogId: "tree.spruce", group: "trees", label: "Spruce Pine", params: { height: { type: "number", min: 6, max: 17, step: 1, default: 10 }, snowy: { type: "select", options: [{ value: "0", label: "plain" }, { value: "1", label: "snowy" }], default: "0" } } }
];

/** Structures catalogue projected from STYLES */
export const HOUSE_CATALOG: CatalogEntry[] = STYLES.map((s) => ({
  catalogId: `house:${s.key}`,
  group: "houses",
  label: s.name,
  params: {
    width: { type: "number", min: s.wMin, max: s.wMax, step: 1, default: Math.min(s.wMax, s.wMin + 2) },
    side: { type: "select", options: [{ value: "S", label: "South (front)" }, { value: "N", label: "North" }, { value: "E", label: "East" }, { value: "W", label: "West" }], default: "S" }
  }
}));

/** Individually-spawnable researched village interiors (Phase 3). Fixed shell
 *  footprint per design; the bridge honors `side` and ignores `width`. */
export const VILLAGE_HOUSE_DESIGN_CATALOG: CatalogEntry[] = HOUSE_DESIGN_META.map((d) => ({
  catalogId: `house-design:${d.key}`,
  group: "houses",
  label: `🏠 ${d.label}`,
  params: {
    side: { type: "select", options: [{ value: "S", label: "South (front)" }, { value: "N", label: "North" }, { value: "E", label: "East" }, { value: "W", label: "West" }], default: "S" }
  }
}));

/** Features catalogue */
export const FEATURE_CATALOG: CatalogEntry[] = [
  { catalogId: "feature:well", group: "features", label: "Town Well", params: {} },
  { catalogId: "feature:lamp", group: "features", label: "Cobblestone Lamp Post", params: {} },
  { catalogId: "feature:garden", group: "features", label: "Village Crop Garden", params: {} },
  { catalogId: "feature:fountain", group: "features", label: "Stepped Plaza Fountain", params: {} },
  { catalogId: "feature:stilt", group: "features", label: "Stilt Lake House", params: {} },
  { catalogId: "feature:coral", group: "features", label: "Coral Reef", params: {} },
  { catalogId: "feature:kelp", group: "features", label: "Kelp Forest", params: {} },
  { catalogId: "feature:wreck", group: "features", label: "Sunken Shipwreck", params: {} }
];

/** Mobs catalogue */
export const MOB_CATALOG: CatalogEntry[] = [
  { catalogId: "mob:zombie", group: "mobs", label: "Zombie", params: { count: { type: "number", min: 1, max: 5, step: 1, default: 1 } } },
  { catalogId: "mob:creeper", group: "mobs", label: "Creeper", params: { count: { type: "number", min: 1, max: 5, step: 1, default: 1 } } },
  { catalogId: "mob:skeleton", group: "mobs", label: "Skeleton", params: { count: { type: "number", min: 1, max: 5, step: 1, default: 1 } } },
  { catalogId: "mob:spider", group: "mobs", label: "Spider", params: { count: { type: "number", min: 1, max: 5, step: 1, default: 1 } } },
  { catalogId: "mob:all", group: "mobs", label: "All Hostile Mobs (Line)", params: {} }
];

/** Villagers catalogue */
export const VILLAGER_CATALOG: CatalogEntry[] = PROFESSIONS.map((p, idx) => ({
  catalogId: `villager:${p.name.toLowerCase().replace(/\s+/g, "_")}`,
  group: "villagers",
  label: `${p.badge} ${p.name}`,
  params: {
    professionIdx: { type: "number", min: 0, max: PROFESSIONS.length - 1, step: 1, default: idx },
    skinIdx: { type: "select", options: [{ value: "0", label: "Fair" }, { value: "1", label: "Tan" }, { value: "2", label: "Bronze" }, { value: "3", label: "Ebony" }], default: "0" }
  }
}));

/** Entities catalogue */
export const ENTITY_CATALOG: CatalogEntry[] = [
  { catalogId: "entity:cow", group: "entities", label: "Cow", params: {} },
  { catalogId: "entity:sheep", group: "entities", label: "Sheep", params: {} },
  { catalogId: "entity:pig", group: "entities", label: "Pig", params: {} },
  { catalogId: "entity:chicken", group: "entities", label: "Chicken", params: {} },
  { catalogId: "entity:horse", group: "entities", label: "Horse", params: {} },
  { catalogId: "entity:dog", group: "entities", label: "Dog", params: {} },
  { catalogId: "entity:chest", group: "entities", label: "Articulated Chest", params: {} },
  { catalogId: "entity:boat", group: "entities", label: "Oak Boat", params: {} },
  { catalogId: "entity:painting", group: "entities", label: "Decorative Painting", params: {} }
];

/** Blocks catalogue = live projection (count is asserted by sim:test). */
export function blocksCatalogCount(): number {
  return BLOCK_MAP.size;
}

export function treeCatalogCount(): number {
  return TREE_CATALOG.length;
}

/** Tree pick list [catalogId, label] for the SimDeck selector. */
export function treePickList(): Array<[string, string]> {
  return TREE_CATALOG.map((t) => [t.catalogId, t.label]);
}

/** Block pick list as [id, label] for the SimDeck selector (live projection).
 *  Placeable voxel blocks only — items (tools/food/signs/bucket classes) are excluded
 *  because they have no voxel model in-world. */
export function blocksPickList(): Array<[number, string]> {
  const out: Array<[number, string]> = [];
  for (const [id, b] of BLOCK_MAP) {
    if (id > 0 && !isItemOnly(id)) out.push([id, `${id}: ${b.name}`]);
  }
  out.sort((a, b) => a[0] - b[0]);
  return out;
}

export function structurePickList(): Array<[string, string]> {
  return [
    ...HOUSE_CATALOG.map((h) => [h.catalogId, h.label] as [string, string]),
    ...VILLAGE_HOUSE_DESIGN_CATALOG.map((h) => [h.catalogId, h.label] as [string, string])
  ];
}

export function featurePickList(): Array<[string, string]> {
  return FEATURE_CATALOG.map((f) => [f.catalogId, f.label]);
}

export function mobPickList(): Array<[string, string]> {
  return MOB_CATALOG.map((m) => [m.catalogId, m.label]);
}

export function villagerPickList(): Array<[string, string]> {
  return VILLAGER_CATALOG.map((v) => [v.catalogId, v.label]);
}

export function entityPickList(): Array<[string, string]> {
  return ENTITY_CATALOG.map((e) => [e.catalogId, e.label]);
}

export function sanAndreasPickList(): Array<[string, string]> {
  return SAN_ANDREAS_CATALOG.map((s) => [s.catalogId, s.label]);
}

export function sanAndreasCatalogCount(): number {
  return SAN_ANDREAS_CATALOG.length;
}

/** Retrieve schema for a given catalogId */
export function paramsSchemaFor(catalogId: string): Record<string, ParamsField> {
  const all: CatalogEntry[] = [
    ...TREE_CATALOG,
    ...HOUSE_CATALOG,
    ...VILLAGE_HOUSE_DESIGN_CATALOG,
    ...FEATURE_CATALOG,
    ...MOB_CATALOG,
    ...VILLAGER_CATALOG,
    ...ENTITY_CATALOG,
    ...SAN_ANDREAS_CATALOG
  ];
  const hit = all.find((c) => c.catalogId === catalogId);
  return hit ? hit.params : {};
}
