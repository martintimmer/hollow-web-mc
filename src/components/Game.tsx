import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";


// ==========================================
// BLOCKS / ARMOR REGISTRIES (moved to src/game/)
// ==========================================

import {
  BLOCK_MAP, DEFAULT_HOTBAR } from "../game/blocks";
import { CLOTHING_SETS } from "../game/armor";
import type { ArmorPiece } from "../game/armor";
import { isTelemetryEnabled } from "../game/telemetry";
import {
  CH } from "../game/world";
import { updatePostFx, applyColorGamut } from "../game/engine/postFx";
import type { PostFxSettings } from "../game/engine/postFx";
import { setSpecularEnabled } from "../game/engine/specular";
import {
  shadowConfigFor } from "../game/engine/sceneSetup";
import { MobManager } from "../game/entities/spawner";
import {
  unlockAudio, setVolume as setSfxVolume } from "../game/sfx";
import { setMusicVolume, setMusicEnabled, playAmbientMotif } from "../game/music";
import { createChatController, type ChatMessage } from "../game/chat/chatController";
import { createGameActions } from "./gameActions";
import { initEngine } from "../game/engine/engineInit";
import { isSim, isSimPort, probeSimAccess } from "../services/simMode";
import { fetchTextureOverrides } from "../services/textureOverrides";
import { HUD, FirstJoinCard, CineDirectorModal, MeterDebugOverlay } from "./gui";
import { GameOverlays } from "./GameOverlays";
import {
  useInventoryState,
  useCraftingState,
  useFurnaceState,
  useChestState,
  usePortalState,
  usePetState,
  useMapState,
  useTradingState,
  useStudioState,
  useWorldSession,
  useCinematicState,
  storeCine,
  type VideoProfile
} from "./hooks";
import {
  loadPortals,
  getHomePortal
} from "../game/state/portalStorage";
import {
  createDimensionState,
  transitionDimension,
  type DimensionState,
  type Dimension } from "../game/state/dimensionManager";
import { playMenuClick, playPortalTravel } from "../game/sfx";
import type { MenuTab } from "./gui";
import {
  isStudioActive } from "../game/studioMode";
import { type GameState, createDefaultGameState } from "../game/state/gameState";
import { stopShot } from "../game/engine/cinematic";
import { evContrastFactor, evBloomStrength, fovToMM, ev100FromLux, countWindowClipUp, type MeteringMode, type ExposureModel } from "../game/engine/lightMeter";
import { LEGACY_SIM_PRESET, ISO_ETTL_PRESET, type ExposurePreset } from "../game/engine/exposurePresets";
import { refreshShadowCasterFlags } from "../game/engine/chunkMesher";

// ==========================================
// CODEBASE EFFICIENCY RATING (modularization score, see docs/GAME_MODULARIZATION_PLAN.md)
// ==========================================
const GAME_TSX_BASELINE = 9308;
const GAME_TSX_CURRENT = 1403;
const GAME_MODULES = 70;
const EFFICIENCY_SCORE = Math.round((1 - GAME_TSX_CURRENT / GAME_TSX_BASELINE) * 100);
const EFFICIENCY_RATING = EFFICIENCY_SCORE >= 70 ? "S" : EFFICIENCY_SCORE >= 55 ? "A" : EFFICIENCY_SCORE >= 40 ? "B" : "C";
if (import.meta.env.DEV) console.log(`[efficiency] Game.tsx ${GAME_TSX_CURRENT} lines (baseline ${GAME_TSX_BASELINE}, -${GAME_TSX_BASELINE - GAME_TSX_CURRENT}) · ${GAME_MODULES} game/sim modules · score ${EFFICIENCY_SCORE}/100 · rating ${EFFICIENCY_RATING}`);


// ==========================================
// 1.2 VANILLA MINECRAFT CLOTHING & ARMOR REGISTRY (10 Distinct Sets)
// ==========================================
// 1.1 3D MULTIPLAYER MINECRAFT AVATAR GENERATOR
// ==========================================

/* Remote avatar factory moved to ../game/avatars */
export default function Game() {
  const containerRef = useRef<HTMLDivElement>(null);
  const miniCanvasRef = useRef<HTMLCanvasElement>(null);
  const bigCanvasRef = useRef<HTMLCanvasElement>(null);

  const [, setActive] = useState(false);  const [creative, setCreative] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);
  const [cinematic, setCinematic] = useState(false);
  const [cineDirectorOpen, setCineDirectorOpen] = useState(false);
  const [connOnline, setConnOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine !== false : true));
  const [lastSyncAt, setLastSyncAt] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [loadMsg, setLoadMsg] = useState("Waking the world…");
  const [loadPct, setLoadPct] = useState(0);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Hotbar & Active Item
  const [hotbar, setHotbar] = useState<number[]>(isSim() ? [0, 0, 0, 0, 0, 0, 0, 0, 0] : DEFAULT_HOTBAR);
  const [activeSlot, setActiveSlot] = useState(0);
  const [selectedInvBlock, setSelectedInvBlock] = useState<number>(1);
  const [vehicleKmh, setVehicleKmh] = useState(0);
  const [isInVehicle, setIsInVehicle] = useState(false);
  const [seatName, setSeatName] = useState("Driver");

  const [seedText, setSeedText] = useState("hollowpine");
  const [worldType, setWorldType] = useState("standard");
  const [vibrance, setVibrance] = useState(140);
  const [brightness, setBrightness] = useState(105);
  const [contrast, setContrast] = useState(105);
  const [fov, setFov] = useState(70);
  const [ev, setEv] = useState<number>(() => {
    try {
      const v = Number(localStorage.getItem("mc_ev"));
      if (Number.isFinite(v)) return Math.max(8, Math.min(17, Math.round(v)));
    } catch {}
    return 12;
  });
  const [renderDistance, setRenderDistance] = useState(8);
  const [evComp, setEvComp] = useState<number>(() => {
    try {
      const v = Math.round(Number(localStorage.getItem("mc_evcomp")) * 10) / 10;
      if ([-3, -2.5, -2, -1.5, -1, -0.7, -0.3, 0, 0.3, 0.7, 1, 1.5, 2, 2.5, 3].includes(v)) return v;
    } catch {}
    return 0;
  });
  const [metering, setMetering] = useState<MeteringMode>(() => {
    try {
      const saved = localStorage.getItem("mc_metering");
      if (saved === "matrix" || saved === "center" || saved === "spot") return saved;
    } catch {}
    return "matrix";
  });
  const [exposureModel, setExposureModel] = useState<ExposureModel>(() => {
    try {
      const saved = localStorage.getItem("mc_exposure_model");
      if (saved === "legacy-sim" || saved === "iso-ettl") return saved;
    } catch {}
    return "legacy-sim";
  });
  const [shadows, setShadows] = useState(true);
  const [shadowTier, setShadowTier] = useState<"basic" | "detailed" | "advanced">("detailed");
  const [shadowTierOverridden, setShadowTierOverridden] = useState(false);
  const [dof, setDof] = useState(false);
  const [dofStrength, setDofStrength] = useState(0.4);
  const [ca, setCa] = useState(false);
  const [caStrength, setCaStrength] = useState(0.25);
  const [colorGamut, setColorGamut] = useState<string>("display-p3");
  const [bokeh, setBokeh] = useState(false);
  const [specular, setSpecular] = useState(false);
  const [specularStrength, setSpecularStrength] = useState(0.6);
  const [qualityPreset, setQualityPreset] = useState<"smooth" | "balanced" | "beautiful">("balanced");
  const [gameplayMode, setGameplayMode] = useState<"peaceful" | "survival" | "hardcore">(() => {
    try {
      const saved = localStorage.getItem("mc_gameplay_mode");
      if (saved === "peaceful" || saved === "survival" || saved === "hardcore") return saved;
    } catch {}
    return "survival";
  });
  const [autoStep, setAutoStep] = useState(false);
  const [touchControls, setTouchControls] = useState(false);
  const [menuTab, setMenuTab] = useState<MenuTab>("video");
  const [maxFps, setMaxFps] = useState<number>(0);
  const [detectedHz, setDetectedHz] = useState<number>(120);

  // Time & Day/Night System (Minecraft 24000 tick cycle: 6000=noon, 12000=sunset, 18000=midnight, 0/24000=sunrise)
  const [worldTime, setWorldTime] = useState(6000);
  const [timeFlow, setTimeFlow] = useState(true);
  const [timeSpeed, setTimeSpeed] = useState(1);
  const [timeFormatted, setTimeFormatted] = useState("12:00 PM ☀️");
  const [dayCount, setDayCount] = useState(0);

  const [fps, setFps] = useState(0);
  const [chunkCount, setChunkCount] = useState(0);
  const [posInfo, setPosInfo] = useState({ x: 0, y: 0, z: 0, heading: "N 0°", state: "flying" });
  const [nearestVillage, setNearestVillage] = useState<{ name: string; x: number; z: number; dist: number; angle: number; bearing: string } | null>(null);
  const [compassHeading, setCompassHeading] = useState<number>(0);
  const [isoThumbnails, setIsoThumbnails] = useState<Map<number, string>>(new Map());
  const isoThumbsRef = useRef<Map<number, string>>(new Map());
  const [hungerBar, setHungerBar] = useState<number>(20);
  const [xpBar, setXpBar] = useState<{ level: number; progress: number }>({ level: 0, progress: 0 });
  const [pauseOpen, setPauseOpen] = useState(false);
  const [bootDone, setBootDone] = useState(false);
  const captureNowRef = useRef(false);
  const [simBoost, setSimBoost] = useState(false);
  const [bootStallMsg, setBootStallMsg] = useState<string | null>(null);
  const [blueprintModalOpen, setBlueprintModalOpen] = useState(false);

  // Boot-stall self-diagnostic: warns only when loading makes NO progress
  // (pct frozen) — slow-but-advancing loads are not stalls. Posted only when
  // telemetry is opted in.
  const bootProgRef = useRef({ pct: -1, at: 0 });
  useEffect(() => {
    const iv = setInterval(() => {
      const st = stateRef.current;
      if (!loading) {
        st.bootStallAt = 0;
        bootProgRef.current = { pct: -1, at: 0 };
        setBootStallMsg((m) => (m ? null : m));
        return;
      }
      const now = performance.now();
      if (!st.bootStallAt) st.bootStallAt = now;
      if (loadPct !== bootProgRef.current.pct) bootProgRef.current = { pct: loadPct, at: now };
      const elapsed = Math.round(now - st.bootStallAt);
      const stalledFor = Math.round(now - bootProgRef.current.at);
      if (elapsed > 15000 && stalledFor > 12000) {
        const since = now - st.lastBootStallLog;
        if (since > 6000) {
          st.lastBootStallLog = now;
          const stage = loadPct < 48 ? "gen" : loadPct < 88 ? "mesh" : loadPct < 95 ? "wildlife" : loadPct < 100 ? "atlas" : "finalize";
          const payload = {
            kind: "STALL_BOOT", ms: elapsed, stalledFor, loadPct, stage, worldId: st.currentWorldId, seedText: st.seedText,
            chunks: st.chunks.size, genQ: st.genQ.length, meshQ: st.meshQ.length,
            meshResume: st.meshResume.length, active: st.active, uiPaused: st.uiPaused,
            lastFrame: Math.round(st.lastFrameAt || 0)
          };
          if (isTelemetryEnabled()) {
            fetch("/api/debug/perf", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ lines: [JSON.stringify({ ts: new Date().toISOString(), ...payload })] })
            }).catch(() => {});
          }
          setBootStallMsg(
            `⚠ Loading stalled ${(stalledFor / 1000).toFixed(0)}s at ${loadPct}% (${stage}) — world ${st.currentWorldId} · seed "${st.seedText}" · chunks ${st.chunks.size} · genQ ${st.genQ.length} · meshQ ${st.meshQ.length} · resume ${st.meshResume.length} · active ${st.active} · paused ${st.uiPaused}`
          );
        }
      }
    }, 3000);
    return () => clearInterval(iv);
  }, [loading, loadPct]);

  // Sim Deck availability is server-confirmed (admin session in the dev environment)
  useEffect(() => {
    if (isSim()) {
      probeSimAccess().then((allowed) => {
        if (allowed) setSimBoost(true);
      });
    }
  }, []);
  const [isUnderwater, setIsUnderwater] = useState(false);
  const [isUnderLava, setIsUnderLava] = useState(false);
  const [oxygenBubbles, setOxygenBubbles] = useState(10);
  const [nearVillager, setNearVillager] = useState<any | null>(null);
  const [aimedVillager, setAimedVillager] = useState<any | null>(null);
  const [hoveredBlockName, setHoveredBlockName] = useState<string | null>(null);

  // Environmental Weather & Cloud System ("clear" | "cloudy" | "overcast")
  const [weather, setWeather] = useState<"clear" | "cloudy" | "overcast">("cloudy");

  // Multiplayer Chat System
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatTextRef = useRef("");
  const chatCancelRef = useRef(false);

  // Health / Survival Damage System (20 HP = 10 Hearts)
  const [health, setHealth] = useState(20);
  const [dead, setDead] = useState(false);
  const [hurtTick, setHurtTick] = useState(0);

  // Dimension System (Overworld & Nether)
  const dimStateRef = useRef<DimensionState>(createDimensionState("hollowpine"));
  const [currentDimension, setCurrentDimension] = useState<Dimension>("overworld");
  const [portalWarping, setPortalWarping] = useState<boolean>(false);

  // WebAudio SFX & Ambient Music (Phase 6): volume + mute toggles, unlocked on first gesture
  const [soundOn, setSoundOn] = useState(false); // sound effects OFF by default
  const [volume, setVolume] = useState(0.7);
  const [musicOn, setMusicOn] = useState(true); // music ON by default
  const [musicVolume, setMusicVolumeState] = useState(0.5);
  const [equippedArmor, setEquippedArmor] = useState<{
    helmet: ArmorPiece | null;
    chestplate: ArmorPiece | null;
    leggings: ArmorPiece | null;
    boots: ArmorPiece | null;
  }>({
    helmet: null,
    chestplate: CLOTHING_SETS[0].items.chestplate,
    leggings: CLOTHING_SETS[0].items.leggings,
    boots: CLOTHING_SETS[0].items.boots
  });

  const stateRef = useRef<GameState>(createDefaultGameState());
  if (typeof window !== "undefined") {
    (window as any).__gameState = stateRef.current;
    (window as any).BLOCK_MAP = BLOCK_MAP;
  }

  // Live exposure readout ticker: re-render 2×/s so the P-mode cluster
  // (f/shutter/ISO/mm/lux) tracks the meter. (fps state alone can't do this —
  // React bails out when the fps value is unchanged at a stable framerate.)
  const [, setExpoTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setExpoTick((t) => t + 1), 500);
    return () => clearInterval(iv);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 1800);
  }, []);

  const tryLockPointer = useCallback(() => {
    const cv = containerRef.current?.querySelector("canvas") as HTMLCanvasElement | null;
    if (!cv || document.pointerLockElement || typeof cv.requestPointerLock !== "function") return;
    try {
      (cv as unknown as { requestPointerLock: (o?: { unadjustedMovement?: boolean }) => void }).requestPointerLock({ unadjustedMovement: true });
    } catch {
      try { cv.requestPointerLock(); } catch { /* browser denied */ }
    }
  }, []);

  // Hook: Survival Inventory State & Handlers
  const {
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
  } = useInventoryState({
    stateRef,
    inventoryOpen,
    setInventoryOpen,
    hotbar,
    setHotbar,
    activeSlot,
    setActive,
    showToast
  });

  // Hook: Crafting State & Handlers
  const {
    craftGrid,
    craftTableOpen,
    setCraftTableOpen,
    craftResult,
    handleCraftCellClick,
    handleCraftResultClick,
    handleCraftReset,
    openCraftTable,
    closeCraftTable
  } = useCraftingState({
    stateRef,
    inventoryAddItem,
    setHotbar,
    setHotbarCounts,
    setActive,
    showToast
  });

  // Hook: Furnace State & Handlers
  const {
    furnaceOpen,
    setFurnaceOpen,
    furnaceUI,
    syncFurnaceUI,
    openFurnace,
    closeFurnace,
    handleFurnaceSlotClick,
    handleFurnaceReset
  } = useFurnaceState({
    stateRef,
    inventoryAddItem,
    setHotbar,
    setHotbarCounts,
    setActive,
    showToast
  });

  const closeAllModals = useCallback(() => {
    const s = stateRef.current;
    s.inventoryOpen = false; setInventoryOpen(false);
    s.craftTableOpen = false; setCraftTableOpen(false);
    s.furnaceOpen = false; setFurnaceOpen(false);
    s.mapOpen = false; setMapOpen(false);
    s.menuOpen = false; setMenuOpen(false);
    s.pauseOpen = false; setPauseOpen(false);
    s.chatOpen = false; setChatOpen(false);
    setBlueprintModalOpen(false);
  }, []);

  // Hook: Chest State & Handlers
  const {
    chestOpen,
    chestPos,
    chestSlots,
    setChestSlots,
    handleSetChestSlots,
    openChest,
    closeChest,
    handleChestSlotClick
  } = useChestState({
    stateRef,
    closeAllModals,
    setHotbar,
    setHotbarCounts,
    setActive,
    showToast
  });

  // Hook: Portal & Recall State & Handlers
  const {
    portalModalOpen,
    portalCoord,
    recallModalOpen,
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
  } = usePortalState({
    stateRef,
    closeAllModals,
    setActive,
    showToast
  });

  // Hook: Pet State & Handlers
  const {
    petsOpen,
    setPetsOpen,
    namingAnimal,
    setNamingAnimal,
    namingInput,
    setNamingInput,
    collarColor,
    setCollarColor,
    petsList,
    refreshPets,
    closePetName,
    confirmPetName
  } = usePetState({
    stateRef,
    tryLockPointer,
    setActive,
    showToast
  });

  // Hook: Map State & Handlers
  const {
    handleMapHover,
    handleMapHoverLeave,
    handleMapSaveSpawn,
    handleMapSpawnAt,
    handleRenamePortal,
    handleFlashSpawn,
    handleMapTeleportToPortal,
    getMapMarkers
  } = useMapState({
    stateRef,
    portalsListRef,
    setPortalsList,
    setMapOpen,
    showToast
  });

  // Hook: Cinematic observer mode (own FOV + video profile)
  const cineValues: VideoProfile = {
    vibrance, brightness, contrast, fov, renderDistance, shadows, shadowTier,
    shadowTierOverridden, dof, dofStrength, ca, caStrength, colorGamut, bokeh,
    specular, specularStrength, qualityPreset, maxFps, ev, metering, evComp, exposureModel
  };
  const { enterCinematic, exitCinematic } = useCinematicState({
    stateRef,
    values: cineValues,
    setters: {
      setVibrance, setBrightness, setContrast, setFov, setRenderDistance,
      setShadows, setShadowTier, setShadowTierOverridden, setDof, setDofStrength,
      setCa, setCaStrength, setColorGamut, setBokeh, setSpecular,
      setSpecularStrength, setQualityPreset, setMaxFps, setEv, setMetering, setEvComp, setExposureModel
    },
    setActive,
    setPauseOpen,
    setMenuOpen,
    setMapOpen,
    setInventoryOpen,
    setCinematic,
    onLockPointer: tryLockPointer,
    showToast
  });

  // Cinematic timeline bridges (Q marks cameras, Esc stops playback)
  const cineMark = useCallback(() => {
    const s = stateRef.current;
    if (!s.cinematic || !s.cine) return;
    if (s.cineShot?.playing) {
      stopShot(s);
      s.cineAutoPlay = false;
      showToast("Shot stopped");
      return;
    }
    const pose = { ...s.cine };
    if (!s.cineMarks.a || (s.cineMarks.a && s.cineMarks.b)) {
      s.cineMarks = { a: pose, b: null };
      s.cineShot = null;
      showToast("Camera A marked — fly elsewhere, press Q for B");
    } else {
      s.cineMarks.b = pose;
      s.cineShotDur = s.cineShotDur || 5;
      setCineDirectorOpen(true);
      showToast("Camera B marked — set time, Process, Play");
    }
  }, [showToast]);

  const cineStop = useCallback(() => {
    const s = stateRef.current;
    stopShot(s);
    s.cineAutoPlay = false;
    showToast("Shot stopped");
  }, [showToast]);

  useEffect(() => {
    if (!cinematic) setCineDirectorOpen(false);
  }, [cinematic]);

  const toggleCinematicFromMenu = useCallback(() => {
    if (stateRef.current.cinematic) exitCinematic(false);
    else enterCinematic();
  }, [enterCinematic, exitCinematic]);

  // Hook: Trading State & Handlers
  const {
    tradingVillager,
    setTradingVillager,
    tradeTick,
    handleExecuteTrade
  } = useTradingState({
    stateRef,
    showToast,
    inventoryAddItem: (id: number, count: number) => inventoryAddItem(id, count)
  });

  // UI open tracker ref (for modal and wake state checks)
  const uiOpenRef = useRef({
    pets: false, portal: false, recall: false, blueprint: false,
    audit: false, naming: false, trading: false
  });

  // Hook: World Session, Authentication & Persistence
  const {
    currentUser,
    authUsername,
    setAuthUsername,
    authPassword,
    setAuthPassword,
    authError,
    titleScreenOpen,
    setTitleScreenOpen,
    worldSelectOpen,
    setWorldSelectOpen,
    createWorldOpen,
    setCreateWorldOpen,
    auditLogsOpen,
    setAuditLogsOpen,
    newWorldName,
    setNewWorldName,
    newWorldSeed,
    setNewWorldSeed,
    newWorldType,
    setNewWorldType,
    newWorldMode,
    setNewWorldMode,
    availableWorlds,
    activeWorld,
    setActiveWorld,
    auditLogs,
    handleAuthSubmit,
    handleLogout,
    handleCreateWorldSubmit,
    handleDeleteWorldClick,
    handleJoinWorld,
    handleOpenAuditLogs,
    handlePauseWorldSelect,
    handleQuitToLogin,
    handleEnter,
    savePreferences,
    reportSyncOk,
    reportSyncFail
  } = useWorldSession({
    stateRef,
    uiOpenRef,
    loading,
    setLoading,
    showToast,
    setMenuOpen,
    setPauseOpen,
    setInventoryOpen,
    setActive,
    setChatMessages,
    setChatOpen,
    setPortalsList,
    setSeedText,
    setWorldType,
    setWorldTime,
    setDayCount,
    setCreative,
    setHotbar,
    setHotbarCounts,
    activeSlot,
    setActiveSlot,
    setInvMain,
    refreshPets,
    setRenderDistance,
    setVibrance,
    setBrightness,
    setContrast,
    setFov,
    setShadows,
    setShadowTier,
    setShadowTierOverridden,
    setDof,
    setDofStrength,
    setCa,
    setCaStrength,
    setColorGamut,
    setBokeh,
    setQualityPreset,
    setWeather,
    setAutoStep,
    setTouchControls,
    setMaxFps,
    setExposureModel,
    setConnOnline,
    setLastSyncAt
  });

  // Hook: Studio & Blueprint State & Handlers
  const {
    simBuildingMode,
    handleRebuildWorld,
    handleEnterStudio,
    handleReturnFromStudio,
    handleToggleBuildingMode,
    handleLoadPresetStructure,
    handleScanAndSaveBlueprint,
    handleStampBlueprint
  } = useStudioState({
    stateRef,
    activeWorld,
    seedText,
    worldType,
    setCreative,
    setHotbar,
    setMenuOpen,
    setInventoryOpen,
    setPauseOpen,
    showToast
  });

  if (typeof window !== "undefined") {
    (window as any).__toggleInventory = handleToggleInventory;
    (window as any).__assignToHotbar = handleAssignToHotbar;
  }

  const {
    handleApplyPreset, handleSetWeather, handleRespawnClick,
    handleOpenMenu, handleClosePause, handlePauseOptions,
    handlePauseStatistics, handlePauseSnapshot, handlePauseHelp,
  } = createGameActions({
    stateRef,
    showToast,
    setQualityPreset,
    setRenderDistance,
    setShadows,
    setDof,
    setDofStrength,
    setCa,
    setCaStrength,
    setWeather,
    setChatMessages,
    setDead,
    setHealth,
    setOxygenBubbles,
    setActive,
    setPauseOpen,
    setMenuOpen,
    setInventoryOpen,
    setAuditLogsOpen,
    containerRef,
    captureNowRef,
    onLockPointer: tryLockPointer,
  });

  const applyExposurePreset = useCallback((preset: ExposurePreset) => {
    setExposureModel(preset.exposureModel);
    setEv(preset.ev);
    setMetering(preset.metering);
    setEvComp(preset.evComp);
    setBrightness(preset.brightness);
    setContrast(preset.contrast);
    setVibrance(preset.vibrance);
    setShadows(preset.shadows);
    setShadowTier(preset.shadowTier);
    setShadowTierOverridden(true);
    setSpecular(preset.specular);
    setSpecularStrength(preset.specularStrength / 100);
    handleSetWeather(preset.weather);
    showToast(`Exposure preset: ${preset.label} — ${preset.blurb}`);
  }, [showToast, handleSetWeather]);

  const handleApplyLegacyExposure = useCallback(() => {
    applyExposurePreset(LEGACY_SIM_PRESET);
  }, [applyExposurePreset]);

  const handleApplyIsoExposure = useCallback(() => {
    applyExposurePreset(ISO_ETTL_PRESET);
  }, [applyExposurePreset]);
  const { openChat, closeChat } = createChatController({    stateRef,
    showToast,
    setChatInput,
    setChatOpen,
    setActive,
    setChatMessages,
    setCreative,
    chatTextRef,
    chatInputRef,
    chatCancelRef,
    onSetWeather: handleSetWeather,
  });


  useEffect(() => {
    stateRef.current.slot = activeSlot;
  }, [activeSlot]);

  useEffect(() => {
    stateRef.current.hotbar = hotbar;
  }, [hotbar]);

  useEffect(() => {
    stateRef.current.mapOpen = mapOpen;
  }, [mapOpen]);

  useEffect(() => {
    stateRef.current.inventoryOpen = inventoryOpen;
  }, [inventoryOpen]);

  useEffect(() => {
    const s = stateRef.current;
    s.creative = creative;
    if (!creative) {
      s.player.fly = false;
      s.player.vy = 0;
    }
  }, [creative]);

  useEffect(() => {
    stateRef.current.time = worldTime;
  }, [worldTime]);

  useEffect(() => {
    stateRef.current.timeFlow = timeFlow;
  }, [timeFlow]);

  useEffect(() => {
    stateRef.current.timeSpeed = timeSpeed;
  }, [timeSpeed]);

  useEffect(() => {
    const s = stateRef.current;
    s.render = renderDistance;
    s.keep = renderDistance + 2;
    if (s.scene?.fog) {
      const maxHorizonDist = qualityPreset === "smooth" ? 32 * CH : (qualityPreset === "balanced" ? 48 * CH : 64 * CH);
      (s.scene.fog as THREE.Fog).far = maxHorizonDist;
      (s.scene.fog as THREE.Fog).near = Math.max(25, s.render * CH * 0.65);
    }
    // Instantly rescan and stream new visible chunks and update horizon mesh at new radius
    if (s.rescan && s.player) {
      const pcx = Math.floor(s.player.x / CH);
      const pcz = Math.floor(s.player.z / CH);
      s.lastCX = pcx;
      s.lastCZ = pcz;
      s.scanT = performance.now();
      s.rescan(pcx, pcz);
      s.updateHorizonMesh?.(true);
    }
  }, [renderDistance, qualityPreset]);

  useEffect(() => {
    const s = stateRef.current;
    s.shadowsOn = shadows;
    const tier = shadowTier;
    const cfg = shadowConfigFor(tier);
    s.shadowRes = cfg.res;
    s.shadowRad = cfg.rad;
    if (s.renderer) {
      s.renderer.shadowMap.enabled = shadows;
      s.renderer.shadowMap.type = cfg.type;
      if (s.sun) {
        s.sun.castShadow = shadows;
        // P1c: higher-res map + tighter camera so a block spans several texels
        s.sun.shadow.mapSize.set(cfg.res, cfg.res);
        if (s.sun.shadow.map) s.sun.shadow.map.dispose();
        const rad = cfg.rad;
        s.sun.shadow.camera.left = -rad; s.sun.shadow.camera.right = rad;
        s.sun.shadow.camera.top = rad; s.sun.shadow.camera.bottom = -rad;
        s.sun.shadow.camera.updateProjectionMatrix();
      }
    }
    if (s.sun) s.sun.castShadow = shadows;
    refreshShadowCasterFlags(s);
    if (s.renderer) s.renderer.shadowMap.needsUpdate = true;
  }, [shadows, shadowTier]);

  // Quality preset auto-sets the shadow tier until the user overrides it manually.
  useEffect(() => {
    if (shadowTierOverridden) return;
    setShadowTier(
      qualityPreset === "smooth" ? "basic" :
      qualityPreset === "beautiful" ? "advanced" : "detailed"
    );
  }, [qualityPreset, shadowTierOverridden]);

  useEffect(() => {
    stateRef.current.autoStep = autoStep;
  }, [autoStep]);

  useEffect(() => {
    stateRef.current.gameplayMode = gameplayMode;
    try { localStorage.setItem("mc_gameplay_mode", gameplayMode); } catch {}
  }, [gameplayMode]);

  useEffect(() => {
    stateRef.current.maxFps = maxFps;
  }, [maxFps]);

  // Mirror health / death / chat state into the engine loop closure
  useEffect(() => { stateRef.current.health = health; }, [health]);
  useEffect(() => { stateRef.current.dead = dead; }, [dead]);
  useEffect(() => { stateRef.current.chatOpen = chatOpen; }, [chatOpen]);
  useEffect(() => { stateRef.current.myUsername = currentUser?.username || ""; }, [currentUser]);
  useEffect(() => { stateRef.current.craftTableOpen = craftTableOpen; }, [craftTableOpen]);
  useEffect(() => { stateRef.current.furnaceOpen = furnaceOpen; }, [furnaceOpen]);
  useEffect(() => { stateRef.current.chestOpen = chestOpen; }, [chestOpen]);
  useEffect(() => { stateRef.current.chestPos = chestPos; }, [chestPos]);
  useEffect(() => { stateRef.current.chestSlots = chestSlots; }, [chestSlots]);
  useEffect(() => { stateRef.current.nearVillager = nearVillager; }, [nearVillager]);
  useEffect(() => { stateRef.current.aimedVillager = aimedVillager; }, [aimedVillager]);
  useEffect(() => { stateRef.current.oxygen = oxygenBubbles; }, [oxygenBubbles]);
  useEffect(() => { stateRef.current.invMain = invMain; }, [invMain]);
  useEffect(() => { stateRef.current.hotbarCounts = hotbarCounts; }, [hotbarCounts]);

  // Total equipped armor defense points (mirrored for engine-loop damage reduction)
  useEffect(() => {
    const total = [equippedArmor.helmet, equippedArmor.chestplate, equippedArmor.leggings, equippedArmor.boots]
      .reduce((a, b) => a + (b?.defense || 0), 0);
    stateRef.current.armorDefense = total;
  }, [equippedArmor]);

  // WebAudio: unlock on any user gesture (iOS Safari requires a gesture to start audio)
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("touchstart", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, []);

  // Sound Effects & Ambient Music volume / mute sync
  useEffect(() => {
    setSfxVolume(soundOn ? volume : 0);
  }, [soundOn, volume]);

  useEffect(() => {
    setMusicEnabled(musicOn);
    setMusicVolume(musicOn ? musicVolume : 0);
  }, [musicOn, musicVolume]);

  const handleToggleMusic = useCallback(() => {
    unlockAudio();
    showToast(musicOn ? "Music: PAUSED ⏸️" : "Music: PLAYING ▶️");
    setMusicOn(!musicOn);
  }, [musicOn, showToast]);

  // Page Refresh & Tab Close Persistence: Immediately save player coordinates, camera angles, and hotbar
  useEffect(() => {
    const handleBeforeUnload = () => {
      const s = stateRef.current;
      if (s.currentWorldId) {
        try {
          const stateObj = {
            x: s.player.x,
            y: s.player.y,
            z: s.player.z,
            yaw: s.player.yaw,
            pitch: s.player.pitch,
            fly: s.player.fly
          };
          localStorage.setItem("mc_last_player_state_" + s.currentWorldId, JSON.stringify(stateObj));

          const payload = JSON.stringify({
            x: s.player.x,
            y: s.player.y,
            z: s.player.z,
            yaw: s.player.yaw,
            pitch: s.player.pitch,
            flying: s.player.fly,
            gameMode: s.creative ? "creative" : "survival",
            hotbar: s.hotbar,
            activeSlot: s.slot,
            worldTime: s.time,
            dayCount: Math.floor(s.dayCount || 0)
          });
          const blob = new Blob([payload], { type: "application/json" });
          if (!s.simMode) navigator.sendBeacon(`/api/worlds/${s.currentWorldId}/state`, blob);
        } catch (e) {}
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
    };
  }, []);

  // Entering Creative mode restores full health (no hearts in creative)
  useEffect(() => {
    if (creative) {
      setHealth(20);
      setDead(false);
      stateRef.current.health = 20;
      stateRef.current.dead = false;
    } else {
      // Entering Survival: empty hotbar slots (id ≤ 0 or count 0) get the default block
      // + a fresh 64-stack so the player can mine/build immediately.
      const s = stateRef.current;
      const hb = [...s.hotbar];
      const counts = [...s.hotbarCounts];
      for (let i = 0; i < 10; i++) {
        if (hb[i] <= 0 || !counts[i]) {
          hb[i] = DEFAULT_HOTBAR[i] ?? 1;
          counts[i] = 64;
        }
      }
      s.hotbar = hb;
      s.hotbarCounts = counts;
      setHotbar(hb);
      setHotbarCounts(counts);
    }
  }, [creative]);


  // Save Preferences when settings change (Guarded by isPrefsLoaded inside savePreferences)
  // In cinematic mode the live profile belongs to the observer camera: persist it
  // to localStorage instead of the server so each mode keeps its own FOV + video setup.
  useEffect(() => {
    stateRef.current.baseFov = fov;
    if (stateRef.current.camera) {
      stateRef.current.camera.fov = fov;
      stateRef.current.camera.updateProjectionMatrix();
    }
    if (stateRef.current.cinematic) {
      storeCine({
        renderDistance, vibrance, brightness, contrast, fov, shadows,
        shadowTier, shadowTierOverridden, maxFps, dof, dofStrength, ca,
        caStrength, colorGamut, bokeh, specular, specularStrength,
        qualityPreset, ev, metering, evComp, exposureModel
      });
      return;
    }

    savePreferences({
      renderDistance,
      vibrance,
      brightness,
      contrast,
      fov,
      shadows,
      autoStep,
      maxFps,
      dof,
      dofStrength: Math.round(dofStrength * 100),
      ca,
      caStrength: Math.round(caStrength * 100),
      colorGamut,
      bokeh,
      specular,
      specularStrength: Math.round(specularStrength * 100),
      qualityPreset,
      shadowTier,
      touchControls,
      weather,
      exposureModel
    });
  }, [renderDistance, vibrance, brightness, contrast, fov, shadows, shadowTier, autoStep, maxFps, dof, dofStrength, ca, caStrength, colorGamut, bokeh, specular, specularStrength, qualityPreset, weather, touchControls, exposureModel, savePreferences]);

  // Dynamic range (EV): Khronos Neutral tone mapping renders the scene's HDR
  // inside Rec.709 the cinematography way — smooth highlight shoulder (no hard
  // clip) and an open toe (shadows keep detail). EV selects the adaptation
  // latitude of the eye-adaptation meter (renderLoop owns the live exposure);
  // EV 12 barely adapts, EV 15+ fully rides bright/dark views. localStorage.
  useEffect(() => {
    stateRef.current.ev = ev;
    stateRef.current.metering = metering;
    stateRef.current.exposureModel = exposureModel;
    stateRef.current.evComp = evComp;
    const r = stateRef.current.renderer;
    if (r) r.toneMapping = THREE.NeutralToneMapping;
    try { localStorage.setItem("mc_ev", String(ev)); } catch {}
    try { localStorage.setItem("mc_metering", metering); } catch {}
    try { localStorage.setItem("mc_exposure_model", exposureModel); } catch {}
    try { localStorage.setItem("mc_evcomp", String(evComp)); } catch {}
  }, [ev, metering, exposureModel, evComp, loading]);

  const postFxSettingsRef = useRef<PostFxSettings>({ dof: false, dofStrength: 0.4, ca: false, caStrength: 0.25, bokeh: false, bloom: 0.9, grade: false, gradeWidth: 17 });
  useEffect(() => {
    postFxSettingsRef.current = { dof, dofStrength, ca, caStrength, bokeh, bloom: evBloomStrength(ev), grade: ev < 17, gradeWidth: ev };
    updatePostFx(stateRef.current.postFx, postFxSettingsRef.current);
  }, [dof, dofStrength, ca, caStrength, bokeh, ev]);

  const colorGamutRef = useRef<string>("display-p3");
  useEffect(() => {
    colorGamutRef.current = colorGamut;
    applyColorGamut(stateRef.current.renderer, colorGamut);
  }, [colorGamut]);

  const specularRef = useRef(false);
  const specularStrengthRef = useRef(0.6);
  useEffect(() => {
    specularRef.current = specular;
    specularStrengthRef.current = specularStrength;
    setSpecularEnabled([stateRef.current.matMerged, stateRef.current.matOpaque, stateRef.current.matTrans], specular, specularStrength);
  }, [specular, specularStrength]);

  // Static pre-allocated vectors & colors for zero-allocation rendering loop
  const _rayDir = useRef(new THREE.Vector3()).current;

  // Main Engine Initialization
  useEffect(() => {
    return initEngine({
      stateRef,
      showToast,
      _rayDir,
      setActive,
      setActiveSlot,
      setAimedVillager,
      setBlueprintModalOpen,
      setChatMessages,
      setChestSlots,
      setChunkCount,
      setCollarColor,
      setCompassHeading,
      setCreative,
      setCurrentDimension,
      setDayCount,
      setDead,
      setDetectedHz,
      setFps,
      setFurnaceOpen,
      setHealth,
      setHotbar,
      setHotbarCounts,
      setHotbarDamage,
      setHoveredBlockName,
      setHungerBar,
      setHurtTick,
      setInvMain,
      setInventoryOpen,
      setIsInVehicle,
      setIsUnderLava,
      setIsUnderwater,
      setIsoThumbnails,
      setLoadMsg,
      setLoadPct,
      setLoading,
      setMapOpen,
      setMenuOpen,
      setNamingAnimal,
      setNamingInput,
      setNearVillager,
      setNearestVillage,
      setOxygenBubbles,
      setPauseOpen,
      setPetsOpen,
      setPortalWarping,
      setPosInfo,
      setRenderDistance,
      setSeatName,
      setTimeFormatted,
      setTitleScreenOpen,
      setTradingVillager,
      setVehicleKmh,
      setWorldSelectOpen,
      setWorldTime,
      setXpBar,
      bigCanvasRef,
      colorGamutRef,
      containerRef,
      dimStateRef,
      isoThumbsRef,
      miniCanvasRef,
      postFxSettingsRef,
      specularRef,
      specularStrengthRef,
      closeChat,
      closeChest,
      closeCraftTable,
      closeFurnace,
      deductHotbarSlot,
      dropHeldItem,
      getMapMarkers,
      handleEnter,
      inventoryAddItem,
      openChat,
      openChest,
      openCraftTable,
      openFurnace,
      openPortalModal,
      openRecallModal,
      reportSyncFail,
      reportSyncOk,
      syncFurnaceUI,
      blueprintModalOpen,
      qualityPreset,
      shadowTier,
    });
  }, [showToast]);

  // Mirror UI state into the engine ref for the 1-FPS idle gate in frame()
  // NOTE: while `loading` (world join/boot) the loop must NEVER pause — meshing
  // resumes and spawn area depend on stream() pumping. This was the prod "world
  // not generating" regression candidate and is now hard-guarded.
  useEffect(() => {
    const s = stateRef.current;
    const isAnyMenuOpen = menuOpen || pauseOpen || inventoryOpen || chestOpen || furnaceOpen ||
      craftTableOpen || tradingVillager !== null || titleScreenOpen ||
      worldSelectOpen || dead;
    s.uiPaused = !loading && isAnyMenuOpen;
    s.menuOpen = menuOpen;
    s.pauseOpen = pauseOpen;
    if (!isAnyMenuOpen && !loading) {
      s.active = true;
      s.steering = true;
      setActive(true);
    }
  }, [loading, menuOpen, pauseOpen, inventoryOpen, chestOpen, furnaceOpen, craftTableOpen,
      tradingVillager, titleScreenOpen, worldSelectOpen, dead]);


  if (typeof window !== "undefined") {
    (window as any).__openRecallModal = openRecallModal;
    (window as any).__openPortalModal = openPortalModal;
    (window as any).__confirmRecall = confirmRecall;
    (window as any).__closeRecallModal = closeRecallModal;
    (window as any).__getHomePortal = () => getHomePortal(stateRef.current.currentWorldId);
    (window as any).__getPortalsList = () => loadPortals(stateRef.current.currentWorldId);
    (window as any).__getDimension = () => dimStateRef.current.dimension;
    (window as any).__teleportToDimension = async (targetDim: Dimension) => {
      const s = stateRef.current;
      const dim = dimStateRef.current;
      if (dim.dimension === targetDim) return;
      setPortalWarping(true);
      playPortalTravel();
      const res = await transitionDimension(s, dim, targetDim);
      s.dimension = targetDim;
      setCurrentDimension(targetDim);
      ((s as any).mobMgr as MobManager | undefined)?.clear();
      s.player.x = res.targetX;
      s.player.y = res.targetY;
      s.player.z = res.targetZ;
      s.player.vx = s.player.vy = s.player.vz = 0;
      const scx = Math.floor(s.player.x / CH), scz = Math.floor(s.player.z / CH);
      if ((s as any).genChunk && (s as any).buildMesh) {
        for (let dz = -1; dz <= 1; dz++) {
          for (let dx = -1; dx <= 1; dx++) {
            (s as any).genChunk(scx + dx, scz + dz);
            (s as any).buildMesh(scx + dx, scz + dz);
          }
        }
      }
      s.rescan?.(scx, scz);
      setTimeout(() => setPortalWarping(false), 600);
      return res;
    };
    (window as any).__currentDimension = currentDimension;
    (window as any).__exitCinematic = exitCinematic;
    (window as any).__cineMark = cineMark;
    (window as any).__cineStop = cineStop;
  }

  uiOpenRef.current = {
    pets: petsOpen, portal: portalModalOpen, recall: recallModalOpen,
    blueprint: blueprintModalOpen, audit: auditLogsOpen,
    naming: namingAnimal !== null, trading: tradingVillager !== null
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0d1117] font-mono text-[#e9e0cb] select-none touch-none">
      {/* 3D Canvas Mount with Live Vibrance/Brightness Filter */}
      <div
        ref={containerRef}
        className="absolute inset-0 cursor-crosshair transform-gpu"
        style={{
          filter: `saturate(${vibrance}%) brightness(${brightness}%) contrast(${contrast * evContrastFactor(ev)}%)`,
          willChange: "transform"
        }}
      />

      {/* Heads-Up Display (HUD) — hidden in cinematic observer mode */}
      {!cinematic && (
      <HUD
        fps={fps}
        detectedHz={detectedHz}
        maxFps={maxFps}
        chunkCount={chunkCount}
        timeFormatted={timeFormatted}
        dayCount={dayCount}
        connOnline={connOnline}
        lastSyncAt={lastSyncAt}
        pendingCount={stateRef.current.pendingEdits.length}
        posInfo={posInfo}
        creative={creative || simBuildingMode}
        seed={stateRef.current.seed}
        worldLabel={stateRef.current.world?.label || (isSim() ? "Builder Studio" : "Overworld")}
        inventoryOpen={inventoryOpen}
        mapOpen={mapOpen}
        setMapOpen={setMapOpen}
        miniCanvasRef={miniCanvasRef}
        isUnderwater={isUnderwater}
        isUnderLava={isUnderLava}
        toastMsg={toastMsg}
        hurtTick={hurtTick}
        dead={dead}
        loading={loading}
        loadPct={loadPct}
        loadMsg={loadMsg}
        expoN={stateRef.current.meterN}
        expoT={stateRef.current.meterT}
        expoISO={stateRef.current.meterISO}
        expoMode={metering}
        expoMM={fovToMM(stateRef.current.camera?.fov || fov)}
        expoLux={stateRef.current.meterLux}
        expoEV100={ev100FromLux(stateRef.current.meterLux || 1)}
        expoClipUp={countWindowClipUp(stateRef.current)}
        expoModelTag={exposureModel === "iso-ettl" ? "ISO" : "LEG"}
        evComp={evComp}
        setEvComp={setEvComp}
        titleScreenOpen={titleScreenOpen}
        worldSelectOpen={worldSelectOpen}
        menuOpen={menuOpen}
        health={health}
        oxygenBubbles={oxygenBubbles}
        chatOpen={chatOpen}
        chatMessages={chatMessages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        chatInputRef={chatInputRef}
        chatTextRef={chatTextRef}
        chatCancelRef={chatCancelRef}
        openChat={openChat}
        closeChat={closeChat}
        hoveredBlockName={hoveredBlockName}
        setHoveredBlockName={setHoveredBlockName}
        hotbar={hotbar}
        hotbarCounts={hotbarCounts}
        hotbarDamage={hotbarDamage}
        activeSlot={activeSlot}
        setActiveSlot={setActiveSlot}
        isoThumbnails={isoThumbnails}
        aimedVillager={aimedVillager}
        myUsername={currentUser?.username || ""}
        onOpenPets={() => { refreshPets(); setPetsOpen(true); }}
        petsCount={petsList.length}
        tradingVillager={tradingVillager}
        setTradingVillager={setTradingVillager}
        onOpenMenu={handleOpenMenu}
        musicOn={musicOn}
        onToggleMusic={handleToggleMusic}
        onToggleInventory={handleToggleInventory}
        onAdvanceTime={() => {
          const nextTime = (stateRef.current.time + 3000) % 24000;
          stateRef.current.time = nextTime;
          setWorldTime(nextTime);
          showToast("Time advanced +3 hrs");
        }}
        onRespawnClick={handleRespawnClick}
        onMobileKey={(k, pressed) => { stateRef.current.keys[k] = pressed; }}
        onMobileHitDown={() => (stateRef.current as any).mobileActions?.hitDown()}
        onMobileHitUp={() => (stateRef.current as any).mobileActions?.hitUp()}
        onMobileTake={() => (stateRef.current as any).mobileActions?.take()}
        onMobileLook={(dx, dy) => (stateRef.current as any).mobileActions?.look(dx, dy)}
        onToggleFly={() => {
          stateRef.current.player.fly = !stateRef.current.player.fly;
          stateRef.current.player.vy = 0;
          showToast(stateRef.current.player.fly ? "Flying" : "Walking");
        }}
        forceTouchControls={touchControls}
        hungerBar={hungerBar}
        xpBar={xpBar}
        onEnterStudio={isSimPort() ? (isStudioActive() ? handleReturnFromStudio : handleEnterStudio) : undefined}
        isStudioActive={isStudioActive()}
        onToggleBuilding={handleToggleBuildingMode}
        isBuildingMode={simBuildingMode}
        isSimMode={isSim()}
        onSnap={async () => {
          const api = (window as unknown as { __sim?: { api?: { snapCurrentView?: () => Promise<{ ok: boolean }> } } }).__sim?.api;
          if (api?.snapCurrentView) {
            const res = await api.snapCurrentView();
            if (res?.ok) showToast("📸 Snapshot saved to snapshots/live-snap.jpg");
          }
        }}
      />
      )}

      {/* Cinematic observer-mode pill */}
      {cinematic && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider mc-window whitespace-nowrap">
          <span className="text-[#FFFFA0]">🎬 Cinematic</span>
          <span className="text-gray-300 normal-case font-mono hidden md:inline">WASD fly · Space up · Shift down · drag look · wheel speed · Q mark cam · Esc exits</span>
          <button
            className="mc-button px-2 py-0.5 text-[11px] font-bold uppercase"
            title="Timelines & scenes (Q marks cameras)"
            onClick={() => setCineDirectorOpen(true)}
          >
            🎞️
          </button>
          <button
            className="mc-button px-2 py-0.5 text-[11px] font-bold uppercase"
            title="Video settings (saved to cinematic profile)"
            onClick={() => setMenuOpen(true)}
          >
            ⚙️
          </button>
          <button
            className="mc-button px-2 py-0.5 text-[11px] font-bold uppercase"
            title="Exit cinematic mode"
            onClick={() => exitCinematic(false)}
          >
            ✕ Exit
          </button>
        </div>
      )}

      {/* Cinematic director: timelines & saved scenes */}
      <CineDirectorModal
        isOpen={cineDirectorOpen}
        onClose={() => setCineDirectorOpen(false)}
        stateRef={stateRef}
        cineValues={cineValues}
        videoSetters={{
          setVibrance, setBrightness, setContrast, setFov, setRenderDistance,
          setShadows, setShadowTier, setShadowTierOverridden, setDof, setDofStrength,
          setCa, setCaStrength, setColorGamut, setBokeh, setSpecular,
          setSpecularStrength, setQualityPreset, setMaxFps, setEv, setMetering, setEvComp, setExposureModel
        }}
        showToast={showToast}
      />

      {/* First-join onboarding (Phase D) */}
      <FirstJoinCard visible={!titleScreenOpen && !loading} />

      {/* Light-meter debugger (?meter=1): live per-source values at 3Hz */}
      {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("meter") === "1" && (
        <MeterDebugOverlay stateRef={stateRef} />
      )}

      {/* Game Overlays & Modals */}
      <GameOverlays
        tradingVillager={tradingVillager}
        tradeTick={tradeTick}
        creative={creative}
        inventoryState={stateRef.current}
        isoThumbnails={isoThumbnails}
        onExecuteTrade={handleExecuteTrade}
        onCloseTrading={() => setTradingVillager(null)}
        inventoryOpen={inventoryOpen}
        chestOpen={chestOpen}
        craftTableOpen={craftTableOpen}
        furnaceOpen={furnaceOpen}
        menuOpen={menuOpen}
        pauseOpen={pauseOpen}
        loading={loading}
        equippedArmor={equippedArmor}
        setEquippedArmor={setEquippedArmor}
        craftGrid={craftGrid}
        craftResult={craftResult}
        selectedInvBlock={selectedInvBlock}
        setSelectedInvBlock={setSelectedInvBlock}
        hotbar={hotbar}
        hotbarCounts={hotbarCounts}
        setHotbar={setHotbar}
        setHotbarCounts={setHotbarCounts}
        activeSlot={activeSlot}
        setActiveSlot={setActiveSlot}
        invMain={invMain}
        setInvMain={setInvMain}
        onCraftCellClick={handleCraftCellClick}
        onCraftResultClick={handleCraftResultClick}
        onCraftReset={handleCraftReset}
        onAssignToHotbar={handleAssignToHotbar}
        onMainSlotClick={handleMainSlotClick}
        onToggleInventory={handleToggleInventory}
        showToast={showToast}
        onCloseCraftTable={closeCraftTable}
        furnaceUI={furnaceUI}
        onFurnaceSlotClick={handleFurnaceSlotClick}
        onFurnaceReset={handleFurnaceReset}
        onCloseFurnace={closeFurnace}
        namingAnimal={namingAnimal}
        namingInput={namingInput}
        setNamingInput={setNamingInput}
        collarColor={collarColor}
        setCollarColor={setCollarColor}
        confirmPetName={confirmPetName}
        closePetName={closePetName}
        petsOpen={petsOpen}
        setPetsOpen={setPetsOpen}
        petsList={petsList}
        onTeleportToPet={(pet) => {
          stateRef.current.teleportToFn?.(pet.x, pet.z);
          setPetsOpen(false);
          showToast(`✨ Teleported to ${pet.name || pet.type}`);
        }}
        onSummonPet={(pet) => stateRef.current.summonPetTo?.(pet)}
        portalModalOpen={portalModalOpen}
        portalCoord={portalCoord}
        portalsList={portalsList}
        onSavePortal={handleSavePortal}
        onSetHome={handleSetHome}
        onDeletePortal={handleDeletePortal}
        onTeleportToPortal={handleTeleportToPortal}
        onClosePortalModal={closePortalModal}
        recallModalOpen={recallModalOpen}
        currentWorldId={stateRef.current.currentWorldId}
        confirmRecall={confirmRecall}
        closeRecallModal={closeRecallModal}
        chestPos={chestPos}
        chestSlots={chestSlots}
        handleSetChestSlots={handleSetChestSlots}
        handleChestSlotClick={handleChestSlotClick}
        closeChest={closeChest}
        menuTab={menuTab}
        setMenuTab={setMenuTab}
        qualityPreset={qualityPreset}
        handleApplyPreset={handleApplyPreset}
        weather={weather}
        handleSetWeather={handleSetWeather}
        renderDistance={renderDistance}
        setRenderDistance={setRenderDistance}
        vibrance={vibrance}
        setVibrance={setVibrance}
        brightness={brightness}
        setBrightness={setBrightness}
        contrast={contrast}
        setContrast={setContrast}
        fov={fov}
        setFov={setFov}
        ev={ev}
        setEv={setEv}
        metering={metering}
        setMetering={setMetering}
        exposureModel={exposureModel}
        onApplyLegacyExposure={handleApplyLegacyExposure}
        onApplyIsoExposure={handleApplyIsoExposure}
        evComp={evComp}
        setEvComp={setEvComp}
        maxFps={maxFps}
        setMaxFps={setMaxFps}
        detectedHz={detectedHz}
        soundOn={soundOn}
        setSoundOn={setSoundOn}
        volume={volume}
        setVolume={setVolume}
        musicOn={musicOn}
        setMusicOn={setMusicOn}
        musicVolume={musicVolume}
        setMusicVolumeState={setMusicVolumeState}
        playAmbientMotif={playAmbientMotif}
        unlockAudio={unlockAudio}
        shadows={shadows}
        setShadows={setShadows}
        shadowTier={shadowTier}
        setShadowTier={setShadowTier}
        setShadowTierOverridden={setShadowTierOverridden}
        dof={dof}
        setDof={setDof}
        dofStrength={dofStrength}
        setDofStrength={setDofStrength}
        ca={ca}
        setCa={setCa}
        caStrength={caStrength}
        setCaStrength={setCaStrength}
        colorGamut={colorGamut}
        setColorGamut={setColorGamut}
        bokeh={bokeh}
        setBokeh={setBokeh}
        specular={specular}
        setSpecular={setSpecular}
        specularStrength={specularStrength}
        setSpecularStrength={setSpecularStrength}
        setCreative={setCreative}
        gameplayMode={gameplayMode}
        setGameplayMode={setGameplayMode}
        autoStep={autoStep}
        setAutoStep={setAutoStep}
        touchControls={touchControls}
        setTouchControls={setTouchControls}
        worldTime={worldTime}
        setWorldTime={setWorldTime}
        timeFormatted={timeFormatted}
        timeFlow={timeFlow}
        setTimeFlow={setTimeFlow}
        timeSpeed={timeSpeed}
        setTimeSpeed={setTimeSpeed}
        seedText={seedText}
        setSeedText={setSeedText}
        worldType={worldType}
        setWorldType={setWorldType}
        currentUser={currentUser}
        activeWorld={activeWorld}
        onRegenerateVillage={() => {
          stateRef.current.regenerateCurrentArea?.();
          showToast("🏰 Immediate village area regenerated!");
          setMenuOpen(false);
        }}
        handleRebuildWorld={handleRebuildWorld}
        handleOpenAuditLogs={handleOpenAuditLogs}
        onWorldSelection={handlePauseWorldSelect}
        handleLogout={handleLogout}
        handleEnter={handleEnter}
        portalWarping={portalWarping}
        bootStallMsg={bootStallMsg}
        isInVehicle={isInVehicle}
        vehicleKmh={vehicleKmh}
        seatName={seatName}
        bootDone={bootDone}
        setBootDone={setBootDone}
        simBoost={simBoost}
        simBuildingMode={simBuildingMode}
        setBlueprintModalOpen={setBlueprintModalOpen}
        handleToggleBuildingMode={handleToggleBuildingMode}
        blueprintModalOpen={blueprintModalOpen}
        handleScanAndSaveBlueprint={handleScanAndSaveBlueprint}
        handleStampBlueprint={handleStampBlueprint}
        handleLoadPresetStructure={handleLoadPresetStructure}
        handleClosePause={handleClosePause}
        handlePauseOptions={handlePauseOptions}
        handlePauseStatistics={handlePauseStatistics}
        handlePauseCinematic={toggleCinematicFromMenu}
        isCinematicActive={cinematic}
        handlePauseWorldSelect={handlePauseWorldSelect}
        handlePauseSnapshot={handlePauseSnapshot}
        onToggleMapFromPause={() => {
          setPauseOpen(false);
          stateRef.current.mapOpen = true;
          stateRef.current.mapPanOn = false;
          setMapOpen(true);
          document.exitPointerLock?.();
          playMenuClick();
        }}
        onRefreshTextures={() => {
          fetchTextureOverrides().then(() => showToast("↻ Block textures refreshed from server")).catch(() => showToast("Texture refresh failed"));
        }}
        handlePauseHelp={handlePauseHelp}
        onEnterStudio={isSimPort() ? (isStudioActive() ? handleReturnFromStudio : handleEnterStudio) : undefined}
        isStudioActive={isStudioActive()}
        handleQuitToLogin={handleQuitToLogin}
        isSimWorld={isSimPort() || isSim()}
        titleScreenOpen={titleScreenOpen}
        authUsername={authUsername}
        setAuthUsername={setAuthUsername}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        authError={authError}
        handleAuthSubmit={handleAuthSubmit}
        worldSelectOpen={worldSelectOpen}
        availableWorlds={availableWorlds}
        setActiveWorld={setActiveWorld}
        handleJoinWorld={handleJoinWorld}
        setCreateWorldOpen={setCreateWorldOpen}
        handleDeleteWorldClick={handleDeleteWorldClick}
        createWorldOpen={createWorldOpen}
        newWorldName={newWorldName}
        setNewWorldName={setNewWorldName}
        newWorldSeed={newWorldSeed}
        setNewWorldSeed={setNewWorldSeed}
        newWorldType={newWorldType}
        setNewWorldType={setNewWorldType}
        newWorldMode={newWorldMode}
        setNewWorldMode={setNewWorldMode}
        handleCreateWorldSubmit={handleCreateWorldSubmit}
        auditLogsOpen={auditLogsOpen}
        setAuditLogsOpen={setAuditLogsOpen}
        auditLogs={auditLogs}
        mapOpen={mapOpen}
        onCloseMap={() => {
          stateRef.current.mapOpen = false;
          setMapOpen(false);
        }}
        bigCanvasRef={bigCanvasRef}
        nearestVillage={nearestVillage}
        posInfo={posInfo}
        playerYaw={stateRef.current.player?.yaw || 0}
        compassHeading={compassHeading}
        handleMapHover={handleMapHover}
        handleMapHoverLeave={handleMapHoverLeave}
        handleMapSaveSpawn={handleMapSaveSpawn}
        handleMapSpawnAt={handleMapSpawnAt}
        handleMapTeleportToPortal={handleMapTeleportToPortal}
        handleRenamePortal={handleRenamePortal}
        handleFlashSpawn={handleFlashSpawn}
        onMapWheel={(e) => {
          e.preventDefault();
          const delta = e.deltaY < 0 ? 0.35 : -0.35;
          const nextScale = Math.max(0.4, Math.min(6.5, (stateRef.current.bigScale || 2.0) + delta));
          stateRef.current.bigScale = nextScale;
          showToast(`Map Zoom: ${nextScale.toFixed(1)}x (Scroll to zoom)`);
        }}
        onMapPan={(dxPx, dyPx) => {
          const s = stateRef.current;
          const scale = s.bigScale || 2.0;
          const cy = Math.cos(s.player.yaw), sy = Math.sin(s.player.yaw);
          if (!s.mapPanOn) { s.mapPanX = s.player.x; s.mapPanZ = s.player.z; s.mapPanOn = true; }
          s.mapPanX -= (dxPx * cy + dyPx * sy) / scale;
          s.mapPanZ -= (-dxPx * sy + dyPx * cy) / scale;
        }}
        onMapPinch={(factor) => {
          const s = stateRef.current;
          if (!Number.isFinite(factor) || factor <= 0) return;
          s.bigScale = Math.max(0.4, Math.min(6.5, (s.bigScale || 2.0) * factor));
        }}
        onMapRecenter={() => {
          stateRef.current.mapPanOn = false;
        }}
      />

    </div>
  );
}
