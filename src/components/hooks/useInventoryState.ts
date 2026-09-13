import { useState, useCallback } from "react";
import * as THREE from "three";
import { pickUp, consumeSlot, swapMainToHotbar } from "../../game/inventory";
import { BLOCK_MAP } from "../../game/blocks";
import type { GameState } from "../../game/state/gameState";

export interface UseInventoryStateParams {
  stateRef: React.MutableRefObject<GameState>;
  inventoryOpen: boolean;
  setInventoryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  hotbar: number[];
  setHotbar: React.Dispatch<React.SetStateAction<number[]>>;
  activeSlot: number;
  setActive: (active: boolean) => void;
  showToast: (msg: string) => void;
}

export function useInventoryState({
  stateRef,
  inventoryOpen,
  setInventoryOpen,
  setHotbar,
  activeSlot,
  setActive,
  showToast
}: UseInventoryStateParams) {
  // Survival Inventory (27 main slots + 10 hotbar slot counts; creative stays infinite)
  const [invMain, setInvMain] = useState<Array<{ id: number; count: number } | null>>(
    Array.from({ length: 27 }, () => null)
  );
  const [hotbarCounts, setHotbarCounts] = useState<number[]>(Array.from({ length: 9 }, () => 64));
  const [hotbarDamage, setHotbarDamage] = useState<number[]>([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

  const handleToggleInventory = useCallback(() => {
    const nextInv = !inventoryOpen;
    setInventoryOpen(nextInv);
    stateRef.current.inventoryOpen = nextInv;
    if (nextInv) {
      ((stateRef.current as unknown as Record<string, unknown>).ensureBaseThumbs as (() => Promise<void>) | undefined)?.()?.catch(() => undefined);
      stateRef.current.active = false;
      stateRef.current.steering = false;
      stateRef.current.keys = {};
      setActive(false);
    } else {
      stateRef.current.active = true;
      stateRef.current.steering = true;
      setActive(true);
    }
  }, [inventoryOpen, setInventoryOpen, stateRef, setActive]);

  const handleAssignToHotbar = useCallback((blockId: number, slotIndex?: number) => {
    const targetSlot = slotIndex !== undefined ? slotIndex : activeSlot;
    setHotbar(prev => {
      const copy = [...prev];
      copy[targetSlot] = blockId;
      return copy;
    });
    // Fresh assignment = fresh 64-stack in survival
    setHotbarCounts(prev => {
      const copy = [...prev];
      copy[targetSlot] = 64;
      return copy;
    });
    showToast(`Equipped ${BLOCK_MAP.get(blockId)?.name} to slot ${targetSlot + 1}`);
  }, [activeSlot, setHotbar, showToast]);

  const inventoryAddItem = useCallback((id: number, count: number): number => {
    const s = stateRef.current;
    const leftover = pickUp(s, id, count);
    setHotbar([...s.hotbar]);
    setInvMain([...s.invMain]);
    setHotbarCounts([...s.hotbarCounts]);
    return leftover;
  }, [stateRef, setHotbar]);

  const deductHotbarSlot = useCallback((slotIdx: number, n = 1) => {
    const s = stateRef.current;
    consumeSlot(s, slotIdx, n);
    setHotbar([...s.hotbar]);
    setHotbarCounts([...s.hotbarCounts]);
    if (s.hotbarDamage) setHotbarDamage([...s.hotbarDamage]);
  }, [stateRef, setHotbar]);

  // [Q] drop: removes the active hotbar item (creative: whole item; survival: one)
  const dropHeldItem = useCallback(() => {
    const s = stateRef.current;
    const heldId = s.hotbar[s.slot] || 0;
    if (!heldId) { showToast("Hand empty — nothing to drop"); return; }
    if (!s.itemDrops || !s.camera) { showToast("Can't drop right now"); return; }
    const dir = new THREE.Vector3(0, 0, -1).applyEuler(s.camera.rotation).normalize();
    const drop = s.itemDrops.spawnDrop(
      s.camera.position.x + dir.x * 0.6,
      s.camera.position.y + dir.y * 0.6,
      s.camera.position.z + dir.z * 0.6,
      heldId,
      1
    );
    if (!drop) { showToast("Can't drop that here"); return; }
    if (s.creative) {
      showToast(`Dropped ${BLOCK_MAP.get(heldId)?.name || "item"} ✈`);
    } else {
      const c = s.hotbarCounts[s.slot] || 1;
      if (c <= 1) {
        s.hotbar[s.slot] = 0;
        s.hotbarCounts[s.slot] = 0;
      } else {
        s.hotbarCounts[s.slot] = c - 1;
      }
      setHotbar([...s.hotbar]);
      setHotbarCounts([...s.hotbarCounts]);
      showToast(`Dropped 1× ${BLOCK_MAP.get(heldId)?.name || "item"}`);
    }
  }, [stateRef, setHotbar, showToast]);

  // Survival grid: click a main slot → swap stack with active hotbar slot
  const handleMainSlotClick = useCallback((i: number) => {
    const s = stateRef.current;
    const res = swapMainToHotbar(s, i, s.slot);
    setHotbar([...s.hotbar]);
    setInvMain([...s.invMain]);
    setHotbarCounts([...s.hotbarCounts]);
    showToast(
      res.swapped
        ? `Swapped ${BLOCK_MAP.get(res.swapped.id)?.name || "item"} ×${res.swapped.count}`
        : res.cleared ? "Slot cleared" : "Slot cleared"
    );
  }, [stateRef, setHotbar, showToast]);

  return {
    invMain,
    setInvMain,
    hotbarCounts,
    setHotbarCounts,
    hotbarDamage,
    setHotbarDamage,
    handleToggleInventory,
    handleAssignToHotbar,
    inventoryAddItem,
    deductHotbarSlot,
    dropHeldItem,
    handleMainSlotClick
  };
}
