// Food definitions and nutrition data mapped to Minecraft 1.19/1.20 specifications
export interface FoodItemDef {
  hunger: number;
  saturation: number;
  alwaysEdible?: boolean;
}

export const FOOD_ITEMS: Record<number, FoodItemDef> = {
  // Cooked Beef / Steak
  1053: { hunger: 8, saturation: 12.8 },
  // Cooked Porkchop
  1055: { hunger: 8, saturation: 12.8 },
  // Cooked Mutton
  1054: { hunger: 6, saturation: 9.6 },
  // Cooked Chicken
  1052: { hunger: 6, saturation: 7.2 },
  // Bread
  1030: { hunger: 5, saturation: 6.0 },
  // Baked Potato
  1023: { hunger: 5, saturation: 6.0 },
  // Apple
  1021: { hunger: 4, saturation: 2.4 },
  // Golden Apple
  1076: { hunger: 4, saturation: 9.6, alwaysEdible: true },
  // Carrot
  1038: { hunger: 3, saturation: 3.6 },
  // Sweet Berries
  1136: { hunger: 2, saturation: 0.4 },
  // Melon Slice
  1093: { hunger: 2, saturation: 1.2 },
  // Cookie
  1057: { hunger: 2, saturation: 0.4 }
};

export function isEdibleItem(id: number): boolean {
  return !!FOOD_ITEMS[id];
}

export function getFoodNutrition(id: number): FoodItemDef | null {
  return FOOD_ITEMS[id] || null;
}
