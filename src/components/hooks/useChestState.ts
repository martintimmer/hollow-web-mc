import { useState, useCallback } from "react";
import { computeChestPair, createArticulatedChest } from "../../game/chest";
import { playChestOpen, playChestClose } from "../../game/sfx";
import { apiSaveChest } from "../../services/api";
import { multiplayer } from "../../services/multiplayer";
import type { GameState } from "../../game/state/gameState";

export interface UseChestStateParams {
  stateRef: React.MutableRefObject<GameState>;
  closeAllModals: () => void;
  setHotbar: React.Dispatch<React.SetStateAction<number[]>>;
  setHotbarCounts: React.Dispatch<React.SetStateAction<number[]>>;
  setActive: (active: boolean) => void;
  showToast: (msg: string) => void;
}

export function useChestState({
  stateRef,
  closeAllModals,
  setHotbar,
  setHotbarCounts,
  setActive,
  showToast
}: UseChestStateParams) {
  // Chest (Phase 4): 27-slot storage per block coord, server-persisted
  const [chestOpen, setChestOpen] = useState(false);
  const [chestPos, setChestPos] = useState<{ x: number; y: number; z: number } | null>(null);
  const [chestSlots, setChestSlots] = useState<Array<{ id: number; count: number } | null>>(
    Array.from({ length: 27 }, () => null)
  );

  const persistChest = useCallback((x: number, y: number, z: number, slots: Array<{ id: number; count: number } | null>) => {
    const s = stateRef.current;
    // Large chests persist under the pair's min-X key
    const key = s.chestKey || `${x},${y},${z}`;
    s.chestMap.set(key, [...slots]);
    if (s.currentWorldId) {
      const [kx, ky, kz] = key.split(",").map(Number);
      apiSaveChest(s.currentWorldId, kx, ky, kz, slots).catch(() => {
        console.warn("Chest save failed (kept locally):", key);
      });
    }
  }, [stateRef]);

  const handleSetChestSlots: React.Dispatch<React.SetStateAction<Array<{ id: number; count: number } | null>>> = useCallback((action) => {
    setChestSlots(prev => {
      const next = typeof action === "function" ? action(prev) : action;
      const s = stateRef.current;
      if (s.chestPos) {
        const key = s.chestKey || `${s.chestPos.x},${s.chestPos.y},${s.chestPos.z}`;
        s.chestSlots = [...next];
        s.chestMap.set(key, [...next]);
        try {
          localStorage.setItem(`mc_chest_${s.currentWorldId}_${key}`, JSON.stringify(next));
        } catch {}
        if (s.currentWorldId) {
          const [kx, ky, kz] = key.split(",").map(Number);
          apiSaveChest(s.currentWorldId, kx, ky, kz, next).catch(() => {});
        }
        // Real-time multi-user chest sync: broadcast immediately to other players
        multiplayer.sendChestUpdate(s.chestPos.x, s.chestPos.y, s.chestPos.z, next);
      }
      return next;
    });
  }, [stateRef]);

  const openChest = useCallback((x: number, y: number, z: number) => {
    const s = stateRef.current;
    // Exclusivity: Close all other windows so strictly only 1 window is visible
    closeAllModals();

    const key = `${x},${y},${z}`;
    s.chestPos = { x, y, z };
    setChestPos({ x, y, z });

    // Large-chest pairing (vanilla ruleset): two singles → double; a chest beside a
    // double stays single; add another → two doubles. Deterministic via computeChestPair.
    const getB = s.getBlockFn;
    let primaryKey = key;
    let isLarge = false;
    let minX = x, maxX = x;
    if (getB) {
      const pair = computeChestPair(getB, x, y, z);
      if (pair.isLarge) {
        isLarge = true;
        minX = pair.leftX;
        maxX = pair.rightX;
        primaryKey = `${pair.leftX},${y},${z}`;
      }
    }
    s.chestLarge = isLarge;
    s.chestKey = primaryKey;

    let existing = s.chestMap.get(primaryKey) || null;
    if (!existing && isLarge) {
      // migrate: combine the two halves' 27-slot saves
      const a = s.chestMap.get(`${minX},${y},${z}`) || Array(27).fill(null);
      const b = s.chestMap.get(`${maxX},${y},${z}`) || Array(27).fill(null);
      existing = [...a, ...b];
    }
    if (isLarge && existing && existing.length < 54) {
      existing = [...existing, ...Array(54 - existing.length).fill(null)];
    }
    const slotsToLoad = existing ? [...existing] : Array.from({ length: isLarge ? 54 : 27 }, () => null);
    setChestSlots(slotsToLoad);
    s.chestSlots = slotsToLoad;
    s.chestOpen = true;
    setChestOpen(true);
    playChestOpen();

    // Instantiate / activate articulated 3D chest model with hinge animation
    if (s.scene) {
      const key = `${x},${y},${z}`;
      if (!s.chestEntities) s.chestEntities = new Map();
      let chestEntity = s.chestEntities.get(key);
      if (!chestEntity) {
        const dirVal = s.blockDirs.get(key);
        let targetYaw = 0;
        if (dirVal !== undefined && dirVal !== null) {
          const facings = [0, Math.PI, Math.PI / 2, -Math.PI / 2];
          targetYaw = facings[dirVal % 4] ?? 0;
        } else {
          const dx = s.player.x - (x + 0.5);
          const dz = s.player.z - (z + 0.5);
          if (Math.abs(dx) > Math.abs(dz)) {
            targetYaw = dx > 0 ? Math.PI / 2 : -Math.PI / 2;
          } else {
            targetYaw = dz > 0 ? 0 : Math.PI;
          }
        }

        chestEntity = createArticulatedChest({ yaw: targetYaw });
        chestEntity.x = x;
        chestEntity.y = y;
        chestEntity.z = z;
        chestEntity.root.position.set(x + 0.5, y, z + 0.5);
        s.scene.add(chestEntity.root);
        s.chestEntities.set(key, chestEntity);
      }

      chestEntity.isOpen = true;
      s.activeChestEntity = chestEntity;
    }

    s.active = false;
    s.steering = false;
    s.keys = {};
    setActive(false);
    document.exitPointerLock?.();
    showToast(isLarge ? "Large chest opened 📦📦" : "Chest opened 📦");
  }, [closeAllModals, stateRef, setActive, showToast]);

  const closeChest = useCallback(() => {
    const s = stateRef.current;
    if (s.chestKey) {
      const [kx, ky, kz] = s.chestKey.split(",").map(Number);
      const latest = s.chestSlots;
      s.chestMap.set(s.chestKey, [...latest]);
      try {
        localStorage.setItem(`mc_chest_${s.currentWorldId}_${s.chestKey}`, JSON.stringify(latest));
      } catch {}
      if (s.currentWorldId) {
        apiSaveChest(s.currentWorldId, kx, ky, kz, latest).catch(() => {});
      }
    }
    s.chestOpen = false;
    setChestOpen(false);
    s.chestPos = null;
    setChestPos(null);
    s.chestKey = null;
    s.chestLarge = false;
    playChestClose();
    if (s.activeChestEntity) {
      s.activeChestEntity.isOpen = false;
      s.activeChestEntity = null;
    }
    if (!stateRef.current.dead) {
      stateRef.current.active = true;
      stateRef.current.steering = true;
      setActive(true);
      const cv = document.querySelector("canvas");
      cv?.requestPointerLock?.();
    }
  }, [stateRef, setActive]);

  const handleChestSlotClick = useCallback((i: number) => {
    const s = stateRef.current;
    const slot = s.chestSlots[i];
    if (!s.chestPos) return;
    const hotId = s.hotbar[s.slot] || 0;
    const hotCount = s.hotbarCounts[s.slot] || 0;

    const next: Array<{ id: number; count: number } | null> = [...s.chestSlots];
    next[i] = hotCount > 0 ? { id: hotId, count: hotCount } : null;
    s.chestSlots = next;
    setChestSlots(next);
    persistChest(s.chestPos.x, s.chestPos.y, s.chestPos.z, next);

    if (slot) {
      setHotbar(prev => { const c = [...prev]; c[s.slot] = slot.id; return c; });
      setHotbarCounts(prev => { const c = [...prev]; c[s.slot] = slot.count; return c; });
    } else {
      setHotbar(prev => { const c = [...prev]; c[s.slot] = 0; return c; });
      setHotbarCounts(prev => { const c = [...prev]; c[s.slot] = 0; return c; });
    }
  }, [persistChest, setHotbar, setHotbarCounts, stateRef]);

  return {
    chestOpen,
    setChestOpen,
    chestPos,
    setChestPos,
    chestSlots,
    setChestSlots,
    handleSetChestSlots,
    persistChest,
    openChest,
    closeChest,
    handleChestSlotClick
  };
}
