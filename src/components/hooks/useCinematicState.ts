import { useCallback, useRef } from "react";
import type { GameState } from "../../game/state/gameState";
import { enterCinematicPose, hideCineArms, restoreCineArms } from "../../game/engine/cinematic";
import type { VideoProfile } from "../../game/engine/cinematic";
import type { ExposureModel, MeteringMode } from "../../game/engine/lightMeter";

export type { VideoProfile };

export interface CinematicSetters {
  setVibrance: (v: number) => void;
  setBrightness: (v: number) => void;
  setContrast: (v: number) => void;
  setFov: (v: number) => void;
  setRenderDistance: (v: number) => void;
  setShadows: (v: boolean) => void;
  setShadowTier: (v: "basic" | "detailed" | "advanced") => void;
  setShadowTierOverridden: (v: boolean) => void;
  setDof: (v: boolean) => void;
  setDofStrength: (v: number) => void;
  setCa: (v: boolean) => void;
  setCaStrength: (v: number) => void;
  setColorGamut: (v: string) => void;
  setBokeh: (v: boolean) => void;
  setSpecular: (v: boolean) => void;
  setSpecularStrength: (v: number) => void;
  setQualityPreset: (v: "smooth" | "balanced" | "beautiful") => void;
  setMaxFps: (v: number) => void;
  setEv: (v: number) => void;
  setMetering: (v: MeteringMode) => void;
  setEvComp: (v: number) => void;
  setExposureModel: (v: ExposureModel) => void;
}

export interface UseCinematicStateOptions {
  stateRef: React.MutableRefObject<GameState>;
  values: VideoProfile;
  setters: CinematicSetters;
  setActive: (v: boolean) => void;
  setPauseOpen: (v: boolean) => void;
  setMenuOpen: (v: boolean) => void;
  setMapOpen: (v: boolean) => void;
  setInventoryOpen: (v: boolean) => void;
  setCinematic: (v: boolean) => void;
  onLockPointer: () => void;
  showToast: (msg: string) => void;
}

const CINE_KEY = "mc_cine_prefs";

export function loadCineStored(): Partial<VideoProfile> | null {
  try {
    const raw = localStorage.getItem(CINE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return p && typeof p === "object" ? p : null;
  } catch {
    return null;
  }
}

export function storeCine(p: VideoProfile): void {
  try {
    localStorage.setItem(CINE_KEY, JSON.stringify(p));
  } catch {}
}

export function applyVideoProfile(s: CinematicSetters, p: VideoProfile): void {
  s.setVibrance(p.vibrance);
  s.setBrightness(p.brightness);
  s.setContrast(p.contrast);
  s.setFov(p.fov);
  s.setRenderDistance(p.renderDistance);
  s.setShadows(p.shadows);
  s.setShadowTier(p.shadowTier);
  s.setShadowTierOverridden(p.shadowTierOverridden);
  s.setDof(p.dof);
  s.setDofStrength(p.dofStrength);
  s.setCa(p.ca);
  s.setCaStrength(p.caStrength);
  s.setColorGamut(p.colorGamut);
  s.setBokeh(p.bokeh);
  s.setSpecular(p.specular);
  s.setSpecularStrength(p.specularStrength);
  s.setQualityPreset(p.qualityPreset);
  s.setMaxFps(p.maxFps);
  if (typeof p.ev === "number" && Number.isFinite(p.ev)) s.setEv(Math.max(8, Math.min(17, Math.round(p.ev))));
  if (p.metering === "matrix" || p.metering === "center" || p.metering === "spot") s.setMetering(p.metering);
  if (typeof p.evComp === "number" && Number.isFinite(p.evComp)) s.setEvComp(Math.max(-3, Math.min(3, p.evComp)));
  if (p.exposureModel === "legacy-sim" || p.exposureModel === "iso-ettl") s.setExposureModel(p.exposureModel);
}

export function useCinematicState(options: UseCinematicStateOptions) {
  const {
    stateRef, setActive, setPauseOpen, setMenuOpen, setMapOpen,
    setInventoryOpen, setCinematic, onLockPointer, showToast,
  } = options;

  const valuesRef = useRef(options.values);
  valuesRef.current = options.values;
  const settersRef = useRef(options.setters);
  settersRef.current = options.setters;
  const normalRef = useRef<VideoProfile | null>(null);

  const enterCinematic = useCallback(() => {
    const s = stateRef.current;
    if (s.cinematic) return;
    if (s.dead) {
      showToast("Respawn first — cinematic mode needs a living camera");
      return;
    }
    normalRef.current = { ...valuesRef.current };
    const stored = loadCineStored();
    applyVideoProfile(settersRef.current, stored ? { ...valuesRef.current, ...stored } : { ...valuesRef.current });
    s.mapOpen = false;
    setMapOpen(false);
    s.inventoryOpen = false;
    setInventoryOpen(false);
    s.menuOpen = false;
    setMenuOpen(false);
    enterCinematicPose(s);
    hideCineArms(s);
    s.cinematic = true;
    s.keys = {};
    s.sneak = false;
    s.sprintHold = false;
    s.pauseOpen = false;
    setPauseOpen(false);
    s.active = true;
    s.steering = true;
    setActive(true);
    setCinematic(true);
    showToast("Cinematic mode — WASD fly · Space up · Shift down · drag look · wheel speed · Esc exits");
  }, [stateRef, setActive, setPauseOpen, setMenuOpen, setMapOpen, setInventoryOpen, setCinematic, showToast]);

  const exitCinematic = useCallback((toPause: boolean) => {
    const s = stateRef.current;
    if (!s.cinematic) return;
    storeCine({ ...valuesRef.current });
    const normal = normalRef.current;
    if (normal) applyVideoProfile(settersRef.current, normal);
    normalRef.current = null;
    s.cinematic = false;
    s.cine = null;
    s.cineShot = null;
    s.cinePreload = null;
    s.cineAutoPlay = false;
    s.keys = {};
    s.sneak = false;
    s.sprintHold = false;
    restoreCineArms(s);
    setCinematic(false);
    s.menuOpen = false;
    setMenuOpen(false);
    s.pauseOpen = false;
    setPauseOpen(false);
    if (toPause) {
      s.active = false;
      s.steering = false;
      setActive(false);
      s.pauseOpen = true;
      setPauseOpen(true);
      try { document.exitPointerLock?.(); } catch {}
    } else {
      s.active = true;
      s.steering = true;
      setActive(true);
      onLockPointer();
    }
    showToast("Cinematic mode off — video settings restored");
  }, [stateRef, setActive, setPauseOpen, setMenuOpen, setCinematic, onLockPointer, showToast]);

  return { enterCinematic, exitCinematic };
}
