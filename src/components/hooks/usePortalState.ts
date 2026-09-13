import { useState, useCallback, useRef } from "react";
import {
  loadPortals,
  saveOrUpdatePortal,
  setPortalAsHome,
  deletePortal,
  type SpawnPortal
} from "../../game/state/portalStorage";
import { apiSaveSpawn, apiDeleteSpawn } from "../../services/api";
import type { GameState } from "../../game/state/gameState";

export interface UsePortalStateParams {
  stateRef: React.MutableRefObject<GameState>;
  closeAllModals: () => void;
  setActive: (active: boolean) => void;
  showToast: (msg: string) => void;
}

export function usePortalState({
  stateRef,
  closeAllModals,
  setActive,
  showToast
}: UsePortalStateParams) {
  const [portalModalOpen, setPortalModalOpen] = useState(false);
  const [portalCoord, setPortalCoord] = useState<{ x: number; y: number; z: number } | null>(null);
  const [recallModalOpen, setRecallModalOpen] = useState(false);
  const [portalsList, setPortalsList] = useState<SpawnPortal[]>(() => loadPortals());
  const portalsListRef = useRef<SpawnPortal[]>([]);
  portalsListRef.current = portalsList;

  const openPortalModal = useCallback((x: number, y: number, z: number) => {
    const s = stateRef.current;
    closeAllModals();

    setPortalCoord({ x, y, z });
    setPortalsList(loadPortals(s.currentWorldId));
    setPortalModalOpen(true);
    s.active = false;
    s.steering = false;
    s.keys = {};
    setActive(false);
    document.exitPointerLock?.();
  }, [closeAllModals, stateRef, setActive]);

  const closePortalModal = useCallback(() => {
    setPortalModalOpen(false);
    setPortalCoord(null);
    if (!stateRef.current.dead) {
      stateRef.current.active = true;
      stateRef.current.steering = true;
      setActive(true);
    }
  }, [stateRef, setActive]);

  const handleSavePortal = useCallback((name: string, isHome: boolean) => {
    const s = stateRef.current;
    if (!portalCoord) return;
    const newPortal: SpawnPortal = {
      id: `portal_${Math.floor(portalCoord.x)}_${Math.floor(portalCoord.y)}_${Math.floor(portalCoord.z)}`,
      name,
      x: Math.floor(portalCoord.x),
      y: Math.floor(portalCoord.y),
      z: Math.floor(portalCoord.z),
      isHome,
      createdAt: Date.now()
    };
    const updated = saveOrUpdatePortal(newPortal, s.currentWorldId);
    setPortalsList(updated);
    if (!s.simMode) {
      apiSaveSpawn(s.currentWorldId, { id: newPortal.id, name, x: newPortal.x, y: newPortal.y, z: newPortal.z, isHome }).catch(() => {});
    }
    showToast(`🌀 Portal "${name}" saved ${isHome ? "(Set as Home) 🏠" : ""}`);
    closePortalModal();
  }, [portalCoord, closePortalModal, showToast, stateRef]);

  const handleSetHome = useCallback((id: string) => {
    const s = stateRef.current;
    const updated = setPortalAsHome(id, s.currentWorldId);
    setPortalsList(updated);
    const target = updated.find((p) => p.id === id);
    if (target && !s.simMode) {
      apiSaveSpawn(s.currentWorldId, { id: target.id, name: target.name, x: target.x, y: target.y, z: target.z, isHome: true }).catch(() => {});
    }
    showToast(`🏠 Home spawn point set to "${target?.name || "Portal"}"!`);
  }, [showToast, stateRef]);

  const handleDeletePortal = useCallback((id: string) => {
    const s = stateRef.current;
    const updated = deletePortal(id, s.currentWorldId);
    setPortalsList(updated);
    if (!s.simMode) apiDeleteSpawn(id).catch(() => {});
    showToast("🗑️ Portal deleted");
  }, [showToast, stateRef]);

  const handleTeleportToPortal = useCallback((portal: SpawnPortal) => {
    const s = stateRef.current;
    s.player.x = portal.x + 0.5;
    s.player.y = portal.y + 0.1;
    s.player.z = portal.z + 0.5;
    s.player.vx = s.player.vy = s.player.vz = 0;
    closePortalModal();
    setRecallModalOpen(false);
    showToast(`✨ Teleported to "${portal.name}"!`);
  }, [closePortalModal, showToast, stateRef]);

  const openRecallModal = useCallback(() => {
    const s = stateRef.current;
    closeAllModals();

    setPortalsList(loadPortals(s.currentWorldId));
    setRecallModalOpen(true);
    s.active = false;
    s.steering = false;
    s.keys = {};
    setActive(false);
    document.exitPointerLock?.();
  }, [closeAllModals, stateRef, setActive]);

  const closeRecallModal = useCallback(() => {
    setRecallModalOpen(false);
    if (!stateRef.current.dead) {
      stateRef.current.active = true;
      stateRef.current.steering = true;
      setActive(true);
    }
  }, [stateRef, setActive]);

  const confirmRecall = useCallback((targetPortal?: SpawnPortal | null) => {
    const s = stateRef.current;
    closeRecallModal();
    if (targetPortal) {
      s.player.x = targetPortal.x + 0.5;
      s.player.y = targetPortal.y + 0.1;
      s.player.z = targetPortal.z + 0.5;
      s.player.vx = s.player.vy = s.player.vz = 0;
      showToast(`✨ Spawned Home at "${targetPortal.name}"!`);
    } else {
      s.teleportSpawnFn?.();
      showToast("✨ Spawned at World Spawn!");
    }
  }, [closeRecallModal, showToast, stateRef]);

  return {
    portalModalOpen,
    setPortalModalOpen,
    portalCoord,
    setPortalCoord,
    recallModalOpen,
    setRecallModalOpen,
    portalsList,
    setPortalsList,
    portalsListRef,
    openPortalModal,
    closePortalModal,
    handleSavePortal,
    handleSetHome,
    handleDeletePortal,
    handleTeleportToPortal,
    openRecallModal,
    closeRecallModal,
    confirmRecall
  };
}
