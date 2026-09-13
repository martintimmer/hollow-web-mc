import { useRef, useCallback } from "react";
import type { GameState } from "../../game/state/gameState";
import { CHH } from "../../game/world";
import { isSolid } from "../../game/blocks";
import { screenToWorld, type MapMarker } from "../../game/engine/worldMap";
import {
  saveOrUpdatePortal,
  renamePortal,
  type SpawnPortal
} from "../../game/state/portalStorage";
import { apiSaveSpawn, apiRenameSpawn } from "../../services/api";

export interface UseMapStateOptions {
  stateRef: React.MutableRefObject<GameState>;
  portalsListRef: React.MutableRefObject<SpawnPortal[]>;
  setPortalsList: React.Dispatch<React.SetStateAction<SpawnPortal[]>>;
  setMapOpen: (open: boolean) => void;
  showToast: (msg: string) => void;
}

export interface UseMapStateReturn {
  mapHoverRef: React.MutableRefObject<{ x: number; z: number } | null>;
  mapFlashRef: React.MutableRefObject<{ x: number; z: number; until: number } | null>;
  handleMapHover: (cssX: number, cssY: number, cssW: number, cssH: number) => { x: number; z: number };
  handleMapHoverLeave: () => void;
  handleMapSaveSpawn: (name: string, x: number, z: number) => void;
  handleMapSpawnAt: (x: number, z: number) => void;
  handleRenamePortal: (id: string, name: string) => void;
  handleFlashSpawn: (portal: SpawnPortal) => void;
  handleMapTeleportToPortal: (portal: SpawnPortal) => void;
  getMapMarkers: () => MapMarker[];
}

export function useMapState(options: UseMapStateOptions): UseMapStateReturn {
  const {
    stateRef,
    portalsListRef,
    setPortalsList,
    setMapOpen,
    showToast
  } = options;

  const mapHoverRef = useRef<{ x: number; z: number } | null>(null);
  const mapFlashRef = useRef<{ x: number; z: number; until: number } | null>(null);

  const mapViewFor = (cssW: number, cssH: number) => {
    const s = stateRef.current;
    const dpr = Math.min(window.devicePixelRatio || 1, 1);
    return {
      view: {
        W: cssW * dpr,
        H: cssH * dpr,
        scale: (s.bigScale || 2.0) * dpr,
        yaw: s.player.yaw,
        px: s.mapPanOn ? s.mapPanX : s.player.x,
        pz: s.mapPanOn ? s.mapPanZ : s.player.z
      },
      dpr
    };
  };

  const handleMapHover = useCallback((cssX: number, cssY: number, cssW: number, cssH: number) => {
    const { view, dpr } = mapViewFor(cssW, cssH);
    const w = screenToWorld(view, cssX * dpr, cssY * dpr);
    const hit = { x: Math.round(w.x * 10) / 10, z: Math.round(w.z * 10) / 10 };
    mapHoverRef.current = hit;
    return hit;
  }, []);

  const handleMapHoverLeave = useCallback(() => {
    mapHoverRef.current = null;
  }, []);

  const handleMapSaveSpawn = useCallback((name: string, x: number, z: number) => {
    const s = stateRef.current;
    const gb = (s as unknown as Record<string, unknown>).getBlock as (x: number, y: number, z: number) => number;
    let y = CHH - 2;
    while (y > 4 && gb && !isSolid(gb(Math.floor(x), y, Math.floor(z)))) y--;
    const clean = name.trim().slice(0, 24) || "Spawn";
    const portal: SpawnPortal = {
      id: "portal_" + Math.floor(x) + "_" + (y + 1) + "_" + Math.floor(z),
      name: clean,
      x: Math.floor(x),
      y: y + 1,
      z: Math.floor(z),
      isHome: false,
      createdAt: Date.now()
    };
    setPortalsList(saveOrUpdatePortal(portal, s.currentWorldId));
    if (!s.simMode) {
      apiSaveSpawn(s.currentWorldId, { id: portal.id, name: clean, x: portal.x, y: portal.y, z: portal.z, isHome: false }).catch(() => {});
    }
    mapHoverRef.current = null;
    showToast("📍 Spawn saved: " + clean);
  }, [setPortalsList, showToast, stateRef]);

  const handleMapSpawnAt = useCallback((x: number, z: number) => {
    const s = stateRef.current;
    const gb = (s as unknown as Record<string, unknown>).getBlock as (x: number, y: number, z: number) => number;
    let y = CHH - 2;
    while (y > 4 && gb && !isSolid(gb(Math.floor(x), y, Math.floor(z)))) y--;
    if (y <= 4) {
      showToast("⏳ Terrain isn't generated there yet — pan somewhere loaded");
      return;
    }
    const fx = Math.floor(x), fz = Math.floor(z);
    if (gb && (gb(fx, y + 1, fz) === 39 || gb(fx, y + 2, fz) === 39)) {
      showToast("🌊 That's open water — pick dry land");
      return;
    }
    s.player.x = fx + 0.5;
    s.player.y = y + 1.01;
    s.player.z = fz + 0.5;
    s.player.vx = s.player.vy = s.player.vz = 0;
    s.mapOpen = false;
    setMapOpen(false);
    showToast("🛬 Spawned on the surface!");
  }, [setMapOpen, showToast, stateRef]);

  const handleRenamePortal = useCallback((id: string, name: string) => {
    const s = stateRef.current;
    const clean = name.trim().slice(0, 24);
    if (!clean) return;
    setPortalsList(renamePortal(id, clean, s.currentWorldId));
    if (!s.simMode) apiRenameSpawn(id, clean).catch(() => {});
    showToast("✏️ Renamed to \"" + clean + "\"");
  }, [setPortalsList, showToast, stateRef]);

  const handleFlashSpawn = useCallback((portal: SpawnPortal) => {
    mapFlashRef.current = { x: portal.x + 0.5, z: portal.z + 0.5, until: Date.now() + 2500 };
  }, []);

  const handleMapTeleportToPortal = useCallback((portal: SpawnPortal) => {
    const s = stateRef.current;
    s.player.x = portal.x + 0.5;
    s.player.y = portal.y + 0.1;
    s.player.z = portal.z + 0.5;
    s.player.vx = s.player.vy = s.player.vz = 0;
    s.mapOpen = false;
    setMapOpen(false);
    showToast("✨ Teleported to \"" + portal.name + "\"! ");
  }, [setMapOpen, showToast, stateRef]);

  const getMapMarkers = useCallback((): MapMarker[] => {
    const ms: MapMarker[] = [];
    for (const p of portalsListRef.current) {
      ms.push({
        x: p.x + 0.5,
        z: p.z + 0.5,
        color: p.isHome ? "#ffd94d" : "#4da3ff",
        icon: p.isHome ? "🏠" : "📍",
        label: p.name
      });
    }
    const h = mapHoverRef.current;
    if (h && stateRef.current.mapOpen) {
      ms.push({ x: h.x, z: h.z, color: "#ffffff", ghost: true });
    }
    const f = mapFlashRef.current;
    if (f && Date.now() < f.until && stateRef.current.mapOpen) {
      ms.push({ x: f.x, z: f.z, color: "#ffd94d", pulse: true });
    }
    return ms;
  }, [portalsListRef, stateRef]);

  return {
    mapHoverRef,
    mapFlashRef,
    handleMapHover,
    handleMapHoverLeave,
    handleMapSaveSpawn,
    handleMapSpawnAt,
    handleRenamePortal,
    handleFlashSpawn,
    handleMapTeleportToPortal,
    getMapMarkers
  };
}
