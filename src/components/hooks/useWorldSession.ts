import { useState, useRef, useEffect, useCallback } from "react";
import type { GameState } from "../../game/state/gameState";
import { shouldWakeWorld } from "../../game/state/gameState";
import {
  apiLogin,
  apiRegister,
  apiLogout,
  apiGetMe,
  apiGetWorlds,
  apiCreateWorld,
  apiDeleteWorld,
  apiJoinWorld,
  apiSavePlayerState,
  apiSaveBlockEdits,
  flushPendingQueue,
  groupPendingByWorld,
  apiGetBlockLogs,
  apiSavePreferences,
  apiSaveAnimals,
  apiSaveBoats,
  apiGetSpawns,
  apiSaveSpawn,
  type User,
  type WorldMeta,
  type BlockLogEntry
} from "../../services/api";
import { apiGetCustomAssets } from "../../services/customAssets";
import { registerCustomAssets } from "../../game/customAssets";
import { multiplayer } from "../../services/multiplayer";
import { isSim } from "../../services/simMode";
import { BLOCK_MAP } from "../../game/blocks";
import { CH } from "../../game/world";
import { loadPortals, savePortals, type SpawnPortal } from "../../game/state/portalStorage";
import { playMenuClick } from "../../game/sfx";

export interface UseWorldSessionOptions {
  stateRef: React.MutableRefObject<GameState>;
  uiOpenRef: React.MutableRefObject<{
    pets: boolean;
    portal: boolean;
    recall: boolean;
    blueprint: boolean;
    audit: boolean;
    naming: boolean;
    trading: boolean;
  }>;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  showToast: (msg: string) => void;
  setMenuOpen: (open: boolean) => void;
  setPauseOpen: (open: boolean) => void;
  setInventoryOpen: (open: boolean) => void;
  setActive: (active: boolean) => void;
  setChatMessages: React.Dispatch<React.SetStateAction<any[]>>;
  setChatOpen: (open: boolean) => void;
  setPortalsList: (portals: SpawnPortal[]) => void;
  setSeedText: (seed: string) => void;
  setWorldType: (type: string) => void;
  setWorldTime: (time: number) => void;
  setDayCount: (d: number) => void;
  setCreative: (creative: boolean) => void;
  setHotbar: React.Dispatch<React.SetStateAction<number[]>>;
  setHotbarCounts: React.Dispatch<React.SetStateAction<number[]>>;
  activeSlot: number;
  setActiveSlot: (slot: number) => void;
  setInvMain: React.Dispatch<React.SetStateAction<Array<{ id: number; count: number } | null>>>;
  refreshPets: () => void;
  // Preferences setters
  setRenderDistance: (d: number) => void;
  setVibrance: (v: number) => void;
  setBrightness: (b: number) => void;
  setContrast: (c: number) => void;
  setFov: (f: number) => void;
  setShadows: (s: boolean) => void;
  setShadowTier: (t: "basic" | "detailed" | "advanced") => void;
  setShadowTierOverridden: (o: boolean) => void;
  setDof: (d: boolean) => void;
  setDofStrength: (s: number) => void;
  setCa: (c: boolean) => void;
  setCaStrength: (s: number) => void;
  setColorGamut: (g: string) => void;
  setBokeh: (b: boolean) => void;
  setQualityPreset: (p: "smooth" | "balanced" | "beautiful") => void;
  setWeather: (w: any) => void;
  setAutoStep: (a: boolean) => void;
  setTouchControls: (t: boolean) => void;
  setMaxFps: (f: number) => void;
  setExposureModel: (m: "legacy-sim" | "iso-ettl") => void;
  setConnOnline: (v: boolean) => void;
  setLastSyncAt: (t: number) => void;
}

export interface UseWorldSessionReturn {
  currentUser: User | null;
  setCurrentUser: React.Dispatch<React.SetStateAction<User | null>>;
  authUsername: string;
  setAuthUsername: React.Dispatch<React.SetStateAction<string>>;
  authPassword: string;
  setAuthPassword: React.Dispatch<React.SetStateAction<string>>;
  authError: string;
  setAuthError: React.Dispatch<React.SetStateAction<string>>;
  titleScreenOpen: boolean;
  setTitleScreenOpen: React.Dispatch<React.SetStateAction<boolean>>;
  worldSelectOpen: boolean;
  setWorldSelectOpen: React.Dispatch<React.SetStateAction<boolean>>;
  createWorldOpen: boolean;
  setCreateWorldOpen: React.Dispatch<React.SetStateAction<boolean>>;
  auditLogsOpen: boolean;
  setAuditLogsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  newWorldName: string;
  setNewWorldName: React.Dispatch<React.SetStateAction<string>>;
  newWorldSeed: string;
  setNewWorldSeed: React.Dispatch<React.SetStateAction<string>>;
  newWorldType: string;
  setNewWorldType: React.Dispatch<React.SetStateAction<string>>;
  newWorldMode: "survival" | "creative";
  setNewWorldMode: React.Dispatch<React.SetStateAction<"survival" | "creative">>;
  availableWorlds: WorldMeta[];
  setAvailableWorlds: React.Dispatch<React.SetStateAction<WorldMeta[]>>;
  activeWorld: WorldMeta | null;
  setActiveWorld: React.Dispatch<React.SetStateAction<WorldMeta | null>>;
  auditLogs: BlockLogEntry[];
  setAuditLogs: React.Dispatch<React.SetStateAction<BlockLogEntry[]>>;
  isPrefsLoadedRef: React.MutableRefObject<boolean>;
  handleAuthSubmit: (e?: React.FormEvent) => Promise<void>;
  handleLogout: () => Promise<void>;
  handleCreateWorldSubmit: (e?: React.FormEvent) => Promise<void>;
  handleDeleteWorldClick: (wldId: string) => Promise<void>;
  handleJoinWorld: (wld: WorldMeta) => Promise<void>;
  handleOpenAuditLogs: () => Promise<void>;
  flushPendingEdits: () => Promise<void>;
  savePlayerStateNow: () => Promise<void>;
  reportSyncOk: () => void;
  reportSyncFail: () => void;
  handlePauseWorldSelect: () => Promise<void>;
  handleQuitToLogin: () => void;
  handleEnter: () => void;
  savePreferences: (payload: Record<string, any>) => void;
}

export function useWorldSession(options: UseWorldSessionOptions): UseWorldSessionReturn {
  const {
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
  } = options;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authUsername, setAuthUsername] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [titleScreenOpen, setTitleScreenOpen] = useState(true);
  const [worldSelectOpen, setWorldSelectOpen] = useState(false);
  const [createWorldOpen, setCreateWorldOpen] = useState(false);
  const [auditLogsOpen, setAuditLogsOpen] = useState(false);
  const [newWorldName, setNewWorldName] = useState("");
  const [newWorldSeed, setNewWorldSeed] = useState("hollowpine");
  const [newWorldType, setNewWorldType] = useState("standard");
  const [newWorldMode, setNewWorldMode] = useState<"survival" | "creative">("survival");
  const [availableWorlds, setAvailableWorlds] = useState<WorldMeta[]>([]);
  const [activeWorld, setActiveWorld] = useState<WorldMeta | null>(null);
  const [auditLogs, setAuditLogs] = useState<BlockLogEntry[]>([]);

  const isPrefsLoadedRef = useRef(false);

  // Sync titleScreenOpen and worldSelectOpen to stateRef
  useEffect(() => {
    stateRef.current.titleScreenOpen = titleScreenOpen;
  }, [titleScreenOpen]);

  useEffect(() => {
    stateRef.current.worldSelectOpen = worldSelectOpen;
  }, [worldSelectOpen]);

  const handleEnter = () => {
    const s = stateRef.current;
    s.keys = {};
    s.active = true;
    s.steering = true;
    s.uiPaused = false;
    setActive(true);
    setMenuOpen(false);
    setPauseOpen(false);
    setInventoryOpen(false);
    setTitleScreenOpen(false);
    setWorldSelectOpen(false);
  };

  // Check session & initialize on mount
  useEffect(() => {
    async function initSession() {
      if (isSim()) {
        isPrefsLoadedRef.current = true;
        setTitleScreenOpen(false);
        setWorldSelectOpen(false);
        stateRef.current.titleScreenOpen = false;
        stateRef.current.worldSelectOpen = false;
        return;
      }
      try {
        const me = await apiGetMe();
        if (me && me.user) {
          setCurrentUser(me.user);
          stateRef.current.currentUserId = me.user.id;
          if (me.preferences) {
            setRenderDistance(me.preferences.renderDistance);
            setVibrance(me.preferences.vibrance);
            setBrightness(me.preferences.brightness);
            setContrast(me.preferences.contrast);
            const curFov = me.preferences.fov || 70;
            setFov(curFov);
            stateRef.current.baseFov = curFov;
            if (stateRef.current.camera) {
              stateRef.current.camera.fov = curFov;
              stateRef.current.camera.updateProjectionMatrix();
            }
            setShadows(me.preferences.shadows);
            setDof(!!me.preferences.dof);
            setDofStrength((me.preferences.dofStrength ?? 40) / 100);
            setCa(!!me.preferences.ca);
            setCaStrength((me.preferences.caStrength ?? 25) / 100);
            if (me.preferences.colorGamut) setColorGamut(me.preferences.colorGamut);
            setBokeh(!!me.preferences.bokeh);
            if (me.preferences.qualityPreset) setQualityPreset(me.preferences.qualityPreset);
            if (me.preferences.shadowTier) { setShadowTier(me.preferences.shadowTier); setShadowTierOverridden(true); }
            if (me.preferences.weather) {
              setWeather(me.preferences.weather);
              stateRef.current.cloudWeather = me.preferences.weather;
            }
            setAutoStep(me.preferences.autoStep);
            setTouchControls(!!me.preferences.touchControls);
            setMaxFps(me.preferences.maxFps);
            if (me.preferences.exposureModel === "legacy-sim" || me.preferences.exposureModel === "iso-ettl") setExposureModel(me.preferences.exposureModel);
          }
          isPrefsLoadedRef.current = true;
          const worlds = await apiGetWorlds().catch(() => []);
          setAvailableWorlds(worlds);
          if (worlds.length > 0) setActiveWorld(worlds[0]);
          // Prompt user to select which world to load
          setTitleScreenOpen(false);
          setWorldSelectOpen(true);
          stateRef.current.titleScreenOpen = false;
          stateRef.current.worldSelectOpen = true;
          setLoading(false);
          return;
        }
      } catch (e) {
        console.warn("Session init check:", e);
      }

      // Not logged in: strictly present Title / Login Screen — try guest prefs from localStorage
      try {
        const raw = localStorage.getItem("mc_prefs_guest");
        if (raw) {
          const gp = JSON.parse(raw);
          if (gp.renderDistance) setRenderDistance(gp.renderDistance);
          if (gp.vibrance) setVibrance(gp.vibrance);
          if (gp.brightness) setBrightness(gp.brightness);
          if (gp.contrast) setContrast(gp.contrast);
          if (gp.fov) { setFov(gp.fov); stateRef.current.baseFov = gp.fov; }
          if (typeof gp.shadows === "boolean") setShadows(gp.shadows);
          if (typeof gp.autoStep === "boolean") setAutoStep(gp.autoStep);
          if (typeof gp.touchControls === "boolean") setTouchControls(gp.touchControls);
          if (gp.maxFps !== undefined) setMaxFps(gp.maxFps);
          if (gp.exposureModel === "legacy-sim" || gp.exposureModel === "iso-ettl") setExposureModel(gp.exposureModel);
          if (typeof gp.dof === "boolean") setDof(gp.dof);
          if (gp.dofStrength !== undefined) setDofStrength(gp.dofStrength / 100);
          if (typeof gp.ca === "boolean") setCa(gp.ca);
          if (gp.caStrength !== undefined) setCaStrength(gp.caStrength / 100);
          if (gp.colorGamut) setColorGamut(gp.colorGamut);
          if (typeof gp.bokeh === "boolean") setBokeh(gp.bokeh);
          if (gp.qualityPreset) setQualityPreset(gp.qualityPreset);
          if (gp.shadowTier) { setShadowTier(gp.shadowTier); setShadowTierOverridden(true); }
          if (gp.weather) { setWeather(gp.weather); stateRef.current.cloudWeather = gp.weather; }
        }
      } catch {}
      isPrefsLoadedRef.current = true;
      setTitleScreenOpen(true);
      setWorldSelectOpen(false);
      stateRef.current.titleScreenOpen = true;
      stateRef.current.worldSelectOpen = false;
      setLoading(false);
    }
    initSession();
  }, []);

  const handleAuthSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError("");
    if (!authUsername.trim()) {
      setAuthError("Please enter a username");
      return;
    }
    if (!authPassword.trim()) {
      setAuthError("Please enter a password");
      return;
    }

    try {
      let res;
      try {
        res = await apiLogin(authUsername, authPassword);
      } catch {
        // New username: create the account explicitly, then sign in.
        try {
          await apiRegister(authUsername, authPassword);
          res = await apiLogin(authUsername, authPassword);
        } catch {
          throw new Error("Invalid username or password");
        }
      }
      setCurrentUser(res.user);
      stateRef.current.currentUserId = res.user.id;
      showToast(`Welcome back, ${res.user.username}! ⛏️`);

      if (res.preferences) {
        setRenderDistance(res.preferences.renderDistance);
        setVibrance(res.preferences.vibrance);
        setBrightness(res.preferences.brightness);
        setContrast(res.preferences.contrast);
        const curFov = res.preferences.fov || 70;
        setFov(curFov);
        stateRef.current.baseFov = curFov;
        if (stateRef.current.camera) {
          stateRef.current.camera.fov = curFov;
          stateRef.current.camera.updateProjectionMatrix();
        }
        setShadows(res.preferences.shadows);
        setDof(!!res.preferences.dof);
        setDofStrength((res.preferences.dofStrength ?? 40) / 100);
        setCa(!!res.preferences.ca);
        setCaStrength((res.preferences.caStrength ?? 25) / 100);
        if (res.preferences.colorGamut) setColorGamut(res.preferences.colorGamut);
        setBokeh(!!res.preferences.bokeh);
        if (res.preferences.qualityPreset) setQualityPreset(res.preferences.qualityPreset);
        if (res.preferences.shadowTier) { setShadowTier(res.preferences.shadowTier); setShadowTierOverridden(true); }
        if (res.preferences.weather) {
          setWeather(res.preferences.weather);
          stateRef.current.cloudWeather = res.preferences.weather;
        }
          setAutoStep(res.preferences.autoStep);
          setTouchControls(!!res.preferences.touchControls);
          setMaxFps(res.preferences.maxFps);
          if (res.preferences.exposureModel === "legacy-sim" || res.preferences.exposureModel === "iso-ettl") setExposureModel(res.preferences.exposureModel);
      }
      isPrefsLoadedRef.current = true;

      const worlds = await apiGetWorlds().catch(() => []);
      setAvailableWorlds(worlds);
      if (worlds.length > 0) setActiveWorld(worlds[0]);
      setTitleScreenOpen(false);
      setWorldSelectOpen(true);
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed");
    }
  };

  // Connection status: single source of truth on stateRef (readable from engine
  // closures); React mirrors it for the HUD pill. Toasts fire on transitions only.
  const touchSync = () => {
    const now = Date.now();
    stateRef.current.lastSyncAt = now;
    setLastSyncAt(now);
  };
  const reportSyncOk = () => {
    const s = stateRef.current;
    if (!s.connOnline) {
      s.connOnline = true;
      setConnOnline(true);
      showToast("✅ Back online — syncing pending changes…");
    }
    touchSync();
    if (s.pendingEdits.length) void flushPendingEdits();
  };
  const reportSyncFail = () => {
    const s = stateRef.current;
    if (s.connOnline) {
      s.connOnline = false;
      setConnOnline(false);
      showToast("⚠ Connection lost — playing offline. Your changes will sync when you're back.");
    }
  };

  const flushPendingEdits = async () => {
    const s = stateRef.current;
    if (!s.pendingEdits.length || s.simMode) return;
    const batch = s.pendingEdits;
    s.pendingEdits = [];
    try {
      const remaining = await flushPendingQueue(batch, (wid, b) => apiSaveBlockEdits(wid, b));
      if (remaining.length) {
        s.pendingEdits = remaining.concat(s.pendingEdits);
        reportSyncFail();
      } else {
        touchSync();
        if (s.pendingEdits.length) void flushPendingEdits();
      }
    } catch {
      s.pendingEdits = batch.concat(s.pendingEdits);
      reportSyncFail();
    }
  };

  const savePlayerStateNow = async () => {
    const s = stateRef.current;
    if (!s.currentWorldId || s.simMode) return;
    try {
      await apiSavePlayerState(s.currentWorldId, {
        x: s.player.x,
        y: s.player.y,
        z: s.player.z,
        yaw: s.player.yaw,
        pitch: s.player.pitch,
        flying: s.player.fly,
        gameMode: s.creative ? "creative" : "survival",
        hotbar: s.hotbar,
        activeSlot,
        worldTime: Math.floor(s.time),
        dayCount: Math.floor(s.dayCount || 0),
        inventory: [
          ...s.invMain.map(sl => (sl ? { id: sl.id, count: sl.count } : null)),
          ...s.hotbar.map((id, i) => ({ id, count: s.hotbarCounts[i] || 0 }))
        ]
      });
      touchSync();
    } catch (e) {
      console.warn("Failed to auto-save player state:", e);
      reportSyncFail();
    }

    const animals = s.getAnimalsFn?.();
    if (animals && animals.length > 0) {
      const animalWorldId = s.dimension === "nether" ? `${s.currentWorldId}_nether` : s.currentWorldId;
      apiSaveAnimals(animalWorldId, animals).catch(() => {});
    }

    const boats = s.getBoatsFn?.();
    if (boats && boats.length > 0) {
      const boatWorldId = s.dimension === "nether" ? `${s.currentWorldId}_nether` : s.currentWorldId;
      const removed = s.removedBoatIds.length ? [...s.removedBoatIds] : [];
      apiSaveBoats(boatWorldId, boats, removed).then(() => {
        if (removed.length) s.removedBoatIds = s.removedBoatIds.filter((id) => !removed.includes(id));
      }).catch(() => {});
    } else if (s.removedBoatIds.length > 0) {
      const boatWorldId = s.dimension === "nether" ? `${s.currentWorldId}_nether` : s.currentWorldId;
      const removed = [...s.removedBoatIds];
      apiSaveBoats(boatWorldId, [], removed).then(() => {
        s.removedBoatIds = s.removedBoatIds.filter((id) => !removed.includes(id));
      }).catch(() => {});
    }
  };

  const handleLogout = async () => {
    document.exitPointerLock?.();
    const s = stateRef.current;
    s.active = false;
    s.steering = false;
    s.uiPaused = true;
    s.keys = {};
    setActive(false);
    await flushPendingEdits();
    await savePlayerStateNow();

    multiplayer.disconnect();
    await apiLogout();
    setCurrentUser(null);
    setActiveWorld(null);
    setAuthUsername("");
    setAuthPassword("");
    setMenuOpen(false);
    setPauseOpen(false);
    setWorldSelectOpen(false);
    setTitleScreenOpen(true);
    showToast("Logged out successfully");
  };

  const handleJoinWorld = async (wld: WorldMeta) => {
    setActiveWorld(wld);
    stateRef.current.currentWorldId = wld.id;
    setWorldSelectOpen(false);
    setLoading(true);
    setChatMessages([]);
    setChatOpen(false);
    stateRef.current.chatOpen = false;

    try {
      localStorage.setItem("mc_last_active_world_id", wld.id);
      const joinData = await apiJoinWorld(wld.id);
      try {
        const customCatalog = await apiGetCustomAssets();
        registerCustomAssets(customCatalog.assets);
      } catch {}

      stateRef.current.pendingAnimals = Array.isArray(joinData.animals) ? joinData.animals : null;
      stateRef.current.pendingBoats = Array.isArray((joinData as any).boats) ? (joinData as any).boats : null;

      if (!isSim()) {
        apiGetSpawns(wld.id).then((rows) => {
          if (rows.length) {
            const mapped: SpawnPortal[] = rows.map((r) => ({
              id: r.id, name: r.name, x: r.x, y: r.y, z: r.z,
              isHome: !!r.isHome, createdAt: r.createdAt || Date.now()
            }));
            setPortalsList(mapped);
            try { savePortals(mapped, wld.id); } catch {}
          } else {
            for (const p of loadPortals(wld.id)) {
              apiSaveSpawn(wld.id, { id: p.id, name: p.name, x: p.x, y: p.y, z: p.z, isHome: p.isHome }).catch(() => {});
            }
          }
        }).catch(() => {});
      }

      setSeedText(wld.seedText || "hollowpine");
      setWorldType(wld.worldType || "standard");

      const joinTime = Number(joinData.world?.worldTime);
      const listTime = Number(wld.worldTime);
      const rawTime = Number.isFinite(joinTime) ? joinTime : (Number.isFinite(listTime) ? listTime : 6000);
      const loadedTime = ((rawTime % 24000) + 24000) % 24000;
      setWorldTime(loadedTime);
      stateRef.current.time = loadedTime;
      const loadedDay = Number(joinData.world?.dayCount);
      const dayCount = Number.isFinite(loadedDay) && loadedDay >= 0 ? Math.floor(loadedDay) : 0;
      setDayCount(dayCount);
      stateRef.current.dayCount = dayCount;

      stateRef.current.tradeLedger.clear();
      for (const [vkey, ledger] of Object.entries((joinData as any).trades || {})) {
        stateRef.current.tradeLedger.set(vkey, ledger as any);
      }
      stateRef.current.paintingData.clear();
      stateRef.current.paintings.clear();
      for (const [pkey, spot] of Object.entries((joinData as any).paintings || {})) {
        stateRef.current.paintingData.set(pkey, spot as any);
      }

      stateRef.current.edits.clear();
      stateRef.current.editsByChunk.clear();
      stateRef.current.blockDirs.clear();
      stateRef.current.emitters.clear();
      for (const [coord, dir] of Object.entries(joinData.blockDirs || {})) {
        stateRef.current.blockDirs.set(coord, Number(dir));
      }
      for (const [coord, blockId] of Object.entries(joinData.blockEdits || {})) {
        stateRef.current.edits.set(coord, blockId);
        const [bx, by, bz] = coord.split(",").map(Number);
        const ecx = Math.floor(bx / CH), ecz = Math.floor(bz / CH);
        const eck = `${ecx},${ecz}`;
        let ecm = stateRef.current.editsByChunk.get(eck);
        if (!ecm) { ecm = new Map(); stateRef.current.editsByChunk.set(eck, ecm); }
        ecm.set(coord, blockId);
        if (blockId > 0) {
          const def = BLOCK_MAP.get(blockId);
          if (def && (def.lightPower || def.glow || (def as { light?: number }).light)) {
            stateRef.current.emitters.set(coord, {
              x: bx + 0.5,
              y: by + 0.5,
              z: bz + 0.5,
              col: def.lightCol || 0xffd489,
              dist: def.lightDist || 16,
              power: def.lightPower || 1.2
            });
          }
        }
      }

      stateRef.current.chestMap.clear();
      for (const [ck, slots] of Object.entries(joinData.chests || {})) {
        stateRef.current.chestMap.set(ck, (slots || []).map(sl => (sl ? { id: sl.id, count: sl.count } : null)));
      }

      let playerStateToRestore: any = joinData.playerState ? {
        x: joinData.playerState.x,
        y: joinData.playerState.y,
        z: joinData.playerState.z,
        yaw: joinData.playerState.yaw || 0,
        pitch: joinData.playerState.pitch || 0,
        fly: !!joinData.playerState.flying,
        gameMode: joinData.playerState.gameMode,
        hotbar: joinData.playerState.hotbar,
        activeSlot: joinData.playerState.activeSlot,
        inventory: joinData.playerState.inventory
      } : null;

      if (!playerStateToRestore) {
        try {
          const localSaved = localStorage.getItem("mc_last_player_state_" + wld.id);
          if (localSaved) {
            const parsed = JSON.parse(localSaved);
            if (parsed && typeof parsed.x === "number" && typeof parsed.y === "number" && typeof parsed.z === "number") {
              playerStateToRestore = {
                x: parsed.x,
                y: parsed.y,
                z: parsed.z,
                yaw: parsed.yaw || 0,
                pitch: parsed.pitch || 0,
                fly: !!parsed.fly,
                gameMode: "survival",
                hotbar: undefined,
                activeSlot: undefined,
                inventory: undefined
              };
            }
          }
        } catch (e) {}
      }

      if (playerStateToRestore) {
        const ps = playerStateToRestore;
        stateRef.current._joinRestoredPos = true;
        stateRef.current.player.x = ps.x;
        stateRef.current.player.y = ps.y;
        stateRef.current.player.z = ps.z;
        stateRef.current.player.yaw = ps.yaw || 0;
        stateRef.current.player.pitch = ps.pitch || 0;
        stateRef.current.player.fly = !!ps.fly;
        if (ps.gameMode) {
          setCreative(ps.gameMode === "creative");
          stateRef.current.creative = ps.gameMode === "creative";
        }
        if (ps.hotbar?.length) {
          setHotbar(ps.hotbar);
          stateRef.current.hotbar = ps.hotbar;
        }
        if (ps.activeSlot !== undefined) {
          setActiveSlot(ps.activeSlot);
        }
        if (ps.inventory && Array.isArray(ps.inventory) && ps.inventory.length) {
          const inv = ps.inventory;
          const mainNew: Array<{ id: number; count: number } | null> = [];
          for (let i = 0; i < 27; i++) mainNew.push(inv[i] || null);
          const hbCounts = Array.from({ length: 10 }, () => 64);
          for (let i = 0; i < 10; i++) {
            const slot = inv[27 + i];
            hbCounts[i] = slot && slot.id > 0 ? Math.max(0, slot.count) : 64;
          }
          setInvMain(mainNew);
          setHotbarCounts(hbCounts);
          stateRef.current.invMain = mainNew;
          stateRef.current.hotbarCounts = hbCounts;
        }
      } else {
        setCreative(false);
        stateRef.current.creative = false;
        stateRef.current.player.fly = false;
      }

      const uid = currentUser?.id || stateRef.current.currentUserId;
      const uname = currentUser?.username || "Player";
      if (!stateRef.current.simMode && wld.id !== "wld_sim_scratch") {
        multiplayer.connect(wld.id, uid, uname, currentUser?.skinColor || "#e0913a");
      }

      if (stateRef.current.rebuildAndSpawnWorld) {
        await stateRef.current.rebuildAndSpawnWorld(
          wld.seedText || "hollowpine",
          wld.worldType || "standard",
          playerStateToRestore ? {
            x: playerStateToRestore.x,
            y: playerStateToRestore.y,
            z: playerStateToRestore.z,
            yaw: playerStateToRestore.yaw,
            pitch: playerStateToRestore.pitch,
            fly: playerStateToRestore.fly
          } : null
        );
      } else {
        setLoading(false);
        handleEnter();
      }

      showToast(`Joined world "${wld.name}"`);
    } catch (e: any) {
      showToast(e.message || "Failed to load world data");
      setLoading(false);
    }
  };

  const handleCreateWorldSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newWorldName.trim()) {
      showToast("World name is required");
      return;
    }

    try {
      const created = await apiCreateWorld(newWorldName, newWorldSeed, newWorldType);
      showToast(`World "${created.name}" created!`);
      const isCreative = newWorldMode === "creative";
      setCreative(isCreative);
      stateRef.current.creative = isCreative;
      stateRef.current.player.fly = isCreative;
      setCreateWorldOpen(false);
      const worlds = await apiGetWorlds();
      setAvailableWorlds(worlds);
      handleJoinWorld(created);
    } catch (err: any) {
      showToast(err.message || "Failed to create world");
    }
  };

  const handleDeleteWorldClick = async (wldId: string) => {
    if (wldId === "wld_default") {
      showToast("Cannot delete the default spawn world");
      return;
    }
    try {
      await apiDeleteWorld(wldId);
      showToast("World deleted");
      const worlds = await apiGetWorlds();
      setAvailableWorlds(worlds);
    } catch (err: any) {
      showToast(err.message || "Failed to delete world");
    }
  };

  const handleOpenAuditLogs = async () => {
    if (!activeWorld && availableWorlds.length > 0) {
      const wldId = availableWorlds[0].id;
      const logs = await apiGetBlockLogs(wldId, 50);
      setAuditLogs(logs);
      setAuditLogsOpen(true);
    } else if (activeWorld) {
      const logs = await apiGetBlockLogs(activeWorld.id, 50);
      setAuditLogs(logs);
      setAuditLogsOpen(true);
    }
  };

  const handlePauseWorldSelect = async () => {
    document.exitPointerLock?.();
    const s = stateRef.current;
    s.active = false;
    s.steering = false;
    s.uiPaused = true;
    s.keys = {};
    setActive(false);
    setPauseOpen(false);
    multiplayer.disconnect();
    await flushPendingEdits();
    await savePlayerStateNow();
    try {
      const worlds = await apiGetWorlds();
      setAvailableWorlds(worlds);
      if (activeWorld) {
        const found = worlds.find(w => w.id === activeWorld.id);
        if (found) setActiveWorld(found);
      }
    } catch {}
    setWorldSelectOpen(true);
    playMenuClick();
  };

  const handleQuitToLogin = () => {
    setPauseOpen(false);
    setMenuOpen(false);
    document.exitPointerLock?.();
    const s = stateRef.current;
    s.active = false;
    s.steering = false;
    s.uiPaused = true;
    s.keys = {};
    setActive(false);
    multiplayer.disconnect();
    savePlayerStateNow();
    localStorage.removeItem("webmc_user");
    localStorage.removeItem("webmc_session");
    setCurrentUser(null);
    setWorldSelectOpen(false);
    setTitleScreenOpen(true);
  };

  const savePreferences = useCallback((payload: Record<string, any>) => {
    if (!isPrefsLoadedRef.current) return;
    if (currentUser) {
      apiSavePreferences(payload as any);
    } else {
      try { localStorage.setItem("mc_prefs_guest", JSON.stringify(payload)); } catch {}
    }
  }, [currentUser]);

  // Periodic Auto-Save every 2.5 seconds + Unload Safety Flush
  useEffect(() => {
    const interval = setInterval(() => {
      if (!loading && !titleScreenOpen && !worldSelectOpen) {
        // Skip network attempts when the OS reports no connection (quiet);
        // when online, attempts run and failures flip the status via reporters.
        if (typeof navigator === "undefined" || navigator.onLine !== false) {
          flushPendingEdits();
          savePlayerStateNow();
        }
        refreshPets();
      }
      const s = stateRef.current;
      const ui = uiOpenRef.current;
      if (typeof document !== "undefined" && document.hasFocus && !document.hasFocus()) return;
      if (shouldWakeWorld({
        loading, pauseOpen: s.pauseOpen, menuOpen: s.menuOpen,
        titleScreenOpen, worldSelectOpen,
        inventoryOpen: s.inventoryOpen, chestOpen: s.chestOpen,
        craftTableOpen: s.craftTableOpen, furnaceOpen: s.furnaceOpen,
        mapOpen: s.mapOpen, chatOpen: s.chatOpen, dead: s.dead,
        petsOpen: ui.pets, portalOpen: ui.portal, recallOpen: ui.recall,
        blueprintOpen: ui.blueprint, auditOpen: ui.audit,
        namingOpen: ui.naming, tradingOpen: ui.trading
      }, s)) {
        s.uiPaused = false;
        s.active = true;
        s.steering = true;
        setActive(true);
      }
    }, 2500);

    const handleBeforeUnload = () => {
      flushPendingEdits();
      savePlayerStateNow();
      // Unload backup: the async flush above may be cancelled by the unload, so
      // beacon whatever is still queued, grouped by world. Duplicate POSTs are
      // harmless — block edits are absolute block sets.
      try {
        const s = stateRef.current;
        if (s.pendingEdits.length && !s.simMode && typeof navigator !== "undefined" && navigator.sendBeacon) {
          for (const g of groupPendingByWorld(s.pendingEdits)) {
            navigator.sendBeacon(
              `/api/worlds/${g.worldId}/blocks`,
              new Blob([JSON.stringify({ edits: g.batch })], { type: "application/json" })
            );
          }
        }
      } catch { /* best effort only */ }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushPendingEdits();
        savePlayerStateNow();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [loading, titleScreenOpen, worldSelectOpen, activeSlot]);

  // Browser connectivity events: notify + sync on restore.
  useEffect(() => {
    const onOnline = () => {
      reportSyncOk();
      savePlayerStateNow();
    };
    const onOffline = () => {
      reportSyncFail();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    if (typeof navigator !== "undefined" && navigator.onLine === false) reportSyncFail();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    currentUser,
    setCurrentUser,
    authUsername,
    setAuthUsername,
    authPassword,
    setAuthPassword,
    authError,
    setAuthError,
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
    setAvailableWorlds,
    activeWorld,
    setActiveWorld,
    auditLogs,
    setAuditLogs,
    isPrefsLoadedRef,
    handleAuthSubmit,
    handleLogout,
    handleCreateWorldSubmit,
    handleDeleteWorldClick,
    handleJoinWorld,
    handleOpenAuditLogs,
    flushPendingEdits,
    savePlayerStateNow,
    reportSyncOk,
    reportSyncFail,
    handlePauseWorldSelect,
    handleQuitToLogin,
    handleEnter,
    savePreferences
  };
}
