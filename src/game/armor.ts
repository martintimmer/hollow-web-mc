/* Clothing & armor sets registry (extracted from Game.tsx — R1.2) */

export interface ArmorPiece {
  id: string;
  name: string;
  slot: "helmet" | "chestplate" | "leggings" | "boots";
  color: number;
  secondaryColor?: number;
  icon: string;
  defense: number;
}

export interface ClothingSet {
  id: string;
  name: string;
  badge: string;
  theme: string;
  items: {
    helmet: ArmorPiece | null;
    chestplate: ArmorPiece | null;
    leggings: ArmorPiece | null;
    boots: ArmorPiece | null;
  };
}

export const CLOTHING_SETS: ClothingSet[] = [
  {
    id: "steve",
    name: "Classic Explorer (Steve)",
    badge: "👕",
    theme: "Classic Blue Casual",
    items: {
      helmet: null,
      chestplate: { id: "steve_shirt", name: "Classic Cyan Shirt", slot: "chestplate", color: 0x2288cc, secondaryColor: 0x1b6ca3, icon: "👕", defense: 2 },
      leggings: { id: "steve_jeans", name: "Indigo Blue Jeans", slot: "leggings", color: 0x334488, secondaryColor: 0x223366, icon: "👖", defense: 2 },
      boots: { id: "steve_shoes", name: "Slate Gray Shoes", slot: "boots", color: 0x555555, secondaryColor: 0x333333, icon: "👞", defense: 1 }
    }
  },
  {
    id: "alex",
    name: "Wilderness Ranger (Alex)",
    badge: "🌲",
    theme: "Forest Survival Attire",
    items: {
      helmet: null,
      chestplate: { id: "alex_tunic", name: "Olive Field Tunic", slot: "chestplate", color: 0x5a7d36, secondaryColor: 0x48642b, icon: "👕", defense: 2 },
      leggings: { id: "alex_pants", name: "Leather Field Pants", slot: "leggings", color: 0x6e4726, secondaryColor: 0x52341b, icon: "👖", defense: 2 },
      boots: { id: "alex_boots", name: "Trail Ranger Boots", slot: "boots", color: 0x3a2514, secondaryColor: 0x24160a, icon: "👢", defense: 1 }
    }
  },
  {
    id: "leather",
    name: "Tanned Leather Armor",
    badge: "🛡️",
    theme: "Stitched Cowhide Survival",
    items: {
      helmet: { id: "leather_helmet", name: "Leather Cap", slot: "helmet", color: 0x9b6338, icon: "🪖", defense: 1 },
      chestplate: { id: "leather_chestplate", name: "Leather Tunic", slot: "chestplate", color: 0x9b6338, icon: "🛡️", defense: 3 },
      leggings: { id: "leather_leggings", name: "Leather Pants", slot: "leggings", color: 0x9b6338, icon: "👖", defense: 2 },
      boots: { id: "leather_boots", name: "Leather Boots", slot: "boots", color: 0x9b6338, icon: "👢", defense: 1 }
    }
  },
  {
    id: "iron",
    name: "Iron Knight Plate",
    badge: "⚔️",
    theme: "Polished Steel Crusader",
    items: {
      helmet: { id: "iron_helmet", name: "Iron Greathelm", slot: "helmet", color: 0xd8d8d8, secondaryColor: 0xb0b0b0, icon: "🪖", defense: 2 },
      chestplate: { id: "iron_chestplate", name: "Iron Breastplate", slot: "chestplate", color: 0xd8d8d8, secondaryColor: 0xb0b0b0, icon: "🛡️", defense: 6 },
      leggings: { id: "iron_leggings", name: "Iron Greaves", slot: "leggings", color: 0xd8d8d8, secondaryColor: 0xb0b0b0, icon: "👖", defense: 5 },
      boots: { id: "iron_boots", name: "Iron Sabatons", slot: "boots", color: 0xd8d8d8, secondaryColor: 0xb0b0b0, icon: "👢", defense: 2 }
    }
  },
  {
    id: "gold",
    name: "Golden Royal Armor",
    badge: "👑",
    theme: "Gilded Ceremonial Plate",
    items: {
      helmet: { id: "gold_helmet", name: "Golden Crown Helm", slot: "helmet", color: 0xf5cf38, secondaryColor: 0xd4a815, icon: "👑", defense: 2 },
      chestplate: { id: "gold_chestplate", name: "Golden Cuirass", slot: "chestplate", color: 0xf5cf38, secondaryColor: 0xd4a815, icon: "🛡️", defense: 5 },
      leggings: { id: "gold_leggings", name: "Golden Leggings", slot: "leggings", color: 0xf5cf38, secondaryColor: 0xd4a815, icon: "👖", defense: 3 },
      boots: { id: "gold_boots", name: "Golden Boots", slot: "boots", color: 0xf5cf38, secondaryColor: 0xd4a815, icon: "👢", defense: 1 }
    }
  },
  {
    id: "diamond",
    name: "Diamond Champion",
    badge: "💎",
    theme: "Radiant Cyan Gem Plate",
    items: {
      helmet: { id: "diamond_helmet", name: "Diamond Helmet", slot: "helmet", color: 0x4fe6e8, secondaryColor: 0x2eb8ba, icon: "🪖", defense: 3 },
      chestplate: { id: "diamond_chestplate", name: "Diamond Chestplate", slot: "chestplate", color: 0x4fe6e8, secondaryColor: 0x2eb8ba, icon: "🛡️", defense: 8 },
      leggings: { id: "diamond_leggings", name: "Diamond Leggings", slot: "leggings", color: 0x4fe6e8, secondaryColor: 0x2eb8ba, icon: "👖", defense: 6 },
      boots: { id: "diamond_boots", name: "Diamond Boots", slot: "boots", color: 0x4fe6e8, secondaryColor: 0x2eb8ba, icon: "👢", defense: 3 }
    }
  },
  {
    id: "netherite",
    name: "Netherite Ancient Armor",
    badge: "🔥",
    theme: "Forged Debris Heavy Plate",
    items: {
      helmet: { id: "netherite_helmet", name: "Netherite Helmet", slot: "helmet", color: 0x31292d, secondaryColor: 0x5a1e26, icon: "🪖", defense: 3 },
      chestplate: { id: "netherite_chestplate", name: "Netherite Chestplate", slot: "chestplate", color: 0x31292d, secondaryColor: 0x5a1e26, icon: "🛡️", defense: 8 },
      leggings: { id: "netherite_leggings", name: "Netherite Leggings", slot: "leggings", color: 0x31292d, secondaryColor: 0x5a1e26, icon: "👖", defense: 6 },
      boots: { id: "netherite_boots", name: "Netherite Boots", slot: "boots", color: 0x31292d, secondaryColor: 0x5a1e26, icon: "👢", defense: 3 }
    }
  },
  {
    id: "desert",
    name: "Desert Nomad Robes",
    badge: "🌴",
    theme: "Sandstone Traveler Silk",
    items: {
      helmet: { id: "desert_turban", name: "Nomad Headwrap", slot: "helmet", color: 0xdfd3b0, secondaryColor: 0xb59b58, icon: "👳", defense: 1 },
      chestplate: { id: "desert_robe", name: "Desert Linen Robe", slot: "chestplate", color: 0xdfd3b0, secondaryColor: 0xb59b58, icon: "👘", defense: 3 },
      leggings: { id: "desert_sash", name: "Wrapped Sash Pants", slot: "leggings", color: 0xc4b387, secondaryColor: 0x9a875a, icon: "👖", defense: 2 },
      boots: { id: "desert_sandals", name: "Traveler Sandals", slot: "boots", color: 0x8a6d47, secondaryColor: 0x61472a, icon: "👡", defense: 1 }
    }
  },
  {
    id: "tundra",
    name: "Tundra Fur Parka",
    badge: "❄️",
    theme: "Arctic Wool & Fur Thermal",
    items: {
      helmet: { id: "tundra_hood", name: "Fur-Lined Earmuff Hood", slot: "helmet", color: 0x4a627a, secondaryColor: 0xf0f5fa, icon: "❄️", defense: 2 },
      chestplate: { id: "tundra_coat", name: "Heavy Wool Parka", slot: "chestplate", color: 0x4a627a, secondaryColor: 0xf0f5fa, icon: "🧥", defense: 5 },
      leggings: { id: "tundra_pants", name: "Thermal Snow Pants", slot: "leggings", color: 0x364859, secondaryColor: 0xf0f5fa, icon: "👖", defense: 4 },
      boots: { id: "tundra_boots", name: "Insulated Snow Boots", slot: "boots", color: 0x222d38, secondaryColor: 0xf0f5fa, icon: "🥾", defense: 2 }
    }
  },
  {
    id: "smith",
    name: "Forge Master Apron",
    badge: "⚒️",
    theme: "Heavy Crafting Welder Gear",
    items: {
      helmet: { id: "smith_goggles", name: "Protective Welder Goggles", slot: "helmet", color: 0x222222, secondaryColor: 0xffaa00, icon: "🥽", defense: 2 },
      chestplate: { id: "smith_apron", name: "Leather Forge Apron", slot: "chestplate", color: 0x703e1e, secondaryColor: 0x402310, icon: "🥋", defense: 5 },
      leggings: { id: "smith_trousers", name: "Heavy Work Trousers", slot: "leggings", color: 0x3a3633, secondaryColor: 0x242220, icon: "👖", defense: 3 },
      boots: { id: "smith_boots", name: "Steel-Toe Boots", slot: "boots", color: 0x1f1d1c, secondaryColor: 0x444444, icon: "🥾", defense: 2 }
    }
  }
];

// ==========================================