/* Crafting recipes & matcher (Phase 2).
 * Pure module: no React, no engine state. Operates on a flat cell array
 * (gridSize 2x2 = 4 cells, 3x3 = 9 cells) and returns the matching recipe. */

export interface CraftCell {
  id: number;
  count: number;
}

export interface CraftRecipe {
  output: { id: number; count: number };
  pattern: string[];                // rows of chars; ' '/'.' = empty
  key: Record<string, number[]>;    // char → acceptable block ids
}

// Block id aliases (see src/game/blocks.ts)
const LOG_OAK = 16, LOG_BIRCH = 19, LOG_SPRUCE = 22, LOG_JUNGLE = 25;
const PLANK_OAK = 17, PLANK_BIRCH = 20, PLANK_SPRUCE = 23, PLANK_JUNGLE = 26;
const ANY_PLANKS = [PLANK_OAK, PLANK_BIRCH, PLANK_SPRUCE, PLANK_JUNGLE];
const COBBLE = 6, STONE = 5, SAND = 10, SANDSTONE = 11;
const STONE_BRICKS = 8, TABLE = 41, DOOR = 105, CHEST = 43;

export const CRAFT_RECIPES: CraftRecipe[] = [
  // Logs → 4 planks (one recipe per log type)
  { output: { id: PLANK_OAK, count: 4 }, pattern: ["l"], key: { l: [LOG_OAK] } },
  { output: { id: PLANK_BIRCH, count: 4 }, pattern: ["l"], key: { l: [LOG_BIRCH] } },
  { output: { id: PLANK_SPRUCE, count: 4 }, pattern: ["l"], key: { l: [LOG_SPRUCE] } },
  { output: { id: PLANK_JUNGLE, count: 4 }, pattern: ["l"], key: { l: [LOG_JUNGLE] } },
  // 2x2 any planks → crafting table
  { output: { id: TABLE, count: 1 }, pattern: ["pp", "pp"], key: { p: ANY_PLANKS } },
  // 2x2 stone → 8 stone bricks
  { output: { id: STONE_BRICKS, count: 8 }, pattern: ["ss", "ss"], key: { s: [STONE] } },
  // 2x2 sand → 1 sandstone
  { output: { id: SANDSTONE, count: 1 }, pattern: ["ss", "ss"], key: { s: [SAND] } },
  // 3x3 cobblestone → 1 stone
  { output: { id: STONE, count: 1 }, pattern: ["ccc", "ccc", "ccc"], key: { c: [COBBLE] } },
  // 6 planks (2x3) → 3 oak doors
  { output: { id: DOOR, count: 3 }, pattern: ["pp", "pp", "pp"], key: { p: [PLANK_OAK] } },
  // 8 planks (ring) → 1 chest
  { output: { id: CHEST, count: 1 }, pattern: ["ppp", "p p", "ppp"], key: { p: ANY_PLANKS } },
  // Netherite Ingot (4 scrap + 4 gold)
  { output: { id: 1035, count: 1 }, pattern: ["ss", "gg"], key: { s: [1038], g: [33, 49] } },
  // 3x3 Netherite Ingot → 1 Netherite Block
  { output: { id: 501, count: 1 }, pattern: ["iii", "iii", "iii"], key: { i: [1035] } },
  // Diamond gear upgrades → Netherite Gear
  { output: { id: 1040, count: 1 }, pattern: ["si"], key: { s: [572], i: [1035] } }, // Netherite Sword
  { output: { id: 1037, count: 1 }, pattern: ["pi"], key: { p: [32, 278, 570], i: [1035] } }, // Netherite Pickaxe
  { output: { id: 1030, count: 1 }, pattern: ["ai"], key: { a: [279, 571], i: [1035] } }, // Netherite Axe
  { output: { id: 1039, count: 1 }, pattern: ["hi"], key: { h: [573], i: [1035] } }, // Netherite Shovel
  // Respawn Anchor (6 Crying Obsidian + 3 Glowstone)
  { output: { id: 601, count: 1 }, pattern: ["ccc", "ggg", "ccc"], key: { c: [93], g: [47] } },
  // Sticks (2 planks → 4)
  { output: { id: 1129, count: 4 }, pattern: ["p", "p"], key: { p: [17, 20, 23, 26] } },
  // Torch (coal + stick → 4)
  { output: { id: 80, count: 4 }, pattern: ["c", "s"], key: { c: [817], s: [1129] } },
  // Furnace (8 cobble ring)
  { output: { id: 42, count: 1 }, pattern: ["ccc", "c c", "ccc"], key: { c: [6] } },
  // Bow (3 stick + 3 string)
  { output: { id: 730, count: 1 }, pattern: [" tg", "t g", " tg"], key: { t: [1129], g: [1135] } },
  // Arrows (flint + stick + feather → 4)
  { output: { id: 1170, count: 4 }, pattern: ["f", "s", "e"], key: { f: [914], s: [1129], e: [904] } },
  // Wooden tools (planks + stick)
  { output: { id: 1158, count: 1 }, pattern: ["m", "m", "s"], key: { m: [17, 20, 23, 26], s: [1129] } },
  { output: { id: 1156, count: 1 }, pattern: ["mmm", " s ", " s "], key: { m: [17, 20, 23, 26], s: [1129] } },
  { output: { id: 1154, count: 1 }, pattern: ["mm", "ms", "s "], key: { m: [17, 20, 23, 26], s: [1129] } },
  { output: { id: 1154, count: 1 }, pattern: ["mm", "sm", " s"], key: { m: [17, 20, 23, 26], s: [1129] } },
  { output: { id: 1157, count: 1 }, pattern: ["m", "s", "s"], key: { m: [17, 20, 23, 26], s: [1129] } },
  { output: { id: 1155, count: 1 }, pattern: ["mm", " s", " s"], key: { m: [17, 20, 23, 26], s: [1129] } },
  { output: { id: 1155, count: 1 }, pattern: ["mm", "s ", "s "], key: { m: [17, 20, 23, 26], s: [1129] } },
  // Stone tools (cobble + stick)
  { output: { id: 1134, count: 1 }, pattern: ["m", "m", "s"], key: { m: [6], s: [1129] } },
  { output: { id: 1132, count: 1 }, pattern: ["mmm", " s ", " s "], key: { m: [6], s: [1129] } },
  { output: { id: 1130, count: 1 }, pattern: ["mm", "ms", "s "], key: { m: [6], s: [1129] } },
  { output: { id: 1130, count: 1 }, pattern: ["mm", "sm", " s"], key: { m: [6], s: [1129] } },
  { output: { id: 1133, count: 1 }, pattern: ["m", "s", "s"], key: { m: [6], s: [1129] } },
  { output: { id: 1131, count: 1 }, pattern: ["mm", " s", " s"], key: { m: [6], s: [1129] } },
  { output: { id: 1131, count: 1 }, pattern: ["mm", "s ", "s "], key: { m: [6], s: [1129] } },
  // Iron tools (iron ingot + stick)
  { output: { id: 958, count: 1 }, pattern: ["m", "m", "s"], key: { m: [953], s: [1129] } },
  { output: { id: 956, count: 1 }, pattern: ["mmm", " s ", " s "], key: { m: [953], s: [1129] } },
  { output: { id: 947, count: 1 }, pattern: ["mm", "ms", "s "], key: { m: [953], s: [1129] } },
  { output: { id: 947, count: 1 }, pattern: ["mm", "sm", " s"], key: { m: [953], s: [1129] } },
  { output: { id: 957, count: 1 }, pattern: ["m", "s", "s"], key: { m: [953], s: [1129] } },
  { output: { id: 951, count: 1 }, pattern: ["mm", " s", " s"], key: { m: [953], s: [1129] } },
  { output: { id: 951, count: 1 }, pattern: ["mm", "s ", "s "], key: { m: [953], s: [1129] } },
  // Gold tools (gold ingot + stick)
  { output: { id: 938, count: 1 }, pattern: ["m", "m", "s"], key: { m: [925], s: [1129] } },
  { output: { id: 936, count: 1 }, pattern: ["mmm", " s ", " s "], key: { m: [925], s: [1129] } },
  { output: { id: 928, count: 1 }, pattern: ["mm", "ms", "s "], key: { m: [925], s: [1129] } },
  { output: { id: 928, count: 1 }, pattern: ["mm", "sm", " s"], key: { m: [925], s: [1129] } },
  { output: { id: 937, count: 1 }, pattern: ["m", "s", "s"], key: { m: [925], s: [1129] } },
  { output: { id: 933, count: 1 }, pattern: ["mm", " s", " s"], key: { m: [925], s: [1129] } },
  { output: { id: 933, count: 1 }, pattern: ["mm", "s ", "s "], key: { m: [925], s: [1129] } },
  // Diamond tools (diamond + stick)
  { output: { id: 887, count: 1 }, pattern: ["m", "m", "s"], key: { m: [877], s: [1129] } },
  { output: { id: 885, count: 1 }, pattern: ["mmm", " s ", " s "], key: { m: [877], s: [1129] } },
  { output: { id: 878, count: 1 }, pattern: ["mm", "ms", "s "], key: { m: [877], s: [1129] } },
  { output: { id: 878, count: 1 }, pattern: ["mm", "sm", " s"], key: { m: [877], s: [1129] } },
  { output: { id: 886, count: 1 }, pattern: ["m", "s", "s"], key: { m: [877], s: [1129] } },
  { output: { id: 882, count: 1 }, pattern: ["mm", " s", " s"], key: { m: [877], s: [1129] } },
  { output: { id: 882, count: 1 }, pattern: ["mm", "s ", "s "], key: { m: [877], s: [1129] } },
  // Leather armor
  { output: { id: 971, count: 1 }, pattern: ["mmm", "m m"], key: { m: [966] } },
  { output: { id: 969, count: 1 }, pattern: ["m m", "mmm", "mmm"], key: { m: [966] } },
  { output: { id: 974, count: 1 }, pattern: ["mmm", "m m", "m m"], key: { m: [966] } },
  { output: { id: 967, count: 1 }, pattern: ["m m", "m m"], key: { m: [966] } },
  // Iron armor
  { output: { id: 950, count: 1 }, pattern: ["mmm", "m m"], key: { m: [953] } },
  { output: { id: 949, count: 1 }, pattern: ["m m", "mmm", "mmm"], key: { m: [953] } },
  { output: { id: 954, count: 1 }, pattern: ["mmm", "m m", "m m"], key: { m: [953] } },
  { output: { id: 948, count: 1 }, pattern: ["m m", "m m"], key: { m: [953] } },
  // Diamond armor
  { output: { id: 881, count: 1 }, pattern: ["mmm", "m m"], key: { m: [877] } },
  { output: { id: 880, count: 1 }, pattern: ["m m", "mmm", "mmm"], key: { m: [877] } },
  { output: { id: 884, count: 1 }, pattern: ["mmm", "m m", "m m"], key: { m: [877] } },
  { output: { id: 879, count: 1 }, pattern: ["m m", "m m"], key: { m: [877] } }
];

/** Normalized cell grid: returns { rows, minW } trimmed of empty border cells. */
export function trimGrid(cells: (CraftCell | null)[], width: number): { rows: (CraftCell | null)[][]; w: number; h: number } | null {
  const h = cells.length / width;
  let minX = width, maxX = -1, minY = h, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < width; x++) {
      if (cells[y * width + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0 || maxY < 0) return null; // empty grid
  const rows: (CraftCell | null)[][] = [];
  for (let y = minY; y <= maxY; y++) {
    rows.push(cells.slice(y * width + minX, y * width + maxX + 1));
  }
  return { rows, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Find the first recipe matching the player's grid (any placement, trimmed). */
export function matchCrafting(
  cells: (CraftCell | null)[],
  gridWidth: number,
  recipes: CraftRecipe[] = CRAFT_RECIPES
): CraftRecipe | null {
  const trimmed = trimGrid(cells, gridWidth);
  if (!trimmed) return null;

  for (const recipe of recipes) {
    const rH = recipe.pattern.length;
    const rW = recipe.pattern[0].length;
    if (rH !== trimmed.h || rW !== trimmed.w) continue;

    let ok = true;
    for (let y = 0; y < rH && ok; y++) {
      for (let x = 0; x < rW && ok; x++) {
        const want = recipe.pattern[y][x];
        const cell = trimmed.rows[y][x];
        if (want === " " || want === ".") {
          if (cell) ok = false;
        } else {
          const accepts = recipe.key[want];
          if (!cell || !accepts || accepts.indexOf(cell.id) < 0) ok = false;
        }
      }
    }
    if (ok) return recipe;
  }
  return null;
}
