import { useState, useCallback } from "react";
import { fuelItems, smeltOutput } from "../../game/smelt";
import { consumeSlot } from "../../game/inventory";
import type { GameState } from "../../game/state/gameState";

export interface FurnaceUIState {
  input: { id: number; count: number } | null;
  fuel: { id: number; count: number } | null;
  output: { id: number; count: number } | null;
  prog: number;
  fuelLeft: number;
  lit: boolean;
}

export interface UseFurnaceStateParams {
  stateRef: React.MutableRefObject<GameState>;
  inventoryAddItem: (id: number, count: number) => number;
  setHotbar: React.Dispatch<React.SetStateAction<number[]>>;
  setHotbarCounts: React.Dispatch<React.SetStateAction<number[]>>;
  setActive: (active: boolean) => void;
  showToast: (msg: string) => void;
}

// Per-furnace persistence (C2): contents survive modal-close, furnace
// switching, and relog. localStorage mirror keyed by world+dimension+pos
// (same pattern as chest localStorage mirror in Game.tsx). Passive burn
// progress between the last save and a hard disconnect (<= 1 item) is not
// covered — documented in kb/mechanics/furnace.md.
interface SavedFurnace {
  input: { id: number; count: number } | null;
  fuel: { id: number; count: number } | null;
  output: { id: number; count: number } | null;
  prog: number;
  fuelLeft: number;
}

function furnaceLsKey(s: GameState): string {
  const wid = s.dimension === "nether" ? `${s.currentWorldId}_nether` : s.currentWorldId;
  return `mc_furnace_${wid}_${s.furnace.x},${s.furnace.y},${s.furnace.z}`;
}

function validSlot(v: any): v is { id: number; count: number } | null {
  return v === null || (typeof v?.id === "number" && typeof v?.count === "number" && v.count > 0);
}

function loadSavedFurnace(s: GameState): SavedFurnace | null {
  try {
    const raw = localStorage.getItem(furnaceLsKey(s));
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (!validSlot(p.input) || !validSlot(p.fuel) || !validSlot(p.output)) return null;
    return {
      input: p.input, fuel: p.fuel, output: p.output,
      prog: typeof p.prog === "number" ? p.prog : 0,
      fuelLeft: typeof p.fuelLeft === "number" ? p.fuelLeft : 0,
    };
  } catch { return null; }
}

function saveFurnace(s: GameState): void {
  try {
    const data: SavedFurnace = {
      input: s.furnaceSlots.input, fuel: s.furnaceSlots.fuel, output: s.furnaceSlots.output,
      prog: s.furnaceProg, fuelLeft: s.furnaceFuelLeft,
    };
    localStorage.setItem(furnaceLsKey(s), JSON.stringify(data));
  } catch { /* storage full/blocked — furnace simply stays session-only */ }
}

export function useFurnaceState({
  stateRef,
  inventoryAddItem,
  setHotbar,
  setHotbarCounts,
  setActive,
  showToast
}: UseFurnaceStateParams) {
  // Furnace (Phase 3 + C2): per-furnace persisted sessions; engine ticker drives burn progress
  const [furnaceOpen, setFurnaceOpen] = useState(false);
  const [furnaceUI, setFurnaceUI] = useState<FurnaceUIState>({
    input: null,
    fuel: null,
    output: null,
    prog: 0,
    fuelLeft: 0,
    lit: false
  });

  const syncFurnaceUI = useCallback(() => {
    const s = stateRef.current;
    setFurnaceUI({
      input: s.furnaceSlots.input,
      fuel: s.furnaceSlots.fuel,
      output: s.furnaceSlots.output,
      prog: s.furnaceProg,
      fuelLeft: s.furnaceFuelLeft,
      lit: s.furnaceLit
    });
  }, [stateRef]);

  const openFurnace = useCallback((x: number, y: number, z: number) => {
    const s = stateRef.current;
    s.furnace.x = x; s.furnace.y = y; s.furnace.z = z;
    const saved = loadSavedFurnace(s);
    s.furnaceSlots = saved
      ? { input: saved.input, fuel: saved.fuel, output: saved.output }
      : { input: null, fuel: null, output: null };
    s.furnaceProg = saved?.prog ?? 0;
    s.furnaceFuelLeft = saved?.fuelLeft ?? 0;
    s.furnaceLit = false; // tickFurnace re-lights on next tick if still burning
    setFurnaceOpen(true);
    s.active = false;
    s.steering = false;
    s.keys = {};
    setActive(false);
    document.exitPointerLock?.();
    syncFurnaceUI();
  }, [stateRef, setActive, syncFurnaceUI]);

  const closeFurnace = useCallback(() => {
    saveFurnace(stateRef.current);
    setFurnaceOpen(false);
    if (!stateRef.current.dead) {
      stateRef.current.active = true;
      stateRef.current.steering = true;
      setActive(true);
    }
  }, [stateRef, setActive]);

  const handleFurnaceSlotClick = useCallback((kind: "input" | "fuel" | "output") => {
    const s = stateRef.current;
    const slot = s.furnaceSlots[kind];
    if (slot) {
      // Return stack to inventory
      const leftover = inventoryAddItem(slot.id, slot.count);
      s.furnaceSlots[kind] = leftover > 0 ? { id: slot.id, count: leftover } : null;
      saveFurnace(s);
      syncFurnaceUI();
    } else {
      // Pull full stack from selected hotbar slot
      const hotId = s.hotbar[s.slot] || 0;
      const hotCount = s.hotbarCounts[s.slot] || 0;
      if (hotId <= 0 || hotCount <= 0) { showToast("No block in the selected hotbar slot"); return; }
      if (kind === "fuel" && fuelItems(hotId) <= 0) { showToast("That block is not fuel 🔥"); return; }
      if (kind === "input" && smeltOutput(hotId) === null) { showToast("That block cannot be smelted"); return; }
      s.furnaceSlots[kind] = { id: hotId, count: hotCount };
      consumeSlot(s, s.slot, hotCount);
      setHotbar([...s.hotbar]);
      setHotbarCounts([...s.hotbarCounts]);
      saveFurnace(s);
      syncFurnaceUI();
    }
  }, [stateRef, inventoryAddItem, syncFurnaceUI, showToast, setHotbar, setHotbarCounts]);

  const handleFurnaceReset = useCallback(() => {
    const s = stateRef.current;
    for (const k of ["input", "fuel", "output"] as const) {
      const slot = s.furnaceSlots[k];
      if (slot) inventoryAddItem(slot.id, slot.count);
      s.furnaceSlots[k] = null;
    }
    saveFurnace(s);
    syncFurnaceUI();
  }, [stateRef, inventoryAddItem, syncFurnaceUI]);

  return {
    furnaceOpen,
    setFurnaceOpen,
    furnaceUI,
    setFurnaceUI,
    syncFurnaceUI,
    openFurnace,
    closeFurnace,
    handleFurnaceSlotClick,
    handleFurnaceReset
  };
}
