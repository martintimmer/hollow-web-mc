/**
 * @file src/sim/assetSideloader.ts
 * Runtime Asset Sideloader Engine & Bridge for Blueprints, Semantic Specs, and City Packs.
 */

import { BLOCK_MAP, BLOCKS } from "../game/blocks";
import {
  type BlueprintDoc,
  validateBlueprintDoc
} from "./blueprintScanner";
import type {
  SemanticAssetSpec,
  CityPackage
} from "../../catalog/ai/asset-spec";

/** Quick block name -> ID lookup cache */
const BLOCK_NAME_TO_ID = new Map<string, number>();
for (const b of BLOCKS) {
  const clean = b.name.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  if (!BLOCK_NAME_TO_ID.has(clean)) {
    BLOCK_NAME_TO_ID.set(clean, b.id);
  }
}

// Aliases for common architectural terms
const ROLE_ALIASES: Record<string, number> = {
  cobblestone: 6,
  stone_bricks: 8,
  stone: 5,
  oak_log: 16,
  spruce_log: 21,
  birch_log: 23,
  dark_oak_log: 25,
  oak_planks: 17,
  spruce_planks: 19,
  birch_planks: 20,
  dark_oak_planks: 22,
  glass_pane: 377,
  glass: 37,
  oak_door: 105,
  iron_door: 107,
  lantern: 46,
  torch: 47,
  oak_stairs: 70,
  spruce_stairs: 77,
  stone_brick_stairs: 72,
  stone_brick_slab: 1188,
  cobblestone_slab: 1186,
  stone_slab: 1185,
  oak_fence: 1174,
  quartz_block: 569,
  green_terracotta: 400,
  gray_concrete: 389,
  smooth_stone_slab: 626,
  bricks: 59,
  sandstone: 61
};

/**
 * Resolves a material string name or numeric ID into a valid catalog Block ID.
 */
export function resolveBlockId(identifier: string | number | undefined, defaultId = 1): number {
  if (typeof identifier === "number" && identifier > 0) {
    return BLOCK_MAP.has(identifier) ? identifier : defaultId;
  }
  if (typeof identifier === "string") {
    const raw = identifier.trim().toLowerCase();
    const num = Number.parseInt(raw, 10);
    if (!Number.isNaN(num) && BLOCK_MAP.has(num)) return num;

    const clean = raw.replace(/[^a-z0-9]+/g, "_");
    if (ROLE_ALIASES[clean] && BLOCK_MAP.has(ROLE_ALIASES[clean])) {
      return ROLE_ALIASES[clean];
    }
    if (BLOCK_NAME_TO_ID.has(clean)) {
      return BLOCK_NAME_TO_ID.get(clean)!;
    }
  }
  return defaultId;
}

export interface LintReport {
  valid: boolean;
  errors: string[];
  warnings: string[];
  blockCount: number;
  dimensions: { width: number; height: number; depth: number };
  materialsCount: Record<string, number>;
}

/**
 * Performs architectural and physical integrity linting on a Blueprint.
 */
export function lintBlueprint(doc: BlueprintDoc): LintReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const materialsCount: Record<string, number> = {};

  if (!validateBlueprintDoc(doc)) {
    errors.push("Invalid BlueprintDoc schema (missing required fields or version).");
    return {
      valid: false,
      errors,
      warnings,
      blockCount: 0,
      dimensions: { width: 0, height: 0, depth: 0 },
      materialsCount: {}
    };
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  let hasLight = false;
  let hasDoor = false;

  const voxelSet = new Set<string>();

  for (const b of doc.blocks) {
    if (typeof b.dx !== "number" || typeof b.dy !== "number" || typeof b.dz !== "number") {
      errors.push(`Invalid voxel coordinates: (${b.dx}, ${b.dy}, ${b.dz})`);
      continue;
    }

    minX = Math.min(minX, b.dx);
    maxX = Math.max(maxX, b.dx);
    minY = Math.min(minY, b.dy);
    maxY = Math.max(maxY, b.dy);
    minZ = Math.min(minZ, b.dz);
    maxZ = Math.max(maxZ, b.dz);

    const bDef = BLOCK_MAP.get(b.id);
    if (!bDef) {
      errors.push(`Unknown block ID #${b.id} at (${b.dx}, ${b.dy}, ${b.dz})`);
      continue;
    }

    if (b.id === 0) {
      warnings.push(`Air block (#0) included at (${b.dx}, ${b.dy}, ${b.dz}) - will be pruned.`);
    }

    if (bDef.glow || (bDef as { light?: number }).light || b.id === 50 || b.id === 535) {
      hasLight = true;
    }
    if (bDef.name.toLowerCase().includes("door") || b.id === 503 || b.id === 504) {
      hasDoor = true;
    }

    const key = `${b.dx},${b.dy},${b.dz}`;
    if (voxelSet.has(key)) {
      warnings.push(`Duplicate block at (${b.dx}, ${b.dy}, ${b.dz})`);
    }
    voxelSet.add(key);

    const label = `${bDef.name} (#${b.id})`;
    materialsCount[label] = (materialsCount[label] || 0) + 1;
  }

  const width = maxX >= minX ? maxX - minX + 1 : 0;
  const height = maxY >= minY ? maxY - minY + 1 : 0;
  const depth = maxZ >= minZ ? maxZ - minZ + 1 : 0;

  if (doc.category === "house" || doc.category === "castle") {
    if (!hasLight) warnings.push("Structure contains no light sources (torches/lanterns).");
    if (!hasDoor) warnings.push("Enclosed building structure contains no door.");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    blockCount: doc.blocks.length,
    dimensions: { width, height, depth },
    materialsCount
  };
}

/**
 * In-memory Sideloaded Asset Registry.
 */
class AssetSideloaderRegistry {
  private blueprints = new Map<string, BlueprintDoc>();
  private semanticSpecs = new Map<string, SemanticAssetSpec>();
  private cityPacks = new Map<string, CityPackage>();

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage(): void {
    if (typeof localStorage === "undefined") return;
    try {
      const rawBp = localStorage.getItem("hp_sideloaded_blueprints");
      if (rawBp) {
        const arr = JSON.parse(rawBp);
        if (Array.isArray(arr)) {
          for (const bp of arr) {
            if (validateBlueprintDoc(bp)) this.blueprints.set(bp.id, bp);
          }
        }
      }
    } catch {
      // ignore
    }
  }

  private saveToLocalStorage(): void {
    if (typeof localStorage === "undefined") return;
    try {
      const arr = Array.from(this.blueprints.values());
      localStorage.setItem("hp_sideloaded_blueprints", JSON.stringify(arr));
    } catch {
      // ignore
    }
  }

  public registerBlueprint(doc: BlueprintDoc): LintReport {
    const report = lintBlueprint(doc);
    if (report.valid) {
      this.blueprints.set(doc.id, doc);
      this.saveToLocalStorage();
    }
    return report;
  }

  public getBlueprint(id: string): BlueprintDoc | undefined {
    return this.blueprints.get(id);
  }

  public listBlueprints(): BlueprintDoc[] {
    return Array.from(this.blueprints.values());
  }

  public removeBlueprint(id: string): boolean {
    const res = this.blueprints.delete(id);
    if (res) this.saveToLocalStorage();
    return res;
  }

  public registerSemanticSpec(spec: SemanticAssetSpec): void {
    this.semanticSpecs.set(spec.id, spec);
  }

  public getSemanticSpec(id: string): SemanticAssetSpec | undefined {
    return this.semanticSpecs.get(id);
  }

  public registerCityPack(pack: CityPackage): void {
    this.cityPacks.set(pack.id, pack);
  }

  public getCityPack(id: string): CityPackage | undefined {
    return this.cityPacks.get(id);
  }
}

export const assetSideloader = new AssetSideloaderRegistry();
