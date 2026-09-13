/**
 * @file catalog/ai/generateAssetsWithValidation.ts
 * Param-spec-first asset contract + hard validation/repair gate.
 *
 * The AI (mock or CLI) emits compact `SemanticAssetSpec` objects (dimensions,
 * stories, roof style, palette) — NOT raw voxel lists. A deterministic generator
 * resolves each spec into a linted BlueprintDoc. Every result is run through
 * `lintBlueprint`; failures are repaired (deterministic) and re-validated, so
 * the pipeline never accepts structurally-broken output (the #1 failure mode of
 * raw LLM voxel emission).
 */

import type { BlueprintDoc, BlueprintBlock } from "../../src/sim/blueprintScanner";
import { validateBlueprintDoc } from "../../src/sim/blueprintScanner";
import type { SemanticAssetSpec, SceneSpec } from "./asset-spec";
import { generateHouseFromSpec } from "./generators/houseGenerator";
import { lintBlueprint, resolveBlockId, type LintReport } from "../../src/sim/assetSideloader";
import { BLOCK_MAP } from "../../src/game/blocks";

export interface AssetValidation {
  spec: SemanticAssetSpec;
  blueprint: BlueprintDoc | null;
  lint: LintReport | null;
  valid: boolean;
  retries: number;
}

export interface AssetProviderInput {
  images: unknown[];
  intent: string;
  feedback?: string;
}

export type AssetProvider = (input: AssetProviderInput) => Promise<{
  assets: SemanticAssetSpec[];
  scene?: SceneSpec | Record<string, unknown> | null;
  report?: Record<string, unknown> | null;
}>;

const clampInt = (v: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(v || min)));

/**
 * Normalizes / clamps an AI-supplied spec into a safe, generator-friendly form.
 * This is the deterministic "AI responded to feedback" step: out-of-range dims,
 * missing palette roles, bad ids, and unknown categories are all repaired here.
 */
export function normalizeSpec(raw: SemanticAssetSpec): SemanticAssetSpec {
  const d = raw?.dimensions || {};
  const stories = clampInt(d.stories ?? 1, 1, 3);
  const width = clampInt(d.width || 7, 5, 24);
  const depth = clampInt(d.depth || 6, 5, 24);
  const height = clampInt(d.height || stories * 3 + 3, 4, 26);

  const pal = raw?.palette || {};
  const roof = raw?.roof || {};

  return {
    version: 1,
    id: raw.id?.startsWith("bp_") ? raw.id : `bp_${raw.id || "asset"}`,
    name: raw.name || raw.id || "Generated Asset",
    category: (raw.category || "house") as SemanticAssetSpec["category"],
    style: raw.style || "rustic_cottage",
    biomeAffinity: Array.isArray(raw.biomeAffinity) && raw.biomeAffinity.length ? raw.biomeAffinity : ["plains", "forest"],
    dimensions: { width, height, depth, stories },
    footprint: {
      shape: (raw.footprint?.shape as SemanticAssetSpec["footprint"]["shape"]) || "rectangle",
      mainWidth: width,
      mainDepth: depth,
      wingWidth: raw.footprint?.wingWidth,
      wingDepth: raw.footprint?.wingDepth,
      wingSide: raw.footprint?.wingSide
    },
    roof: {
      style: (roof.style as SemanticAssetSpec["roof"]["style"]) || "gable",
      pitch: Math.max(0.5, Math.min(1.5, Number(roof.pitch) || 1)),
      overhang: clampInt(roof.overhang ?? 1, 1, 2),
      dormers: roof.dormers
    },
    features: {
      porch: !!raw.features?.porch,
      balcony: !!raw.features?.balcony,
      chimney: raw.features?.chimney || "none",
      cellarEntrance: !!raw.features?.cellarEntrance,
      lanterns: raw.features?.lanterns ?? true,
      fences: !!raw.features?.fences
    },
    palette: {
      foundation: pal.foundation ?? "stone_bricks",
      frame: pal.frame ?? "oak_log",
      walls: pal.walls ?? "oak_planks",
      roof: pal.roof ?? "oak_stairs",
      roofTrim: pal.roofTrim ?? "stone_brick_slab",
      floor: pal.floor ?? "birch_planks",
      doors: pal.doors ?? "oak_door",
      windows: pal.windows ?? "glass_pane",
      lights: pal.lights ?? "lantern",
      accent: pal.accent ?? "oak_fence",
      tires: pal.tires ?? "black_concrete",
      paint: pal.paint ?? pal.walls ?? "oak_planks",
      metal: pal.metal ?? pal.frame ?? "oak_log",
      tail: pal.tail ?? "redstone_block",
      trim: pal.trim ?? "quartz_slab"
    },
    vehicleType: raw.vehicleType,
    parts: raw.parts,
    createdAt: raw.createdAt || new Date().toISOString()
  };
}

/**
 * Deterministic vehicle assembler (category "object" + vehicleType): wheels at
 * ground, chassis slab, hood/cab/bed (pickup) or cabin/trunk (sedan) or
 * tall body (van/bus/suv) or tractor+trailer (semi). Uses the §5 vehicle
 * palette roles (tires / paint / metal / windows / lights).
 */
export function generateVehicleFromSpec(spec: SemanticAssetSpec): BlueprintDoc {
  const blocks: BlueprintBlock[] = [];
  const added = new Set<string>();
  const w = spec.dimensions.width;
  const h = spec.dimensions.height;
  const d = spec.dimensions.depth;
  const vtype = spec.vehicleType || "pickup";
  const paint = resolveBlockId(spec.palette.paint ?? spec.palette.walls, 17);
  const glass = resolveBlockId(spec.palette.windows, 38);
  const tire = resolveBlockId(spec.palette.tires, 186);
  const metal = resolveBlockId(spec.palette.metal ?? spec.palette.frame, 414);
  const light = resolveBlockId(spec.palette.lights, 48);
  const tail = resolveBlockId(spec.palette.tail, 591);
  const trim = resolveBlockId(spec.palette.trim, 1195); // quartz slab = chrome trim
  const put = (x: number, y: number, z: number, id: number) => putBlock(blocks, added, x, y, z, id);
  const cx = Math.floor((w - 1) / 2);

  // 1. Wheels (y=0) — 1×1 tires at the 4 corners; bumper/rocker chrome placed first
  //    so the body fill can't dedupe the details away.
  for (const z of [1, d - 2]) for (const x of [0, w - 1]) put(x, 0, z, tire);
  for (let x = 0; x < w; x++) { put(x, 1, 0, metal); put(x, 1, d - 1, metal); }
  // rocker chrome trim (slab) along the sides between wheels
  for (let x = 0; x < w; x++) { if (x === 0 || x === w - 1) { for (let z = 2; z < d - 2; z++) put(x, 1, z, trim); } }

  // 2. Lower body plate (y=1)
  for (let x = 0; x < w; x++) for (let z = 1; z < d - 1; z++) put(x, 1, z, paint);

  // 3. Upper body / cabin per type
  if (vtype === "pickup" || vtype === "truck") {
    // front: grill + headlights (y=2 z=0), hood plateau (z=0..1) with chrome lip
    put(cx, 2, 0, metal);                       // grill
    for (const x of [0, w - 1]) { put(x, 2, 0, light); put(x, 2, 1, trim); }  // headlights + hood lip
    for (let x = 0; x < w; x++) for (let z = 0; z < 2; z++) put(x, 2, z, paint);
    // cab (z=2..cabEnd)
    const cabEnd = Math.min(d - 3, 3);
    for (let x = 0; x < w; x++) for (let z = 2; z <= cabEnd; z++) put(x, 2, z, paint);
    // windshield (y=3 front row of cab, glass) + cab side windows + roof
    for (let x = 0; x < w; x++) put(x, 3, 2, glass);
    if (w >= 3) { put(0, 3, 3, glass); put(w - 1, 3, 3, glass); } // side windows
    for (let x = 0; x < w; x++) for (let z = 2; z <= cabEnd; z++) put(x, 3, z, paint);
    if (h >= 4) for (let x = 0; x < w; x++) for (let z = 2; z <= cabEnd; z++) put(x, 4, z, paint);
    // roof chrome lip + bed rails + tailgate + taillights
    for (let x = 0; x < w; x++) put(x, 3, cabEnd + 1, trim);
    for (let x = 0; x < w; x++) put(x, 2, d - 1, tail); // tailgate top
    for (const x of [0, w - 1]) { for (let z = 4; z < d; z++) put(x, 2, z, paint); } // bed rails
    if (w >= 3) for (let x = 1; x < w - 1; x++) put(x, 2, d - 2, trim); // bed floor lip
  } else if (vtype === "sedan") {
    // front grill + headlights, hood, glass greenhouse, trunk, chrome lips
    put(cx, 2, 0, metal);
    for (const x of [0, w - 1]) { put(x, 2, 0, light); put(x, 2, 1, trim); put(x, 2, d - 1, tail); }
    for (let x = 0; x < w; x++) { put(x, 2, 0, paint); put(x, 2, 1, paint); put(x, 2, d - 2, paint); put(x, 2, d - 1, paint); }
    for (let x = 1; x < w - 1; x++) { put(x, 3, 2, glass); }                       // windshield
    for (let x = 0; x < w; x++) for (let z = 2; z < d - 2; z++) put(x, 2, z, paint);
    if (w >= 3) { put(0, 3, 2, glass); put(w - 1, 3, 2, glass); put(0, 3, 3, glass); put(w - 1, 3, 3, glass); }
    for (let x = 1; x < w - 1; x++) for (let z = 3; z < d - 2; z++) put(x, 3, z, glass); // greenhouse
    if (h >= 4) for (let x = 0; x < w; x++) for (let z = 2; z < d - 2; z++) put(x, 4, z, paint);
  } else {
    // van / bus / suv / semi: tall body, windshield front, side window band, lights
    const side = Math.min(h - 1, 3);
    put(cx, 2, 0, metal);
    for (const x of [0, w - 1]) { put(x, 2, 0, light); put(x, 2, 1, trim); put(x, 2, d - 1, tail); }
    for (let x = 0; x < w; x++) put(x, 3, 0, glass); // windshield
    for (let x = 1; x < w - 1; x++) for (let z = 1; z < d - 1; z++) put(x, side, z, glass); // window band
    for (let x = 0; x < w; x++) for (let z = 0; z < d; z++) for (let y = 2; y < h; y++) put(x, y, z, paint);
    for (let x = 0; x < w; x++) put(x, Math.min(h - 1, 4), d - 1, trim); // rear chrome lip
    if (vtype === "semi") {
      for (let x = 0; x < w; x++) for (let z = Math.floor(d / 2); z < d; z++) put(x, 2, z, metal);
    }
  }

  const materialsCount: Record<string, number> = {};
  for (const b of blocks) {
    const label = `${BLOCK_MAP.get(b.id)?.name || "Block"} (#${b.id})`;
    materialsCount[label] = (materialsCount[label] || 0) + 1;
  }

  return {
    version: 1,
    id: spec.id,
    name: spec.name,
    author: "AI Asset Studio",
    category: "misc",
    packageName: "AI Generated",
    biomeAffinity: spec.biomeAffinity,
    spawnNaturally: true,
    dimensions: { width: w, height: h, depth: d },
    anchor: { ax: cx, ay: 0, az: 0 },
    foundationDepth: 0,
    blocks,
    materialsCount,
    totalBlocks: blocks.length,
    createdAt: new Date().toISOString()
  };
}

const putBlock = (blocks: BlueprintBlock[], added: Set<string>, x: number, y: number, z: number, id: number) => {
  const key = `${x},${y},${z}`;
  if (added.has(key) || id <= 0) return;
  added.add(key);
  blocks.push({ dx: x, dy: y, dz: z, id });
};

/**
 * Simple deterministic assembler for non-house categories (object / foliage /
 * misc): a tree for foliage, a framed solid box otherwise. Always lint-valid.
 */
export function generateSimpleObjectFromSpec(spec: SemanticAssetSpec): BlueprintDoc {
  const blocks: BlueprintBlock[] = [];
  const added = new Set<string>();
  const w = spec.dimensions.width;
  const h = spec.dimensions.height;
  const d = spec.dimensions.depth;
  const wall = resolveBlockId(spec.palette.walls, 17);
  const frame = resolveBlockId(spec.palette.frame, 16);
  const leaf = resolveBlockId(spec.palette.accent, 18);
  const light = resolveBlockId(spec.palette.lights, 46);
  const cx = Math.floor(w / 2);
  const cz = Math.floor(d / 2);

  if (spec.category === "foliage") {
    const trunkH = Math.max(2, h - 2);
    for (let y = 0; y < trunkH; y++) putBlock(blocks, added, cx, y, cz, frame);
    const crownR = Math.max(1, Math.floor(Math.min(w, d) / 2));
    for (let y = trunkH; y < Math.max(trunkH + 1, h); y++) {
      for (let dx = -crownR; dx <= crownR; dx++) {
        for (let dz = -crownR; dz <= crownR; dz++) {
          if (dx * dx + dz * dz <= crownR * crownR) putBlock(blocks, added, cx + dx, y, cz + dz, leaf);
        }
      }
    }
  } else {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        for (let z = 0; z < d; z++) {
          const edge = x === 0 || x === w - 1 || z === 0 || z === d - 1 || y === 0 || y === h - 1;
          putBlock(blocks, added, x, y, z, edge ? frame : wall);
        }
      }
    }
  }

  if (light) putBlock(blocks, added, cx, h, cz, light);

  const materialsCount: Record<string, number> = {};
  for (const b of blocks) {
    const label = `${BLOCK_MAP.get(b.id)?.name || "Block"} (#${b.id})`;
    materialsCount[label] = (materialsCount[label] || 0) + 1;
  }

  return {
    version: 1,
    id: spec.id,
    name: spec.name,
    author: "AI Asset Studio",
    category: (spec.category === "house" || spec.category === "tower" || spec.category === "castle" ||
      spec.category === "farm" || spec.category === "bridge" || spec.category === "shrine")
      ? spec.category
      : "misc",
    packageName: "AI Generated",
    biomeAffinity: spec.biomeAffinity,
    spawnNaturally: true,
    dimensions: { width: w, height: h, depth: d },
    anchor: { ax: cx, ay: 0, az: cz },
    foundationDepth: 1,
    blocks,
    materialsCount,
    totalBlocks: blocks.length,
    createdAt: new Date().toISOString()
  };
}

/**
 * Resolves a normalized SemanticAssetSpec into a BlueprintDoc via the
 * deterministic generators (house assembler for structures, simple assembler
 * for objects/foliage).
 */
export function specToBlueprint(spec: SemanticAssetSpec): BlueprintDoc {
  const normalized = normalizeSpec(spec);
  const isStructure =
    normalized.category === "house" || normalized.category === "tower" ||
    normalized.category === "castle" || normalized.category === "farm" ||
    normalized.category === "bridge" || normalized.category === "shrine";
  const doc = normalized.vehicleType || (normalized.category === "object" && normalized.dimensions.depth > normalized.dimensions.width)
    ? generateVehicleFromSpec(normalized)
    : isStructure
      ? generateHouseFromSpec(normalized)
      : generateSimpleObjectFromSpec(normalized);
  if (!validateBlueprintDoc(doc)) {
    throw new Error(`specToBlueprint produced an invalid BlueprintDoc for "${normalized.id}"`);
  }
  return doc;
}

/**
 * Converts + lints every AI asset spec. Returns per-asset validation with the
 * lint report and the resolved blueprint.
 */
export function validateAssetSet(rawAssets: SemanticAssetSpec[]): AssetValidation[] {
  if (!Array.isArray(rawAssets)) return [];
  return rawAssets.map((raw) => {
    const spec = normalizeSpec(raw);
    try {
      const blueprint = specToBlueprint(spec);
      const lint = lintBlueprint(blueprint);
      return { spec, blueprint, lint, valid: lint.valid, retries: 0 };
    } catch (err) {
      const msg = String(err && (err as Error).message ? (err as Error).message : err);
      return {
        spec,
        blueprint: null,
        lint: { valid: false, errors: [msg], warnings: [], blockCount: 0, dimensions: { width: 0, height: 0, depth: 0 }, materialsCount: {} },
        valid: false,
        retries: 0
      };
    }
  });
}

/**
 * Deterministic repair for an invalid asset: normalize (clamp) the spec and
 * rebuild. Mirrors "AI retried with the lint feedback" for the mock path and is
 * the safety net for the real CLI path.
 */
export function repairAsset(validation: AssetValidation): AssetValidation {
  const spec = normalizeSpec(validation.spec);
  const blueprint = specToBlueprint(spec);
  const lint = lintBlueprint(blueprint);
  return { spec, blueprint, lint, valid: lint.valid, retries: validation.retries + 1 };
}

/**
 * Param-first generation with a hard lint/retry gate. Calls the provider, then
 * validates every asset; any invalid asset is repaired (≤ maxRetries rounds).
 * The provider may be a mock (returns specs) or the real CLI (with feedback).
 */
export async function generateAssetsWithRetry(
  provider: AssetProvider,
  input: AssetProviderInput,
  maxRetries = 2
): Promise<{
  report: Record<string, unknown> | null;
  scene: SceneSpec | Record<string, unknown> | null;
  validations: AssetValidation[];
  allValid: boolean;
  retriesUsed: number;
}> {
  let res = await provider(input);
  let validations = validateAssetSet(res.assets);
  let retriesUsed = 0;
  const failed = () => validations.filter((v) => !v.valid);

  while (failed().length > 0 && retriesUsed < maxRetries) {
    const errors = failed().map((v) => v.lint?.errors?.join("; ") || "unknown lint failure").filter(Boolean);
    // deterministic repair first (the mock's "feedback response")
    validations = validations.map((v) => (v.valid ? v : repairAsset(v)));
    retriesUsed++;
    if (failed().length > 0) {
      // real-provider feedback path: ask the AI to fix it with the lint errors
      res = await provider({ ...input, feedback: errors.join("\n") });
      validations = validateAssetSet(res.assets);
    }
  }

  return {
    report: res.report ?? null,
    scene: res.scene ?? null,
    validations,
    allValid: failed().length === 0,
    retriesUsed
  };
}