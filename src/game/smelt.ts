/* Furnace smelting rules (Phase 3). Pure module: no engine/React.

 * Model (MC-canon, simplified to block-only registry):
 *  - one item cooks per SMELT_TIME seconds when fuel remains
 *  - fuel ratings = number of items one fuel unit can cook
 */

export const SMELT_MAP: Record<number, number> = {
  6: 5,       // Cobblestone → Stone
  10: 37,     // Sand → Glass
  149: 1038,  // Ancient Debris → Netherite Scrap
  31: 953,    // Iron ore → Iron ingot
  328: 953,   // Deepslate iron ore → Iron ingot
  1073: 953,  // Raw iron → Iron ingot
  32: 925,    // Gold ore → Gold ingot
  327: 925,   // Deepslate gold ore → Gold ingot
  1072: 925,  // Raw gold → Gold ingot
  268: 862,   // Copper ore → Copper ingot
  1071: 862,  // Raw copper → Copper ingot
  1055: 1172, // Potato → Baked potato
  131: 348,   // Kelp → Dried kelp
};

export const SMELT_TIME = 10; // seconds per item (1x speed)

export const FUEL_RATINGS: Record<number, number> = {
  817: 8, 748: 8,                    // coal / charcoal (vanilla rating)
  17: 2, 20: 2, 23: 2, 26: 2,     // planks
  16: 3, 19: 3, 22: 3, 25: 3,     // logs
  105: 3,                          // oak door
  119: 3, 120: 3, 121: 3, 122: 3   // cherry wood / crimson stem / warped stem / redwood
};

/** Output block id for an input, or null if not smeltable. */
export function smeltOutput(inputId: number): number | null {
  return SMELT_MAP[inputId] ?? null;
}

/** How many items this fuel block can cook (0 = not fuel). */
export function fuelItems(inputId: number): number {
  return FUEL_RATINGS[inputId] ?? 0;
}
