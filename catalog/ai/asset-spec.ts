/**
 * @file catalog/ai/asset-spec.ts
 * Unified Semantic Asset Specifications for AI Generation, Procedural Assembly, and Sideloading.
 */

import type { BlueprintDoc, BlueprintBlock } from "../../src/sim/blueprintScanner";

export type ArchitecturalStyle =
  | "medieval_timber"
  | "nordic_taiga"
  | "gothic_stone"
  | "desert_sandstone"
  | "japanese_pagoda"
  | "modern_villa"
  | "rustic_cottage"
  | "steampunk_forge"
  | "coastal_stilt";

export type FootprintShape =
  | "rectangle"
  | "l_shape"
  | "t_shape"
  | "cross"
  | "tower"
  | "circle";

export type RoofStyle =
  | "gable"
  | "hipped"
  | "mansard"
  | "flat"
  | "pyramid"
  | "gambrel";

export interface PaletteRoles {
  /** Bottom foundation, slope trim, base steps (e.g. cobblestone, stone_bricks) */
  foundation: string | number;
  /** Vertical corner pillars, floor ceiling beams (e.g. oak_log, spruce_log) */
  frame: string | number;
  /** Wall infill panels (e.g. oak_planks, white_terracotta, bricks) */
  walls: string | number;
  /** Primary roof slopes (e.g. dark_oak_stairs, cobblestone_stairs) */
  roof: string | number;
  /** Roof ridge / trim / overhang slabs (e.g. stone_brick_slab, dark_oak_slab) */
  roofTrim?: string | number;
  /** Interior flooring (e.g. birch_planks, spruce_planks) */
  floor?: string | number;
  /** Door block (e.g. oak_door, iron_door) */
  doors?: string | number;
  /** Windows / skylights / vehicle glass (e.g. glass_pane, tinted_glass) */
  windows?: string | number;
  /** Light emitters / vehicle headlights (e.g. lantern, sea_lantern, glowstone) */
  lights?: string | number;
  /** Decorative accents (e.g. flower_pot, fence, leaves, coral) */
  accent?: string | number;
  /** Vehicle tires (e.g. black_concrete, coal_block, obsidian) */
  tires?: string | number;
  /** Vehicle metal mechanics / bumpers / grill (e.g. iron_block, iron_bars, anvil) */
  metal?: string | number;
  /** Vehicle body paint concrete (e.g. red_concrete, blue_concrete, light_gray_concrete) */
  paint?: string | number;
  /** Vehicle taillights (e.g. redstone_block, red_concrete, red wool) */
  tail?: string | number;
  /** Vehicle trim slabs / chrome accents (e.g. quartz_slab, smooth_stone_slab, stone_brick_slab) */
  trim?: string | number;
}

export interface SemanticPart {
  kind: "box" | "roof" | "door" | "window" | "pillar" | "porch" | "chimney" | "stairs" | "interior";
  x0?: number;
  y0?: number;
  z0?: number;
  x1?: number;
  y1?: number;
  z1?: number;
  style?: string;
  blockId?: number | string;
  role?: keyof PaletteRoles;
  overhang?: number;
  count?: number;
  facing?: number;
}

export interface SemanticAssetSpec {
  version: 1;
  id: string;
  name: string;
  category: "house" | "tower" | "castle" | "farm" | "bridge" | "shrine" | "object" | "foliage" | "misc";
  style: ArchitecturalStyle;
  biomeAffinity: string[];
  dimensions: {
    width: number;
    height: number;
    depth: number;
    stories?: number;
  };
  footprint: {
    shape: FootprintShape;
    mainWidth: number;
    mainDepth: number;
    wingWidth?: number;
    wingDepth?: number;
    wingSide?: "left" | "right" | "front" | "back";
  };
  roof: {
    style: RoofStyle;
    pitch: number; // 0.5 to 1.5
    overhang: number; // 1 or 2 blocks
    dormers?: number;
  };
  features: {
    porch?: boolean;
    balcony?: boolean;
    chimney?: "left" | "right" | "back" | "none";
    cellarEntrance?: boolean;
    lanterns?: boolean;
    fences?: boolean;
  };
  /** Set for vehicles/props built by the vehicle assembler (category "object"). */
  vehicleType?: "pickup" | "sedan" | "van" | "truck" | "semi" | "bus" | "suv";
  palette: PaletteRoles;
  parts?: SemanticPart[];
  resolvedBlocks?: BlueprintBlock[];
  sourcePhotos?: string[];
  createdAt: string;
}

export interface SceneObjectPlacement {
  objectId: string;
  assetId?: string;
  x: number;
  y: number;
  z: number;
  rotation: 0 | 1 | 2 | 3; // 90-degree steps
  role?: "hero" | "outbuilding" | "fixture" | "vegetation";
}

export interface SceneSpec {
  version: 1;
  id: string;
  name: string;
  description?: string;
  objects: SemanticAssetSpec[];
  layout: SceneObjectPlacement[];
  roads?: Array<{ x0: number; z0: number; x1: number; z1: number; width: number; material: string }>;
  createdAt: string;
}

export interface CityPlot {
  plotId: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  facingRoad: "north" | "south" | "east" | "west";
  assignedAssetId?: string;
}

export interface CityPackage {
  version: 1;
  id: string;
  packageName: string;
  theme: ArchitecturalStyle;
  assets: BlueprintDoc[];
  semanticSpecs: SemanticAssetSpec[];
  plots: CityPlot[];
  roads: Array<{ x0: number; z0: number; x1: number; z1: number; width: number; material: number }>;
}
