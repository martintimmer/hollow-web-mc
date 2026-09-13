import { useState, useCallback, useMemo } from "react";
import { matchCrafting } from "../../game/recipes";
import { BLOCK_MAP } from "../../game/blocks";
import { consumeSlot } from "../../game/inventory";
import { playCraft } from "../../game/sfx";
import type { GameState } from "../../game/state/gameState";

export interface UseCraftingStateParams {
  stateRef: React.MutableRefObject<GameState>;
  inventoryAddItem: (id: number, count: number) => number;
  setHotbar: React.Dispatch<React.SetStateAction<number[]>>;
  setHotbarCounts: React.Dispatch<React.SetStateAction<number[]>>;
  setActive: (active: boolean) => void;
  showToast: (msg: string) => void;
}

export function useCraftingState({
  stateRef,
  inventoryAddItem,
  setHotbar,
  setHotbarCounts,
  setActive,
  showToast
}: UseCraftingStateParams) {
  // Crafting (Phase 2): shared 9-cell grid (2×2 in inventory, 3×3 at crafting table)
  const [craftGrid, setCraftGrid] = useState<Array<{ id: number; count: number } | null>>(
    Array.from({ length: 9 }, () => null)
  );
  const [craftW, setCraftW] = useState(2);
  const [craftTableOpen, setCraftTableOpen] = useState(false);

  const craftResult = useMemo(
    () => matchCrafting(craftGrid.slice(0, craftW * craftW), craftW),
    [craftGrid, craftW]
  );

  const handleCraftCellClick = useCallback((i: number) => {
    const s = stateRef.current;
    const cells = [...craftGrid];
    const cell = cells[i];
    if (cell) {
      // Return stack to inventory (leftover stays in the cell if inventory full)
      const leftover = inventoryAddItem(cell.id, cell.count);
      cells[i] = leftover > 0 ? { id: cell.id, count: leftover } : null;
      setCraftGrid(cells);
    } else {
      // Pull the full stack from the selected hotbar slot
      const hotId = s.hotbar[s.slot] || 0;
      const hotCount = s.hotbarCounts[s.slot] || 0;
      if (hotId > 0 && hotCount > 0) {
        cells[i] = { id: hotId, count: hotCount };
        consumeSlot(s, s.slot, hotCount); // empties the hotbar slot
        setCraftGrid(cells);
        setHotbar([...s.hotbar]);
        setHotbarCounts([...s.hotbarCounts]);
      } else {
        showToast("No block in the selected hotbar slot");
      }
    }
  }, [craftGrid, inventoryAddItem, stateRef, setHotbar, setHotbarCounts, showToast]);

  const handleCraftResultClick = useCallback(() => {
    if (!craftResult) return;
    const name = BLOCK_MAP.get(craftResult.output.id)?.name || "Item";
    const cells = craftGrid.map(c => {
      if (!c) return null;
      const next = c.count - 1;
      return next > 0 ? { id: c.id, count: next } : null;
    });
    const leftover = inventoryAddItem(craftResult.output.id, craftResult.output.count);
    setCraftGrid(cells);
    playCraft();
    showToast(
      leftover > 0
        ? `Crafted ${name} ×${craftResult.output.count} — inventory full!`
        : `Crafted ${name} ×${craftResult.output.count}! ✨`
    );
  }, [craftResult, craftGrid, inventoryAddItem, showToast]);

  const handleCraftReset = useCallback(() => {
    for (const c of craftGrid) if (c) inventoryAddItem(c.id, c.count);
    setCraftGrid(Array.from({ length: 9 }, () => null));
  }, [craftGrid, inventoryAddItem]);

  const openCraftTable = useCallback(() => {
    const s = stateRef.current;
    setCraftW(3);
    setCraftGrid(Array.from({ length: 9 }, () => null));
    setCraftTableOpen(true);
    s.active = false;
    s.steering = false;
    s.keys = {};
    setActive(false);
    document.exitPointerLock?.();
  }, [stateRef, setActive]);

  const closeCraftTable = useCallback(() => {
    setCraftTableOpen(false);
    setCraftGrid(Array.from({ length: 9 }, () => null));
    if (!stateRef.current.dead) {
      stateRef.current.active = true;
      stateRef.current.steering = true;
      setActive(true);
    }
  }, [stateRef, setActive]);

  return {
    craftGrid,
    setCraftGrid,
    craftW,
    setCraftW,
    craftTableOpen,
    setCraftTableOpen,
    craftResult,
    handleCraftCellClick,
    handleCraftResultClick,
    handleCraftReset,
    openCraftTable,
    closeCraftTable
  };
}
