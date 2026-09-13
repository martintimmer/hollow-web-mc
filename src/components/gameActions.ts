import type { Dispatch, RefObject, SetStateAction } from "react";
import * as THREE from "three";
import { makeNoise } from "../game/noise";
import { makeClouds } from "../game/visuals";
import { getHomePortal } from "../game/state/portalStorage";
import { playMenuClick } from "../game/sfx";
import { encodeCanvasToPngBlob } from "../game/snapshotEncoder";
import type { GameState } from "../game/state/gameState";
import type { ChatMessage } from "../game/chat/chatController";

export type WeatherKind = "clear" | "cloudy" | "overcast";

export interface GameActionsDeps {
  stateRef: RefObject<GameState>;
  showToast: (msg: string) => void;
  setQualityPreset: (v: "smooth" | "balanced" | "beautiful") => void;
  setRenderDistance: (v: number) => void;
  setShadows: (v: boolean) => void;
  setDof: (v: boolean) => void;
  setDofStrength: (v: number) => void;
  setCa: (v: boolean) => void;
  setCaStrength: (v: number) => void;
  setWeather: (v: WeatherKind) => void;
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setDead: (v: boolean) => void;
  setHealth: (v: number) => void;
  setOxygenBubbles: (v: number) => void;
  setActive: (v: boolean) => void;
  setPauseOpen: (v: boolean) => void;
  setMenuOpen: (v: boolean) => void;
  setInventoryOpen: (v: boolean) => void;
  setAuditLogsOpen: (v: boolean) => void;
  containerRef: RefObject<HTMLDivElement | null>;
  captureNowRef: RefObject<boolean>;
  onLockPointer: () => void;
}

export function createGameActions(d: GameActionsDeps) {
  const {
    stateRef, showToast, setQualityPreset, setRenderDistance, setShadows,
    setDof, setDofStrength, setCa, setCaStrength, setWeather, setChatMessages,
    setDead, setHealth, setOxygenBubbles, setActive, setPauseOpen, setMenuOpen,
    setInventoryOpen, setAuditLogsOpen, containerRef, captureNowRef, onLockPointer,
  } = d;

  const handleApplyPreset = (preset: "smooth" | "balanced" | "beautiful") => {
    setQualityPreset(preset);
    const s = stateRef.current;
    if (preset === "smooth") {
      setRenderDistance(6);
      s.render = 6;
      s.keep = 9;
      setShadows(false);
      s.shadowsOn = false;
      if (s.sun) s.sun.castShadow = false;
      if (s.renderer) s.renderer.setPixelRatio(1.0);
      setDof(false);
      setCa(false);
      showToast("⚡ Smooth Mode: 6 Chunks, Shadows OFF, 1.0x DPR (90-120+ FPS)");
    } else if (preset === "balanced") {
      setRenderDistance(8);
      s.render = 8;
      s.keep = 9;
      setShadows(true);
      s.shadowsOn = true;
      if (s.sun) s.sun.castShadow = true;
      if (s.renderer) s.renderer.setPixelRatio(1.0);
      setDof(false);
      setCa(false);
      setCaStrength(0.08);
      showToast("⚖️ Balanced Mode: 8 Chunks, Shadows ON, 60+ FPS Target");
    } else if (preset === "beautiful") {
      setRenderDistance(12);
      s.render = 12;
      s.keep = 15;
      setShadows(true);
      s.shadowsOn = true;
      if (s.sun) s.sun.castShadow = true;
      if (s.renderer) s.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      setDof(true);
      setDofStrength(0.4);
      setCa(true);
      setCaStrength(0.25);
      showToast("💎 Beautiful Mode: 12 Chunks, HD Shadows, Ultra Visuals");
    }
  };

  const handleSetWeather = (newWeather: WeatherKind) => {
    setWeather(newWeather);
    const s = stateRef.current;
    s.cloudWeather = newWeather;
    if (s.scene && s.clouds) {
      s.scene.remove(s.clouds);
      if (s.clouds instanceof THREE.Mesh && s.clouds.geometry) s.clouds.geometry.dispose();
      const { vnoise } = makeNoise(() => s.seedMix);
      const newClouds = makeClouds(vnoise, newWeather);
      s.scene.add(newClouds);
      s.clouds = newClouds;
    }
    showToast(`Weather set to ${newWeather.toUpperCase()}`);
    setChatMessages(prev => [
      ...prev.slice(-40),
      { username: "System", text: `Weather set to ${newWeather}`, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
    ]);
  };

  const handleRespawnClick = () => {
    const s = stateRef.current;
    s.dead = false;
    s.health = 20;
    setDead(false);
    setHealth(20);
    setOxygenBubbles(10);
    if (s.player) s.fallPeakY = s.player.y;
    s.keys = {};
    const home = (!s.dimension || s.dimension === "overworld") ? getHomePortal(s.currentWorldId) : null;
    s.respawnFn?.();
    s.active = true;
    s.steering = true;
    setActive(true);
    showToast(home ? `Respawned at home (${home.name}) 🏠❤️` : "Respawned at world spawn ❤️");
  };

  const handleOpenMenu = () => {
    const s = stateRef.current;
    s.active = false; s.steering = false; s.keys = {};
    setActive(false); setPauseOpen(true); setMenuOpen(false); setInventoryOpen(false);
    playMenuClick();
  };

  const handleClosePause = () => {
    const s = stateRef.current;
    setPauseOpen(false); setMenuOpen(false);
    s.active = true; s.steering = true;
    setActive(true);
    playMenuClick();
    onLockPointer();
  };

  const handlePauseOptions = () => {
    setPauseOpen(false);
    setMenuOpen(true);
    playMenuClick();
  };

  const handlePauseStatistics = () => {
    setPauseOpen(false);
    setAuditLogsOpen(true);
    playMenuClick();
  };

  const handlePauseSnapshot = () => {
    captureNowRef.current = true;
    const src = containerRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (src && src.width > 0) {
      encodeCanvasToPngBlob(src, src.width, src.height).then((blob) => {
        if (!blob) return;
        const dd = new Date();
        const stamp = dd.toISOString().slice(0, 19).replace(/[-:]/g, (c) => (c === "T" ? "_" : c === "-" ? "" : c));
        fetch(`/api/debug/snapshot?name=${encodeURIComponent(`shot-${stamp}.png`)}`, {
          method: "POST",
          headers: { "Content-Type": "image/png" },
          body: blob
        }).then(() => showToast("📸 Snapshot saved ✓")).catch(() => showToast("📸 Snapshot failed"));
      });
    }
    playMenuClick();
  };

  const handlePauseHelp = () => {
    showToast("📚 Docs: /docs — controls in FEATURES.md");
    playMenuClick();
  };

  return {
    handleApplyPreset,
    handleSetWeather,
    handleRespawnClick,
    handleOpenMenu,
    handleClosePause,
    handlePauseOptions,
    handlePauseStatistics,
    handlePauseSnapshot,
    handlePauseHelp,
  };
}
