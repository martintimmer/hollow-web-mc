import React, { useState, useMemo, useRef, useEffect } from "react";
import { BLOCKS, BLOCK_MAP } from "../../game/blocks";
import type { BlockDef } from "../../game/blocks";
import { CRAFT_RECIPES } from "../../game/recipes";
import { PlayerPaperdoll } from "./PlayerPaperdoll";
import objectClassification from "../../../catalog/object-classification.json";
import { apiGetCustomAssets } from "../../services/customAssets";
import { registerCustomAssets, isCustomAssetBlock } from "../../game/customAssets";
import { getWeaponInfo } from "../../game/weapons";
import { VANILLA_3D_IDS } from "../../game/engine/chunkMesh";
import { isSimPort } from "../../services/simMode";

const isCustom = (b: BlockDef) => isCustomAssetBlock(b.id) || Boolean((b as CustomBlock).customAssetId) || (b.id >= 1198 && b.id <= 2000);

const VANILLA_3D_SET: Set<number> = new Set(VANILLA_3D_IDS);

function vanillaRank(b: BlockDef): number {
  if (isCustom(b)) return 99;
  const n = b.name;
  if (b.category === "building" || b.category === "wood" || b.stair || n.includes("Planks") || n.includes("Stone") || n.includes("Bricks") || n.includes("Sandstone") || n.includes("Glass")) return 0;
  if (b.category === "colored" || n.includes("Wool") || n.includes("Concrete") || n.includes("Terracotta")) return 1;
  if (b.category === "natural" || b.category === "ores" || b.category === "nether_end" || n.includes("Grass") || n.includes("Dirt") || n.includes("Sand") || n.includes("Gravel") || n.includes("Clay") || n.includes("Ice") || n.includes("Snow") || n.includes("Obsidian") || n.includes("Bedrock") || n.includes("Bucket")) return 2;
  if (n.includes("Redstone")) return 3;
  if (b.category === "utility" || b.category === "decoration" || n.includes("Leaves") || n.includes("Torch") || n.includes("Lantern") || n.includes("Bookshelf") || n.includes("Bed") || n.includes("Table") || n.includes("Furnace") || n.includes("Chest") || n.includes("Ladder") || n.includes("Sponge") || n.includes("Campfire") || n.includes("Poppy") || n.includes("Dandelion") || n.includes("Coral") || n.includes("Pickle")) return 4;
  if (n.includes("TNT") || n.includes("Lamp") || n.includes("Slime") || n.includes("Door") || n.includes("Trapdoor") || n.includes("Lever") || n.includes("Plate") || n.includes("Dispenser") || n.includes("Piston")) return 5;
  if (n.includes("Pickaxe") || (n.includes("Axe") && !n.includes("Pickaxe")) || n.includes("Shovel") || n.includes("Hoe") || n.includes("Shears") || n.includes("Fishing") || n.includes("Compass") || n.includes("Clock") || n.includes("Flint and steel")) return 6;
  if (n.includes("Sword") || n.includes("Bow") || n.includes("Crossbow") || n.includes("Arrow") || n.includes("Shield") || n.includes("Helmet") || n.includes("Chestplate") || n.includes("Leggings") || n.includes("Boots")) return 7;
  if (n.includes("Apple") || n.includes("Bread") || n.includes("Beef") || n.includes("Porkchop") || n.includes("Carrot") || n.includes("Potato") || n.includes("Cookie") || n.includes("Cake") || n.includes("Wheat") || n.includes("Berry") || n.includes("Melon") || n.includes("Pumpkin") || n.includes("Hay")) return 8;
  return 9;
}

function getCustomBlockOverrideThumb(id: number): string | null {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem("mc_custom_atlas_overrides") : null;
    if (!raw) return null;
    const overrides = JSON.parse(raw);
    return (
      overrides[`block_${id}_single_top`] ||
      overrides[`block_${id}_top`] ||
      overrides[`block_${id}_single_side`] ||
      overrides[`block_${id}_side`] ||
      overrides[`block_${id}`] ||
      null
    );
  } catch {
    return null;
  }
}

// Extended/custom objects (our invented woods/leaves/biomes) are hidden from the
// default creative catalog; a "Load extended list" toggle reveals them.
const EXTENDED_NAMES: Set<string> = new Set(
  Object.values(objectClassification)
    .filter((c: any) => c.kind === "extended")
    .map((c: any) => c.name)
);

export interface EquippedArmorState {
  helmet: any;
  chestplate: any;
  leggings: any;
  boots: any;
}

export interface InventoryModalProps {
  isOpen: boolean;
  loading: boolean;
  creative?: boolean;
  equippedArmor: EquippedArmorState;
  setEquippedArmor: React.Dispatch<React.SetStateAction<EquippedArmorState>>;
  craftGrid: Array<{ id: number; count: number } | null>;
  craftResult: { output: { id: number; count: number } } | null;
  isoThumbnails: Map<number, string>;
  selectedInvBlock: number;
  setSelectedInvBlock: (id: number) => void;
  hotbar: number[];
  hotbarCounts?: number[];
  setHotbar?: React.Dispatch<React.SetStateAction<number[]>>;
  setHotbarCounts?: React.Dispatch<React.SetStateAction<number[]>>;
  activeSlot: number;
  setActiveSlot: (slot: number) => void;
  invMain: Array<{ id: number; count: number } | null>;
  setInvMain?: React.Dispatch<React.SetStateAction<Array<{ id: number; count: number } | null>>>;
  onCraftCellClick?: (index: number) => void;
  onCraftResultClick?: () => void;
  onCraftReset?: () => void;
  onAssignToHotbar: (blockId: number, slotIndex?: number) => void;
  onMainSlotClick?: (index: number) => void;
  onClose: () => void;
  showToast: (msg: string) => void;
}

type CreativeTabId =
  | "all"
  | "custom"
  | "building"
  | "decoration"
  | "redstone"
  | "transportation"
  | "natural"
  | "food"
  | "tools"
  | "combat"
  | "colored"
  | "models3d"
  | "survival";

type CustomBlock = { customAssetId?: number };

interface TabDef {
  id: CreativeTabId;
  label: string;
  defaultBlockId: number;
  fallbackIcon: string;
}

const TOP_TABS: TabDef[] = [
  { id: "all", label: "All Items", defaultBlockId: 0, fallbackIcon: "🧭" },
  { id: "custom", label: "Custom Assets", defaultBlockId: 1199, fallbackIcon: "✨" },
  { id: "building", label: "Building Blocks", defaultBlockId: 50, fallbackIcon: "🧱" },
  { id: "decoration", label: "Decoration Blocks", defaultBlockId: 126, fallbackIcon: "🌸" },
  { id: "redstone", label: "Redstone", defaultBlockId: 84, fallbackIcon: "🔴" },
  { id: "transportation", label: "Transportation", defaultBlockId: 46, fallbackIcon: "🛤️" },
  { id: "natural", label: "Natural & Misc", defaultBlockId: 1, fallbackIcon: "🌿" },
  { id: "models3d", label: "3D Models", defaultBlockId: 80, fallbackIcon: "🏮" }
];

const BOTTOM_TABS: TabDef[] = [
  { id: "food", label: "Foodstuffs", defaultBlockId: 49, fallbackIcon: "🍏" },
  { id: "tools", label: "Tools & Utilities", defaultBlockId: 41, fallbackIcon: "⛏️" },
  { id: "combat", label: "Combat", defaultBlockId: 35, fallbackIcon: "⚔️" },
  { id: "colored", label: "Colored Wool", defaultBlockId: 62, fallbackIcon: "🎨" },
  { id: "survival", label: "Survival Inventory", defaultBlockId: 43, fallbackIcon: "📦" }
];

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  loading,
  creative = false,
  equippedArmor,
  setEquippedArmor,
  craftGrid,
  craftResult,
  isoThumbnails,
  selectedInvBlock,
  setSelectedInvBlock,
  hotbar,
  hotbarCounts = [],
  setHotbar,
  setHotbarCounts,
  activeSlot,
  setActiveSlot,
  invMain = [],
  setInvMain,
  onCraftCellClick,
  onCraftResultClick,
  onCraftReset,
  onAssignToHotbar: _onAssignToHotbar,
  onClose,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<CreativeTabId>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showExtended, setShowExtended] = useState<boolean>(false);
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const [hoveredItem, setHoveredItem] = useState<number | null>(null);
  const [customAssetVersion, setCustomAssetVersion] = useState(0);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const showItemTip = (e: React.MouseEvent, id: number) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltipPos({ x: r.left + r.width / 2, y: r.top - 8 });
    setHoveredTab(null);
    setHoveredItem(id);
  };
  const [recipeBookOpen, setRecipeBookOpen] = useState<boolean>(false);
  const [offhandItem, setOffhandItem] = useState<number | null>(null);

  // Floating Cursor Item Stack (Minecraft Drag & Drop - Ref-based zero React re-renders)
  const [cursorStack, setCursorStack] = useState<{ id: number; count: number } | null>(null);
  const [cursorSource, setCursorSource] = useState<{ container: "main" | "hotbar"; index: number } | null>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Track mouse coordinates directly via CSS transform on cursorRef (zero React diffing)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      }
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Auto-focus search input when inventory opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen, activeTab]);

  useEffect(() => {
    let syncing = false;
    const syncAssets = () => {
      if (syncing) return;
      syncing = true;
      apiGetCustomAssets().then(cat => {
        registerCustomAssets(cat.assets, true);
        setCustomAssetVersion(prev => prev + 1);
      }).catch(() => {}).finally(() => {
        setTimeout(() => { syncing = false; }, 100);
      });
    };
    if (isOpen) syncAssets();
    window.addEventListener("custom-assets-updated", syncAssets);
    const onStorage = (e: StorageEvent) => {
      if (e.key === "mc_custom_atlas_overrides" || e.key === "mc_custom_atlas_version") {
        syncAssets();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("custom-assets-updated", syncAssets);
      window.removeEventListener("storage", onStorage);
    };
  }, [isOpen]);

  // Is Survival GUI view currently active? When searching, always show the filtered
  // catalog even in survival so "tall grass" etc. are findable without switching to creative.
  const isSurvivalView = (!creative || activeTab === "survival") && searchQuery.trim().length === 0;

  // Category filter
  const rawTabBlocks = useMemo(() => {
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase().trim();
      const matches = BLOCKS.filter(b => b.id > 0 && (b.name.toLowerCase().includes(q) || String(b.id).includes(q)));
      const customs = matches.filter(b => isCustom(b));
      const others = matches.filter(b => !isCustom(b));
      return [...customs, ...others];
    }

    switch (activeTab) {
      case "all": {
        return BLOCKS.filter(b => b.id > 0).sort((a, b) => (vanillaRank(a) - vanillaRank(b)) || (a.id - b.id));
      }
      case "custom":
        return BLOCKS.filter(b => b.id > 0 && isCustom(b));
      case "models3d":
        return BLOCKS.filter(b => b.id > 0 && VANILLA_3D_SET.has(b.id));
      case "building":
        return BLOCKS.filter(
          b =>
            b.id > 0 &&
            (isCustom(b) ||
              b.category === "building" ||
              b.category === "wood" ||
              b.stair ||
              b.name.includes("Planks") ||
              b.name.includes("Stone") ||
              b.name.includes("Bricks") ||
              b.name.includes("Sandstone") ||
              b.name.includes("Glass"))
        );
      case "decoration":
        return BLOCKS.filter(
          b =>
            b.id > 0 &&
            (isCustom(b) ||
              b.category === "utility" ||
              b.category === "decoration" ||
              b.name.includes("Leaves") ||
              b.name.includes("Torch") ||
              b.name.includes("Lantern") ||
              b.name.includes("Bookshelf") ||
              b.name.includes("Bed") ||
              b.name.includes("Table") ||
              b.name.includes("Furnace") ||
              b.name.includes("Chest") ||
              b.name.includes("Ladder") ||
              b.name.includes("Sponge") ||
              b.name.includes("Campfire") ||
              b.name.includes("Poppy") ||
              b.name.includes("Dandelion") ||
              b.name.includes("Coral") ||
              b.name.includes("Pickle"))
        );
      case "redstone":
        return BLOCKS.filter(
          b =>
            b.id > 0 &&
            (b.name.includes("Redstone") ||
              b.name.includes("TNT") ||
              b.name.includes("Lamp") ||
              b.name.includes("Torch") ||
              b.name.includes("Slime") ||
              b.name.includes("Door") ||
              b.name.includes("Trapdoor") ||
              b.name.includes("Lever") ||
              b.name.includes("Plate") ||
              b.name.includes("Dispenser") ||
              b.name.includes("Piston"))
        );
      case "transportation":
        return BLOCKS.filter(
          b =>
            b.id > 0 &&
            (b.name.includes("Rail") ||
              b.name.includes("Minecart") ||
              b.name.includes("Boat") ||
              b.name.includes("Ladder"))
        );
      case "natural":
        return BLOCKS.filter(
          b =>
            b.id > 0 &&
            (b.category === "natural" ||
              b.category === "ores" ||
              b.category === "nether_end" ||
              b.name.includes("Grass") ||
              b.name.includes("Dirt") ||
              b.name.includes("Sand") ||
              b.name.includes("Gravel") ||
              b.name.includes("Clay") ||
              b.name.includes("Ice") ||
              b.name.includes("Snow") ||
              b.name.includes("Obsidian") ||
              b.name.includes("Bedrock") ||
              b.name.includes("Bucket"))
        );
      case "food":
        return BLOCKS.filter(
          b =>
            b.id > 0 &&
            (b.name.includes("Apple") ||
              b.name.includes("Bread") ||
              b.name.includes("Beef") ||
              b.name.includes("Porkchop") ||
              b.name.includes("Carrot") ||
              b.name.includes("Potato") ||
              b.name.includes("Cookie") ||
              b.name.includes("Cake") ||
              b.name.includes("Wheat") ||
              b.name.includes("Berry") ||
              b.name.includes("Melon") ||
              b.name.includes("Pumpkin") ||
              b.name.includes("Hay"))
        );
      case "tools":
        return BLOCKS.filter(
          b =>
            b.id > 0 &&
            (b.name.includes("Pickaxe") ||
              b.name.includes("Axe") && !b.name.includes("Pickaxe") ||
              b.name.includes("Shovel") ||
              b.name.includes("Hoe") ||
              b.name.includes("Shears") ||
              b.name.includes("Fishing") ||
              b.name.includes("Compass") ||
              b.name.includes("Clock") ||
              b.name.includes("Flint and steel") ||
              b.name.includes("Bucket") ||
              b.category === "utility" ||
              b.name.includes("Table") ||
              b.name.includes("Furnace") ||
              b.name.includes("Chest"))
        );
      case "combat":
        return BLOCKS.filter(
          b =>
            b.id > 0 &&
            (b.name.includes("Sword") ||
              b.name.includes("Bow") ||
              b.name.includes("Crossbow") ||
              b.name.includes("Arrow") ||
              b.name.includes("Shield") ||
              b.name.includes("Helmet") ||
              b.name.includes("Chestplate") ||
              b.name.includes("Leggings") ||
              b.name.includes("Boots") ||
              b.name.includes("TNT"))
        );
      case "colored":
        return BLOCKS.filter(
          b =>
            b.id > 0 &&
            (b.category === "colored" ||
              b.name.includes("Wool") ||
              b.name.includes("Concrete") ||
              b.name.includes("Terracotta") ||
              b.name.includes("Glass"))
        );
      default:
        return BLOCKS.filter(b => b.id > 0);
    }
  }, [activeTab, searchQuery, customAssetVersion]);

  // Segregation: default = vanilla objects only; "Load extended list" reveals customs.
  const filteredBlocks = useMemo(() => {
    const searching = searchQuery.trim().length > 0;
    if (showExtended || searching || activeTab === "custom") return rawTabBlocks;
    return rawTabBlocks.filter((b: any) => !EXTENDED_NAMES.has(b.name) || isCustom(b));
  }, [rawTabBlocks, searchQuery, showExtended, activeTab]);

  // Always pad grid to a multiple of 9, with minimum 45 slots
  const displaySlots = useMemo(() => {
    const totalCount = Math.max(45, Math.ceil(filteredBlocks.length / 9) * 9);
    const slots: Array<BlockDef | null> = [];
    for (let i = 0; i < totalCount; i++) {
      slots.push(i < filteredBlocks.length ? filteredBlocks[i] : null);
    }
    return slots;
  }, [filteredBlocks]);

  if (!isOpen || loading) return null;

  // Active Category Name Display
  const currentTabDef = [...TOP_TABS, ...BOTTOM_TABS].find(t => t.id === activeTab);
  const categoryTitle = activeTab === "all" ? "All Items" : currentTabDef?.label || "Building Blocks";

  // Cursor Drag & Drop Slot Handlers
  const handleSlotClick = (
    e: React.MouseEvent,
    slotType: "main" | "hotbar" | "craft" | "armor" | "offhand" | "trash",
    index: number
  ) => {
    e.stopPropagation();
    e.preventDefault();

    // 1. Creative Catalog Interaction
    if (slotType === "main" && !isSurvivalView) {
      if (cursorStack) {
        // Dragging/clicking an item back to the creative catalog destroys it (classic MC creative behavior)
        setCursorStack(null);
        showToast("Item deleted from cursor 🗑️");
        return;
      }
      const b = displaySlots[index];
      if (b && b.id > 0) {
        setSelectedInvBlock(b.id);
        if (e.shiftKey && setHotbar && setHotbarCounts) {
          // Shift-Click: Instantly assign 64-stack to the first empty hotbar slot or active slot!
          const emptyIdx = hotbar.findIndex((h, hi) => h === 0 || (hotbarCounts[hi] || 0) === 0);
          const targetSlot = emptyIdx !== -1 ? emptyIdx : activeSlot;
          const newHotbar = [...hotbar];
          const newCounts = [...hotbarCounts];
          newHotbar[targetSlot] = b.id;
          newCounts[targetSlot] = 64;
          setHotbar(newHotbar);
          setHotbarCounts(newCounts);
          showToast(`⚡ Equipped ${b.name} to Hotbar slot ${targetSlot + 1}`);
          return;
        }
        setCursorStack({ id: b.id, count: 64 });
      }
      return;
    }

    // Creative Hotbar Drop (Clicking hotbar slot with cursorStack in creative mode places full stack)
    if (!isSurvivalView && slotType === "hotbar" && cursorStack && setHotbar && setHotbarCounts) {
      const newHotbar = [...hotbar];
      const newCounts = [...hotbarCounts];
      newHotbar[index] = cursorStack.id;
      newCounts[index] = cursorStack.count;
      setHotbar(newHotbar);
      setHotbarCounts(newCounts);
      setSelectedInvBlock(cursorStack.id);
      showToast(`📦 Placed ${BLOCK_MAP.get(cursorStack.id)?.name || "Item"} in Hotbar slot ${index + 1}`);
      return;
    }

    // 2. Trash Slot in Creative Survival Tab
    if (slotType === "trash") {
      // Delete the cursor stack AND its source slot (whole stack removal)
      if (cursorSource) {
        if (cursorSource.container === "main" && setInvMain) {
          const m = [...invMain];
          m[cursorSource.index] = null;
          setInvMain(m);
          showToast("Item deleted ❌");
        } else if (cursorSource.container === "hotbar" && setHotbar && setHotbarCounts) {
          const h = [...hotbar];
          const c = [...hotbarCounts];
          h[cursorSource.index] = 0;
          c[cursorSource.index] = 0;
          setHotbar(h);
          setHotbarCounts(c);
          showToast("Item deleted ❌");
        }
      } else {
        showToast("Item deleted ❌");
      }
      setCursorStack(null);
      setCursorSource(null);
      return;
    }

    // 3. Shift-Click Quick Move between Hotbar and 3x9 Main Storage (Reorganization of 36 slots)
    if (e.shiftKey) {
      if (slotType === "main" && setInvMain && setHotbar && setHotbarCounts) {
        const currentSlot = invMain[index];
        if (currentSlot && currentSlot.id > 0) {
          const emptyHotbarIdx = hotbar.findIndex((h, hi) => h === 0 || (hotbarCounts[hi] || 0) === 0);
          if (emptyHotbarIdx !== -1) {
            const newHotbar = [...hotbar];
            const newCounts = [...hotbarCounts];
            newHotbar[emptyHotbarIdx] = currentSlot.id;
            newCounts[emptyHotbarIdx] = currentSlot.count;
            setHotbar(newHotbar);
            setHotbarCounts(newCounts);
            const newInv = [...invMain];
            newInv[index] = null;
            setInvMain(newInv);
          }
        }
      } else if (slotType === "hotbar" && setInvMain && setHotbar && setHotbarCounts) {
        const currentId = hotbar[index];
        const currentCount = hotbarCounts[index] || 0;
        if (currentId > 0 && currentCount > 0) {
          const emptyInvIdx = invMain.findIndex(s => !s || s.id === 0);
          if (emptyInvIdx !== -1) {
            const newInv = [...invMain];
            newInv[emptyInvIdx] = { id: currentId, count: currentCount };
            setInvMain(newInv);
            const newHotbar = [...hotbar];
            const newCounts = [...hotbarCounts];
            newHotbar[index] = 0;
            newCounts[index] = 0;
            setHotbar(newHotbar);
            setHotbarCounts(newCounts);
          }
        }
      }
      return;
    }

    // Helper: read current slot
    let slotId = 0;
    let slotCount = 0;
    if (slotType === "main") {
      const s = invMain[index];
      if (s) { slotId = s.id; slotCount = s.count; }
    } else if (slotType === "hotbar") {
      slotId = hotbar[index] || 0;
      slotCount = hotbarCounts[index] || 0;
    }

    // Helper: write slot
    const setSlot = (id: number, count: number) => {
      if (slotType === "main" && setInvMain) {
        const newInv = [...invMain];
        newInv[index] = count > 0 && id > 0 ? { id, count } : null;
        setInvMain(newInv);
      } else if (slotType === "hotbar" && setHotbar && setHotbarCounts) {
        const newH = [...hotbar];
        const newC = [...hotbarCounts];
        newH[index] = count > 0 && id > 0 ? id : 0;
        newC[index] = count > 0 && id > 0 ? count : 0;
        setHotbar(newH);
        setHotbarCounts(newC);
      }
    };

    // 4. Left-Click (button === 0): Move 1 item
    if (e.button === 0) {
      if (!cursorStack) {
        if (slotId > 0 && slotCount > 0) {
          setCursorStack({ id: slotId, count: 1 });
          setCursorSource(slotType === "main" || slotType === "hotbar" ? { container: slotType, index } : null);
          setSlot(slotId, slotCount - 1);
        }
      } else {
        setCursorSource(null);
        if (slotCount === 0 || slotId === 0) {
          setSlot(cursorStack.id, 1);
          if (cursorStack.count > 1) {
            setCursorStack({ id: cursorStack.id, count: cursorStack.count - 1 });
          } else {
            setCursorStack(null);
          }
        } else if (slotId === cursorStack.id && slotCount < 64) {
          setSlot(slotId, slotCount + 1);
          if (cursorStack.count > 1) {
            setCursorStack({ id: cursorStack.id, count: cursorStack.count - 1 });
          } else {
            setCursorStack(null);
          }
        } else if (slotId !== cursorStack.id && cursorStack.count === 1) {
          const temp = { id: slotId, count: slotCount };
          setSlot(cursorStack.id, 1);
          setCursorStack(temp);
        }
      }
      return;
    }

    // 5. Right-Click (button === 2): Move full stack (64 items)
    if (e.button === 2) {
      if (!cursorStack) {
        if (slotId > 0 && slotCount > 0) {
          setCursorStack({ id: slotId, count: slotCount });
          setCursorSource(slotType === "main" || slotType === "hotbar" ? { container: slotType, index } : null);
          setSlot(0, 0);
        }
      } else {
        setCursorSource(null);
        if (slotCount === 0 || slotId === 0) {
          setSlot(cursorStack.id, cursorStack.count);
          setCursorStack(null);
        } else if (slotId === cursorStack.id) {
          const space = 64 - slotCount;
          const transfer = Math.min(space, cursorStack.count);
          setSlot(slotId, slotCount + transfer);
          if (cursorStack.count > transfer) {
            setCursorStack({ id: cursorStack.id, count: cursorStack.count - transfer });
          } else {
            setCursorStack(null);
          }
        } else {
          const temp = { id: slotId, count: slotCount };
          setSlot(cursorStack.id, cursorStack.count);
          setCursorStack(temp);
        }
      }
    }
  };

  const handleTabMouseEnter = (e: React.MouseEvent, label: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 8 });
    setHoveredTab(label);
  };

  return (
    <div
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-2 select-none animate-fade pointer-events-auto"
    >
      {/* Outer Assembly: Top External Tabs + Fixed-Size Window Container + Bottom External Tabs */}
      <div className="relative flex flex-col items-center">
        
        {/* ========================================================================= */}
        {/* 1. TOP EXTERNAL TABS (Attached to Outside Top Border: OG Minecraft Layout) */}
        {/* ========================================================================= */}
        {creative && (
          <div className="w-[484px] flex items-end justify-start px-2 -mb-[2px] z-10">
            <div className="flex items-end gap-[3px]">
              {TOP_TABS.filter(tab => tab.id !== "models3d" || isSimPort()).map(tab => {
                const isActive = activeTab === tab.id;
                const thumb = tab.defaultBlockId ? isoThumbnails.get(tab.defaultBlockId) : null;
                return (
                  <button
                    key={tab.id}
                    data-tab-id={tab.id}
                    title={tab.label}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSearchQuery("");
                    }}
                    onMouseEnter={e => handleTabMouseEnter(e, tab.label)}
                    onMouseLeave={() => setHoveredTab(null)}
                    className={`w-9 h-8 ${isActive ? "mc-tab-top-active h-9" : "mc-tab-top"}`}
                  >
                    {thumb ? (
                      <img src={thumb} alt={tab.label} className="w-5 h-5 object-contain pointer-events-none drop-shadow" />
                    ) : (
                      <span className="text-base pointer-events-none">{tab.fallbackIcon}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. CENTRAL MAIN GREY WINDOW CONTAINER (Dynamic Spacing: No Collision)      */}
        {/* ========================================================================= */}
        <div className="w-[484px] min-h-[360px] mc-window bg-[#C6C6C6] p-3 flex flex-col justify-between border-4 border-[#373737] shadow-2xl relative z-0 box-border gap-2.5" data-testid="inventory-window">
          
          {/* ----------------------------------------------------------------------- */}
          {/* VIEW A: CREATIVE CATEGORIZED / SEARCH BROWSER                           */}
          {/* ----------------------------------------------------------------------- */}
          {!isSurvivalView ? (
            <div className="flex flex-col gap-2 h-full justify-between">
              
              {/* Header: Category Name or Search Bar */}
              <div className="flex items-center justify-between gap-2 h-7 px-0.5">
                <div className="flex items-center gap-2">
                  <div className="text-xs font-bold text-[#3F3F3F] tracking-wide">
                    {categoryTitle}
                  </div>
                  <button
                    onClick={() => setShowExtended(v => !v)}
                    title={showExtended ? "Showing vanilla + extended/custom items" : "Showing vanilla items only — click to reveal extended/custom objects"}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${showExtended ? "bg-[#3f3f3f] text-white border-[#6a6a6a]" : "bg-[#e9e0cb] text-[#3f3f3f] border-[#6a6a6a]"}`}
                  >
                    {showExtended ? "Hide extended list" : "Load extended list"}
                  </button>
                </div>

                {/* Search Text Box */}
                <div className="flex items-center gap-1.5">
                  <div className="w-48 bg-[#111111] px-2 py-1 mc-slot border border-[#373737] flex items-center h-6">
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Search items..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full bg-transparent text-xs text-white placeholder-white/40 focus:outline-none font-bold"
                    />
                    {!searchQuery && <span className="text-white/40 text-xs animate-pulse">_</span>}
                  </div>
                  {/* X Close button (touch-friendly — iPads have no Esc key) */}
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close inventory"
                    title="Close"
                    className="w-7 h-7 bg-[#C6C6C6] border-2 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555] flex items-center justify-center text-[12px] font-bold text-[#3F3F3F] shadow hover:bg-[#d8d8d8] active:border-t-[#555555] active:border-l-[#555555] cursor-pointer"
                  >✕</button>
                </div>
              </div>

              {/* 9×5 Grid (45 Fixed Visible Slots) with Right Scrollbar Track */}
              <div className="flex items-start gap-1">
                <div className="flex-1 h-[180px] overflow-y-auto p-1 mc-scrollbar grid grid-cols-9 gap-1 bg-[#8B8B8B] mc-slot">
                  {displaySlots.map((b, i) => {
                    const customOverride = b && (b.id >= 1000 || (b as CustomBlock).customAssetId) ? getCustomBlockOverrideThumb(b.id) : null;
                    const thumb = b ? (isoThumbnails.get(b.id) || customOverride) : null;
                    const isSelected = b && selectedInvBlock === b.id;
                    const isEquipped = b && hotbar.slice(0, 9).includes(b.id);
                    return (
                      <button
                        key={i}
                        onMouseDown={e => handleSlotClick(e, "main", i)}
                        onMouseEnter={e => { if (b) { showItemTip(e, b.id); setSelectedInvBlock(b.id); } }}
                        onMouseLeave={() => setHoveredItem(null)}
                        onContextMenu={e => e.preventDefault()}
                        onDragStart={e => e.preventDefault()}
                        className={`w-9 h-9 mc-slot flex items-center justify-center p-0.5 aspect-square relative cursor-pointer ${
                          isSelected ? "mc-slot-active" : ""
                        }`}
                      >
                        {thumb && b ? (
                          <img src={thumb} alt={b.name} draggable={false} className="w-full h-full object-contain drop-shadow p-0.5 pointer-events-none select-none" />
                        ) : (b as CustomBlock | null)?.customAssetId || (b && b.id >= 1000) ? (
                          <span className="text-lg pointer-events-none">✨</span>
                        ) : null}
                        {isEquipped && (
                          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-[#55FF55] border border-black pointer-events-none" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 9 Hotbar Slots at Bottom (Aligned Vertically with 9 Grid Columns) */}
              <div className="pt-2 border-t-2 border-[#8B8B8B]/40">
                <div className="text-[10px] font-bold text-[#4F4F4F] mb-1">Hotbar</div>
                <div className="grid grid-cols-9 gap-1 bg-[#8B8B8B] p-1 mc-slot">
                  {hotbar.slice(0, 9).map((blockId, idx) => {
                    const isSelected = idx === activeSlot;
                    const customOverride = blockId > 0 && (blockId >= 1000 || (BLOCK_MAP.get(blockId) as CustomBlock | undefined)?.customAssetId) ? getCustomBlockOverrideThumb(blockId) : null;
                    const thumb = blockId > 0 ? (isoThumbnails.get(blockId) || customOverride) : null;
                    const count = hotbarCounts[idx] || 0;
                    return (
                      <button
                        key={idx}
                        onMouseDown={e => {
                          setActiveSlot(idx);
                          handleSlotClick(e, "hotbar", idx);
                        }}
                        onMouseEnter={e => { if (blockId > 0) showItemTip(e, blockId); }}
                        onMouseLeave={() => setHoveredItem(null)}
                        onContextMenu={e => e.preventDefault()}
                        onDragStart={e => e.preventDefault()}
                        className={`w-9 h-9 mc-slot flex items-center justify-center p-0.5 aspect-square relative cursor-pointer ${
                          isSelected ? "mc-slot-active" : ""
                        }`}
                      >
                        {thumb && blockId > 0 ? (
                          <img src={thumb} alt="" draggable={false} className="w-full h-full object-contain drop-shadow p-0.5 pointer-events-none select-none" />
                        ) : blockId >= 1000 || (BLOCK_MAP.get(blockId) as CustomBlock | undefined)?.customAssetId ? (
                          <span className="text-lg pointer-events-none">✨</span>
                        ) : null}
                        {!creative && count > 1 && (
                          <span className="absolute right-0.5 bottom-0.5 text-[9px] font-bold text-white mc-text-shadow pointer-events-none select-none">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
          ) : (
            /* ----------------------------------------------------------------------- */
            /* VIEW B: SURVIVAL INVENTORY GUI (inventory.png)                          */
            /* ----------------------------------------------------------------------- */
            <div className="flex flex-col gap-2 h-full justify-between">
              {/* Survival search — always visible so "tall grass" etc. are findable */}
              <div className="flex items-center gap-1.5">
                <div className="flex-1 bg-[#111111] px-2 py-1 mc-slot border border-[#373737] flex items-center h-6">
                  <input
                    type="text"
                    placeholder="Search items... (try &quot;tall grass&quot;)"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full bg-transparent text-xs text-white placeholder-white/40 focus:outline-none font-bold"
                  />
                </div>
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="w-6 h-6 bg-[#C6C6C6] border border-[#373737] flex items-center justify-center text-[10px] font-bold text-[#3F3F3F]"
                    title="Clear search"
                  >✕</button>
                )}
              </div>
              
              {/* Top Section: 4 Armor Slots + Paperdoll Box + 2×2 Crafting */}
              <div className="flex items-start justify-between gap-2.5">
                
                {/* 4 Armor Slots */}
                <div className="flex flex-col gap-1">
                  {(["helmet", "chestplate", "leggings", "boots"] as const).map(slot => {
                    const piece = equippedArmor[slot];
                    const emptyIcons: Record<string, string> = {
                      helmet: "🪖",
                      chestplate: "🛡️",
                      leggings: "👖",
                      boots: "👢"
                    };
                    return (
                      <button
                        key={slot}
                        onClick={() => {
                          if (piece) {
                            setEquippedArmor(prev => ({ ...prev, [slot]: null }));
                            showToast(`Unequipped ${piece.name}`);
                          }
                        }}
                        title={piece ? piece.name : `Empty ${slot} slot`}
                        className={`w-9 h-9 mc-slot flex items-center justify-center text-sm ${
                          piece ? "border-[#55FF55] bg-[#2b8a3e]/30" : "opacity-40"
                        }`}
                      >
                        {piece ? piece.icon : emptyIcons[slot]}
                      </button>
                    );
                  })}
                </div>

                {/* Sunken Player Character Paperdoll Box */}
                <div className="relative flex-1 h-[156px] mc-slot bg-[#0a0e14] flex flex-col items-center justify-center border-2 border-[#373737] overflow-hidden py-1">
                  <PlayerPaperdoll equippedArmor={equippedArmor} />

                  {/* Off-hand Shield Slot with Watermark */}
                  <button
                    onClick={() => {
                      if (offhandItem) {
                        setOffhandItem(null);
                        showToast("Removed off-hand item");
                      }
                    }}
                    title={offhandItem ? `Off-hand item` : "Off-hand / Shield Slot"}
                    className="absolute bottom-1 left-1 w-8 h-8 mc-slot flex items-center justify-center bg-black/40 border border-[#555555] text-xs text-white/50"
                  >
                    {offhandItem ? (
                      <img src={isoThumbnails.get(offhandItem)} alt="" className="w-6 h-6 object-contain" />
                    ) : (
                      "⛨"
                    )}
                  </button>

                  <div className="absolute bottom-1 right-2 text-[9px] text-[#55FF55] font-bold mc-text-shadow">
                    +{[equippedArmor.helmet, equippedArmor.chestplate, equippedArmor.leggings, equippedArmor.boots].reduce((a, b) => a + (b?.defense || 0), 0)} 🛡️
                  </div>
                </div>

                {/* Crafting 2×2 Matrix + Output Slot */}
                <div className="flex flex-col gap-1 items-end">
                  <div className="text-[10px] font-bold text-[#373737] uppercase tracking-wider self-start">
                    Crafting
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="grid grid-cols-2 gap-1">
                      {[0, 1, 2, 3].map(i => {
                        const cell = craftGrid[i];
                        const cellThumb = cell ? isoThumbnails.get(cell.id) : null;
                        return (
                          <button
                            key={i}
                            onClick={() => onCraftCellClick?.(i)}
                            className="w-8 h-8 mc-slot flex items-center justify-center p-0.5 relative"
                          >
                            {cellThumb && (
                              <img src={cellThumb} alt="" className="w-full h-full object-contain drop-shadow" />
                            )}
                            {cell && cell.count > 1 && (
                              <span className="absolute right-0.5 bottom-0 text-[8px] font-bold text-white mc-text-shadow">
                                {cell.count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <span className="text-xs font-bold text-[#555555]">➔</span>

                    {/* Output Slot */}
                    <button
                      onClick={onCraftResultClick}
                      className="w-9 h-9 mc-slot flex items-center justify-center p-0.5 relative border-2 border-[#555555]"
                    >
                      {craftResult && (
                        <>
                          <img
                            src={isoThumbnails.get(craftResult.output.id)}
                            alt=""
                            className="w-full h-full object-contain drop-shadow"
                          />
                          <span className="absolute right-0.5 bottom-0 text-[9px] font-bold text-white mc-text-shadow">
                            {craftResult.output.count}
                          </span>
                        </>
                      )}
                    </button>

                    {onCraftReset && (
                      <button
                        onClick={onCraftReset}
                        title="Clear crafting grid"
                        className="mc-button px-1 py-0.5 text-[8px] font-bold !text-white"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Recipe Book Toggle Button */}
                  <button
                    onClick={() => setRecipeBookOpen(!recipeBookOpen)}
                    className={`w-full mc-button py-0.5 text-[9px] font-bold flex items-center justify-center gap-1 mt-1 ${
                      recipeBookOpen ? "bg-[#2b8a3e] text-white" : ""
                    }`}
                  >
                    <span>📖</span>
                    <span>Recipes</span>
                  </button>
                </div>

              </div>

              {/* Recipe Book Drawer */}
              {recipeBookOpen && (
                <div className="bg-[#8b8b8b] p-1.5 mc-slot rounded max-h-20 overflow-y-auto grid grid-cols-6 gap-1 border border-[#555555]">
                  {CRAFT_RECIPES.map((rec, rIdx) => {
                    const outName = BLOCK_MAP.get(rec.output.id)?.name || "Item";
                    return (
                      <button
                        key={rIdx}
                        onClick={() => showToast(`Recipe: ${outName} ×${rec.output.count}`)}
                        className="mc-button p-0.5 flex items-center justify-center gap-1 text-[8px]"
                      >
                        <img src={isoThumbnails.get(rec.output.id)} alt="" className="w-3.5 h-3.5 object-contain" />
                        <span className="truncate">{outName}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Middle Section: 3 Rows × 9 Columns = 27 Main Inventory Slots */}
              <div className="grid grid-cols-9 gap-1 bg-[#8B8B8B] p-1 mc-slot relative">
                 {invMain.map((slot, i) => {
                   const thumb = slot && slot.id > 0 ? isoThumbnails.get(slot.id) : null;
                   return (
                      <button
                        key={i}
                        onClick={e => handleSlotClick(e, "main", i)}
                        onMouseEnter={e => { if (slot && slot.id > 0) showItemTip(e, slot.id); }}
                        onMouseLeave={() => setHoveredItem(null)}
                        className="w-9 h-9 mc-slot flex items-center justify-center p-0.5 aspect-square relative"
                      >
                      {thumb && slot ? (
                        <img src={thumb} alt="" className="w-full h-full object-contain drop-shadow p-0.5" />
                      ) : slot && (BLOCK_MAP.get(slot.id) as CustomBlock | undefined)?.customAssetId ? (
                        <span className="text-lg pointer-events-none">🧩</span>
                      ) : null}
                      {slot && slot.count > 1 && (
                        <span className="absolute right-0.5 bottom-0.5 text-[9px] font-bold text-white mc-text-shadow">
                          {slot.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Bottom Section: 9 Hotbar Slots + Creative Destroy Item Slot */}
              <div className="flex items-center gap-1">
                <div className="flex-1 grid grid-cols-9 gap-1 bg-[#8B8B8B] p-1 mc-slot">
                  {hotbar.slice(0, 9).map((blockId, idx) => {
                    const isSelected = idx === activeSlot;
                    const thumb = blockId > 0 ? isoThumbnails.get(blockId) : null;
                    const count = hotbarCounts[idx] || 0;
                    return (
                      <button
                        key={idx}
                        onClick={e => {
                          setActiveSlot(idx);
                          handleSlotClick(e, "hotbar", idx);
                        }}
                        onMouseEnter={e => { if (blockId > 0) showItemTip(e, blockId); }}
                        onMouseLeave={() => setHoveredItem(null)}
                        className={`w-9 h-9 mc-slot flex items-center justify-center p-0.5 aspect-square relative ${
                          isSelected ? "mc-slot-active" : ""
                        }`}
                      >
                        {thumb && blockId > 0 ? (
                          <img src={thumb} alt="" className="w-full h-full object-contain drop-shadow p-0.5" />
                        ) : (BLOCK_MAP.get(blockId) as CustomBlock | undefined)?.customAssetId ? (
                          <span className="text-lg pointer-events-none">🧩</span>
                        ) : null}
                        {!creative && count > 1 && (
                          <span className="absolute right-0.5 bottom-0.5 text-[9px] font-bold text-white mc-text-shadow">
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Creative Mode Destroy Item / Trash Slot (Bottom Right: ❌) */}
                {creative && (
                  <button
                    onClick={e => handleSlotClick(e, "trash", 0)}
                    title="Destroy Item / Clear Cursor"
                    className="w-9 h-9 mc-slot flex items-center justify-center p-0.5 aspect-square bg-[#702020] text-sm text-white font-bold hover:bg-[#902020] border-2 border-[#550000]"
                  >
                    ❌
                  </button>
                )}
              </div>

            </div>
          )}

        </div>

        {/* ========================================================================= */}
        {/* 3. BOTTOM EXTERNAL TABS (Attached to Outside Bottom Border: 1.19.3 Layout) */}
        {/* ========================================================================= */}
        {creative && (
          <div className="w-[484px] flex items-start justify-between px-2 -mt-[2px] z-10">
            <div className="flex items-start gap-[3px]">
              {BOTTOM_TABS.slice(0, 5).map(tab => {
                const isActive = activeTab === tab.id;
                const thumb = tab.defaultBlockId ? isoThumbnails.get(tab.defaultBlockId) : null;
                return (
                  <button
                    key={tab.id}
                    data-tab-id={tab.id}
                    title={tab.label}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setSearchQuery("");
                    }}
                    onMouseEnter={e => handleTabMouseEnter(e, tab.label)}
                    onMouseLeave={() => setHoveredTab(null)}
                    className={`w-9 h-8 ${isActive ? "mc-tab-bottom-active h-9" : "mc-tab-bottom"}`}
                  >
                    {thumb ? (
                      <img src={thumb} alt={tab.label} className="w-5 h-5 object-contain pointer-events-none drop-shadow" />
                    ) : (
                      <span className="text-base pointer-events-none">{tab.fallbackIcon}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Far Right: Survival Inventory Tab (Chest 📦) */}
            <button
              onClick={() => {
                setActiveTab("survival");
                setSearchQuery("");
              }}
              onMouseEnter={e => handleTabMouseEnter(e, "Survival Inventory")}
              onMouseLeave={() => setHoveredTab(null)}
              className={`w-9 h-8 ${activeTab === "survival" ? "mc-tab-bottom-active h-9" : "mc-tab-bottom"}`}
            >
              {isoThumbnails.get(43) ? (
                <img src={isoThumbnails.get(43)} alt="" className="w-5 h-5 object-contain pointer-events-none drop-shadow" />
              ) : (
                <span className="text-base pointer-events-none">📦</span>
              )}
            </button>
          </div>
        )}

      </div>

      {/* Floating Minecraft Tooltip on Tab Hover */}
      {hoveredTab && (
        <div
          className="fixed pointer-events-none z-50 px-2.5 py-1 text-[11px] font-bold text-white bg-[#100010] border-2 border-[#5000ff] rounded shadow-[0_0_8px_rgba(80,0,255,0.6)] mc-text-shadow whitespace-nowrap animate-fade"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: "translate(-50%, -100%)"
          }}
        >
          {hoveredTab}
        </div>
      )}

      {/* Floating Item Tooltip (vanilla style: name + weapon stats) */}
      {hoveredItem !== null && (() => {
        const def = BLOCK_MAP.get(hoveredItem);
        if (!def) return null;
        const w = getWeaponInfo(def);
        return (
          <div
            className="fixed pointer-events-none z-50 px-2.5 py-1.5 text-[11px] bg-[#100010]/95 border-2 border-[#5000ff] rounded shadow-[0_0_8px_rgba(80,0,255,0.6)] mc-text-shadow whitespace-nowrap animate-fade text-left"
            style={{
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y}px`,
              transform: "translate(-50%, -100%)"
            }}
          >
            <div className="font-bold text-white">{def.name}</div>
            {w && (
              <>
                <div className="text-emerald-400">+{w.damage} Attack Damage</div>
                <div className="text-gray-300">{w.speed} Attack Speed</div>
              </>
            )}
            <div className="text-gray-500 text-[10px]">ID: {hoveredItem}</div>
          </div>
        );
      })()}

      {/* Floating Drag & Drop Item Stack following mouse pointer */}
      {cursorStack && (
        <div
          ref={cursorRef}
          className="fixed pointer-events-none z-50 w-9 h-9 flex items-center justify-center top-0 left-0"
          style={{
            transform: "translate3d(-100px, -100px, 0)"
          }}
        >
          {isoThumbnails.get(cursorStack.id) && (
            <img
              src={isoThumbnails.get(cursorStack.id)}
              alt=""
              className="w-8 h-8 object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]"
            />
          )}
          {!creative && cursorStack.count > 1 && (
            <span className="absolute right-0 bottom-0 text-[10px] font-bold text-white mc-text-shadow">
              {cursorStack.count}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
