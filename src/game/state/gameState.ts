import * as THREE from "three";
import { GROUND, TYPES } from "../world";
import { DEFAULT_HOTBAR } from "../blocks";
import type { WorldType, Chunk } from "../world";
import type { PendingEdit } from "../../services/api";
import { createOrbitState } from "../engine/orbitControls";
import type { OrbitState } from "../engine/orbitControls";
import type { CinePose } from "../engine/cinematic";
import type { MeteringMode } from "../engine/lightMeter";
import type { ExposureModel } from "../engine/lightMeter";
import type { WorldFX } from "../particles";
import type { PlacedPainting } from "../entities/paintings";
import type { ArrowManager } from "../engine/arrows";
import type { XpSystem } from "../xp";
import type { AnimalEntity } from "../entities/animals";
import type { WebSpiderMesh, CarriedSpider } from "../entities/webSpider";
import type { BoatEntity } from "../entities/boat";
import type { ChestEntity } from "../chest";
import type { VehicleEntity } from "../vehicles/vehicleEntity";
import type { MeshBuffer } from "../engine/chunkMesh";
import { isSim } from "../../services/simMode";
import type { PostFx } from "../engine/postFx";
import type { ItemDropManager } from "../entities/itemDrops";

export interface WakeBlockers {
  loading: boolean;
  pauseOpen: boolean;
  menuOpen: boolean;
  titleScreenOpen: boolean;
  worldSelectOpen: boolean;
  inventoryOpen: boolean;
  chestOpen: boolean;
  craftTableOpen: boolean;
  furnaceOpen: boolean;
  mapOpen: boolean;
  chatOpen: boolean;
  dead: boolean;
  petsOpen: boolean;
  portalOpen: boolean;
  recallOpen: boolean;
  blueprintOpen: boolean;
  auditOpen: boolean;
  namingOpen: boolean;
  tradingOpen: boolean;
}

export function shouldWakeWorld(
  b: WakeBlockers,
  engine: { uiPaused: boolean; active: boolean; steering: boolean }
): boolean {
  if (b.loading) return false;
  if (
    b.pauseOpen || b.menuOpen || b.titleScreenOpen || b.worldSelectOpen ||
    b.inventoryOpen || b.chestOpen || b.craftTableOpen || b.furnaceOpen ||
    b.mapOpen || b.chatOpen || b.dead || b.petsOpen || b.portalOpen ||
    b.recallOpen || b.blueprintOpen || b.auditOpen || b.namingOpen || b.tradingOpen
  ) return false;
  return engine.uiPaused || !engine.active || !engine.steering;
}

export interface MeshJob {
  key: string;
  c: Chunk;
  x0: number;
  z0: number;
  o: MeshBuffer;
  fol: MeshBuffer;
  grass: MeshBuffer;
  t: MeshBuffer;
  gl: MeshBuffer;
  y: number;
  yMax: number;
  t0: number;
  version: number;
  fast: boolean;
  biomeGrid?: string[];
  tintGrids?: import("../terrain/biomes").BlurredTints;
}

export interface Hit {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  d: number;
  blockId?: number;
}

export interface Emitter {
  x: number;
  y: number;
  z: number;
  col: number;
  dist: number;
  power: number;
  id?: number;
}

export interface PlayerData {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  pitch: number;
  ground: boolean;
  fly: boolean;
  bob: number;
  spawnX?: number;
  spawnZ?: number;
}

export interface GameState {
  scene: THREE.Scene | null;
  camera: THREE.PerspectiveCamera | null;
  renderer: THREE.WebGLRenderer | null;
  matOpaque: THREE.MeshLambertMaterial | null;
  matFoliage: THREE.MeshLambertMaterial | null;
  matGrass?: THREE.MeshLambertMaterial | null;
  matTrans: THREE.MeshLambertMaterial | null;
  matGlow: THREE.MeshBasicMaterial | null;
  matMerged?: THREE.MeshLambertMaterial | null;
  sun: THREE.DirectionalLight | null;
  hemi: THREE.HemisphereLight | null;
  amb: THREE.AmbientLight | null;
  sky: THREE.Mesh | null;
  clouds: THREE.Group | THREE.Mesh | null;
  sunBox: THREE.Mesh | null;
  moonBox: THREE.Mesh | null;
  moonHalo: THREE.Sprite | null;
  stars: THREE.Points | null;
  horizonMesh: THREE.Object3D | null;
  horizonCenterCX: number;
  horizonCenterCZ: number;
  horizonTileCount: number;
  horizonBuildMs: number;
  firstPersonArm: THREE.Group | null;
  heldItemGroup: THREE.Group | null;
  leftArm: THREE.Group | null;
  leftHeldItemGroup: THREE.Group | null;
  offhandItem: number | null;
  updateOffhandItem: ((blockId: number | null) => void) | null;
  currentHeldId: number;
  swingTimer: number;
  heldTorchLight: THREE.PointLight | null;
  cloudWeather: "clear" | "cloudy" | "overcast";
  wxLight: { direct: number; amb: number; sun: number; cloud: number };
  lastSnapshotAt: number;
  lastArchiveAt: number;
  snapshotBusy: boolean;
  captureBusy: boolean;
  mapSkipUntilMs: number;
  shadowToggle: boolean;
  postFx?: PostFx | null;
  meshJobs: Map<string, MeshJob>;
  meshResume: string[];
  meshPoolDepth: number;
  meshPoolBusy: number;
  meshFallbacks: number;
  fx: WorldFX | null;
  arrows: ArrowManager | null;
  xp: XpSystem | null;
  itemDrops: ItemDropManager | null;
  atlasTex: THREE.CanvasTexture | null;
  mining: { x: number; y: number; z: number; prog: number; needed: number; durability: number; maxDurability: number; sndT: number } | null;
  mouseLeftDown: boolean;
  hotbarDamage: number[];
  sneak: boolean;
  sprintHold: boolean;
  lastWPressAt: number;
  spinT: number;
  spinFrom: number;
  spinTo: number;
  hunger: number;
  saturation: number;
  exhaustion: number;
  lastSaveToastAt: number;
  xpStateAt: number;
  lastXpLevel: number;
  hungerHudAt: number;
  uiPaused: boolean;
  idleTimer: number | null;
  mobInit: boolean;
  menuOpen: boolean;
  pauseOpen: boolean;
  simMode: boolean;
  dimension?: "overworld" | "nether";
  lastFrameAt: number;
  bootStallAt: number;
  lastBootStallLog: number;
  lastLightUpdateAt: number;
  lights: THREE.PointLight[];
  glowSprites: THREE.Sprite[];
  glowSpriteAt: number;
  chunks: Map<string, Chunk>;
  edits: Map<string, number>;
  editsByChunk: Map<string, Map<string, number>>;
  lanterns: Map<string, [number, number, number]>;
  emitters: Map<string, Emitter>;
  liquidQ: [number, number, number, number, number, number?][];
  liquidTick: number;
  heightCache: Map<string, number>;
  regionCache: Map<string, any>;
  planCache: Map<string, any>;
  mapTiles: Map<string, { cv: HTMLCanvasElement; real: boolean; soft?: boolean }>;
  player: PlayerData;
  orbit: OrbitState | null;
  cinematic: boolean;
  cine: CinePose | null;
  cineMarks: { a: CinePose | null; b: CinePose | null };
  cineShot: { playing: boolean; t: number; dur: number; a: CinePose; b: CinePose } | null;
  cineShotDur: number;
  cinePreload: { active: boolean; queue: string[]; idx: number; total: number } | null;
  cineAutoPlay: boolean;
  ev: number;
  metering: MeteringMode;
  exposureModel: ExposureModel;
  ttlLin: number[];
  ttlRGB: number[];
  ttlClip: number[];
  ttlFrameMean: number;
  ttlZoneLux: number[];
  ttlZoneAt: number;
  ttlHDR: number[];
  ttlHDRMean: number;
  ttlAnchor: number;
  ttlAnchorAt: number;
  ttlHDROk: boolean;
  ttlReady: boolean;
  ttlAt: number;
  ttlMs: number;
  evComp: number;
  meterN: number;
  meterT: number;
  meterISO: number;
  meterLux: number;
  meterGain: number;
  meterAlbedo: number;
  meterAlbedoAt: number;
  meterEmitterLux: number;
  meterEmitterAt: number;
  meterEmitterKlux: number;
  meterSceneLux: number;
  meterPeakLux: number;
  meterBlockId: number;
  meterBlockFace: string;
  meterBlockDist: number;
  lastFlashEnv: number;
  wbK: number;
  wbTargetK: number;
  meterExp: number;
  lastEditShadowAt: number;
  lastTimeStr?: string;
  lastMoveSentAt?: number;
  lastSentX?: number;
  lastSentY?: number;
  lastSentZ?: number;
  lastSentYaw?: number;
  lastSentPitch?: number;
  lastNearVillagerId?: string | null;
  lastHoveredName?: string | null;
  lastChunkCountAt?: number;
  lastFluidUpdateT?: number;
  wasUnderwater?: boolean;
  wasUnderLava?: boolean;
  rescan?: (pcx: number, pcz: number) => void;
  updateHorizonMesh?: (force?: boolean) => void;
  keys: Record<string, boolean>;
  seed: number;
  seedMix: number;
  seedText: string;
  type: string;
  world: WorldType;
  time: number;
  timeFlow: boolean;
  timeSpeed: number;
  creative: boolean;
  simBuildingMode?: boolean;
  gameplayMode?: "peaceful" | "survival" | "hardcore";
  lastRegenAt?: number;
  shadowsOn: boolean;
  shadowRes?: number;
  shadowRad?: number;
  burial01?: number;
  lastBurialAt?: number;
  underCover?: boolean;
  dayCount?: number;
  moonPhase?: number;
  cloudMorphOp?: number;
  lastRainPatterAt?: number;
  lastNetherRumbleAt?: number;
  autoStep: boolean;
  baseFov: number;
  zoomActive: boolean;
  zoomFactor: number;
  maxFps: number;
  detectedHz: number;
  render: number;
  keep: number;
  active: boolean;
  steering: boolean;
  pointerLocked: boolean;
  hotbar: number[];
  slot: number;
  bigScale: number;
  mapPanX: number;
  mapPanZ: number;
  mapPanOn: boolean;
  genQ: [number, number, number][];
  meshQ: [number, number, number][];
  lastCX: number;
  lastCZ: number;
  scanT: number;
  dirtySave: boolean;
  reqId: number | null;
  mapOpen: boolean;
  inventoryOpen: boolean;
  tileBudgetReal: number;
  tileBudgetFar: number;
  lastSpacePress: number;
  lastSpaceRelease: number;
  currentWorldId: string;
  currentUserId: string;
  myUsername: string;
  _joinRestoredPos?: boolean;
  teleportSpawnFn: (() => void) | null;
  teleportToFn: ((x: number, z: number) => void) | null;
  summonPetTo: ((pet: { id: string; type?: string }) => void) | null;
  carriedSpider: CarriedSpider | null;
  heldSpiderMesh: { mesh: WebSpiderMesh; t: number } | null;
  getAnimalsFn: (() => Array<{ id: string; type: string; name?: string | null; sex?: string; ownerId?: string | null; x: number; y: number; z: number; yaw?: number }>) | null;
  getBoatsFn: (() => Array<{ id: string; itemId: number; x: number; y: number; z: number; yaw?: number }>) | null;
  riddenAnimal: AnimalEntity | null;
  riddenBoat: BoatEntity | null;
  lastBoatDismountAt: number;
  brokeBoatAt: number;
  lastMeleeAt: number;
  lastDismountAt: number;
  rideShiftHeld: boolean;
  rideKeys: { w: boolean; a: boolean; s: boolean; d: boolean };
  pendingAnimals: Array<{ id: string; type: string; name: string | null; sex: string; ownerId: string | null; collarColor?: string | null; x: number; y: number; z: number; yaw: number }> | null;
  pendingBoats: Array<{ id: string; itemId: number; x: number; y: number; z: number; yaw: number }> | null;
  removedBoatIds: string[];
  pendingEdits: PendingEdit[];
  connOnline: boolean;
  lastSyncAt: number;
  remoteAvatars: Map<string, THREE.Group>;
  villagers: Map<string, any>;
  rebuildAndSpawnWorld: ((seedStr: string, wType: string, savedPlayerPos?: { x: number; y: number; z: number; yaw?: number; pitch?: number; fly?: boolean } | null) => Promise<void>) | null;
  regenerateCurrentArea: (() => void) | null;
  chatOpen: boolean;
  craftTableOpen: boolean;
  titleScreenOpen: boolean;
  worldSelectOpen: boolean;
  nearVillager: any;
  aimedVillager: any;
  furnaceOpen: boolean;
  furnace: { x: number; y: number; z: number };
  furnaceSlots: { input: { id: number; count: number } | null; fuel: { id: number; count: number } | null; output: { id: number; count: number } | null };
  furnaceProg: number;
  furnaceFuelLeft: number;
  furnaceLit: boolean;
  chestOpen: boolean;
  chestPos: { x: number; y: number; z: number } | null;
  chestSlots: Array<{ id: number; count: number } | null>;
  chestMap: Map<string, Array<{ id: number; count: number } | null>>;
  tradeLedger: Map<string, { tradeDay: number; offers: number[]; uses: number[]; purse: Record<string, number> }>;
  chestLarge: boolean;
  chestKey: string | null;
  getBlockFn?: (x: number, y: number, z: number) => number;
  activeChestEntity: ChestEntity | null;
  chestEntities: Map<string, ChestEntity>;
  paintingGroup: THREE.Group | null;
  paintings: Map<string, PlacedPainting>;
  paintingData: Map<string, { x: number; y: number; z: number; nx: number; nz: number; variant: string }>;
  vehicles: Map<string, VehicleEntity>;
  activeVehicle: VehicleEntity | null;
  customAssetEntities: Map<string, { id: number; root: THREE.Group }>;
  vehicleLookYaw: number;
  vehicleLookPitch: number;
  health: number;
  dead: boolean;
  invMain: Array<{ id: number; count: number } | null>;
  hotbarCounts: number[];
  fallPeakY: number;
  lastDamageAt: number;
  oxygen: number;
  armorDefense: number;
  shakeT: number;
  respawnFn: (() => void) | null;
  tnts: Array<{ x: number; y: number; z: number; mesh: THREE.Mesh; born: number; fuse: number }>;
  explosions: Array<{ mesh: THREE.Mesh; light: THREE.PointLight | null; born: number }>;
  fallingBlocks: Array<{ x: number; z: number; y: number; vy: number; blockId: number; mesh: THREE.Mesh }>;
  blockDirs: Map<string, number>;
  eatingTimer: number;
  eatingSlot: number;
  weatherType: "clear" | "rain" | "snow" | "thunder";
  weatherIntensity: number;
  lastAmbientCaveAt: number;
  areaSelectMode: boolean;
  areaPos1: { x: number; y: number; z: number } | null;
  areaPos2: { x: number; y: number; z: number } | null;
  areaBoxMesh: THREE.LineSegments | null;
  areaBoxFill: THREE.Mesh | null;
  areaGizmo: THREE.Group | null;
  anchorCharges?: Map<string, number>;
  netherSpawnPoint?: { x: number; y: number; z: number; anchorKey: string } | null;
}

export function createDefaultGameState(): GameState {
  return {
    scene: null, camera: null, renderer: null, matOpaque: null, matFoliage: null, matGrass: null, matTrans: null, matGlow: null,
    sun: null, hemi: null, amb: null, sky: null, clouds: null, sunBox: null, moonBox: null, moonHalo: null, stars: null,
    horizonMesh: null, horizonCenterCX: 1e9, horizonCenterCZ: 1e9, horizonTileCount: 0, horizonBuildMs: 0, meshPoolDepth: 0, meshPoolBusy: 0, meshFallbacks: 0,
    firstPersonArm: null, heldItemGroup: null, leftArm: null, leftHeldItemGroup: null, offhandItem: 80, updateOffhandItem: null,     currentHeldId: -1, swingTimer: 0, heldTorchLight: null, cloudWeather: "cloudy", wxLight: { direct: 0.9, amb: 0.85, sun: 0.95, cloud: 0.88 }, lastSnapshotAt: 0, lastArchiveAt: 0, snapshotBusy: false, captureBusy: false, mapSkipUntilMs: 0, shadowToggle: true, meshJobs: new Map(), meshResume: [], fx: null, arrows: null, xp: null, itemDrops: null, atlasTex: null, mining: null, mouseLeftDown: false, sneak: false, sprintHold: false, lastWPressAt: 0, spinT: 0, spinFrom: 0, spinTo: 0, hunger: 20, saturation: 5, exhaustion: 0, lastSaveToastAt: 0, xpStateAt: 0, lastXpLevel: 0, hungerHudAt: 0, uiPaused: true, idleTimer: null, mobInit: false, menuOpen: false, pauseOpen: false, simMode: isSim(), lastFrameAt: 0, bootStallAt: 0, lastBootStallLog: 0, lastLightUpdateAt: 0,
    eatingTimer: 0, eatingSlot: 0, weatherType: "clear", weatherIntensity: 0, lastAmbientCaveAt: 0,
    lights: [], glowSprites: [], glowSpriteAt: 0, chunks: new Map(), edits: new Map(), editsByChunk: new Map(), lanterns: new Map(),
    emitters: new Map(), liquidQ: [], liquidTick: 0, heightCache: new Map(),
    regionCache: new Map(), planCache: new Map(), mapTiles: new Map(),
    player: { x: 0.5, y: GROUND + 1, z: 6.5, vx: 0, vy: 0, vz: 0, yaw: 0, pitch: -0.08, ground: false, fly: false, bob: 0 },
    orbit: createOrbitState(),
    cinematic: false, cine: null,
    cineMarks: { a: null, b: null }, cineShot: null, cineShotDur: 5,
    cinePreload: null, cineAutoPlay: false,
    ev: 12, metering: "matrix", exposureModel: "legacy-sim", evComp: 0, meterN: 2.8, meterT: 1 / 60, meterISO: 100, meterLux: 0, meterGain: 1, meterSceneLux: 0, meterPeakLux: 0, meterBlockId: 0, meterBlockFace: "-", meterBlockDist: 0, lastFlashEnv: 0, meterAlbedo: 0.25, meterAlbedoAt: 0, meterEmitterLux: 0, meterEmitterAt: 0, meterEmitterKlux: 0, wbK: 6500, wbTargetK: 6500, meterExp: 0, ttlLin: [], ttlRGB: [], ttlClip: [], ttlFrameMean: 0, ttlZoneLux: [], ttlZoneAt: 0, ttlHDR: [], ttlHDRMean: 0, ttlAnchor: 0, ttlAnchorAt: 0, ttlHDROk: false, ttlReady: false, ttlAt: 0, ttlMs: 0, lastEditShadowAt: 0,
    keys: {}, seed: 0, seedMix: 0, seedText: "hollowpine", type: "standard", world: TYPES.standard,
    time: 6000, timeFlow: true, timeSpeed: 1, creative: false, shadowsOn: true, autoStep: false, baseFov: 70, zoomActive: false, zoomFactor: 0.5, maxFps: 0, detectedHz: 120, render: 8, keep: 9, active: false,
    steering: false, pointerLocked: false, hotbar: isSim() ? [0, 0, 0, 0, 0, 0, 0, 0, 0] : DEFAULT_HOTBAR, hotbarDamage: [0, 0, 0, 0, 0, 0, 0, 0, 0],     slot: 0, bigScale: 2.0, mapPanX: 0, mapPanZ: 0, mapPanOn: false, genQ: [], meshQ: [], lastCX: 1e9, lastCZ: 1e9,
    scanT: 0, dirtySave: false, reqId: null, mapOpen: false, inventoryOpen: false, tileBudgetReal: 6, tileBudgetFar: 2, lastSpacePress: 0, lastSpaceRelease: 0,
    currentWorldId: "wld_default", currentUserId: "guest", myUsername: "", teleportSpawnFn: null, teleportToFn: null, summonPetTo: null, carriedSpider: null, heldSpiderMesh: null, connOnline: true, lastSyncAt: 0, getAnimalsFn: null, getBoatsFn: null, riddenAnimal: null, lastDismountAt: 0, riddenBoat: null, lastBoatDismountAt: 0, brokeBoatAt: 0, lastMeleeAt: 0, rideShiftHeld: false, rideKeys: { w: false, a: false, s: false, d: false }, pendingAnimals: null, pendingBoats: null, removedBoatIds: [], pendingEdits: [], remoteAvatars: new Map(), villagers: new Map(), rebuildAndSpawnWorld: null, regenerateCurrentArea: null,
    chatOpen: false, craftTableOpen: false, titleScreenOpen: !isSim(), worldSelectOpen: false, nearVillager: null, aimedVillager: null, health: 20, dead: false, invMain: Array.from({ length: 27 }, () => null), hotbarCounts: Array.from({ length: 9 }, () => 64), fallPeakY: 0, lastDamageAt: 0, oxygen: 10, armorDefense: 5, shakeT: 0, respawnFn: null,
    furnaceOpen: false, furnace: { x: 0, y: 0, z: 0 },
    furnaceSlots: { input: null, fuel: null, output: null },
    furnaceProg: 0, furnaceFuelLeft: 0, furnaceLit: false,
    chestOpen: false, chestPos: null, chestSlots: Array.from({ length: 27 }, () => null), chestMap: new Map(), tradeLedger: new Map(), paintingGroup: null, paintings: new Map(), paintingData: new Map(), chestLarge: false, chestKey: null, activeChestEntity: null, chestEntities: new Map(),
  vehicles: new Map(), activeVehicle: null, vehicleLookYaw: 0, vehicleLookPitch: 0,
    customAssetEntities: new Map(),
    tnts: [], explosions: [], fallingBlocks: [], blockDirs: new Map(),
    areaSelectMode: false, areaPos1: null, areaPos2: null, areaBoxMesh: null, areaBoxFill: null, areaGizmo: null,
  };
}

/**
 * Dispose per-instance geometries under a removed entity root (animals, mobs,
 * squids, boats, avatars, fireballs). Shared materials/textures — and shared
 * cached geometries such as the item-drop voxel cache — must NEVER pass through
 * here; callers guarantee per-instance geometry. Prevents slow GPU-memory leaks
 * from entity turnover that can end in a WebGL context loss ("random restart").
 */
export function disposeEntityRoot(root: { traverse(cb: (o: any) => void): void } | null | undefined): void {
  if (!root) return;
  try {
    root.traverse((o: any) => {
      const g = o ? o.geometry : null;
      if (g && typeof g.dispose === "function") {
        try { g.dispose(); } catch { /* already disposed */ }
      }
    });
  } catch { /* defensive: disposal must never break gameplay */ }
}
