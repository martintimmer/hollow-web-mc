import React, { useMemo } from "react";
import type { User, WorldMeta, BlockLogEntry } from "../services/api";
import type { PetEntry } from "./gui/PetModal";
import type { SpawnPortal } from "../game/state/portalStorage";
import { getHomePortal } from "../game/state/portalStorage";
import {
  ChestModal,
  FurnaceModal,
  CraftingModal,
  OptionsMenu,
  VillagerTradeModal,
  PetModal,
  TitleScreenModal,
  WorldSelectModal,
  CreateWorldModal,
  AuditLogsModal,
  WorldMapModal,
  InventoryModal,
  BootScreen,
  PauseMenu,
  PortalModal,
  RecallModal
} from "./gui";
import { BlueprintModal } from "./sim/BlueprintModal";
import type { BlueprintDoc, ScanOptions } from "../sim/blueprintScanner";
import { SimDeck } from "./sim/SimDeck";
import { isSim } from "../services/simMode";
import type { MeteringMode } from "../game/engine/lightMeter";
import type { ExposureModel } from "../game/engine/lightMeter";

export const COLLAR_COLORS = [
  "#d32f2f",
  "#f57c00",
  "#fdd835",
  "#43a047",
  "#1976d2",
  "#8e24aa",
  "#ec407a"
];

export interface GameOverlaysProps {
  // Villager Trading
  tradingVillager: any;
  tradeTick: number;
  creative: boolean;
  inventoryState: any;
  isoThumbnails: Map<number, string>;
  onExecuteTrade: (trade: any) => void;
  onCloseTrading: () => void;

  // Inventory & Crafting
  inventoryOpen: boolean;
  chestOpen: boolean;
  craftTableOpen: boolean;
  furnaceOpen: boolean;
  menuOpen: boolean;
  pauseOpen: boolean;
  loading: boolean;
  equippedArmor: any;
  setEquippedArmor: React.Dispatch<React.SetStateAction<any>>;
  craftGrid: any[];
  craftResult: any;
  selectedInvBlock: any;
  setSelectedInvBlock: React.Dispatch<React.SetStateAction<any>>;
  hotbar: number[];
  hotbarCounts: number[];
  setHotbar: React.Dispatch<React.SetStateAction<number[]>>;
  setHotbarCounts: React.Dispatch<React.SetStateAction<number[]>>;
  activeSlot: number;
  setActiveSlot: (slot: number) => void;
  invMain: any[];
  setInvMain: React.Dispatch<React.SetStateAction<any[]>>;
  onCraftCellClick: (idx: number) => void;
  onCraftResultClick: () => void;
  onCraftReset: () => void;
  onAssignToHotbar: (blockId: number, slotIndex?: number) => void;
  onMainSlotClick: (idx: number) => void;
  onToggleInventory: () => void;
  showToast: (msg: string) => void;

  // Crafting Table Modal
  onCloseCraftTable: () => void;

  // Furnace Modal
  furnaceUI: any;
  onFurnaceSlotClick: (slotKey: any) => void;
  onFurnaceReset: () => void;
  onCloseFurnace: () => void;

  // Pet Naming Prompt
  namingAnimal: any;
  namingInput: string;
  setNamingInput: React.Dispatch<React.SetStateAction<string>>;
  collarColor: string | null;
  setCollarColor: React.Dispatch<React.SetStateAction<string | null>>;
  confirmPetName: () => void;
  closePetName: () => void;

  // My Pets Modal
  petsOpen: boolean;
  setPetsOpen: (open: boolean) => void;
  petsList: PetEntry[];
  onTeleportToPet: (pet: PetEntry) => void;
  onSummonPet: (pet: PetEntry) => void;

  // Portal Modal
  portalModalOpen: boolean;
  portalCoord: { x: number; y: number; z: number } | null;
  portalsList: SpawnPortal[];
  onSavePortal: (name: string, isHome: boolean) => void;
  onSetHome: (portalId: string) => void;
  onDeletePortal: (portalId: string) => void;
  onTeleportToPortal: (portal: SpawnPortal) => void;
  onClosePortalModal: () => void;

  // Recall Modal
  recallModalOpen: boolean;
  currentWorldId: string;
  confirmRecall: () => void;
  closeRecallModal: () => void;

  // Chest Modal
  chestPos: { x: number; y: number; z: number } | null;
  chestSlots: any;
  handleSetChestSlots: any;
  handleChestSlotClick: (slotIdx: number) => void;
  closeChest: () => void;

  // Options & Settings Menu
  menuTab: any;
  setMenuTab: any;
  qualityPreset: any;
  handleApplyPreset: (preset: any) => void;
  weather: any;
  handleSetWeather: (w: any) => void;
  renderDistance: number;
  setRenderDistance: (r: number) => void;
  vibrance: number;
  setVibrance: (v: number) => void;
  brightness: number;
  setBrightness: (b: number) => void;
  contrast: number;
  setContrast: (c: number) => void;
  fov: number;
  setFov: (f: number) => void;
  ev: number;
  setEv: (v: number) => void;
  metering: MeteringMode;
  setMetering: (m: MeteringMode) => void;
  exposureModel: ExposureModel;
  onApplyLegacyExposure: () => void;
  onApplyIsoExposure: () => void;
  evComp: number;
  setEvComp: (v: number) => void;
  maxFps: number;
  setMaxFps: (fps: number) => void;
  detectedHz: number;
  soundOn: boolean;
  setSoundOn: (on: boolean) => void;
  volume: number;
  setVolume: (v: number) => void;
  musicOn: boolean;
  setMusicOn: (on: boolean) => void;
  musicVolume: number;
  setMusicVolumeState: (v: number) => void;
  playAmbientMotif: () => void;
  unlockAudio: () => void;
  shadows: boolean;
  setShadows: (s: boolean) => void;
  shadowTier: any;
  setShadowTier: (t: any) => void;
  setShadowTierOverridden: (ov: boolean) => void;
  dof: boolean;
  setDof: (d: boolean) => void;
  dofStrength: number;
  setDofStrength: (s: number) => void;
  ca: boolean;
  setCa: (c: boolean) => void;
  caStrength: number;
  setCaStrength: (s: number) => void;
  colorGamut: any;
  setColorGamut: (g: any) => void;
  bokeh: boolean;
  setBokeh: (b: boolean) => void;
  specular: boolean;
  setSpecular: (s: boolean) => void;
  specularStrength: number;
  setSpecularStrength: (s: number) => void;
  setCreative: (c: boolean) => void;
  gameplayMode: any;
  setGameplayMode: (m: any) => void;
  autoStep: boolean;
  setAutoStep: (s: boolean) => void;
  touchControls: boolean;
  setTouchControls: (t: boolean) => void;
  worldTime: number;
  setWorldTime: (t: number) => void;
  timeFormatted: string;
  timeFlow: boolean;
  setTimeFlow: (f: boolean) => void;
  timeSpeed: number;
  setTimeSpeed: (s: number) => void;
  seedText: string;
  setSeedText: (s: string) => void;
  worldType: any;
  setWorldType: (t: any) => void;
  currentUser: User | null;
  activeWorld: WorldMeta | null;
  onRegenerateVillage: () => void;
  handleRebuildWorld: () => Promise<void>;
  handleOpenAuditLogs: () => Promise<void>;
  onWorldSelection: () => Promise<void>;
  handleLogout: () => void;
  handleEnter: () => void;

  // Effects & Diagnostic Overlays
  portalWarping: boolean;
  bootStallMsg: string | null;

  // Vehicle HUD
  isInVehicle: boolean;
  vehicleKmh: number;
  seatName: string;

  // Boot Screen
  bootDone: boolean;
  setBootDone: (done: boolean) => void;

  // Sim Deck
  simBoost: boolean;
  simBuildingMode: boolean;
  setBlueprintModalOpen: (open: boolean) => void;
  handleToggleBuildingMode: () => void;

  // Blueprint Modal
  blueprintModalOpen: boolean;
  handleScanAndSaveBlueprint: (opts: ScanOptions) => Promise<BlueprintDoc | null>;
  handleStampBlueprint: (bp: BlueprintDoc) => void;
  handleLoadPresetStructure?: (struct: any) => void;

  // Pause Menu
  handleClosePause: () => void;
  handlePauseOptions: () => void;
  handlePauseStatistics: () => void;
  handlePauseCinematic?: () => void;
  isCinematicActive?: boolean;
  handlePauseWorldSelect: () => Promise<void>;
  handlePauseSnapshot: () => void;
  onToggleMapFromPause: () => void;
  onRefreshTextures: () => void;
  handlePauseHelp: () => void;
  onEnterStudio?: () => void;
  isStudioActive: boolean;
  handleQuitToLogin: () => void;
  isSimWorld: boolean;

  // Title / Auth Screen
  titleScreenOpen: boolean;
  authUsername: string;
  setAuthUsername: (u: string) => void;
  authPassword: string;
  setAuthPassword: (p: string) => void;
  authError: string;
  handleAuthSubmit: (e: React.FormEvent) => Promise<void>;

  // World Select Modal
  worldSelectOpen: boolean;
  availableWorlds: WorldMeta[];
  setActiveWorld: (w: WorldMeta) => void;
  handleJoinWorld: (w: WorldMeta) => void | Promise<void>;
  setCreateWorldOpen: (open: boolean) => void;
  handleDeleteWorldClick: (worldId: string) => Promise<void>;

  // Create World Modal
  createWorldOpen: boolean;
  newWorldName: string;
  setNewWorldName: (n: string) => void;
  newWorldSeed: string;
  setNewWorldSeed: (s: string) => void;
  newWorldType: any;
  setNewWorldType: (t: any) => void;
  newWorldMode: any;
  setNewWorldMode: (m: any) => void;
  handleCreateWorldSubmit: (e: React.FormEvent) => Promise<void>;

  // Audit Logs Modal
  auditLogsOpen: boolean;
  setAuditLogsOpen: (open: boolean) => void;
  auditLogs: BlockLogEntry[];

  // World Map Modal
  mapOpen: boolean;
  onCloseMap: () => void;
  bigCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  nearestVillage: any;
  posInfo: { x: number; y: number; z: number; heading: string; state: string };
  playerYaw: number;
  compassHeading?: number;
  handleMapHover: (cssX: number, cssY: number, cssW: number, cssH: number) => any;
  handleMapHoverLeave: () => void;
  handleMapSaveSpawn?: (name: string, x: number, z: number) => void;
  handleMapSpawnAt?: (x: number, z: number) => void;
  handleMapTeleportToPortal: (portal: SpawnPortal) => void;
  handleRenamePortal?: (portalId: string, newName: string) => void;
  handleFlashSpawn?: (portal: SpawnPortal) => void;
  onMapWheel: (e: React.WheelEvent) => void;
  onMapPan?: (dxPx: number, dyPx: number) => void;
  onMapPinch?: (factor: number) => void;
  onMapRecenter?: () => void;
}

export const GameOverlays: React.FC<GameOverlaysProps> = (props) => {
  const {
    tradingVillager,
    tradeTick,
    creative,
    inventoryState,
    isoThumbnails,
    onExecuteTrade,
    onCloseTrading,

    inventoryOpen,
    chestOpen,
    craftTableOpen,
    furnaceOpen,
    menuOpen,
    pauseOpen,
    loading,
    equippedArmor,
    setEquippedArmor,
    craftGrid,
    craftResult,
    selectedInvBlock,
    setSelectedInvBlock,
    hotbar,
    hotbarCounts,
    setHotbar,
    setHotbarCounts,
    activeSlot,
    setActiveSlot,
    invMain,
    setInvMain,
    onCraftCellClick,
    onCraftResultClick,
    onCraftReset,
    onAssignToHotbar,
    onMainSlotClick,
    onToggleInventory,
    showToast,

    onCloseCraftTable,

    furnaceUI,
    onFurnaceSlotClick,
    onFurnaceReset,
    onCloseFurnace,

    namingAnimal,
    namingInput,
    setNamingInput,
    collarColor,
    setCollarColor,
    confirmPetName,
    closePetName,

    petsOpen,
    setPetsOpen,
    petsList,
    onTeleportToPet,
    onSummonPet,

    portalModalOpen,
    portalCoord,
    portalsList,
    onSavePortal,
    onSetHome,
    onDeletePortal,
    onTeleportToPortal,
    onClosePortalModal,

    recallModalOpen,
    currentWorldId,
    confirmRecall,
    closeRecallModal,

    chestPos,
    chestSlots,
    handleSetChestSlots,
    handleChestSlotClick,
    closeChest,

    menuTab,
    setMenuTab,
    qualityPreset,
    handleApplyPreset,
    weather,
    handleSetWeather,
    renderDistance,
    setRenderDistance,
    vibrance,
    setVibrance,
    brightness,
    setBrightness,
    contrast,
    setContrast,
    fov,
    setFov,
    ev,
    setEv,
    metering,
    setMetering,
    exposureModel,
    onApplyLegacyExposure,
    onApplyIsoExposure,
    evComp,
    setEvComp,
    maxFps,
    setMaxFps,
    detectedHz,
    soundOn,
    setSoundOn,
    volume,
    setVolume,
    musicOn,
    setMusicOn,
    musicVolume,
    setMusicVolumeState,
    playAmbientMotif,
    unlockAudio,
    shadows,
    setShadows,
    shadowTier,
    setShadowTier,
    setShadowTierOverridden,
    dof,
    setDof,
    dofStrength,
    setDofStrength,
    ca,
    setCa,
    caStrength,
    setCaStrength,
    colorGamut,
    setColorGamut,
    bokeh,
    setBokeh,
    specular,
    setSpecular,
    specularStrength,
    setSpecularStrength,
    setCreative,
    gameplayMode,
    setGameplayMode,
    autoStep,
    setAutoStep,
    touchControls,
    setTouchControls,
    worldTime,
    setWorldTime,
    timeFormatted,
    timeFlow,
    setTimeFlow,
    timeSpeed,
    setTimeSpeed,
    seedText,
    setSeedText,
    worldType,
    setWorldType,
    currentUser,
    activeWorld,
    onRegenerateVillage,
    handleRebuildWorld,
    handleOpenAuditLogs,
    onWorldSelection,
    handleLogout,
    handleEnter,

    portalWarping,
    bootStallMsg,

    isInVehicle,
    vehicleKmh,
    seatName,

    bootDone,
    setBootDone,

    simBoost,
    simBuildingMode,
    setBlueprintModalOpen,
    handleToggleBuildingMode,

    blueprintModalOpen,
    handleScanAndSaveBlueprint,
    handleStampBlueprint,
    handleLoadPresetStructure,

    handleClosePause,
    handlePauseOptions,
    handlePauseStatistics,
    handlePauseCinematic,
    isCinematicActive,
    handlePauseWorldSelect,
    handlePauseSnapshot,
    onToggleMapFromPause,
    onRefreshTextures,
    handlePauseHelp,
    onEnterStudio,
    isStudioActive,
    handleQuitToLogin,
    isSimWorld,

    titleScreenOpen,
    authUsername,
    setAuthUsername,
    authPassword,
    setAuthPassword,
    authError,
    handleAuthSubmit,

    worldSelectOpen,
    availableWorlds,
    setActiveWorld,
    handleJoinWorld,
    setCreateWorldOpen,
    handleDeleteWorldClick,

    createWorldOpen,
    newWorldName,
    setNewWorldName,
    newWorldSeed,
    setNewWorldSeed,
    newWorldType,
    setNewWorldType,
    newWorldMode,
    setNewWorldMode,
    handleCreateWorldSubmit,

    auditLogsOpen,
    setAuditLogsOpen,
    auditLogs,

    mapOpen,
    onCloseMap,
    bigCanvasRef,
    nearestVillage,
    posInfo,
    playerYaw,
    compassHeading,
    handleMapHover,
    handleMapHoverLeave,
    handleMapSaveSpawn,
    handleMapSpawnAt,
    handleMapTeleportToPortal,
    handleRenamePortal,
    handleFlashSpawn,
    onMapWheel,
    onMapPan,
    onMapPinch,
    onMapRecenter
  } = props;

  const mapPlayerPos = useMemo(
    () => ({ x: posInfo.x, y: posInfo.y, z: posInfo.z, yaw: playerYaw }),
    [posInfo.x, posInfo.y, posInfo.z, playerYaw]
  );

  return (
    <>
      {/* VILLAGER TRADING GUI MODAL */}
      <VillagerTradeModal
        tradingVillager={tradingVillager}
        tradeTick={tradeTick}
        creative={creative}
        inventoryState={inventoryState}
        isoThumbnails={isoThumbnails}
        onExecuteTrade={onExecuteTrade}
        onClose={onCloseTrading}
      />

      {/* Survival / Creative Inventory GUI */}
      <InventoryModal
        isOpen={inventoryOpen && !chestOpen && !craftTableOpen && !furnaceOpen && !menuOpen && !pauseOpen}
        loading={loading}
        creative={creative}
        equippedArmor={equippedArmor}
        setEquippedArmor={setEquippedArmor}
        craftGrid={craftGrid}
        craftResult={craftResult}
        isoThumbnails={isoThumbnails}
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
        onCraftCellClick={onCraftCellClick}
        onCraftResultClick={onCraftResultClick}
        onCraftReset={onCraftReset}
        onAssignToHotbar={onAssignToHotbar}
        onMainSlotClick={onMainSlotClick}
        onClose={onToggleInventory}
        showToast={showToast}
      />

      {/* Crafting Table GUI */}
      <CraftingModal
        isOpen={craftTableOpen}
        loading={loading}
        craftGrid={craftGrid}
        craftResult={craftResult}
        isoThumbnails={isoThumbnails}
        onCellClick={onCraftCellClick}
        onResultClick={onCraftResultClick}
        onReset={onCraftReset}
        onClose={onCloseCraftTable}
      />

      {/* Furnace GUI */}
      <FurnaceModal
        isOpen={furnaceOpen}
        loading={loading}
        furnaceUI={furnaceUI}
        isoThumbnails={isoThumbnails}
        onSlotClick={onFurnaceSlotClick}
        onReset={onFurnaceReset}
        onClose={onCloseFurnace}
      />

      {/* Pet naming prompt (sign + animal) */}
      {namingAnimal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 pointer-events-auto">
          <div className="w-[380px] max-w-[90vw] bg-[#c6c6c6] border-4 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555] shadow-2xl p-4">
            <div className="text-sm font-bold text-[#2b2b2b] mb-2">🐾 Name your pet</div>
            <input
              autoFocus
              value={namingInput}
              onChange={(e) => setNamingInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); confirmPetName(); }
                else if (e.key === "Escape") { e.preventDefault(); closePetName(); }
              }}
              maxLength={24}
              placeholder="Pet name…"
              className="w-full px-3 py-2 bg-[#8b8b8b] border-2 border-t-[#555555] border-l-[#555555] border-b-[#ffffff] border-r-[#ffffff] text-sm text-white outline-none placeholder-white/50"
            />
            {namingAnimal.type === "dog" && (
              <div className="mt-3">
                <div className="text-[11px] font-bold text-[#3f3f3f] mb-1">Collar colour</div>
                <div className="flex gap-1.5">
                  {COLLAR_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setCollarColor(c)}
                      style={{ background: c }}
                      className={`w-6 h-6 rounded-full border-2 ${collarColor === c ? "border-[#3f3f3f] scale-110" : "border-white/70"}`}
                      aria-label={c}
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 mt-3 justify-end">
              <button onClick={confirmPetName} className="mc-button px-4 py-1.5 text-xs font-bold uppercase">Done</button>
              <button onClick={closePetName} className="px-4 py-1.5 bg-[#8b8b8b] border-2 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555] text-xs font-bold uppercase text-[#3f3f3f]">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* My Pets GUI */}
      <PetModal
        open={petsOpen}
        onClose={() => setPetsOpen(false)}
        pets={petsList}
        onTeleport={onTeleportToPet}
        onSummon={onSummonPet}
      />

      {/* Portal & Multiple Spawn Points GUI */}
      <PortalModal
        isOpen={portalModalOpen}
        currentCoord={portalCoord}
        portals={portalsList}
        onSavePortal={onSavePortal}
        onSetHome={onSetHome}
        onDeletePortal={onDeletePortal}
        onTeleportTo={onTeleportToPortal}
        onClose={onClosePortalModal}
      />

      {/* R Key Recall ("Spawn Home? OK / Cancel") GUI */}
      <RecallModal
        isOpen={recallModalOpen}
        homePortal={getHomePortal(currentWorldId)}
        allPortals={portalsList}
        onConfirm={confirmRecall}
        onCancel={closeRecallModal}
      />

      {/* Chest GUI */}
      <ChestModal
        isOpen={chestOpen}
        loading={loading}
        creative={creative}
        chestPos={chestPos}
        chestSlots={chestSlots}
        setChestSlots={handleSetChestSlots}
        invMain={invMain}
        setInvMain={setInvMain}
        hotbar={hotbar}
        hotbarCounts={hotbarCounts}
        setHotbar={setHotbar}
        setHotbarCounts={setHotbarCounts}
        activeSlot={activeSlot}
        setActiveSlot={setActiveSlot}
        isoThumbnails={isoThumbnails}
        onSlotClick={handleChestSlotClick}
        onClose={closeChest}
        showToast={showToast}
      />

      {/* Options & Settings Menu */}
      <OptionsMenu
        isOpen={menuOpen}
        loading={loading}
        menuTab={menuTab}
        setMenuTab={setMenuTab}
        qualityPreset={qualityPreset}
        onApplyPreset={handleApplyPreset}
        weather={weather}
        setWeather={handleSetWeather}
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
        onApplyLegacyExposure={onApplyLegacyExposure}
        onApplyIsoExposure={onApplyIsoExposure}
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
        setMusicVolume={setMusicVolumeState}
        onPlayAmbientTheme={playAmbientMotif}
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
        creative={creative}
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
        onRegenerateVillage={onRegenerateVillage}
        onRebuildWorld={handleRebuildWorld}
        onOpenAuditLogs={handleOpenAuditLogs}
        onWorldSelection={onWorldSelection}
        onLogout={handleLogout}
        onClose={handleEnter}
        showToast={showToast}
      />

      {/* Nether Dimensional Warp FX Vignette */}
      {portalWarping && (
        <div
          id="portalWarpOverlay"
          className="fixed inset-0 z-50 pointer-events-none transition-opacity duration-300"
          style={{
            background: "radial-gradient(circle, rgba(128,0,180,0.45) 0%, rgba(50,0,90,0.85) 100%)",
            backdropFilter: "blur(2px)"
          }}
        />
      )}

      {/* Boot-stall diagnostic card (visible on prod if world load hangs) */}
      {bootStallMsg && (
        <div className="fixed bottom-2 left-2 z-[80] max-w-[520px] rounded-md border-2 border-[#e05a3a] bg-[#2a0f07]/95 px-3 py-2 text-[11px] text-[#ffd0a8] shadow-2xl select-none">
          <div className="font-bold uppercase tracking-widest text-[#ff8f6a] mb-1">World load stall detected</div>
          <div className="whitespace-pre-wrap break-words">{bootStallMsg}</div>
          <div className="mt-1 text-[#ffb98a]/70">STALL_BOOT diagnostic sent to the server log — hard-refresh and wait 15 s; check data/telemetry-perf.jsonl for the cause.</div>
        </div>
      )}

      {/* Vehicle KM/H + Seat HUD */}
      {isInVehicle && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[35] pointer-events-none select-none flex flex-col items-center gap-2">
          <div className="flex flex-col items-center gap-1 bg-black/75 border-2 border-white/20 rounded-lg px-6 py-2 backdrop-blur-sm shadow-xl">
            <div className="text-[10px] tracking-[0.2em] text-white/60 font-bold">SPEED</div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white tabular-nums" style={{ fontVariantNumeric: "tabular-nums" }}>{String(vehicleKmh).padStart(2, "0")}</span>
              <span className="text-xs font-bold text-white/70">KM/H</span>
            </div>
            <div className="w-32 h-1 bg-white/15 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-emerald-400 to-lime-400 transition-all duration-100" style={{ width: `${Math.min(100, (vehicleKmh / 122) * 100)}%` }} />
            </div>
            <div className="text-[10px] font-bold text-amber-300 flex items-center gap-1">
              <span>💺 {seatName}</span>
              <span className="text-white/40">• Arrows to switch seat • E to exit</span>
            </div>
          </div>
        </div>
      )}

      {/* Bootstrap boot screen (dark pixel loader) */}
      {!bootDone && !isSim() && <BootScreen onDone={() => setBootDone(true)} />}

      {/* Sim Deck overlay (M1) — only in sim mode */}
      {(simBoost || isSim()) && (
        <SimDeck
          ready
          admin={simBoost}
          thumbs={isoThumbnails}
          onOpenBlueprints={() => setBlueprintModalOpen(true)}
          onToggleBuilding={handleToggleBuildingMode}
          isBuildingMode={simBuildingMode}
        />
      )}

      {/* Blueprint & Worldgen Studio Modal */}
      <BlueprintModal
        isOpen={blueprintModalOpen}
        onClose={() => setBlueprintModalOpen(false)}
        onScanAndSave={handleScanAndSaveBlueprint}
        onStampBlueprint={handleStampBlueprint}
        onLoadPreset={handleLoadPresetStructure}
        showToast={showToast}
      />

      {/* Esc Game Menu (pause overlay, vanilla-style in Prod, 4-button in Sim) */}
      <PauseMenu
        isOpen={pauseOpen}
        onResume={handleClosePause}
        onOptions={handlePauseOptions}
        onStatistics={handlePauseStatistics}
        onCinematic={handlePauseCinematic}
        isCinematicActive={isCinematicActive}
        onWorldSelect={handlePauseWorldSelect}
        onSnapshot={handlePauseSnapshot}
        onToggleMap={onToggleMapFromPause}
        onRefreshTextures={onRefreshTextures}
        onHelp={handlePauseHelp}
        onEnterStudio={onEnterStudio}
        isStudioActive={isStudioActive}
        skinColor={currentUser?.skinColor || "#e0913a"}
        equippedArmor={equippedArmor}
        isSimMode={isSim() || isSimWorld}
        onToggleBuilding={handleToggleBuildingMode}
        isBuildingMode={simBuildingMode}
        onQuitToLogin={handleQuitToLogin}
      />

      {/* Title / Login Screen */}
      <TitleScreenModal
        isOpen={titleScreenOpen}
        authUsername={authUsername}
        setAuthUsername={setAuthUsername}
        authPassword={authPassword}
        setAuthPassword={setAuthPassword}
        authError={authError}
        onSubmit={handleAuthSubmit}
      />

      {/* World Select Browser */}
      <WorldSelectModal
        isOpen={worldSelectOpen}
        currentUser={currentUser}
        availableWorlds={availableWorlds}
        activeWorld={activeWorld}
        setActiveWorld={setActiveWorld}
        onPlayWorld={handleJoinWorld}
        onCreateWorldOpen={() => setCreateWorldOpen(true)}
        onDeleteWorld={handleDeleteWorldClick}
        onOpenAuditLogs={handleOpenAuditLogs}
        onLogout={handleLogout}
      />

      {/* Create World Modal */}
      <CreateWorldModal
        isOpen={createWorldOpen}
        newWorldName={newWorldName}
        setNewWorldName={setNewWorldName}
        newWorldSeed={newWorldSeed}
        setNewWorldSeed={setNewWorldSeed}
        newWorldType={newWorldType}
        setNewWorldType={setNewWorldType}
        newWorldMode={newWorldMode}
        setNewWorldMode={setNewWorldMode}
        onSubmit={handleCreateWorldSubmit}
        onClose={() => setCreateWorldOpen(false)}
      />

      {/* Block Audit Logs Modal */}
      <AuditLogsModal
        isOpen={auditLogsOpen}
        auditLogs={auditLogs}
        onClose={() => setAuditLogsOpen(false)}
      />

      {/* Fullscreen Tactical Map Modal */}
      <WorldMapModal
        isOpen={mapOpen && !isSim()}
        canvasRef={bigCanvasRef}
        nearestVillage={nearestVillage}
        playerPos={mapPlayerPos}
        compassHeading={compassHeading}
        onHoverMove={handleMapHover}
        onHoverLeave={handleMapHoverLeave}
        onMapRightClick={handleMapHover}
        onSaveSpawn={handleMapSaveSpawn}
        onSpawnAt={handleMapSpawnAt}
        portals={portalsList}
        onTeleportSpawn={handleMapTeleportToPortal}
        onSetHomeSpawn={onSetHome}
        onDeleteSpawn={onDeletePortal}
        onRenameSpawn={handleRenamePortal}
        onFlashSpawn={handleFlashSpawn}
        onWheel={onMapWheel}
        onMapPan={onMapPan}
        onMapPinch={onMapPinch}
        onMapRecenter={onMapRecenter}
        onClose={onCloseMap}
      />
    </>
  );
};
