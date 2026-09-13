/**
 * Simulation Regression Scenarios — In-browser automated feature verification.
 * Runs assertions on pure algorithms, registries, math formulas, and engine physics.
 */
import { xpForLevel, levelForXp, splitOrbs } from "../game/xp";
import { SMELT_MAP, SMELT_TIME, fuelItems } from "../game/smelt";
import { matchCrafting } from "../game/recipes";
import { BLOCK_MAP, BLOCK_DROPS } from "../game/blocks";
import { PROFESSIONS, TRADES_PER_DAY } from "../game/villagers";
import { TREE_CATALOG, HOUSE_CATALOG, FEATURE_CATALOG } from "./catalog";

export interface ScenarioStep {
  name: string;
  run: () => { pass: boolean; detail: string };
}

export interface ScenarioSuite {
  id: string;
  name: string;
  description: string;
  steps: ScenarioStep[];
}

export const SCENARIO_SUITES: ScenarioSuite[] = [
  {
    id: "xp_curves",
    name: "XP Curves & Orb Splitting",
    description: "Verifies vanilla-accurate level curves, inverse level calculation, and orb tiering.",
    steps: [
      {
        name: "L1 requires exactly 7 XP",
        run: () => {
          const req = xpForLevel(1);
          return { pass: req === 7, detail: `xpForLevel(1) = ${req} (expected 7)` };
        }
      },
      {
        name: "L30 requires exactly 1395 XP",
        run: () => {
          const req = xpForLevel(30);
          return { pass: req === 1395, detail: `xpForLevel(30) = ${req} (expected 1395)` };
        }
      },
      {
        name: "Inverse level lookup matches exactly",
        run: () => {
          const l30 = levelForXp(1395);
          const l1 = levelForXp(7);
          const pass = l30.level === 30 && l1.level === 1;
          return { pass, detail: `levelForXp(1395) = L${l30.level}, levelForXp(7) = L${l1.level}` };
        }
      },
      {
        name: "Orb splitting splits 1000 XP into wiki orb tiers",
        run: () => {
          const orbs = splitOrbs(1000);
          const sum = orbs.reduce((a, b) => a + b, 0);
          const pass = sum === 1000 && orbs[0] === 617 && orbs[1] === 307;
          return { pass, detail: `splitOrbs(1000) = [${orbs.join(", ")}] (sum: ${sum})` };
        }
      }
    ]
  },
  {
    id: "economy_crafting",
    name: "Crafting & Smelting Matrix",
    description: "Verifies 2x2/3x3 recipe matcher, furnace smelt outputs, and fuel consumption.",
    steps: [
      {
        name: "Oak logs to planks (2x2)",
        run: () => {
          const grid = [{ id: 16, count: 1 }, null, null, null];
          const res = matchCrafting(grid, 2);
          const pass = !!res && res.output.id === 17 && res.output.count === 4;
          return { pass, detail: `Crafting logs → id=${res?.output.id}, count=${res?.output.count}` };
        }
      },
      {
        name: "Furnace cobblestone to stone smelt output",
        run: () => {
          const out = SMELT_MAP[6];
          return { pass: out === 5, detail: `Cobblestone(6) melts to Stone(5) = ${out}` };
        }
      },
      {
        name: "Fuel efficiency calculation",
        run: () => {
          const f = fuelItems(16); // 16 logs
          return { pass: f === 3, detail: `Fuel items for 16 logs = ${f} (expected 3)` };
        }
      },
      {
        name: "Smelting standard duration",
        run: () => {
          return { pass: SMELT_TIME === 10, detail: `Smelt duration = ${SMELT_TIME}s` };
        }
      }
    ]
  },
  {
    id: "villager_economy",
    name: "Villager Trading & Professions",
    description: "Verifies profession badge definitions, trade counts, and daily restock caps.",
    steps: [
      {
        name: "Trades per day is capped at 8",
        run: () => {
          return { pass: TRADES_PER_DAY === 8, detail: `TRADES_PER_DAY = ${TRADES_PER_DAY}` };
        }
      },
      {
        name: "Professions include all 6 archetypes",
        run: () => {
          const pass = PROFESSIONS.length === 6;
          const names = PROFESSIONS.map((p) => p.name).join(", ");
          return { pass, detail: `Professions (${PROFESSIONS.length}): ${names}` };
        }
      },
      {
        name: "All profession trade tables contain valid block ids",
        run: () => {
          let valid = true;
          for (const p of PROFESSIONS) {
            for (const t of p.trades) {
              if (!BLOCK_MAP.has(t.offerId) || !BLOCK_MAP.has(t.costId)) valid = false;
            }
          }
          return { pass: valid, detail: `Validated ${PROFESSIONS.length} profession trade tables` };
        }
      }
    ]
  },
  {
    id: "catalog_integrity",
    name: "Simulation Catalogue Integrity",
    description: "Verifies live registry projections for trees, houses, and features without drift.",
    steps: [
      {
        name: "Tree catalogue count",
        run: () => {
          const count = TREE_CATALOG.length;
          return { pass: count === 18, detail: `Tree catalogue count = ${count} (expected 18)` };
        }
      },
      {
        name: "House catalogue count",
        run: () => {
          const count = HOUSE_CATALOG.length;
          return { pass: count === 8, detail: `House catalogue count = ${count} (expected 8)` };
        }
      },
      {
        name: "Feature catalogue count",
        run: () => {
          const count = FEATURE_CATALOG.length;
          return { pass: count === 8, detail: `Feature catalogue count = ${count} (expected 8)` };
        }
      },
      {
        name: "Blocks catalogue matches BLOCK_MAP",
        run: () => {
          const size = BLOCK_MAP.size;
          return { pass: size >= 105, detail: `BLOCK_MAP size = ${size}` };
        }
      }
    ]
  },
  {
    id: "drops_and_liquids",
    name: "Block Drops & Bucket IDs",
    description: "Verifies block destruction drop tables and fluid bucket item IDs.",
    steps: [
      {
        name: "Empty, Water, and Lava Bucket registered",
        run: () => {
          const bEmpty = BLOCK_MAP.has(134);
          const bWater = BLOCK_MAP.has(135);
          const bLava = BLOCK_MAP.has(136);
          const pass = bEmpty && bWater && bLava;
          return { pass, detail: `Buckets 134/135/136 registered = ${pass}` };
        }
      },
      {
        name: "Grass Block drops Dirt item",
        run: () => {
          const drop = BLOCK_DROPS[1]; // Grass block → dirt
          const pass = !!drop && drop.length > 0 && drop[0].id === 2;
          return { pass, detail: `Grass Block drop mapped: id=${drop?.[0]?.id}` };
        }
      }
    ]
  }
];
