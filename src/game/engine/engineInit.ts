import * as THREE from 'three';
import { multiplayer } from '../../services/multiplayer';
import { apiSaveBlockEdits } from '../../services/api';
import { apiGetCustomAssets } from '../../services/customAssets';
import { BLOCK_MAP, BED_ID, BED_BYTE, isSolid, isOpaque, getMineTime } from '../blocks';
import { CH, CHH, SEA, SNOWLINE, TYPES, EYE } from '../world';
import type { Chunk } from '../world';
import { javaHash } from '../noise';
import { createRemoteAvatar } from '../avatars';
import { PROFESSIONS, createVillagerMesh, villagerInTradeRange, isVillagerAimed, TRADE_AIM_DIST, FARMER_PROFESSION } from '../villagers';
import { createArticulatedChest, computeChestPair, type ChestEntity } from '../chest';
import { createVehicleEntity, type VehicleEntity } from '../vehicles/vehicleEntity';
import { createTextureAtlas, isAtlasReady } from '../engine/atlas';
import { loadThumbnails, refreshOverrideThumbnails } from '../engine/thumbnails';
import { createVoxelGeometry } from '../engine/chunkMesh';
import { MeshPool, recommendedWorkerCount } from '../engine/meshPool';
import { createChunkMesher } from '../engine/chunkMesher';
import { createChunkStreamer } from '../engine/chunkStreamer';
import { createWorldMap } from '../engine/worldMap';
import { stepCinematic } from '../engine/cinematic';
import { createRenderLoop } from '../engine/renderLoop';
import { createPostFx, disposePostFx, applyColorGamut } from '../engine/postFx';
import type { PostFxSettings } from '../engine/postFx';
import { createPlayerInteraction } from '../interaction/playerInteraction';
import { moteForBlock } from '../ambientParticles';
import { PAINTINGS, createPaintingMesh, layoutPaintingMesh, findPaintingSpot, PAINTING_ITEM_ID, type PaintingRect } from '../entities/paintings';
import { apiSavePainting, apiRemovePainting } from '../../services/api';
import { setupGameInputListeners } from '../interaction/gameInput';
import { createTerrainContext, createChunkGenerator } from '../terrain/terrainGenerator';
import { initCelestialSky, createPlayerArm, updateArmHeldItem, shadowConfigFor, createBlockMaterials, createSceneLights, createSkyDome } from '../engine/sceneSetup';
import { damagePlayer as applyPlayerDamage, createPlayerPhysics } from '../physics/playerPhysics';
import { primeTnt as primeTntHelper, explode as explodeHelper, processTnt as processTntHelper } from '../terrain/explosions';
import { stepVillagers as runStepVillagers } from '../entities/villagerAI';
import { createFluidSimulator } from '../terrain/fluidDynamics';
import { setupSimDeckBridge } from '../../sim/simDeckBridge';
import { buildRoadStrip, buildLampPost, buildWell, buildGarden, buildPen, generateHouseStructure, rollVillageLoot } from '../terrain/structures';
import { MobManager } from '../entities/spawner';
import { WebSpiderManager, createWebSpiderMesh } from '../entities/webSpider';
import { isCobwebId, MUG_ID } from '../cobweb';
import type { AnimalEntity } from '../entities/animals';
import { attachNameplate } from '../entities/animals';
import { isBoatItem } from '../entities/boat';
import { getWeaponInfo, meleeCooldownMs, meleeDamage, rollMobDrops } from '../weapons';
import { smeltOutput, fuelItems, SMELT_TIME } from '../smelt';
import { playDig, playPlace, playStep, playExplode, playHurt, playDeath, playSplash, playIgnite, playFurnace, playSwing, playLevelUp, playChestOpen, playDoorUse, playChatPing } from '../sfx';
import { perf, isTelemetryEnabled } from '../telemetry';
import { isSim, simSeed, simType, simFlat, simDoorMode, simLog, simLogRing } from '../../services/simMode';
import { fetchTextureOverrides } from '../../services/textureOverrides';
import { createAxisGizmo, placeAxisGizmo } from '../../sim/gizmo';
import { getHomePortal } from '../state/portalStorage';
import { transitionDimension, type DimensionState, type Dimension, isPlayerInsidePortal } from '../state/dimensionManager';
import { playPortalHum, playPortalTravel } from '../sfx';
import { getCachedPlayerLocation, clearCachedPlayerLocation } from '../studioMode';
import { createWandManager } from '../blueprints/wand';
import { type GameState, disposeEntityRoot } from '../state/gameState';
import { clearCustomAssetModelCache, customAssetYaw, getCustomAssetMeta, getCustomAssetMetas, isCustomAssetBlock, loadCustomAssetModel, loadCustomAssetThumbnails, registerCustomAssets } from '../customAssets';

import type { Dispatch, RefObject, SetStateAction } from "react";
import type { ChatMessage } from "../chat/chatController";

export type AnySetter = Dispatch<SetStateAction<any>>;
export type AnyFn = (...args: any[]) => any;

export interface EngineInitDeps {
  setActive: AnySetter;
  setActiveSlot: AnySetter;
  setAimedVillager: AnySetter;
  setBlueprintModalOpen: AnySetter;
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setChestSlots: AnySetter;
  setChunkCount: AnySetter;
  setCollarColor: AnySetter;
  setCompassHeading: AnySetter;
  setCreative: AnySetter;
  setCurrentDimension: AnySetter;
  setDayCount: AnySetter;
  setDead: AnySetter;
  setDetectedHz: AnySetter;
  setFps: AnySetter;
  setFurnaceOpen: AnySetter;
  setHealth: AnySetter;
  setHotbar: AnySetter;
  setHotbarCounts: AnySetter;
  setHotbarDamage: AnySetter;
  setHoveredBlockName: AnySetter;
  setHungerBar: AnySetter;
  setHurtTick: AnySetter;
  setInvMain: AnySetter;
  setInventoryOpen: AnySetter;
  setIsInVehicle: AnySetter;
  setIsUnderLava: AnySetter;
  setIsUnderwater: AnySetter;
  setIsoThumbnails: AnySetter;
  setLoadMsg: AnySetter;
  setLoadPct: Dispatch<SetStateAction<number>>;
  setLoading: AnySetter;
  setMapOpen: AnySetter;
  setMenuOpen: AnySetter;
  setNamingAnimal: AnySetter;
  setNamingInput: AnySetter;
  setNearVillager: AnySetter;
  setNearestVillage: AnySetter;
  setOxygenBubbles: AnySetter;
  setPauseOpen: AnySetter;
  setPetsOpen: AnySetter;
  setPortalWarping: AnySetter;
  setPosInfo: AnySetter;
  setRenderDistance: AnySetter;
  setSeatName: AnySetter;
  setTimeFormatted: AnySetter;
  setTitleScreenOpen: AnySetter;
  setTradingVillager: AnySetter;
  setVehicleKmh: AnySetter;
  setWorldSelectOpen: AnySetter;
  setWorldTime: AnySetter;
  setXpBar: AnySetter;
  bigCanvasRef: RefObject<HTMLCanvasElement | null>;
  colorGamutRef: RefObject<string>;
  containerRef: RefObject<HTMLDivElement | null>;
  dimStateRef: RefObject<DimensionState>;
  isoThumbsRef: RefObject<Map<number, string>>;
  miniCanvasRef: RefObject<HTMLCanvasElement | null>;
  postFxSettingsRef: RefObject<PostFxSettings>;
  specularRef: RefObject<boolean>;
  specularStrengthRef: RefObject<number>;
  stateRef: RefObject<GameState>;
  closeChat: (send: boolean) => void;
  closeChest: AnyFn;
  closeCraftTable: AnyFn;
  closeFurnace: AnyFn;
  deductHotbarSlot: AnyFn;
  dropHeldItem: AnyFn;
  getMapMarkers: AnyFn;
  handleEnter: AnyFn;
  inventoryAddItem: AnyFn;
  openChat: (initialText?: string) => void;
  openChest: AnyFn;
  openCraftTable: AnyFn;
  openFurnace: AnyFn;
  openPortalModal: AnyFn;
  openRecallModal: AnyFn;
  reportSyncFail: AnyFn;
  reportSyncOk: AnyFn;
  syncFurnaceUI: AnyFn;
  blueprintModalOpen: boolean;
  qualityPreset: "smooth" | "balanced" | "beautiful";
  shadowTier: "basic" | "detailed" | "advanced";
  showToast: (msg: string) => void;
  _rayDir: THREE.Vector3;
}

export function initEngine(deps: EngineInitDeps): (() => void) | void {
  const {
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
    stateRef,
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
    showToast,
    _rayDir,
  } = deps;
    const s = stateRef.current;
    if (!containerRef.current) return;
    const mobMgr = new MobManager();
    (s as any).mobMgr = mobMgr;
    const webSpiderMgr = new WebSpiderManager();
    (s as any).webSpiderMgr = webSpiderMgr;

    // ==========================================
    // 2. 16x16 PROCEDURAL TEXTURE ATLAS (256x256 px)
    // ==========================================
    const { texture: tex, isoThumbnails: thumbs } = createTextureAtlas();
    setIsoThumbnails(thumbs);
    isoThumbsRef.current = thumbs;
    (window as unknown as { __isoThumbsRef?: { current: Map<number, string> } }).__isoThumbsRef = isoThumbsRef;
    (window as unknown as { __refreshThumbs?: () => Promise<{ size: number; ids: number[]; len503: number }> }).__refreshThumbs = async () => {
      const m = await refreshOverrideThumbnails(tex.image as HTMLCanvasElement);
      return { size: m.size, ids: [...m.keys()], len503: m.get(503) ? m.get(503)!.length : -1 };
    };

    // U4: thumbnails are loaded from /catalog/thumbnails.json (out of the JS bundle)
    const baseThumbsRef = { map: new Map<number, string>() };
    const overrideThumbIds = new Set<number>();
    const applyOverrideThumbnails = async () => {
      const updated = await refreshOverrideThumbnails(tex.image as HTMLCanvasElement);
      // Revert thumbnails whose override was removed back to the vanilla base.
      for (const id of [...overrideThumbIds]) {
        if (!updated.has(id)) {
          const base = baseThumbsRef.map.get(id);
          if (base) isoThumbsRef.current.set(id, base);
          else isoThumbsRef.current.delete(id);
          overrideThumbIds.delete(id);
        }
      }
      if (updated.size === 0) return;
      for (const [id, uri] of updated) {
        isoThumbsRef.current.set(id, uri);
        overrideThumbIds.add(id);
      }
      setIsoThumbnails(new Map(isoThumbsRef.current));
    };
    (window as unknown as { __applyThumbs?: () => Promise<{ after503: number; size: number }> }).__applyThumbs = async () => {
      const updated = await refreshOverrideThumbnails(tex.image as HTMLCanvasElement);
      await applyOverrideThumbnails();
      return { after503: isoThumbsRef.current.get(503) ? isoThumbsRef.current.get(503)!.length : -1, size: updated.size };
    };
    let baseThumbsReady: Promise<void> | null = null;
    const ensureBaseThumbs = () => {
      if (!baseThumbsReady) {
        baseThumbsReady = loadThumbnails().then((map) => {
          if (!map.size) return;
          baseThumbsRef.map = map;
          for (const [id, uri] of map) isoThumbsRef.current.set(id, uri);
          setIsoThumbnails(new Map(isoThumbsRef.current));
          stateRef.current.currentHeldId = -1;
          applyOverrideThumbnails();
        });
      }
      return baseThumbsReady;
    };
    (stateRef.current as unknown as Record<string, unknown>).ensureBaseThumbs = ensureBaseThumbs;
    let customThumbnailGeneration = 0;
    const loadCustomThumbnails = () => {
      const generation = ++customThumbnailGeneration;
      void ensureBaseThumbs().then(async () => {
        const thumbs = await loadCustomAssetThumbnails(getCustomAssetMetas());
        if (generation !== customThumbnailGeneration) return;
        if (!thumbs.size) return;
        for (const [id, uri] of thumbs) isoThumbsRef.current.set(id, uri);
        setIsoThumbnails(new Map(isoThumbsRef.current));
        stateRef.current.currentHeldId = -1;
      }).catch(() => undefined);
    };
    window.addEventListener("custom-assets-updated", loadCustomThumbnails);
    loadCustomThumbnails();
    const onOverrideThumbs = (e: StorageEvent) => {
      if (e.key === "mc_custom_atlas_overrides" || e.key === "mc_custom_atlas_version") {
        applyOverrideThumbnails();
        // Remesh chunks that contain torch-family blocks so the per-face cap
        // UVs (custom face slots) take effect on already-loaded worlds.
        const ver = Number(localStorage.getItem("mc_custom_atlas_version") || 0);
        if (ver && ver !== lastRemeshVersion && s.chunks.size > 0) {
          lastRemeshVersion = ver;
          const build = (s as any).buildMesh as ((cx: number, cz: number, ms?: number) => unknown) | undefined;
          if (build) {
            for (const [k, chunk] of s.chunks) {
              const d = chunk?.data;
              let hasTorch = false;
              if (d) {
                for (let i = 0; i < d.length; i++) {
                  if (d[i] === 80 || d[i] === 81 || d[i] === 84) { hasTorch = true; break; }
                }
              }
              if (!hasTorch) continue;
              const [cx, cz] = k.split(",").map(Number);
              build(cx, cz, 1.5);
            }
          }
        }
      }
    };
    let lastRemeshVersion = 0;
    window.addEventListener("storage", onOverrideThumbs);
    // Texture-override DB bridge: pull saved block/chest texture overrides on
    // boot. Live re-apply is manual (pause menu ↻) — no background polling.
    fetchTextureOverrides();
    syncCustomAssetsCatalog();
    window.addEventListener("focus", () => {
      applyOverrideThumbnails();
      syncCustomAssetsCatalog();
    });

    // ==========================================
    // 3. PROCEDURAL NOISE & TERRAIN
    // ==========================================
    function setSeed(text: string, typeKey: string) {
      const st = String(text == null ? "" : text).trim();
      s.seedText = st || "0";
      s.seed = (/^-?\d+$/.test(st) ? (Number(st) | 0) : javaHash(st)) >>> 0;
      s.seedMix = Math.imul(s.seed, 2246822519) | 0;
      s.type = TYPES[typeKey] ? typeKey : "standard";
      s.world = TYPES[s.type];
    }

    const terrainCtx = createTerrainContext(
      () => s.seedMix,
      () => s.world,
      s.heightCache,
      s.regionCache
    );

    const {
      hash2, hash3, vnoise, vnoise3D,
      continentalAt, tempAt,
      terrainHeight, surfaceAt, horizonColumn,
      villageAt, villagesNear, findNearestVillage, getBiome,
      riverInfoAt,
      caveAt, mineshaftAt
    } = terrainCtx;
    mobMgr.getBiome = getBiome;

    const ckey = (cx: number, cz: number) => cx + "," + cz;
    const getChunk = (cx: number, cz: number) => s.chunks.get(ckey(cx, cz));

    const pendingCustomAssetEntities = new Map<string, Promise<void>>();

    function removeCustomAssetEntity(key: string) {
      const existing = s.customAssetEntities.get(key);
      if (!existing) return;
      s.scene?.remove(existing.root);
      s.customAssetEntities.delete(key);
    }

    function ensureCustomAssetEntity(x: number, y: number, z: number, id: number) {
      const key = `${x},${y},${z}`;
      // Fallback: any id >=1198 is a custom asset even if metadata hasn't arrived yet (race on place)
      const isCustom = isCustomAssetBlock(id) || id >= 1198;
      if (!isCustom || pendingCustomAssetEntities.has(key)) return;
      const meta = getCustomAssetMeta(id);
      // If a placeholder exists and real metadata is ready, replace it.
      if (meta) {
        const existing = s.customAssetEntities.get(key);
        if (existing && existing.root?.userData?.placeholder) {
          removeCustomAssetEntity(key);
        } else if (existing) {
          return;
        }
      } else if (s.customAssetEntities.has(key)) {
        // Placeholder already present; keep waiting (retry loop below handles arrival).
        return;
      }
      if (!meta) {
        // No metadata yet — a temporary BROWN cube so the block is never invisible.
        // It is replaced by the real model once the catalog arrives (retry loop + re-scan).
        const tmp = new THREE.Group();
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshBasicMaterial({ color: 0x8a6b3f, side: THREE.DoubleSide, transparent: false });
        tmp.add(new THREE.Mesh(geo, mat));
        tmp.userData.placeholder = true;
        tmp.position.set(x + 0.5, y + 0.5, z + 0.5);
        tmp.rotation.y = customAssetYaw(s.blockDirs.get(key) ?? 0);
        if (s.scene) s.scene.add(tmp);
        s.customAssetEntities.set(key, { id, root: tmp });
        // Retry until the real model loads (replaces the placeholder when metadata lands).
        const retry = () => {
          const cur = s.customAssetEntities.get(key);
          if (getBlock(x, y, z) !== id) return;
          if (cur?.root?.userData?.placeholder) {
            removeCustomAssetEntity(key);
            ensureCustomAssetEntity(x, y, z, id);
            if (!s.customAssetEntities.has(key) || s.customAssetEntities.get(key)?.root?.userData?.placeholder) {
              setTimeout(retry, 800);
            }
          }
        };
        setTimeout(retry, 800);
        return;
      }
      const task = loadCustomAssetModel(id).then((model) => {
        if (getBlock(x, y, z) !== id || !s.scene) return;
        let root: THREE.Group | null = null;
        if (model) {
          // Voxel-built custom assets already carry opaque native geometry +
          // per-face overrides (see loadCustomAssetModel/buildVoxelMesh) — just clone.
          if ((model as any).userData?.voxel) {
            root = model.clone(true);
          } else {
          // Use the first texture's image, but respect per-face overrides from editor.html
          // (block_${id}_single_side/top/bottom stored in mc_custom_atlas_overrides).
          // This guarantees visibility and makes blocks.html edits show up in-game.
          let firstTex: THREE.Texture | null = null;
          let customSideUrl: string | null = null, customTopUrl: string | null = null, customBottomUrl: string | null = null;
          try {
            model.traverse((o: any) => {
              if (firstTex || !o.isMesh) return;
              const mats: any = Array.isArray(o.material) ? o.material : [o.material];
              for (const m of mats) {
                if (m.map && (m.map as any).image) { firstTex = m.map; break; }
              }
            });
            try {
              const overrides = JSON.parse(localStorage.getItem("mc_custom_atlas_overrides") || "{}");
              customSideUrl = overrides[`block_${id}_single_side`] || overrides[`block_${id}_side`] || null;
              customTopUrl = overrides[`block_${id}_single_top`] || overrides[`block_${id}_top`] || null;
              customBottomUrl = overrides[`block_${id}_single_bottom`] || overrides[`block_${id}_bottom`] || null;
            } catch {}
            const loadTexFromUrl = (url: string): THREE.Texture | null => {
              try {
                const img = new Image();
                img.src = url;
                const t = new THREE.CanvasTexture(img as any);
                t.colorSpace = THREE.SRGBColorSpace;
                t.magFilter = THREE.NearestFilter;
                t.minFilter = THREE.NearestFilter;
                t.generateMipmaps = false;
                if ((img as any).complete && (img as any).naturalWidth > 0) {
                  t.needsUpdate = true;
                  return t;
                }
                return null;
              } catch {
                return null;
              }
            };
            // @ts-ignore - TS thinks customTopUrl may be used before assignment due to inner try, but it's initialized to null
            if (customSideUrl || customTopUrl || customBottomUrl) {
              root = model.clone(true);
              const sideTex = customSideUrl ? loadTexFromUrl(customSideUrl) : null;
              const topTex = customTopUrl ? loadTexFromUrl(customTopUrl) : null;
              const bottomTex = customBottomUrl ? loadTexFromUrl(customBottomUrl) : null;
              root.traverse((obj) => {
                if (!(obj instanceof THREE.Mesh)) return;
                const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
                mats.forEach((m: any, idx: number) => {
                  const override = (idx === 1 || idx === 2 ? (topTex || sideTex) : (idx === 3 ? (bottomTex || sideTex) : sideTex));
                  if (!m) return;
                  const tex = override || firstTex;
                  if (tex) m.map = tex;
                  m.transparent = false;
                  m.alphaTest = 0;
                  m.depthWrite = true;
                  m.side = THREE.DoubleSide;
                  m.needsUpdate = true;
                  if (m.map) m.map.needsUpdate = true;
                });
              });
            } else {
              root = model.clone(true);
            }
          } catch {
            root = model.clone(true);
          }
          }
        } else {
          // Fallback: solid brown cube so the block is never invisible
          root = new THREE.Group();
          const geo = new THREE.BoxGeometry(1, 1, 1);
          const mat = new THREE.MeshBasicMaterial({ color: 0x8a6b3f, side: THREE.DoubleSide, transparent: false });
          const mesh = new THREE.Mesh(geo, mat);
          root.add(mesh);
        }
        if (!root) return;
        root.position.set(x + 0.5, y + 0.5, z + 0.5);
        root.rotation.y = customAssetYaw(s.blockDirs.get(key) ?? 0);
        s.scene.add(root);
        s.customAssetEntities.set(key, { id, root });
      }).catch(() => {
        // Fallback on error as well
        if (getBlock(x, y, z) !== id || !s.scene) return;
        const root = new THREE.Group();
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshBasicMaterial({ color: 0x8a6b3f, side: THREE.DoubleSide, transparent: false });
        const mesh = new THREE.Mesh(geo, mat);
        root.add(mesh);
        root.position.set(x + 0.5, y + 0.5, z + 0.5);
        root.rotation.y = customAssetYaw(s.blockDirs.get(key) ?? 0);
        s.scene.add(root);
        s.customAssetEntities.set(key, { id, root });
      }).finally(() => {
        pendingCustomAssetEntities.delete(key);
      });
      pendingCustomAssetEntities.set(key, task);
    }

    function syncCustomAssetsForChunk(c: Chunk) {
      if (!c.data) return;
      for (let i = 0; i < c.data.length; i++) {
        const id = c.data[i];
        if (!isCustomAssetBlock(id)) continue;
        const x = c.cx * CH + (i & 15);
        const y = i >> 8;
        const z = c.cz * CH + ((i >> 4) & 15);
        ensureCustomAssetEntity(x, y, z, id);
      }
    }

    function syncCustomAssets() {
      for (const [key, entity] of s.customAssetEntities) {
        const [x, y, z] = key.split(",").map(Number);
        if (getBlock(x, y, z) !== entity.id) removeCustomAssetEntity(key);
      }
    }

    async function syncCustomAssetsCatalog(dispatch = false) {
      try {
        const cat = await apiGetCustomAssets();
        registerCustomAssets(cat.assets, dispatch);
        loadCustomThumbnails();
        // Re-scan existing chunks for newly-registered custom assets (e.g. 1199 placed
        // before the catalog arrived). Without this, already-meshed chunks keep a
        // transparent voxel (side -1) and never get their GLTF entity.
        for (const chunk of s.chunks.values()) {
          if (chunk) syncCustomAssetsForChunk(chunk);
        }
        // Also force held-item refresh so hotbar 1199 shows solid BasicMaterial
        stateRef.current.currentHeldId = -1;
      } catch {}
    }

    // ── Wall paintings (entity quads + world_paintings persistence) ──
    function paintingKey(x: number, y: number, z: number): string {
      return `${x},${y},${z}`;
    }

    function removePaintingMesh(key: string): void {
      const old = s.paintings.get(key);
      if (old) {
        s.paintingGroup?.remove(old.mesh);
        old.mesh.geometry.dispose();
        (old.mesh.material as THREE.Material)?.dispose?.();
        s.paintings.delete(key);
      }
    }

    function spawnPaintingEntity(spot: { x: number; y: number; z: number; nx: number; nz: number; variant: string }): boolean {
      const def = PAINTINGS.find((p) => p.name === spot.variant) ?? PAINTINGS[0];
      if (!def || !s.scene || !s.paintingGroup) return false;
      const key = paintingKey(spot.x, spot.y, spot.z);
      removePaintingMesh(key);
      const mesh = createPaintingMesh(def);
      layoutPaintingMesh(mesh, def, spot.x, spot.y, spot.z, spot.nx, spot.nz);
      mesh.userData.paintingKey = key;
      s.paintingGroup.add(mesh);
      s.paintings.set(key, { id: key, x: spot.x, y: spot.y, z: spot.z, nx: spot.nx, nz: spot.nz, def, mesh });
      s.paintingData.set(key, { x: spot.x, y: spot.y, z: spot.z, nx: spot.nx, nz: spot.nz, variant: def.name });
      return true;
    }

    function removePainting(key: string, drop: boolean): boolean {
      const p = s.paintings.get(key);
      if (!p && !s.paintingData.has(key)) return false;
      const [x, y, z] = key.split(",").map(Number);
      removePaintingMesh(key);
      s.paintingData.delete(key);
      if (!s.simMode) apiRemovePainting(s.currentWorldId, x, y, z).catch(() => {});
      if (drop && s.itemDrops) {
        s.itemDrops.spawnDrop((p ? p.x : x) + 0.5, (p ? p.y : y) + 0.5, (p ? p.z : z) + 0.5, PAINTING_ITEM_ID, 1);
      }
      return true;
    }

    function paintingSupported(p: { x: number; y: number; z: number; nx: number; nz: number; def: { w: number; h: number } }): boolean {
      const ux = p.nz !== 0 ? 1 : 0;
      const uz = p.nx !== 0 ? 1 : 0;
      for (let dy = 0; dy < p.def.h; dy++) {
        for (let dw = 0; dw < p.def.w; dw++) {
          const behind = getBlock(p.x + ux * dw - p.nx, p.y + dy, p.z + uz * dw - p.nz);
          if (behind === 0 || behind === 39 || behind === 40 || !isSolid(behind)) return false;
        }
      }
      return true;
    }

    function syncPaintings(): void {
      if (!s.paintings.size) return;
      for (const [key, p] of [...s.paintings]) {
        if (!paintingSupported(p)) {
          removePainting(key, true);
          showToast("🖼️ Painting fell — support destroyed");
        }
      }
    }

    function existingPaintingRects(): PaintingRect[] {
      const out: PaintingRect[] = [];
      for (const p of s.paintings.values()) {
        if (p.nx !== 0) out.push({ nx: p.nx, nz: 0, x0: p.x, y0: p.y, z0: p.z, x1: p.x + 1, y1: p.y + p.def.h, z1: p.z + p.def.w });
        else out.push({ nx: 0, nz: p.nz, x0: p.x, y0: p.y, z0: p.z, x1: p.x + p.def.w, y1: p.y + p.def.h, z1: p.z + 1 });
      }
      return out;
    }

    function tryPlacePainting(hit: { x: number; y: number; z: number; nx: number; ny: number; nz: number }): boolean {
      if (!s.scene || !s.paintingGroup) return false;
      if (hit.ny !== 0 || (hit.nx === 0 && hit.nz === 0)) {
        showToast("🖼️ Paintings hang on walls — aim at a wall");
        return true;
      }
      const isSupport = (id: number) => id !== 0 && id !== 39 && id !== 40 && isSolid(id);
      const isOpen = (id: number) => !isOpaque(id);
      const spot = findPaintingSpot(getBlock, isSupport, isOpen, existingPaintingRects(), hit.x + hit.nx, hit.y + hit.ny, hit.z + hit.nz, hit.nx, hit.nz, Math.random);
      if (!spot) {
        showToast("🖼️ No room — clear a flat wall area");
        return true;
      }
      const def = PAINTINGS.find((pd) => pd.name === spot.variant) ?? PAINTINGS[0];
      if (!spawnPaintingEntity({ ...spot, nx: hit.nx, nz: hit.nz })) return false;
      if (!s.simMode) apiSavePainting(s.currentWorldId, { ...spot, nx: hit.nx, nz: hit.nz }).catch(() => {});
      if (!s.creative) deductHotbarSlot(s.slot);
      playPlace(PAINTING_ITEM_ID);
      showToast(`🖼️ Hung “${def.title}” (${def.w}×${def.h})`);
      return true;
    }

    function tryBreakPainting(): boolean {
      if (!s.camera || !s.paintingGroup || !s.paintings.size) return false;
      const rc = new THREE.Raycaster();
      rc.setFromCamera(new THREE.Vector2(0, 0), s.camera);
      rc.far = s.player.fly ? 7 : 5;
      const hits = rc.intersectObjects(s.paintingGroup.children, false);
      if (!hits.length) return false;
      const key = (hits[0].object as unknown as { userData?: { paintingKey?: string } }).userData?.paintingKey;
      if (!key || !s.paintings.has(key)) return false;
      s.swingTimer = 1.0;
      removePainting(key, true);
      playDig(PAINTING_ITEM_ID);
      return true;
    }

    let isReloadingCustomAssets = false;
    function reloadAllCustomAssets() {
      if (isReloadingCustomAssets) return;
      isReloadingCustomAssets = true;
      try {
        clearCustomAssetModelCache();
        for (const [, entity] of s.customAssetEntities) {
          if (s.scene) s.scene.remove(entity.root);
        }
        s.customAssetEntities.clear();
        pendingCustomAssetEntities.clear();
        for (const chunk of s.chunks.values()) {
          if (chunk) syncCustomAssetsForChunk(chunk);
        }
        stateRef.current.currentHeldId = -1;
        syncCustomAssetsCatalog(false);
        loadCustomThumbnails();
        applyOverrideThumbnails();
      } finally {
        setTimeout(() => { isReloadingCustomAssets = false; }, 500);
      }
    }

    window.addEventListener("storage", (e) => {
      if (e.key === "mc_custom_atlas_overrides" || e.key === "mc_custom_atlas_version") {
        reloadAllCustomAssets();
      }
    });

    function getBlock(x: number, y: number, z: number) {
      x = Math.floor(x); y = Math.floor(y); z = Math.floor(z);
      if (y < 0) return 5; // Stone bottom
      if (y >= CHH) return 0; // Air
      const c = s.chunks.get(ckey(x >> 4, z >> 4));
      return c ? c.data[y * 256 + (z & 15) * 16 + (x & 15)] : 0;
    }

    function setRaw(x: number, y: number, z: number, id: number) {
      if (y < 0 || y >= CHH) return;
      const c = s.chunks.get(ckey(x >> 4, z >> 4));
      if (!c) return;
      c.data[y * 256 + (z & 15) * 16 + (x & 15)] = id;
      if (id && y > c.maxY) c.maxY = y;
    }

    // Component-level access to the voxel world (used by openChest/break handlers)
    s.getBlockFn = getBlock;

    interface SimCell { k: string; x: number; y: number; z: number; prev: number; next: number; }
    const simStamps: Array<{ cells: Array<SimCell> }> = [];
    const genOrigin = { GC: null as Chunk | null, GX0: 0, GZ0: 0 };
    let simCapture: ((x: number, y: number, z: number, id: number) => void) | null = null;
    function w(x: number, y: number, z: number, id: number) {
      if (simCapture) { simCapture(x, y, z, id); return; }
      if (!genOrigin.GC || y < 0 || y >= CHH) return;
      if (x < genOrigin.GX0 || x >= genOrigin.GX0 + CH || z < genOrigin.GZ0 || z >= genOrigin.GZ0 + CH) return;
      genOrigin.GC.data[y * 256 + (z & 15) * 16 + (x & 15)] = id;
      if (id && y > genOrigin.GC.maxY) genOrigin.GC.maxY = y;
      const b = BLOCK_MAP.get(id);
      if (b && (b.glow || (b as { light?: number }).light)) {
        const k = x + "," + y + "," + z;
        s.emitters.set(k, {
          x: x + 0.5,
          y: y + 0.5,
          z: z + 0.5,
          col: b.lightCol || 0xffd489,
          dist: b.lightDist || 16,
          power: b.lightPower || 1.2,
          id
        });
        s.lanterns.set(k, [x + 0.5, y + 0.5, z + 0.5]);
      }
    }
    const clearUp = (x: number, z: number, from: number) => { for (let y = from; y < CHH; y++) w(x, y, z, 0); };
    // Stair writer: stamps a stair block AND records its facing in the chunk's
    // dirs array (mesher reads dirs[off]-1 as the facing; 0 ascends toward +Z).
    const wStair = (x: number, y: number, z: number, id: number, facing: number) => {
      if (simCapture) { simCapture(x, y, z, id); return; }
      if (!genOrigin.GC || y < 0 || y >= CHH) return;
      if (x < genOrigin.GX0 || x >= genOrigin.GX0 + CH || z < genOrigin.GZ0 || z >= genOrigin.GZ0 + CH) return;
      const off = y * 256 + (z & 15) * 16 + (x & 15);
      genOrigin.GC.data[off] = id;
      if (y > genOrigin.GC.maxY) genOrigin.GC.maxY = y;
      if (!genOrigin.GC.dirs) genOrigin.GC.dirs = new Uint16Array(CH * CHH * CH);
      genOrigin.GC.dirs[off] = facing + 1;
    };
    function rngAt(x: number, z: number) {
      let st = ((Math.imul(x, 73856093) ^ Math.imul(z, 19349663) ^ s.seedMix) >>> 0);
      return () => { st = (Math.imul(st, 1664525) + 1013904223) >>> 0; return st / 4294967296; };
    }

    const roadStrip = (x0: number, z0: number, x1: number, z1: number) =>
      buildRoadStrip(x0, z0, x1, z1, genOrigin.GX0, genOrigin.GZ0, CH, w, hash2, terrainHeight, wStair);
    const lampPost = (x: number, z: number, base: number) => buildLampPost(x, z, base, w, clearUp);
    const wellAt = (cx: number, cz: number, base: number) => buildWell(cx, cz, base, w, clearUp);
    const gardenAt = (x0: number, z0: number, x1: number, z1: number) =>
      buildGarden(x0, z0, x1, z1, w, clearUp, terrainHeight);
    const penAt = (x0: number, z0: number, x1: number, z1: number, base: number) =>
      buildPen(x0, z0, x1, z1, base, w, clearUp);
    const buildHouse = (H: any) => {
      const artSpots: Array<{ x: number; y: number; z: number }> = [];
      generateHouseStructure(H, w, clearUp, terrainHeight, hash2, wStair, registerVillageLoot, (x, y, z) => {
        if (x < genOrigin.GX0 - 1 || x > genOrigin.GX0 + CH || z < genOrigin.GZ0 - 1 || z > genOrigin.GZ0 + CH) return;
        artSpots.push({ x, y, z });
      });
      hangHousePaintings(H, artSpots.slice(0, 2));
    };

    function hangHousePaintings(H: any, spots: Array<{ x: number; y: number; z: number }>): void {
      if (!s.scene || !s.paintingGroup) return;
      const hx0 = H.x0, hz0 = H.z0, hx1 = H.x1, hz1 = H.z1;
      if (typeof hx0 !== "number" || typeof hz0 !== "number" || typeof hx1 !== "number" || typeof hz1 !== "number") return;
      const isSupport = (id: number) => id !== 0 && id !== 39 && id !== 40 && isSolid(id);
      const isOpen = (id: number) => !isOpaque(id);
      for (const sp of spots) {
        const cands = [
          { x: hx0 + 1, z: sp.z, nx: 1, nz: 0 },
          { x: hx1 - 1, z: sp.z, nx: -1, nz: 0 },
          { x: sp.x, z: hz0 + 1, nx: 0, nz: 1 },
          { x: sp.x, z: hz1 - 1, nx: 0, nz: -1 },
        ];
        cands.sort((a, b) => (Math.abs(a.x - sp.x) + Math.abs(a.z - sp.z)) - (Math.abs(b.x - sp.x) + Math.abs(b.z - sp.z)));
        for (const c of cands) {
          const pick = (n: number) => Math.floor(Math.abs(hash2(c.x * 13 + c.z * 29 + sp.y, hx0 + hz0)) * n);
          const found = findPaintingSpot(getBlock, isSupport, isOpen, existingPaintingRects(), c.x, sp.y, c.z, c.nx, c.nz, pick);
          if (found) {
            const had = s.paintingData.has(`${found.x},${found.y},${found.z}`);
            if (spawnPaintingEntity({ ...found, nx: c.nx, nz: c.nz }) && !had && !s.simMode) {
              apiSavePainting(s.currentWorldId, { ...found, nx: c.nx, nz: c.nz }).catch(() => {});
            }
            break;
          }
        }
      }
    }
    // Village chest loot: seed each generated chest from its design's vanilla-style
    // loot table, deterministic per coordinate. Guarded so player-looted chests win
    // (and stay looted across /regenerate, since chestMap is never cleared by it).
    function registerVillageLoot(x: number, y: number, z: number, designKey: string) {
      const key = `${x},${y},${z}`;
      if (s.chestMap.has(key)) return;
      s.chestMap.set(key, rollVillageLoot(designKey, rngAt(x, z)));
    }

    const chunkGen = createChunkGenerator({
      s,
      simFlat,
      hash2, hash3, vnoise, vnoise3D, continentalAt, tempAt,
      terrainHeight, surfaceAt, villagesNear, getBiome, riverInfoAt,
      rngAt, w, clearUp,
      origin: genOrigin,
      roadStrip, lampPost, wellAt, gardenAt, penAt, buildHouse,
      caveAt, mineshaftAt
    });
    const { genChunk: overworldGenChunk, pine, villagePlan } = chunkGen;
    const genChunk = (cx: number, cz: number): Chunk => {
      const key = ckey(cx, cz);
      if (s.chunks.has(key)) return s.chunks.get(key)!;

      if (dimStateRef.current.dimension === "nether") {
        const c = dimStateRef.current.netherGen.generateChunk(cx, cz, s.edits, (k, items) => {
          if (!s.chestMap.has(k)) s.chestMap.set(k, items);
        });
        s.chunks.set(key, c);
        return c;
      }
      return overworldGenChunk(cx, cz);
    };
    (s as any).genChunk = genChunk;

    // ---- Worker-based chunk meshing pool (async; falls back to sliced main-thread meshing) ----
    const meshWaiters = new Map<string, (ok: boolean) => void>();
    const meshPoolOk = { v: false };
    let meshPool: MeshPool | null = null;
    const mesher = createChunkMesher({
      s,
      meshPoolOk,
      meshWaiters,
      getChunk,
      getBlock,
      getMeshPool: () => meshPool,
      syncCustomAssetsForChunk,
      getBiome
    });
    meshPool = new MeshPool(
      mesher.onMeshPoolResult,
      () => { meshPoolOk.v = false; },
      recommendedWorkerCount()
    );
    const { buildMesh, advanceMeshJob } = mesher;
    (s as any).buildMesh = buildMesh;

    const chunkStreamer = createChunkStreamer({
      s,
      getChunk,
      genChunk,
      buildMesh,
      advanceMeshJob,
      sampleHorizon: horizonColumn,
      setChunkCount
    });
    const { updateHorizonMesh, rescan, stream } = chunkStreamer;

    // ==========================================
    // 2.5D CONTINUOUS HORIZON LOD SYSTEM
    // ==========================================

    // ==========================================
    // MINECRAFT VILLAGERS & MOBS SYSTEM
    // ==========================================

    function spawnVillagers() {
      // Clear existing
      for (const v of s.villagers.values()) {
        if (v.mesh?.root && s.scene) s.scene.remove(v.mesh.root);
        disposeEntityRoot(v.mesh?.root);
      }
      s.villagers.clear();

      const vs = villagesNear(Math.floor(s.player.x), Math.floor(s.player.z));
      if (!vs.length) return;

      const village = vs[0];
      const plan = villagePlan(village);
      const base = village.base;

      // Spawn 8 active villagers across village landmarks
      const spawnSpots: Array<{ x: number; z: number; profIdx: number; house?: any }> = [];

      // Near well
      if (plan.wells.length) {
        spawnSpots.push({ x: plan.wells[0][0] + 1.5, z: plan.wells[0][1] + 1.5, profIdx: 0 });
        spawnSpots.push({ x: plan.wells[0][0] - 1.5, z: plan.wells[0][1] - 1.5, profIdx: 1 });
      }

      // Near gardens / farms
      for (let i = 0; i < Math.min(2, plan.gardens.length); i++) {
        const g = plan.gardens[i];
        spawnSpots.push({ x: (g[0] + g[2]) / 2, z: (g[1] + g[3]) / 2, profIdx: 0 });
      }

      // Near houses
      for (let i = 0; i < Math.min(4, plan.houses.length); i++) {
        const h = plan.houses[i];
        const profIdx = (i + 2) % PROFESSIONS.length;
        const mx = (h.x0 + h.x1) / 2, mz = (h.z0 + h.z1) / 2;
        spawnSpots.push({ x: mx, z: mz, profIdx, house: h });
      }

      spawnSpots.forEach((sp, idx) => {
        const prof = PROFESSIONS[sp.profIdx % PROFESSIONS.length];
        const skinIdx = (idx + sp.profIdx) % 4; // Multi-tone skin diversity
        const vMesh = createVillagerMesh(prof, skinIdx);
        const y = base + 1;
        vMesh.root.position.set(sp.x, y, sp.z);
        if (s.scene) s.scene.add(vMesh.root);

        let pen: { x: number; z: number } | null = null;
        if (prof.name === FARMER_PROFESSION && plan.pens && plan.pens.length) {
          let best: any = null, bestD = Infinity;
          for (const pn of plan.pens) {
            const d = Math.hypot(pn.cx - sp.x, pn.cz - sp.z);
            if (d < bestD) { bestD = d; best = pn; }
          }
          if (best) pen = { x: best.cx, z: best.cz };
        }

        const entity = {
          id: `vil_${idx}`,
          prof,
          x: sp.x,
          y,
          z: sp.z,
          vx: 0,
          vy: 0,
          vz: 0,
          yaw: Math.random() * Math.PI * 2,
          targetX: sp.x,
          targetZ: sp.z,
          state: "idle",
          stateTimer: 2 + Math.random() * 4,
          walkCycle: 0,
          house: sp.house,
          pen,
          mesh: vMesh,
          usesLeft: prof.trades.map(() => 1),
          tradeDay: -1,
          offerIdx: [],
          purse: {},
          tkey: `${sp.x.toFixed(1)}|${sp.z.toFixed(1)}|${prof.name}`,
          lastRestockDay: 0
        };
        s.villagers.set(entity.id, entity);
        const saved = (s.tradeLedger as Map<string, any> | undefined)?.get(entity.tkey);
        if (saved) {
          entity.tradeDay = saved.tradeDay ?? -1;
          entity.offerIdx = Array.isArray(saved.offers) ? saved.offers : [];
          entity.usesLeft = prof.trades.map((_, ti) => Number(saved.uses?.[ti] ?? 1));
          entity.purse = { ...((saved.purse as Record<string, number>) || {}) };
        }
      });

      // Farmer livestock: 2-3 calm cows per fenced pen (tagged so regroups never duplicate them)
      if (plan.pens && plan.pens.length && mobMgr) {
        plan.pens.forEach((pn: any, pi: number) => {
          const tag = `pen:${village.id}:${pi}`;
          if (mobMgr.animals.some((a: any) => a.ownerId === tag)) return;
          const n = 2 + Math.floor(Math.random() * 2);
          for (let i = 0; i < n; i++) {
            const a = mobMgr.spawnSingleAnimal(
              pn.cx + (Math.random() * 4 - 2), pn.base + 1, pn.cz + (Math.random() * 4 - 2),
              "cow", { ownerId: tag }
            );
            if (a) a.wanderTier = "calm";
          }
        });
      }
    }

    function stepVillagers(dt: number) {
      runStepVillagers(s, dt, { setNearVillager });
    }

    function remesh(x: number, z: number) {
      const set = new Set<string>();
      set.add(ckey(x >> 4, z >> 4));
      if ((x & 15) === 0) set.add(ckey((x >> 4) - 1, z >> 4));
      if ((x & 15) === 15) set.add(ckey((x >> 4) + 1, z >> 4));
      if ((z & 15) === 0) set.add(ckey(x >> 4, (z >> 4) - 1));
      if ((z & 15) === 15) set.add(ckey(x >> 4, (z >> 4) + 1));
      set.forEach(k => { const p = k.split(",").map(Number); if (getChunk(p[0], p[1])) buildMesh(p[0], p[1]); });
    }

    function registerEmitter(x: number, y: number, z: number, id: number) {
      const k = x + "," + y + "," + z;
      const b = BLOCK_MAP.get(id);
      if (b && (b.glow || (b as { light?: number }).light)) {
        s.emitters.set(k, {
          x: x + 0.5,
          y: y + 0.5,
          z: z + 0.5,
          col: b.lightCol || 0xffd489,
          dist: b.lightDist || 16,
          power: b.lightPower || 1.2,
          id
        });
        s.lanterns.set(k, [x + 0.5, y + 0.5, z + 0.5]);
        const cx = Math.floor(x / 16), cz = Math.floor(z / 16);
        const c = getChunk(cx, cz);
        if (c) {
          if (!c.emitterKeys) c.emitterKeys = [];
          c.emitterKeys.push(k);
        }
      } else {
        s.emitters.delete(k);
        s.lanterns.delete(k);
      }
    }

    function edit(x: number, y: number, z: number, id: number, broadcast = true) {
      const prevId = getBlock(x, y, z);
      setRaw(x, y, z, id);
      // Removing a liquid source (bucket-absorb-equivalent) dries its orphaned puddle
      if ((prevId === 39 || prevId === 40) && id === 0) dryUpFluids(x, y, z, prevId);
      s.edits.set(x + "," + y + "," + z, id);
      const ecx = Math.floor(x / CH), ecz = Math.floor(z / CH);
      const eck = `${ecx},${ecz}`;
      let ecm = s.editsByChunk.get(eck);
      if (!ecm) { ecm = new Map(); s.editsByChunk.set(eck, ecm); }
      ecm.set(x + "," + y + "," + z, id);
      registerEmitter(x, y, z, id);
      if (isCustomAssetBlock(id)) ensureCustomAssetEntity(x, y, z, id);
      else if (isCustomAssetBlock(prevId)) removeCustomAssetEntity(`${x},${y},${z}`);
      if (id === 39 || id === 40) {
        s.liquidQ.push([x, y, z, id, 0]);
      }
      s.dirtySave = true;
      remesh(x, z);
      const nowMs = performance.now();
      if (s.renderer && s.shadowsOn && nowMs - (s.lastEditShadowAt || 0) > 150) {
        s.lastEditShadowAt = nowMs;
        s.renderer.shadowMap.needsUpdate = true;
      }

      // Simulation mode single-block undo tracking
      if ((isSim() || s.simMode) && !simCapture && prevId !== id) {
        simStamps.push({ cells: [{ k: `${x},${y},${z}`, x, y, z, prev: prevId, next: id }] });
      }

      // Instant save directly to database (immediate persistence even upon crash) — sim sandbox skips prod IO.
      // Failures queue world-tagged edits for the 2.5s/reconnect flush; success marks the sync state.
      const dir = s.blockDirs.get(x + "," + y + "," + z) ?? 0;
      if (!s.simMode) {
        const targetWorldId = s.dimension === "nether" ? `${s.currentWorldId}_nether` : s.currentWorldId;
        saveEditsNow(targetWorldId, [{ x, y, z, blockId: id, dir, prevBlockId: prevId, action: id === 0 ? "mine" : "place" }]);
      }

      if (broadcast && !s.simMode) {
        multiplayer.sendBlockEdit(x, y, z, id, prevId, id === 0 ? "mine" : "place", dir);
      }
    }
    // Shared edit-save path: instant POST; on failure the edits queue world-tagged
    // for the periodic/reconnect flush, and the HUD goes offline. On success the
    // sync state (and HUD "last synced") updates.
    function saveEditsNow(targetWorldId: string, batch: Array<{ x: number; y: number; z: number; blockId: number; dir?: number; prevBlockId?: number; action?: string }>) {
      if (s.simMode || !batch.length) return;
      apiSaveBlockEdits(targetWorldId, batch).then(
        () => { reportSyncOk(); },
        () => { reportSyncFail(); for (const e of batch) s.pendingEdits.push({ worldId: targetWorldId, edit: e }); }
      );
    }
    (s as any).edit = edit;

    // ==========================================
    // 4. SKY, ATMOSPHERE & 3D CUBIC CELESTIAL BODIES
    // ==========================================

    const scene = new THREE.Scene();
    const wandManager = createWandManager(scene);
    scene.fog = new THREE.Fog(0xc3d9e9, Math.max(25, s.render * CH * 0.35), s.render * CH + 12);
    const camera = new THREE.PerspectiveCamera(s.baseFov || 70, window.innerWidth / window.innerHeight, 0.08, 800);
    camera.rotation.order = "YXZ";

    let renderer: THREE.WebGLRenderer;
    const gameCanvas = document.createElement("canvas");
    // Spontaneous "restarts" are WebGL context loss + restore (GPU pressure, tab
    // switch, driver reset). Resume in place — THREE re-uploads GPU resources
    // automatically — instead of a destructive full-page reload.
    let glLost = false;
    let resumeRenderLoop: (() => void) | null = null;
    const beaconGlEvent = (msg: string) => {
      try {
        fetch("/api/debug/client-error", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ts: new Date().toISOString(), tag: String((window as unknown as { __BUILD_TAG?: string }).__BUILD_TAG || "unknown"), href: location.href, msg })
        }).catch(() => undefined);
      } catch { /* beacon must never break the game */ }
    };
    gameCanvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      glLost = true;
      console.warn("[WebGL] Context lost! Pausing render loop (no reload — will resume on restore)...");
      beaconGlEvent("webglcontextlost — render loop paused, awaiting restore");
      showToast("⚠ GPU paused — recovering… (your world is safe)");
      if (s.reqId) {
        cancelAnimationFrame(s.reqId);
        s.reqId = null;
      }
    }, false);
    gameCanvas.addEventListener("webglcontextrestored", () => {
      glLost = false;
      console.log("[WebGL] Context restored — resuming render loop without reload.");
      beaconGlEvent("webglcontextrestored — resumed without reload");
      showToast("✅ GPU recovered — welcome back, no restart needed.");
      try { resumeRenderLoop?.(); } catch { /* the frame watchdog also restarts the loop */ }
    }, false);
    const ctxAttrs = {
      antialias: false,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
      colorSpace: colorGamutRef.current === "srgb" ? "srgb" : "display-p3"
    } as WebGLContextAttributes;
    const glCtx = gameCanvas.getContext("webgl2", ctxAttrs) as WebGL2RenderingContext | null;
    if (glCtx) {
      renderer = new THREE.WebGLRenderer({ canvas: gameCanvas, context: glCtx, antialias: false, preserveDrawingBuffer: false });
    } else {
      try {
        renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: false });
      } catch {
        renderer = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: false });
      }
    }
    renderer.setPixelRatio(1.0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1;
    applyColorGamut(renderer, colorGamutRef.current);

    let coarseInputAtInit = false;
    try { coarseInputAtInit = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 1; } catch {}
    const shadowsEnabled = s.shadowsOn && !coarseInputAtInit; // mobile default: no sun-shadow pass (contact-highlight look)
    renderer.shadowMap.enabled = shadowsEnabled;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.shadowMap.type = shadowConfigFor(shadowTier).type;
    (window as any).__debugShadows = () => ({
      enabled: renderer.shadowMap.enabled,
      type: renderer.shadowMap.type,
      castShadow: s.sun ? s.sun.castShadow : null,
      mapSize: s.sun && s.sun.shadow ? s.sun.shadow.mapSize.x + "x" + s.sun.shadow.mapSize.y : null,
      shadowsOn: s.shadowsOn,
      coarse: coarseInputAtInit
    });

    if (s.postFx) disposePostFx(s.postFx);
    s.postFx = createPostFx(renderer, scene, camera, postFxSettingsRef.current);

    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }
    containerRef.current.appendChild(renderer.domElement);

    const { matMerged, matOpaque, matFoliage, matGrass, matGlow, matTrans } = createBlockMaterials(
      tex,
      specularRef.current,
      specularStrengthRef.current
    );

    const { amb, hemi, sun, lights } = createSceneLights(scene, s.shadowsOn, shadowTier);

    const sky = createSkyDome(scene);

    const { sunBox, moonBox, moonHalo, stars, clouds } = initCelestialSky(scene, vnoise);

    // ==========================================
    // FIRST-PERSON PLAYER ARM & HELD 3D ITEM SYSTEM (HUD_example.png #7)
    // ==========================================
    const { armGroup: firstPersonArm, sleeveMesh, handMesh, heldItemGroup } = createPlayerArm(false);
    const { armGroup: leftArm, sleeveMesh: leftSleeveMesh, handMesh: leftHandMesh, heldItemGroup: leftHeldItemGroup } = createPlayerArm(true);

    function updateHeldItem(blockId: number) {
      // Rebuild when the item changes OR the mug-rider visual would be stale.
      const wantRider = blockId === MUG_ID && !!s.carriedSpider;
      if (s.currentHeldId === blockId && !!s.heldSpiderMesh === wantRider) return;
      if (s.heldSpiderMesh) {
        heldItemGroup.remove(s.heldSpiderMesh.mesh.root);
        disposeEntityRoot(s.heldSpiderMesh.mesh.root);
        s.heldSpiderMesh = null;
      }
      s.currentHeldId = blockId;
      updateArmHeldItem(heldItemGroup, sleeveMesh, handMesh, blockId, tex, isoThumbsRef.current, false);
      // Mug carrying a spider: perch a live wiggling spider on the mug.
      if (wantRider) {
        const mesh = createWebSpiderMesh();
        mesh.root.scale.setScalar(0.5);
        mesh.root.position.set(0.04, 0.13, -0.06);
        mesh.root.rotation.y = -0.5;
        heldItemGroup.add(mesh.root);
        s.heldSpiderMesh = { mesh, t: Math.random() * 10 };
      }
      flattenViewmodel(heldItemGroup);
    }

    function updateOffhandItem(blockId: number | null) {
      s.offhandItem = blockId;
      if (!blockId || blockId <= 0 || !tex) {
        leftArm.visible = false;
        return;
      }
      leftArm.visible = !s.simMode;
      updateArmHeldItem(leftHeldItemGroup, leftSleeveMesh, leftHandMesh, blockId, tex, isoThumbsRef.current, true);
      flattenViewmodel(leftHeldItemGroup);
    }

    function flattenViewmodel(root: THREE.Object3D) {
      root.traverse((o) => {
        o.layers.set(1);
        const mesh = o as THREE.Mesh;
        if (!mesh || !(mesh as unknown as { isMesh?: boolean }).isMesh) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          if (m && (m as THREE.Material).toneMapped !== false) {
            (m as THREE.Material).toneMapped = false;
            m.needsUpdate = true;
          }
        }
      });
    }

    const heldTorchLight = new THREE.PointLight(0xffaa44, 0, 10.0, 1.2);
    scene.add(heldTorchLight);

    // Viewmodel rig: first-person arms/items live on layer 1 with their own
    // constant key light, rendered in a dedicated NoToneMapping pass after
    // postfx — world lights and scene exposure can never touch them again.
    firstPersonArm.traverse((o) => o.layers.set(1));
    leftArm.traverse((o) => o.layers.set(1));
    const rigKey = new THREE.PointLight(0xfff1dd, 0.35, 3.5, 1);
    rigKey.layers.set(1);
    rigKey.position.set(0.1, 0.15, 0.1);
    camera.add(rigKey);

    // Distance glow halos: additive sprites on the nearest emitters out to the
    // full render distance (no 40-block cutoff like the point-light pool), so
    // torches/lanterns/fires read as glowing from afar. Cheap: N draws, no lights.
    {
      const glowCv = document.createElement("canvas");
      glowCv.width = glowCv.height = 64;
      const g2 = glowCv.getContext("2d")!;
      const grad = g2.createRadialGradient(32, 32, 2, 32, 32, 32);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.35, "rgba(255,255,255,0.45)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      g2.fillStyle = grad;
      g2.fillRect(0, 0, 64, 64);
      const glowTex = new THREE.CanvasTexture(glowCv);
      for (let i = 0; i < 32; i++) {
        const sm = new THREE.SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending });
        const sp = new THREE.Sprite(sm);
        sp.visible = false;
        sp.renderOrder = 2;
        scene.add(sp);
        s.glowSprites.push(sp);
      }
    }

    camera.add(firstPersonArm);
    camera.add(leftArm);
    scene.add(camera);

    s.scene = scene; s.camera = camera; s.renderer = renderer;
    if (!s.paintingGroup) {
      s.paintingGroup = new THREE.Group();
      s.paintingGroup.frustumCulled = false;
      scene.add(s.paintingGroup);
    }
    for (const spot of s.paintingData.values()) spawnPaintingEntity(spot);
    s.firstPersonArm = firstPersonArm;
    s.heldItemGroup = heldItemGroup;
    s.leftArm = leftArm;
    s.leftHeldItemGroup = leftHeldItemGroup;
    s.updateOffhandItem = updateOffhandItem;
    s.heldTorchLight = heldTorchLight;
    if (s.offhandItem) updateOffhandItem(s.offhandItem);
    if (s.simMode) {
      firstPersonArm.visible = false;
      heldItemGroup.visible = false;
      leftArm.visible = false;
      leftHeldItemGroup.visible = false;
    }
    s.matOpaque = matOpaque; s.matFoliage = matFoliage; s.matGrass = matGrass; s.matTrans = matTrans; s.matGlow = matGlow; s.matMerged = matMerged;
    s.sun = sun; s.hemi = hemi; s.amb = amb; s.sky = sky; s.clouds = clouds;
    s.sunBox = sunBox; s.moonBox = moonBox; s.moonHalo = moonHalo; s.stars = stars; s.lights = lights;
    // Clouds enabled seamlessly in all modes

    // ==========================================
    // 5. PLAYER MOVEMENT & COLLISION PHYSICS
    // ==========================================
    // (Physics constants PR/PH/EYE/WALK/SPRINT/FLY/GRAV/JUMP live in src/game/world.ts
    //  and src/game/physics/playerPhysics.ts — stepPlayerPhysics)

    function locateSpawn() {
      const v = villageAt(0, 0);
      if (v) {
        const p = villagePlan(v);
        if (p.home && p.home.doorX !== undefined) {
          s.player.x = p.home.doorX + 0.5;
          s.player.z = p.home.doorZ + 0.5;
          return;
        } else if (p.wells && p.wells[0]) {
          s.player.x = p.wells[0][0] + 0.5;
          s.player.z = p.wells[0][1] + 4.5;
          return;
        }
      }

      // If no village at (0, 0) or submerged in ocean, search for closest scenic dry land
      let foundX = 0, foundZ = 0;
      let minWaterDist = -1;

      for (let radius = 0; radius <= 160; radius += 8) {
        for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
          const testX = Math.round(Math.cos(angle) * radius);
          const testZ = Math.round(Math.sin(angle) * radius);
          const surf = surfaceAt(testX, testZ);
          if (surf.h >= SEA + 2 && surf.h <= SNOWLINE - 8 && surf.slope < 2.0) {
            foundX = testX;
            foundZ = testZ;
            minWaterDist = radius;
            break;
          }
        }
        if (minWaterDist >= 0) break;
      }

      s.player.x = foundX + 0.5;
      s.player.z = foundZ + 0.5;
    }

    function respawn() {
      if (s.dimension === "nether" && (s as any).netherSpawnPoint) {
        const pt = (s as any).netherSpawnPoint;
        const key = pt.anchorKey;
        const charges = (s as any).anchorCharges?.get(key) || 0;
        if (charges > 0) {
          (s as any).anchorCharges.set(key, charges - 1);
          s.player.x = pt.x + 0.5;
          s.player.y = pt.y + 0.05;
          s.player.z = pt.z + 0.5;
          s.player.vx = s.player.vy = s.player.vz = 0;
          s.hunger = 20; s.saturation = 5; s.exhaustion = 0;
          setHungerBar(20);
          showToast(`✨ Respawned at Anchor! (${charges - 1} charges left)`);
          return;
        } else {
          showToast("⚠️ Respawn Anchor depleted. Returning to world spawn.");
          (s as any).netherSpawnPoint = null;
        }
      }
      locateSpawn();
      const home = (!s.dimension || s.dimension === "overworld") ? getHomePortal(s.currentWorldId) : null;
      if (home) {
        s.player.x = home.x + 0.5;
        s.player.z = home.z + 0.5;
      }
      genChunk(Math.floor(s.player.x) >> 4, Math.floor(s.player.z) >> 4);
      let y = CHH - 2;
      while (y > 4 && !isSolid(getBlock(Math.floor(s.player.x), y, Math.floor(s.player.z)))) y--;
      s.player.y = y + 1.05;
      s.player.vx = s.player.vy = s.player.vz = 0;
      s.hunger = 20; s.saturation = 5; s.exhaustion = 0;
      setHungerBar(20);
    }
    s.respawnFn = respawn;

    // /spawn chat command: teleport to world spawn WITHOUT resetting hunger/health.
    function teleportSpawn() {
      locateSpawn();
      genChunk(Math.floor(s.player.x) >> 4, Math.floor(s.player.z) >> 4);
      let y = CHH - 2;
      while (y > 4 && !isSolid(getBlock(Math.floor(s.player.x), y, Math.floor(s.player.z)))) y--;
      s.player.y = y + 1.05;
      s.player.vx = s.player.vy = s.player.vz = 0;
    }
    s.teleportSpawnFn = teleportSpawn;

    // Diagnostic hook (ALL builds, harmless read-only): lets probes inspect the
    // live animal/mob state on prod — why are animals stuck?
    (window as unknown as Record<string, unknown>).__worldDbg = {
      mobMgr,
      getS: () => stateRef.current
    };

    // Teleport to an arbitrary world position (pet list "go to pet" button).
    function teleportTo(x: number, z: number) {
      s.player.x = x;
      s.player.z = z;
      let y = CHH - 2;
      while (y > 4 && !isSolid(getBlock(Math.floor(x), y, Math.floor(z)))) y--;
      s.player.y = y + 1.05;
      s.player.vx = s.player.vy = s.player.vz = 0;
    }
    s.teleportToFn = teleportTo;

    // Summon a pet to the player: relocate the live entity next to the player.
    // Spiders can't be summoned — the player travels to them instead.
    function summonPetTo(pet: { id: string; type?: string }) {
      if (pet.type === "spider") {
        showToast("🕷 Spiders can't be summoned — travel to them instead");
        return;
      }
      const a = mobMgr.animals.find((x: any) => x.id === pet.id);
      if (!a) { showToast("🐾 Pet not found nearby"); return; }
      const fx = -Math.sin(s.player.yaw), fz = -Math.cos(s.player.yaw);
      const nx = Math.floor(s.player.x + fx * 2.5) + 0.5;
      const nz = Math.floor(s.player.z + fz * 2.5) + 0.5;
      let ny = CHH - 2;
      while (ny > 4 && !isSolid(getBlock(Math.floor(nx), ny, Math.floor(nz)))) ny--;
      a.x = nx; a.y = ny + 1; a.z = nz;
      a.vx = a.vy = a.vz = 0;
      a.root.position.set(nx, ny + 1, nz);
      showToast(`🐾 Summoned ${a.name || a.type} to you`);
      setPetsOpen(false);
    }
    s.summonPetTo = summonPetTo;

    // Animal snapshot for persistence (pets + wildlife) — saved with player state.
    s.getAnimalsFn = () => mobMgr.animals.map((a) => ({
      id: a.id, type: a.type, name: a.name || null, sex: a.sex, ownerId: a.ownerId || null, collarColor: a.collarColor || null,
      x: Math.round(a.x * 100) / 100, y: Math.round(a.y * 100) / 100, z: Math.round(a.z * 100) / 100, yaw: Math.round(a.yaw * 100) / 100
    }));

    // Boat snapshot for persistence — saved with player state (dimension-aware, never empty).
    s.getBoatsFn = () => mobMgr.boats.map((b) => ({
      id: b.id, itemId: b.itemId || 1041,
      x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, z: Math.round(b.z * 100) / 100, yaw: Math.round(b.yaw * 100) / 100
    }));

    // Aim test: nearest animal within `maxDist` roughly in front of the crosshair.
    function aimAnimal(maxDist = 4): AnimalEntity | null {
      const fx = -Math.sin(s.player.yaw) * Math.cos(s.player.pitch);
      const fy = Math.sin(s.player.pitch);
      const fz = -Math.cos(s.player.yaw) * Math.cos(s.player.pitch);
      let best: AnimalEntity | null = null;
      let bestScore = Infinity;
      for (const a of mobMgr.animals) {
        const dx = a.x - s.player.x;
        const dy = (a.y + 0.8) - (s.player.y + EYE);
        const dz = a.z - s.player.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist > maxDist || dist < 0.6) continue;
        const dot = (dx * fx + dy * fy + dz * fz) / dist;
        if (dot < 0.55) continue;
        const score = dist * (2 - dot);
        if (score < bestScore) { bestScore = score; best = a; }
      }
      return best;
    }

    // Boat helpers: cone-aim over mobMgr.boats, water placement, enter/break.
    function aimBoat(maxDist = 4): any | null {
      const fx = -Math.sin(s.player.yaw) * Math.cos(s.player.pitch);
      const fy = Math.sin(s.player.pitch);
      const fz = -Math.cos(s.player.yaw) * Math.cos(s.player.pitch);
      let best: any = null;
      let bestScore = Infinity;
      for (const b of mobMgr.boats) {
        const dx = b.x - s.player.x;
        const dy = (b.y + 0.4) - (s.player.y + EYE);
        const dz = b.z - s.player.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist > maxDist || dist < 0.6) continue;
        const dot = (dx * fx + dy * fy + dz * fz) / dist;
        if (dot < 0.55) continue;
        const score = dist * (2 - dot);
        if (score < bestScore) { bestScore = score; best = b; }
      }
      return best;
    }

    function tryBoatPlace(heldId: number): boolean {
      if (!isBoatItem(heldId, (id) => BLOCK_MAP.get(id))) return false;
      const hit = raycastLiquid(s.player.fly ? 7 : 5);
      if (hit && hit.id === 39) {
        const boat = mobMgr.spawnBoat(hit.x + 0.5, hit.y + 0.8, hit.z + 0.5, heldId, { yaw: s.player.yaw + Math.PI });
        if (boat) {
          if (!s.creative && (s.hotbarCounts[s.slot] || 0) > 0) {
            s.hotbarCounts[s.slot] = Math.max(0, s.hotbarCounts[s.slot] - 1);
            if (s.hotbarCounts[s.slot] === 0) s.hotbar[s.slot] = 0;
            setHotbar([...s.hotbar]);
            setHotbarCounts([...s.hotbarCounts]);
          }
          showToast("🛶 Boat launched!");
          return true;
        }
      }
      showToast("Aim at water to launch the boat 🌊");
      return true;
    }

    function tryBoatEnter(): boolean {
      if (s.riddenBoat || s.riddenAnimal || s.activeVehicle) return false;
      const boat = aimBoat(3.5);
      if (!boat) return false;
      boat.isRidden = true;
      s.riddenBoat = boat;
      s.player.fly = false;
      s.player.vy = 0;
      showToast("🛶 Rowing — WASD to paddle, Shift to disembark");
      return true;
    }

    function tryBreakBoat(): boolean {
      if (s.riddenBoat) return false;
      const boat = aimBoat(4.5);
      if (!boat) return false;
      mobMgr.removeBoat(boat);
      if (s.itemDrops) s.itemDrops.spawnDrop(boat.x, boat.y + 0.5, boat.z, boat.itemId || 1041, 1);
      return true;
    }

    // Melee combat: crosshair-aimed hostile within 3.2 m takes held-weapon
    // damage (vanilla tiers + cooldowns), knockback, loot + XP orbs on kill.
    function tryMeleeAttack(): boolean {
      if (s.dead) return false;
      const fx = -Math.sin(s.player.yaw) * Math.cos(s.player.pitch);
      const fy = Math.sin(s.player.pitch);
      const fz = -Math.cos(s.player.yaw) * Math.cos(s.player.pitch);
      let best: any = null;
      let bestScore = Infinity;
      for (const m of mobMgr.mobs) {
        const dx = m.x - s.player.x;
        const dy = (m.y + 1.0) - (s.player.y + EYE);
        const dz = m.z - s.player.z;
        const dist = Math.hypot(dx, dy, dz);
        if (dist > 3.2 || dist < 0.5) continue;
        const dot = (dx * fx + dy * fy + dz * fz) / dist;
        if (dot < 0.55) continue;
        const score = dist * (2 - dot);
        if (score < bestScore) { bestScore = score; best = m; }
      }
      if (!best) return false;
      const heldId = s.hotbar[s.slot] || 0;
      const info = getWeaponInfo(BLOCK_MAP.get(heldId));
      const now = performance.now();
      s.swingTimer = 1.0;
      playSwing();
      if (now - (s.lastMeleeAt || 0) < meleeCooldownMs(info)) return true;
      s.lastMeleeAt = now;
      const dmg = meleeDamage(heldId, (id) => BLOCK_MAP.get(id), s.creative);
      const dx = best.x - s.player.x, dz = best.z - s.player.z;
      const dl = Math.hypot(dx, dz) || 1;
      best.vx = (best.vx || 0) + (dx / dl) * 5;
      best.vz = (best.vz || 0) + (dz / dl) * 5;
      const mobType = best.type;
      mobMgr.damageMob(best.id, dmg, (x, y, z) => {
        if (s.xp) s.xp.add(5, new THREE.Vector3(x, y + 0.5, z));
        if (s.itemDrops) {
          for (const d of rollMobDrops(mobType)) s.itemDrops.spawnDrop(x, y + 0.5, z, d.id, d.count);
        }
      });
      return true;
    }

    // Pet interaction routing (right-click OR E key):
    // sign item → open the naming prompt; free hand → mount own rideable pet.
    function tryAnimalInteraction(heldId: number): boolean {
      // ANY wood sign works for naming pets: name contains "sign", is not a
      // hanging sign, and is an item (not a placeable block).
      const signDef = heldId ? BLOCK_MAP.get(heldId) : null;
      const isSignItem = (
        !!signDef &&
        /sign/i.test(signDef.name || "") &&
        !/hanging/i.test(signDef.name || "") &&
        (!!signDef.itemTexture || signDef.category === "item")
      );
      const aimed = aimAnimal(isSignItem ? 4.5 : 3.5);
      if (!aimed) {
        // Sign + web spider (on a web or grounded): claim/name it as a pet.
        if (!isSignItem) return false;
        const hit = raycast(4.5);
        let spider = hit && isCobwebId(hit.id) ? webSpiderMgr.spiderAt(hit.x, hit.y, hit.z) : null;
        if (!spider) {
          const fx = -Math.sin(s.player.yaw) * Math.cos(s.player.pitch);
          const fy = Math.sin(s.player.pitch);
          const fz = -Math.cos(s.player.yaw) * Math.cos(s.player.pitch);
          spider = webSpiderMgr.aimSpider(s.player.x, s.player.y + EYE, s.player.z, fx, fy, fz, 4.5);
        }
        if (!spider) return false;
        document.exitPointerLock?.();
        s.active = false;
        s.steering = false;
        s.keys = {};
        setActive(false);
        setNamingAnimal(spider as any);
        setNamingInput(spider.name || "");
        setCollarColor(null);
        return true;
      }
      if (isSignItem) {
        document.exitPointerLock?.();
        s.active = false;
        s.steering = false;
        s.keys = {};
        setActive(false);
        setNamingAnimal(aimed);
        setNamingInput(aimed.name || "");
        setCollarColor((aimed as any).collarColor || null);
        return true;
      }
      if (!heldId && aimed.ownerId === s.currentUserId &&
          (aimed.type === "cow" || aimed.type === "sheep" || aimed.type === "pig" || aimed.type === "horse")) {
        aimed.ridden = true;
        s.riddenAnimal = aimed;
        // remember held Shift so sprinting up to the mount doesn't insta-dismount
        s.rideShiftHeld = !!s.keys["ShiftLeft"];
        s.lastDismountAt = performance.now();
        // riding must never run inside the auto-pause/idle world freeze:
        s.pauseOpen = false;
        setPauseOpen(false);
        s.uiPaused = false;
        s.active = true;
        s.steering = true;
        setActive(true);
        showToast(`🐎 Riding ${aimed.name || aimed.type} — Shift to dismount`);
        return true;
      }
      if (!heldId && aimed && aimed.ownerId !== s.currentUserId) {
        showToast("❌ Not your animal — hold a Sign and right-click to claim it as a pet");
        return true;
      }
      return false;
    }

    function look(mx: number, my: number) {
      if (s.cinematic && s.cine) {
        s.cine.yaw -= mx * 0.0026;
        s.cine.pitch = Math.max(-1.55, Math.min(1.55, s.cine.pitch - my * 0.0026));
        return;
      }
      if (s.activeVehicle) {
        s.vehicleLookYaw = (s.vehicleLookYaw || 0) - mx * 0.0026;
        s.vehicleLookPitch = Math.max(-1.2, Math.min(1.2, (s.vehicleLookPitch || 0) - my * 0.0026));
        return;
      }
      s.player.yaw -= mx * 0.0026;
      s.player.pitch = Math.max(-1.55, Math.min(1.55, s.player.pitch - my * 0.0026));
    }

    function raycast(max: number) {
      if (!s.camera) return null;
      _rayDir.set(0, 0, -1).applyEuler(s.camera.rotation);
      const dir = _rayDir;
      const p = s.camera.position;
      let x = Math.floor(p.x), y = Math.floor(p.y), z = Math.floor(p.z);
      const sx = Math.sign(dir.x), sy = Math.sign(dir.y), sz = Math.sign(dir.z);
      const dX = sx ? Math.abs(1 / dir.x) : Infinity;
      const dY = sy ? Math.abs(1 / dir.y) : Infinity;
      const dZ = sz ? Math.abs(1 / dir.z) : Infinity;
      let tX = sx ? (sx > 0 ? (x + 1 - p.x) : (p.x - x)) * dX : Infinity;
      let tY = sy ? (sy > 0 ? (y + 1 - p.y) : (p.y - y)) * dY : Infinity;
      let tZ = sz ? (sz > 0 ? (z + 1 - p.z) : (p.z - z)) * dZ : Infinity;
      let nx = 0, ny = 0, nz = 0, t = 0;
      while (t <= max) {
        const id = getBlock(x, y, z);
        if (id && id !== 39 && id !== 40) return { x, y, z, nx, ny, nz, id }; // Hit solid
        if (tX < tY && tX < tZ) { x += sx; t = tX; tX += dX; nx = -sx; ny = 0; nz = 0; }
        else if (tY < tZ) { y += sy; t = tY; tY += dY; nx = 0; ny = -sy; nz = 0; }
        else { z += sz; t = tZ; tZ += dZ; nx = 0; ny = 0; nz = -sz; }
      }
      return null;
    }

    function raycastLiquid(max: number) {
      // Same DDA as raycast, but fluids are targetable (bucket absorb)
      if (!s.camera) return null;
      const dirTmp = _rayDir.set(0, 0, -1).applyEuler(s.camera.rotation);
      const dir = dirTmp;
      const p = s.camera.position;
      let x = Math.floor(p.x), y = Math.floor(p.y), z = Math.floor(p.z);
      const sx = Math.sign(dir.x), sy = Math.sign(dir.y), sz = Math.sign(dir.z);
      const dX = sx ? Math.abs(1 / dir.x) : Infinity;
      const dY = sy ? Math.abs(1 / dir.y) : Infinity;
      const dZ = sz ? Math.abs(1 / dir.z) : Infinity;
      let tX = sx ? (sx > 0 ? (x + 1 - p.x) : (p.x - x)) * dX : Infinity;
      let tY = sy ? (sy > 0 ? (y + 1 - p.y) : (p.y - y)) * dY : Infinity;
      let tZ = sz ? (sz > 0 ? (z + 1 - p.z) : (p.z - z)) * dZ : Infinity;
      let nx = 0, ny = 0, nz = 0, t = 0;
      while (t <= max) {
        const id = getBlock(x, y, z);
        if (id === 39 || id === 40) return { x, y, z, nx, ny, nz, id }; // Fluids first
        if (id && id !== 39 && id !== 40) return null; // solid blocks the fluid behind it
        if (tX < tY && tX < tZ) { x += sx; t = tX; tX += dX; nx = -sx; ny = 0; nz = 0; }
        else if (tY < tZ) { y += sy; t = tY; tY += dY; nx = 0; ny = -sy; nz = 0; }
        else { z += sz; t = tZ; tZ += dZ; nx = 0; ny = 0; nz = -sz; }
      }
      return null;
    }

    // ── Minecraft-style liquid dynamics (wiki rules) ──
    //  - placed sources (level 0) spread up to WATER_MAX blocks, slowing near the end
    // ==========================================
    // FLUID DYNAMICS (Water & Lava Simulator)
    // ==========================================
    const { dryUpFluids: dryUpFluidsImpl, stepLiquids: stepLiquidsImpl } = createFluidSimulator();

    const dryUpFluids = (sx: number, sy: number, sz: number, id: number) => {
      dryUpFluidsImpl(s, sx, sy, sz, id, { buildMesh });
    };

    const stepLiquids = () => {
      stepLiquidsImpl(s, { buildMesh, showToast, villagesNear, villagePlan });
    };

    // Structure-occupancy check for animal spawns: false inside generated house
    // rects or within a column of man-made blocks (roofs/walls/doors).
    const STRUCTURE_IDS = new Set([6, 8, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 37, 41, 42, 44, 59, 105, 106, 107, 108, 109, 110, 111, 112]);
    function spawnSafeAt(x: number, y: number, z: number): boolean {
      for (const v of villagesNear(x, z)) {
        const plan = villagePlan(v);
        for (const h of plan.houses) {
          if (x >= h.x0 && x <= h.x1 && z >= h.z0 && z <= h.z1 && y >= h.base - 1 && y <= h.base + (h.style?.h || 4) + 2) {
            return false;
          }
        }
      }
      const xi = Math.floor(x), zi = Math.floor(z);
      for (let dy = -1; dy <= 6; dy++) {
        const bid = getBlock(xi, Math.floor(y) + dy, zi);
        if (bid !== 0 && STRUCTURE_IDS.has(bid)) return false;
      }
      return true;
    }

    // Villager trade line-of-sight: voxel DDA (opaque solids block) + mob body blocking + range
    function villagerTradeLos(v: any): boolean {
      return villagerInTradeRange(v, s.player, EYE, getBlock, mobMgr.mobs, mobMgr.animals, s.villagers);
    }

    // Full trade gate: in range + line-of-sight + crosshair actually on the villager.
    // This is the ONLY path that may open the trade modal.
    function canTradeWith(v: any): boolean {
      if (!v || !villagerTradeLos(v)) return false;
      if (!s.camera) return false;
      const bh = raycast(TRADE_AIM_DIST + 0.2);
      const bd = bh
        ? Math.hypot(bh.x + 0.5 - s.camera.position.x, bh.y + 0.5 - s.camera.position.y, bh.z + 0.5 - s.camera.position.z)
        : null;
      return isVillagerAimed(s.camera, bd, v, TRADE_AIM_DIST);
    }

    // Hold-time seconds for survival mining: tool-based (wiki hardness × correct-tool speed)
    function mineHoldTime(id: number, heldId: number) {
      return getMineTime(id, heldId);
    }


    // ==========================================
    // 3.0 FALLING BLOCKS (Sand & Gravel Gravity & Torch Drops)
    // ==========================================
    function spawnFallingBlock(x: number, y: number, z: number, blockId: number) {
      if (!s.scene || !s.matOpaque) return;
      if (s.fallingBlocks.some(fb => fb.x === x && fb.z === z && Math.abs(fb.y - y) < 0.85)) return;

      edit(x, y, z, 0, false);
      const def = BLOCK_MAP.get(blockId);
      const geom = createVoxelGeometry(def?.side ?? 1, def?.top ?? def?.side ?? 1, def?.bottom ?? def?.side ?? 1);
      const mesh = new THREE.Mesh(geom, s.matOpaque);
      mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      s.scene.add(mesh);

      s.fallingBlocks.push({
        x, z, y, vy: -1.0, blockId, mesh
      });
    }

    function checkFallingBlocks(x: number, startY: number, z: number) {
      let curY = startY;
      while (curY < CHH) {
        const id = getBlock(x, curY, z);
        if (id !== 10 && id !== 12) break; // Only Sand (10) & Gravel (12) are affected by gravity

        const belowId = getBlock(x, curY - 1, z);
        if (belowId === 0 || belowId === 39 || belowId === 40) {
          spawnFallingBlock(x, curY, z, id);
        }
        curY++;
      }
    }

    // ==========================================
    // 3.1 SURVIVAL DAMAGE SYSTEM (Health, Armor Reduction & Death)
    // ==========================================
    const damagePlayer = (rawAmount: number) => {
      const wasDead = s.dead;
      applyPlayerDamage(s, rawAmount, {
        playHurt, playDeath, setHealth, setDead, setHurtTick
      });
      if (!wasDead && s.dead) {
        if (s.riddenAnimal) { s.riddenAnimal.ridden = false; s.riddenAnimal = null; }
        if (s.riddenBoat) { s.riddenBoat.isRidden = false; s.riddenBoat = null; }
        s.activeVehicle = null;
        if (!s.creative) dropAllInventory();
      }
    };

    // Survival death: scatter the full inventory at the death spot (kept in creative).
    function dropAllInventory() {
      if (!s.itemDrops) return;
      const drop = (id: number, count: number) => {
        if (id > 0 && count > 0) {
          s.itemDrops!.spawnDrop(
            s.player.x + (Math.random() - 0.5) * 1.5,
            s.player.y + 1,
            s.player.z + (Math.random() - 0.5) * 1.5,
            id, count
          );
        }
      };
      s.invMain.forEach((sl) => { if (sl) drop(sl.id, sl.count); });
      s.hotbar.forEach((id, i) => drop(id, s.hotbarCounts[i] || 0));
      s.invMain = s.invMain.map(() => null);
      s.hotbar = s.hotbar.map(() => 0);
      s.hotbarCounts = s.hotbarCounts.map(() => 0);
      setInvMain([...s.invMain]);
      setHotbar([...s.hotbar]);
      setHotbarCounts([...s.hotbarCounts]);
      showToast("☠️ You died — your items scattered where you fell!");
    }

    // ==========================================
    // 3.2 TNT EXPLOSIVES (Fuse, Chain Reaction & Sphere Destruction)
    // ==========================================
    function primeTnt(x: number, y: number, z: number, fuse = 1.8) {
      primeTntHelper(s, x, y, z, fuse, { edit, playIgnite, showToast });
    }

    function explode(cx: number, cy: number, cz: number) {
      explodeHelper(s, cx, cy, cz, {
        primeTnt,
        dryUpFluids,
        buildMesh,
        damagePlayer,
        playExplode,
          onBatchEdit: (batch) => {
          if (batch.length) {
            s.dirtySave = true;
            const targetWorldId = s.dimension === "nether" ? `${s.currentWorldId}_nether` : s.currentWorldId;
            saveEditsNow(targetWorldId, batch);
            multiplayer.sendBlockEditBatch(batch);
          }
        }
      });
    }

    function processTnt(now: number, dt: number) {
      processTntHelper(s, now, dt, { explode });
      if (s.shakeT > 0) s.shakeT = Math.max(0, s.shakeT - dt);
    }

    // ==========================================
    // 3.3 FURNACE BURN LOOP (Lit block 96 ↔ unlit 42, emitter-driven light)
    // ==========================================
    function setFurnaceLit(lit: boolean) {
      const f = s.furnace;
      if (!f || s.furnaceLit === lit) return;
      s.furnaceLit = lit;
      setRaw(f.x, f.y, f.z, lit ? 96 : 42);
      registerEmitter(f.x, f.y, f.z, lit ? 96 : 42); // id 96 has glow → dynamic point light appears
      remesh(f.x, f.z);
      playFurnace(lit);
    }

    function tickFurnace(dt: number) {
      if (!s.furnaceOpen) return;
      const f = s.furnace;
      const cur = getBlock(f.x, f.y, f.z);
      if (cur !== 42 && cur !== 96) { setFurnaceOpen(false); syncFurnaceUI(); return; } // furnace broken/moved

      const inSlot = s.furnaceSlots.input;
      const outSlot = s.furnaceSlots.output;
      const outId = inSlot ? smeltOutput(inSlot.id) : null;
      if (outId === null) { setFurnaceLit(false); return; } // nothing smeltable

      // Ignite / refuel: consume one fuel item when the bank runs dry
      if (s.furnaceFuelLeft <= 0) {
        const fuelSlot = s.furnaceSlots.fuel;
        if (fuelSlot && fuelSlot.count > 0) {
          s.furnaceFuelLeft += fuelItems(fuelSlot.id);
          s.furnaceSlots.fuel = fuelSlot.count > 1 ? { id: fuelSlot.id, count: fuelSlot.count - 1 } : null;
        } else {
          setFurnaceLit(false);
          return;
        }
      }

      // Output full → pause burn
      if (outSlot && outSlot.id === outId && outSlot.count >= 64) { setFurnaceLit(true); return; }

      setFurnaceLit(true);
      s.furnaceProg += dt / SMELT_TIME;
      if (s.furnaceProg >= 1) {
        s.furnaceProg = 0;
        s.furnaceFuelLeft = Math.max(0, s.furnaceFuelLeft - 1);
        if (inSlot!.count > 1) s.furnaceSlots.input = { id: inSlot!.id, count: inSlot!.count - 1 };
        else s.furnaceSlots.input = null;
        const stacked = outSlot && outSlot.id === outId ? outSlot.count + 1 : 1;
        s.furnaceSlots.output = { id: outId, count: Math.min(64, stacked) };
        if (s.xp) s.xp.add(Math.abs(smeltOutput(outSlot?.id ?? 0) ? 0.35 : 0.35));
      }
      syncFurnaceUI();
    }

    function spawnChestEntity(x: number, y: number, z: number, facing?: number) {
      if (!s.chestEntities) s.chestEntities = new Map();

      // Reconcile the whole contiguous chest run along X so a break/place of one
      // chest correctly re-pairs neighbours (two singles → one double; a chest
      // beside a double stays single; add another → two doubles; and so on).
      let x0 = x;
      while (getBlock(x0 - 1, y, z) === 43) x0--;
      let x1 = x;
      while (getBlock(x1 + 1, y, z) === 43) x1++;
      for (let xx = x0; xx <= x1; xx++) {
        const k = `${xx},${y},${z}`;
        const old = s.chestEntities.get(k);
        if (old && old.root) { if (s.scene) s.scene.remove(old.root); s.chestEntities.delete(k); }
      }

      let entity: ChestEntity | null = null;
      const yawFor = (dirVal: number | undefined | null): number => {
        if (dirVal == null) return 0;
        const facings = [0, Math.PI, Math.PI / 2, -Math.PI / 2];
        return facings[dirVal % 4] ?? 0;
      };

      for (let xx = x0; xx <= x1; ) {
        const pair = computeChestPair(getBlock, xx, y, z);
        if (pair.isLarge) {
          const kL = `${pair.leftX},${y},${z}`;
          const kR = `${pair.rightX},${y},${z}`;
          const dirVal = s.blockDirs.get(kL) ?? s.blockDirs.get(kR);
          const targetYaw = yawFor(dirVal);
          const large = createArticulatedChest({ yaw: targetYaw, isLarge: true });
          large.x = pair.leftX; large.y = y; large.z = z;
          large.root.position.set(pair.leftX + 1.0, y, z + 0.5);
          if (s.scene) s.scene.add(large.root);
          s.chestEntities.set(kL, large);
          s.chestEntities.set(kR, large);
          if (xx === x) entity = large;
          xx = pair.rightX + 1;
        } else {
          let targetYaw = 0;
          if (xx === x && facing !== undefined && facing !== null) {
            const facings = [0, Math.PI, Math.PI / 2, -Math.PI / 2];
            targetYaw = facings[facing % 4] ?? 0;
          } else {
            const dirVal = s.blockDirs.get(`${xx},${y},${z}`);
            targetYaw = dirVal != null ? yawFor(dirVal) : 0;
            if (dirVal == null) {
              const dx = s.player.x - (xx + 0.5);
              const dz = s.player.z - (z + 0.5);
              if (Math.abs(dx) > Math.abs(dz)) targetYaw = dx > 0 ? Math.PI / 2 : -Math.PI / 2;
              else targetYaw = dz > 0 ? 0 : Math.PI;
            }
          }
          const single = createArticulatedChest({ yaw: targetYaw });
          single.x = xx; single.y = y; single.z = z;
          single.root.position.set(xx + 0.5, y, z + 0.5);
          if (s.scene) s.scene.add(single.root);
          s.chestEntities.set(`${xx},${y},${z}`, single);
          if (xx === x) entity = single;
          xx++;
        }
      }
      return entity || s.chestEntities.get(`${x},${y},${z}`)!;
    }

    const playerInteraction = createPlayerInteraction({
      s,
      raycast,
      raycastLiquid,
      edit,
      setRaw,
      remesh,
      getBlock,
      getChunk,
      primeTnt,
      checkFallingBlocks,
      dryUpFluids,
      openCraftTable,
      openFurnace,
      openChest,
      showToast,
      setHotbar,
      deductHotbarSlot,
      playDoorUse,
      playDig,
      playSplash,
      playPlace,
      mobs: mobMgr.mobs,
      currentWorldId: s.currentWorldId,
      apiSaveBlockEdits,
      spawnChestEntity,
      tryPlacePainting,
      spawnWebSpider: (x: number, y: number, z: number) => webSpiderMgr.spawn(x, y, z, s.dayCount || 0),
      catchWebSpider: (x: number, y: number, z: number) => webSpiderMgr.take(x, y, z),
      releaseWebSpider: (x: number, y: number, z: number) => {
        const c = s.carriedSpider;
        if (!c) return false;
        return webSpiderMgr.release(x, y, z, c);
      },
      webSpiderAt: (x: number, y: number, z: number) => !!webSpiderMgr.spiderAt(x, y, z),
      refreshHeldItem: () => {
        s.currentHeldId = -1;
        updateHeldItem(s.hotbar[s.slot] || 0);
      },
      openPortalModal,
      setHotbarCounts,
      setHotbarDamage,
      inventoryAddItem: (id: number, count: number) => inventoryAddItem(id, count),
      mobMgr,
      playSwing
    });
    const { placeBlock, breakBlock, pickBlock, startMining, minePenalty } = playerInteraction;

    const stepTimers = {
      oxygenTimer: 0,
      lavaTimer: 0,
      magmaTimer: 0,
      cactusTimer: 0,
      suffocationTimer: 0,
      randomTickTimer: 0,
      drownTimer: 0,
      freezeTimer: 0,
      freezeHurtTimer: 0,
      regenTimer: 0,
      stepSoundT: 0,
      posInfoTimer: 0,
      posInfoKey: "",
      lastCompassSent: -1,
      lastVillageKey: "",
      wasInWater: false
    };

    // Periodic Surface Random Ticks (Grass Spread/Decay, Leaf Decay, Ice Melting)
    function processRandomTicks() {
      const px = Math.floor(s.player.x);
      const pz = Math.floor(s.player.z);

      for (let i = 0; i < 4; i++) {
        const rx = px + Math.floor((Math.random() - 0.5) * 32);
        const rz = pz + Math.floor((Math.random() - 0.5) * 32);
        const ry = (s as any).surfaceAt ? (s as any).surfaceAt(rx, rz).h : 64;

        const curId = getBlock(rx, ry, rz);
        const aboveId = getBlock(rx, ry + 1, rz);

        // 1. Grass Block Spread & Decay
        if (curId === 1) {
          if (isOpaque(aboveId)) {
            edit(rx, ry, rz, 2, false); // Decay to Dirt under solid blocks
          } else {
            const dx = Math.floor((Math.random() - 0.5) * 3);
            const dz = Math.floor((Math.random() - 0.5) * 3);
            const dy = Math.floor((Math.random() - 0.5) * 3);
            const nx = rx + dx, ny = ry + dy, nz = rz + dz;
            if (getBlock(nx, ny, nz) === 2 && !isOpaque(getBlock(nx, ny + 1, nz))) {
              edit(nx, ny, nz, 1, false); // Spread to neighbor Dirt under sunlight
            }
          }
        }

        // 2. Leaf Decay: if natural leaves have no connected logs within distance 3, decay
        if (curId === 18 || curId === 21 || curId === 24 || curId === 27 || (curId >= 109 && curId <= 118)) {
          let hasLog = false;
          for (let lx = -3; lx <= 3 && !hasLog; lx++) {
            for (let ly = -3; ly <= 3 && !hasLog; ly++) {
              for (let lz = -3; lz <= 3 && !hasLog; lz++) {
                const b = getBlock(rx + lx, ry + ly, rz + lz);
                if (b === 16 || b === 19 || b === 22 || b === 25 || (b >= 119 && b <= 122)) {
                  hasLog = true;
                }
              }
            }
          }
          if (!hasLog) {
            edit(rx, ry, rz, 0, false);
            playDig(curId);
          }
        }

        // 3. Ice Thermal Melting: if Ice (52) is adjacent to a heat source, melt to Water
        if (curId === 52) {
          let nearHeat = false;
          for (let hx = -2; hx <= 2 && !nearHeat; hx++) {
            for (let hy = -2; hy <= 2 && !nearHeat; hy++) {
              for (let hz = -2; hz <= 2 && !nearHeat; hz++) {
                const b = getBlock(rx + hx, ry + hy, rz + hz);
                if (b === 8 || b === 80 || b === 81 || b === 46 || b === 82 || b === 40 || b === 85 || b === 86) {
                  nearHeat = true;
                }
              }
            }
          }
          if (nearHeat) {
            edit(rx, ry, rz, 39, false);
            playSplash();
          }
        }
      }
    }

    const playerPhysics = createPlayerPhysics({
      s,
      timers: stepTimers,
      getBlock,
      edit,
      showToast,
      respawn,
      damagePlayer,
      playStep,
      playDig,
      playSplash,
      processRandomTicks,
      checkFallingBlocks,
      findNearestVillage,
      setHealth,
      setOxygenBubbles,
      setPosInfo,
      setCompassHeading,
      setNearestVillage
    });
    const { stepPlayerPhysics } = playerPhysics;

    // ── V0 VEHICLES (mockup car + arcade physics) ─────────────────────────────
    function vehicleWorld() {
      return {
        isSolidAt: (x: number, y: number, z: number) => isSolid(getBlock(Math.floor(x), Math.floor(y), Math.floor(z))),
        groundYAt: (x: number, z: number) => {
          for (let y = 300; y > -8; y--) {
            const id = getBlock(Math.floor(x), y, Math.floor(z));
            if (id !== 0 && id !== 39 && id !== 40 && isSolid(id)) return y + 1;
          }
          return 1;
        }
      };
    }

    let _lastKmhAt = 0;
    function driveVehicle(dt: number) {
      const veh = s.activeVehicle;
      if (!veh) return;
      veh.update(dt, {
        throttle: s.keys["KeyW"] ? 1 : 0,
        brake: s.keys["KeyS"] ? 1 : 0,
        handbrake: !!s.keys["Space"],
        steer: (s.keys["KeyA"] ? 1 : 0) - (s.keys["KeyD"] ? 1 : 0)
      }, vehicleWorld());

      // sync player + camera to the car — POV completely locked/bonded to the seat
      // seat offset rotated by the vehicle's full orientation (yaw+pitch+roll) so horizon tilts with car
      const seat = veh.getSeatOffset();
      const eyeLocal = new THREE.Vector3(seat.x, veh.seatY, seat.z);
      eyeLocal.applyEuler(new THREE.Euler(veh.state.pitch, veh.state.yaw, veh.state.roll, "YXZ"));
      const eyeWorldX = veh.state.x + eyeLocal.x;
      const eyeWorldY = veh.state.y + eyeLocal.y;
      const eyeWorldZ = veh.state.z + eyeLocal.z;
      // player position is slightly below eye
      s.player.x = eyeWorldX;
      s.player.z = eyeWorldZ;
      s.player.y = eyeWorldY - 0.1;
      s.vehicleLookYaw = s.vehicleLookYaw || 0;
      s.vehicleLookPitch = s.vehicleLookPitch || 0;
      s.player.vx = s.player.vy = s.player.vz = 0;
      s.player.fly = false;
      if (s.camera) {
        s.camera.position.set(eyeWorldX, eyeWorldY, eyeWorldZ);
        s.camera.rotation.order = "YXZ";
        s.camera.rotation.y = veh.state.yaw + (s.vehicleLookYaw || 0);
        // camera pitch + vehicle pitch, roll locked to car
        s.camera.rotation.x = (s.vehicleLookPitch || 0) + veh.state.pitch * 0.7;
        s.camera.rotation.z = veh.state.roll;
      }
      if (s.firstPersonArm) s.firstPersonArm.visible = false;
      if (s.leftArm) s.leftArm.visible = false;
      // update KMH HUD (throttled)
      const nowMs = performance.now();
      if (nowMs - _lastKmhAt > 80) {
        _lastKmhAt = nowMs;
        setVehicleKmh(Math.round(Math.abs(veh.state.speed) * 3.6));
      }
    }


    function enterVehicle(veh: VehicleEntity) {
      if (s.activeVehicle === veh) return;
      s.activeVehicle = veh;
      veh.occupied = true;
      (s as any).vehicleLookYaw = 0;
      (s as any).vehicleLookPitch = 0;
      setIsInVehicle(true);
      setSeatName(veh.seats[veh.seatIndex]?.name || "Driver");
      showToast("🚗 Entered the car — WASD drive · Space handbrake · E trunk/doors · Arrows seat · Mouse look");
    }

    function exitVehicle() {
      const veh = s.activeVehicle;
      if (!veh) return;
      s.activeVehicle = null;
      veh.occupied = false;
      setIsInVehicle(false);
      setVehicleKmh(0);
      if (s.firstPersonArm) s.firstPersonArm.visible = true;
      if (s.leftArm) s.leftArm.visible = !s.simMode;
      s.player.x = veh.state.x - Math.cos(veh.state.yaw) * 2.4;
      s.player.z = veh.state.z + Math.sin(veh.state.yaw) * 2.4;
      s.player.vy = 0;
      showToast("🚪 Exited the car");
    }

    function spawnVehicle(styleId?: string): string | null {
      const px = s.player.x + 3;
      const pz = s.player.z + 3;
      const gy = vehicleWorld().groundYAt(px, pz);
      const veh = createVehicleEntity(styleId || "sedan", px, gy, pz, s.player.yaw);
      s.vehicles.set(veh.id, veh);
      s.scene?.add(veh.root);
      enterVehicle(veh);
      return veh.id;
    }

    function step(dt: number) {
      if (s.cinematic) stepCinematic(s, dt);
      else if (s.activeVehicle) driveVehicle(dt);
      else stepPlayerPhysics(dt);
    }

    // ==========================================
    // 6. CARTOGRAPHY ENGINE (RELIEF SHADING)
    // ==========================================
    const worldMap = createWorldMap({
      s, ckey, getChunk,
      surfaceAt, getBiome, hash2, villagesNear, villageAt, villagePlan, terrainHeight
    });
    const { drawMap } = worldMap;

    const tickPortal = async (dt: number) => {
      const dim = dimStateRef.current;
      if (dim.portalCooldown > 0) {
        dim.portalCooldown -= dt;
        return;
      }
      if (dim.isWarping) return;

      const inside = isPlayerInsidePortal(getBlock, s.player.x, s.player.y, s.player.z);
      if (inside) {
        if (dim.dwellTimer === 0) {
          playPortalHum();
        }
        dim.dwellTimer += dt;
        const requiredDwell = s.creative ? 0.35 : 1.4;
        if (dim.dwellTimer >= requiredDwell) {
          dim.dwellTimer = 0;
          setPortalWarping(true);
          playPortalTravel();
          const targetDim: Dimension = dim.dimension === "overworld" ? "nether" : "overworld";
          showToast(targetDim === "nether" ? "🌀 Entering the Nether..." : "🌀 Returning to the Overworld...");

          const res = await transitionDimension(s, dim, targetDim);
          s.dimension = targetDim;
          setCurrentDimension(targetDim);
          mobMgr.clear();
          s.riddenBoat = null;
          s.riddenAnimal = null;
          s.player.x = res.targetX;
          s.player.y = res.targetY;
          s.player.z = res.targetZ;
          const scx = Math.floor(s.player.x / CH), scz = Math.floor(s.player.z / CH);
          for (let dz = -1; dz <= 1; dz++) {
            for (let dx = -1; dx <= 1; dx++) {
              genChunk(scx + dx, scz + dz);
              buildMesh(scx + dx, scz + dz);
            }
          }
          rescan(scx, scz);
          setTimeout(() => setPortalWarping(false), 800);
        }
      } else {
        dim.dwellTimer = 0;
      }
    };

    // ==========================================
    // 7. ANIMATION FRAME LOOP (extracted to src/game/engine/renderLoop.ts)
    // ==========================================
    const renderLoop = createRenderLoop({
      s,
      qualityPreset,
      tex,
      stepTimers,
      mobMgr,
      webSpiderMgr,
      wandManager,
      miniCanvasRef,
      bigCanvasRef,
      isoThumbsRef,
      rescan,
      updateHorizonMesh,
      stream,
      getMapMarkers,
      stepVillagers,
      step,
      stepLiquids,
      drawMap,
      getBlock,
      damagePlayer,
      spawnSafeAt,
      surfaceAt,
      processTnt,
      tickFurnace,
      raycast,
      mineHoldTime,
      minePenalty,
      breakBlock,
      updateHeldItem,
      playDig,
      playLevelUp,
      showToast,
      inventoryAddItem: (id: number, count: number) => inventoryAddItem(id, count),
      tickPortal,
      setDetectedHz,
      setDayCount,
      setTimeFormatted,
      setFps,
      setAimedVillager,
      setHealth,
      setHungerBar,
      setXpBar,
      setHoveredBlockName,
      setIsUnderwater,
      setIsUnderLava,
      syncCustomAssets,
      syncPaintings
    });
    const { frame } = renderLoop;
    resumeRenderLoop = () => {
      if (!s.reqId && !glLost) {
        try { s.reqId = requestAnimationFrame(frame); } catch { /* watchdog covers */ }
      }
    };

    // ==========================================
    // 8. WORLD BOOT & SPAWN SETUP
    // ==========================================
    function logFatal(tag: string, err: unknown) {
      const msg = `boot.${tag}: ${String((err as Error)?.message || err)} — ${String((err as Error)?.stack || "").split("\n").slice(0, 4).join(" | ").slice(0, 500)}`;
      simLog(msg);
      if (!isTelemetryEnabled()) return;
      fetch("/api/debug/client-error", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ts: new Date().toISOString(), tag: String((window as unknown as { __BUILD_TAG?: string }).__BUILD_TAG || "unknown"), href: location.href, msg })
      }).catch(() => {});
    }
    async function buildSpawnArea() {
      const R0 = (isSim() && simFlat()) ? 2 : 4, list: [number, number, number][] = [];
      for (let dz = -R0 - 1; dz <= R0 + 1; dz++) for (let dx = -R0 - 1; dx <= R0 + 1; dx++)
        list.push([dx, dz, Math.hypot(dx, dz)]);
      list.sort((a, b) => a[2] - b[2]);
      const scx = Math.floor(s.player.x / CH), scz = Math.floor(s.player.z / CH);

      setLoadMsg("Folding hills and shaping terrain…");
      simLog("boot-stage: spawning area gen START");
      for (let i = 0; i < list.length; i++) {
        const gcx = scx + list[i][0], gcz = scz + list[i][1];
        try { genChunk(gcx, gcz); } catch (err) { logFatal(`genChunk[${gcx},${gcz}]`, err); }
        if (i % 4 === 0 || i === list.length - 1) {
          const p = Math.round(48 * (i + 1) / list.length);
          setLoadPct(prev => Math.max(prev, p));
          await new Promise(r => setTimeout(r, 0));
        }
      }
      simLog("boot-stage: gen DONE, meshing START");
      setLoadMsg("Building voxel lighting & geometry…");
      const meshList = list.filter(e => e[2] <= R0 + 0.5);
      const meshPromises: Promise<void>[] = [];
      for (let i = 0; i < meshList.length; i++) {
        const mcx = scx + meshList[i][0], mcz = scz + meshList[i][1];
        try {
          const p = buildMesh(mcx, mcz, 0);
          meshPromises.push(p);
        } catch (err) { logFatal(`buildMesh[${mcx},${mcz}]`, err); }
        if (i % 2 === 0 || i === meshList.length - 1) {
          const p = Math.round(48 + 40 * (i + 1) / meshList.length);
          setLoadPct(prev => Math.max(prev, p));
          await new Promise(r => setTimeout(r, 0));
        }
      }
      // Wait for the async worker pool to finish
      if (meshPromises.length) {
        setLoadMsg("Finalizing geometry buffers…");
        setLoadPct(prev => Math.max(prev, 90));
        await Promise.allSettled(meshPromises);
        const tBootChunkWait = performance.now();
        while (performance.now() - tBootChunkWait < 6000) {
          const pending = meshList.filter(e => !getChunk(scx + e[0], scz + e[1])?.meshes);
          if (!pending.length) break;
          await new Promise(r => setTimeout(r, 40));
        }
      }
      simLog("boot-stage: meshing DONE");
      setLoadMsg("Spawning wildlife & preparing world…");
      setLoadPct(prev => Math.max(prev, 95));
      if (!s.simMode) updateHorizonMesh();
      simLog("boot-stage: horizon done");
      if (s.scene && !s.simMode) {
        mobMgr.init(s.scene);
        mobMgr.clear();
        webSpiderMgr.init(s.scene);
        webSpiderMgr.clear();
        if (s.pendingBoats && s.pendingBoats.length > 0) {
          for (const pb of s.pendingBoats) {
            mobMgr.spawnBoat(pb.x, pb.y, pb.z, pb.itemId || 1041, { id: pb.id, yaw: pb.yaw || 0 });
          }
        }
        if (s.pendingAnimals && s.pendingAnimals.length > 0) {
          for (const pa of s.pendingAnimals) {
            const animal = mobMgr.spawnSingleAnimal(pa.x, pa.y, pa.z, pa.type as "cow" | "sheep" | "pig" | "chicken" | "horse" | "dog" | "cat", {
              id: pa.id,
              name: pa.name || undefined,
              sex: pa.sex === "male" ? "male" : "female",
              ownerId: pa.ownerId || undefined,
              collarColor: pa.collarColor || undefined
            });
            if (animal && pa.name) animal.nameplate = attachNameplate(animal.root, pa.name, undefined, pa.type === "horse" ? 2.2 : (pa.type === "dog" ? 1.25 : (pa.type === "cat" ? 1.0 : 1.5)));
          }
        } else {
          mobMgr.spawnInitialWildlife(s.player.x, s.player.z, surfaceAt, spawnSafeAt);
        }
      }
      setLoadPct(100);
      setLoadMsg("Warming up textures…");
      const tAtlas = performance.now();
      while (!isAtlasReady() && performance.now() - tAtlas < 8000) {
        await new Promise(r => setTimeout(r, 100));
      }
      setLoadMsg("World Ready!");
      await new Promise(r => setTimeout(r, 300));
    }

    async function rebuildAndSpawnWorld(
      seedStr: string,
      wType: string,
      savedPlayerPos?: { x: number; y: number; z: number; yaw?: number; pitch?: number; fly?: boolean } | null
    ) {
      setLoading(true);
      setLoadPct(0);
      setLoadMsg("Forging terrain…");

      // 1. Clear old chunks and meshes from scene
      for (const c of s.chunks.values()) {
        if (c.meshes && s.scene) {
          c.meshes.forEach(m => { s.scene?.remove(m); m.geometry.dispose(); });
        }
      }
      if (s.chestEntities) {
        for (const ce of s.chestEntities.values()) {
          if (s.scene) s.scene.remove(ce.root);
        }
        s.chestEntities.clear();
      }
      if (s.horizonMesh && s.scene) {
        s.scene.remove(s.horizonMesh);
        s.horizonMesh.traverse((o) => {
          const m = o as THREE.Mesh;
          if (m && (m as THREE.Mesh).geometry) (m as THREE.Mesh).geometry.dispose();
        });
        s.horizonMesh = null;
      }
      mobMgr.clear();
      webSpiderMgr.clear();
      s.carriedSpider = null;
      if (s.heldSpiderMesh) {
        disposeEntityRoot(s.heldSpiderMesh.mesh.root);
        s.heldSpiderMesh = null;
      }
      s.riddenBoat = null;
      s.chunks.clear();
      s.heightCache.clear();
      s.lanterns.clear();
      s.mapTiles.clear();
      s.regionCache.clear();
      s.planCache.clear();
      s.genQ = [];
      s.meshQ = [];
      s.lastCX = 1e9;
      s.lastCZ = 1e9;

      // 2. Set seed and world archetype
      setSeed(seedStr, wType);

      // 3. Set player coordinates & camera orientation
      if (savedPlayerPos && savedPlayerPos.x !== undefined && savedPlayerPos.y !== undefined) {
        s.player.x = savedPlayerPos.x;
        s.player.y = savedPlayerPos.y;
        s.player.z = savedPlayerPos.z;
        s.player.yaw = savedPlayerPos.yaw || 0;
        s.player.pitch = savedPlayerPos.pitch || 0;
        s.player.fly = !!savedPlayerPos.fly;
        s.player.vx = s.player.vy = s.player.vz = 0;
        if (s.camera) {
          s.camera.rotation.order = "YXZ";
          s.camera.rotation.y = s.player.yaw;
          s.camera.rotation.x = s.player.pitch;
        }
      } else {
        locateSpawn();
        respawn();
      }

      // 4. Generate spawn chunks & mesh
      await buildSpawnArea();
      if (!savedPlayerPos) {
        respawn();
      }
      if (!s.simMode) spawnVillagers();

      setLoading(false);
      s.uiPaused = false;
      s.lastCX = 1e9;
      s.lastCZ = 1e9;
      rescan(Math.floor(s.player.x / CH), Math.floor(s.player.z / CH));
      handleEnter();
    }

    function regenerateCurrentArea() {
      // 1. Clear all chunks and mesh geometries from scene
      for (const c of s.chunks.values()) {
        if (c.meshes && s.scene) {
          c.meshes.forEach(m => { s.scene?.remove(m); m.geometry.dispose(); });
        }
      }
      s.chunks.clear();
      s.heightCache.clear();
      s.lanterns.clear();
      s.mapTiles.clear();
      s.regionCache.clear();
      s.planCache.clear();
      s.genQ = [];
      s.meshQ = [];
      s.lastCX = 1e9;
      s.lastCZ = 1e9;
      rescan(Math.floor(s.player.x / CH), Math.floor(s.player.z / CH));
      if (!s.simMode) spawnVillagers();
      showToast("🏰 Regenerated surrounding village area & 10 modular buildings!");
    }

    s.rescan = rescan;
    s.updateHorizonMesh = updateHorizonMesh;
    s.rebuildAndSpawnWorld = rebuildAndSpawnWorld;
    s.regenerateCurrentArea = regenerateCurrentArea;
    (s as unknown as Record<string, unknown>).getBlock = getBlock;
    (s as unknown as Record<string, unknown>).surfaceAt = surfaceAt;
    (s as unknown as Record<string, unknown>).mobileActions = {
      hitDown: () => {
        s.active = true;
        s.steering = true;
        s.mouseLeftDown = true;
        if (tryBreakBoat()) { s.mouseLeftDown = false; s.brokeBoatAt = performance.now(); return; }
        if (tryMeleeAttack()) { s.mouseLeftDown = false; return; }
        if (s.creative) breakBlock();
        else startMining();
      },
      hitUp: () => {
        s.mouseLeftDown = false;
        if (s.mining) {
          s.mining = null;
          if (s.fx) s.fx.hideCrack();
        }
      },
      take: () => {
        s.active = true;
        // Full right-click / E action: villager trade → pet interaction (ride/name) → place block
        const tradeTarget = s.nearVillager && canTradeWith(s.nearVillager) ? s.nearVillager : null;
        if (tradeTarget) {
          setTradingVillager(tradeTarget);
          document.exitPointerLock?.();
          return;
        }
        const heldId = s.hotbar[s.slot] || 0;
        if (isBoatItem(heldId, (id) => BLOCK_MAP.get(id))) { if (tryBoatPlace(heldId)) return; }
        else if (tryBoatEnter()) return;
        if (tryAnimalInteraction(heldId)) return;
        placeBlock();
      },
      jump: () => {
        s.keys["Space"] = true;
        setTimeout(() => { s.keys["Space"] = false; }, 200);
      },
      toggleFly: () => {
        s.player.fly = !s.player.fly;
        s.player.vy = 0;
        showToast(s.player.fly ? "Flying" : "Walking");
      },
      look: (dx: number, dy: number) => look(dx, dy)
    };

    async function boot() {
      // ── SIM SANDBOX BOOT ─────────────────────────────────────────
      // ?sim=1 (admin-gated via the dev sim API) boots an isolated
      // world: fixed scratch id, URL seed, prod IO entirely disabled.
      if (isSim()) {
        s.simMode = true;
        s.currentWorldId = "wld_sim_scratch";
        s.currentUserId = "sim";
        if (s.clouds) s.clouds.visible = false;
        if (s.horizonMesh) s.horizonMesh.visible = false;
        if (scene.fog && "near" in scene.fog) { scene.fog.near = 20; scene.fog.far = Math.min(scene.fog.far, 90); }
        s.seedText = simSeed();
        s.type = simType();
        s.world = TYPES[s.type] || TYPES.standard;
        if (simFlat()) {
          s.render = 4;
          setRenderDistance(4);
          simLog("flat-pad mode: grass stage y=64, render 4, spawn over pad center");
        }
        setSeed(s.seedText, s.type);
        setTitleScreenOpen(false);
        setWorldSelectOpen(false);
        simLog(`sandbox boot — seed="${s.seedText}" type="${s.type}"`);
      } else {
        setSeed(s.seedText, s.type);
      }
      const curWldId = stateRef.current.currentWorldId || localStorage.getItem("mc_last_active_world_id") || "default";
      let localSavedPos: any = null;

      // The server save is authoritative when the join already restored the
      // player state (saved every 2.5s) — only fall back to localStorage (or the
      // studio cache) when the join had no saved position for this world.
      if (!s.simMode && !stateRef.current._joinRestoredPos) {
        // Self-heal: if the player entered the dev Builder Studio on a prod world and
        // never returned, restore their pre-studio location from the studio cache and
        // drop the stale flat-pad position (see kb/environments.md).
        const studioCached = getCachedPlayerLocation();
        if (studioCached && studioCached.worldId === curWldId && typeof studioCached.x === "number") {
          localSavedPos = {
            x: studioCached.x, y: studioCached.y, z: studioCached.z,
            yaw: studioCached.yaw, pitch: studioCached.pitch, fly: !!studioCached.fly
          };
          clearCachedPlayerLocation();
          try { localStorage.removeItem("mc_last_player_state_" + curWldId); } catch {}
        }
        if (!localSavedPos) {
          try {
            const raw = localStorage.getItem("mc_last_player_state_" + curWldId);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed && typeof parsed.x === "number" && typeof parsed.y === "number" && typeof parsed.z === "number") {
                localSavedPos = parsed;
              }
            }
          } catch (e) {}
        }
      }

      if (localSavedPos) {
        s.player.x = localSavedPos.x;
        s.player.y = localSavedPos.y;
        s.player.z = localSavedPos.z;
        s.player.yaw = localSavedPos.yaw || 0;
        s.player.pitch = localSavedPos.pitch || 0;
        s.player.fly = !!localSavedPos.fly;
        s.player.vx = s.player.vy = s.player.vz = 0;
        if (s.camera) {
          s.camera.rotation.order = "YXZ";
          s.camera.rotation.y = s.player.yaw;
          s.camera.rotation.x = s.player.pitch;
        }
      } else {
        locateSpawn();
        respawn();
      }
      // Flat-pad: teleport over the stage center right away (grass top at y=64)
      if (s.simMode && simFlat()) {
        s.player.x = 8.5;
        s.player.z = 8.5;
        s.player.y = 65.25;
        s.player.vx = s.player.vy = s.player.vz = 0;
      }
      await buildSpawnArea();
      if (!s.simMode) spawnVillagers();
      setLoading(false);
      // CRITICAL: on the normal (prod) join the world must start LIVE — uiPaused
      // stays true from the initial state otherwise → frozen player/animals every
      // boot until an unrelated UI click happens to wake it.
      if (s.simMode) {
        s.uiPaused = false;
        s.active = true;
        s.steering = false;
        setActive(true);
        setTitleScreenOpen(false);
        setWorldSelectOpen(false);
        setPauseOpen(false);
      } else {
        // Normal game boot: keep game paused until user selects a world to play
        s.uiPaused = true;
        s.active = false;
        s.steering = false;
        setActive(false);
      }
      if (isSim()) {
        s.active = true; s.steering = false;
        setActive(true);
        simLog("sandbox world ready — SimDeck active (click canvas to wake quietly)");
        // ?simdoor=1 → place a cottage and park the camera at its door (headless inspection)
        if (simDoorMode()) {
          setTimeout(() => {
            try {
              setTitleScreenOpen(false);
              setWorldSelectOpen(false);
              const api = (window as unknown as { __sim?: { api?: Record<string, unknown> } }).__sim?.api as {
                stampBlock?: (id: number, x: number, z: number) => unknown;
                timeSet?: (t: number) => void;
              } | undefined;
              (window as unknown as { __simDoorDebug?: string }).__simDoorDebug = `fired api=${!!api}`;
              api?.stampBlock?.(105, 7, 7);   // CLOSED door (2-cell pair)
              api?.stampBlock?.(106, 11, 7);  // OPEN door (2-cell pair)
              api?.timeSet?.(6000);
              (window as unknown as { __simDoorDebug?: string }).__simDoorDebug = "stamped";
            } catch (err) {
              (window as unknown as { __simDoorDebug?: string }).__simDoorDebug = `error ${String(err)}`;
            }
          }, 2600);
        }
      }
      s.reqId = requestAnimationFrame(frame);
    }

    boot().catch((err) => logFatal("boot-chain", err));

    // Frame-loop watchdog + error visibility: if the render loop dies silently,
    // restart it once; surface any uncaught error on screen (diagnosis for prod).
    const watchdog = window.setInterval(() => {
      const st = stateRef.current;
      if (!glLost && !st.uiPaused && !document.hidden && st.lastFrameAt > 0 && performance.now() - st.lastFrameAt > 5000) {
        simLog("watchdog: frame loop stalled → restarting rAF");
        cancelAnimationFrame(st.reqId || 0);
        if (st.idleTimer) { clearInterval(st.idleTimer); st.idleTimer = null; }
        st.reqId = requestAnimationFrame(frame as (t: number) => void);
      }
    }, 3000);
    void watchdog;
    const onErr = (ev: ErrorEvent) => {
      simLog(`error: ${ev.message} @ ${ev.filename?.split("/").pop()}:${ev.lineno}`);
      showToast(`⚠ ${ev.message}`);
    };
    const onRej = (ev: PromiseRejectionEvent) => {
      simLog(`rejection: ${String(ev.reason)}`);
    };
    window.addEventListener("error", onErr);
    window.addEventListener("unhandledrejection", onRej);

    // Main-Thread Stall Detector: a setInterval that fires late ⇒ the event loop was blocked
    let stallNext = performance.now() + 250;
    const stallTimer = window.setInterval(() => {
      const nowMs = performance.now();
      const late = nowMs - stallNext;
      if (late > 150) perf.stall(Math.round(late));
      stallNext = nowMs + 250;
    }, 250);
    void stallTimer;

    // ==========================================
    // 8.5 SIM SANDBOX ENGINE — stamp/undo primitive (S1)
    // ==========================================
    const simPlaced: Array<{ id: string; kind: string; label: string; params: Record<string, number | string>; x: number; z: number; side: string; stampIdx: number }> = [];
    simExposeBridge();

    function simStampRun(name: string, run: (wWriter: (x: number, y: number, z: number, id: number) => void) => void, bounds?: [number, number, number, number, number, number]): { voxels: number; ms: number } {
      const t0 = performance.now();
      void bounds;
      const cells: SimCell[] = [];
      const seen = new Set<string>();
      const dirty = new Set<string>();

      // Chunk-scope capture writer: writes anywhere (any chunk), records pre-diff,
      // keeps emitters in sync, tracks dirty chunk keys for sliced remesh.
      const captureWriter = (x: number, y: number, z: number, id: number) => {
        if (y < 0 || y >= CHH) return;
        if (id === BED_ID) id = BED_BYTE; // world data is bytes (Uint8Array)
        const cx = x >> 4, cz = z >> 4;
        let c = getChunk(cx, cz);
        if (!c) { c = genChunk(cx, cz); if (!c) return; }
        const off = y * 256 + (z & 15) * 16 + (x & 15);
        if (!c.data || off >= c.data.length) return;
        const prev = c.data[off];
        if (prev === id) return;
        const k = `${x},${y},${z}`;
        if (!seen.has(k)) { seen.add(k); cells.push({ k, x, y, z, prev, next: id }); }
        c.data[off] = id;
        s.edits.set(k, id);
        const eck = `${cx},${cz}`;
        let ecm = s.editsByChunk.get(eck);
        if (!ecm) { ecm = new Map(); s.editsByChunk.set(eck, ecm); }
        ecm.set(k, id);
        if (isCustomAssetBlock(id)) ensureCustomAssetEntity(x, y, z, id);
        else if (isCustomAssetBlock(prev)) removeCustomAssetEntity(k);
        if (id && y > c.maxY) c.maxY = y;
      registerEmitter(x, y, z, id);
      const moteSpecs = moteForBlock(id);
      if (moteSpecs && s.fx && id !== 0) {
        for (const spec of moteSpecs) {
          if (spec.needsAbove) {
            const above = getBlock(x, y + 1, z);
            if (spec.needsAbove === "water" && above !== 39) continue;
            if (spec.needsAbove === "lava" && above !== 40) continue;
            if (spec.needsAbove === "fluid" && above !== 39 && above !== 40) continue;
          }
          if (spec.needsSubmerged && getBlock(x, y + 1, z) !== 39) continue;
          s.fx.spawnMote(x + 0.5, y + 0.5 + (spec.dy ?? 0), z + 0.5, spec.color, spec.kind, 2);
        }
      }
        if (id === 39 || id === 40) s.liquidQ.push([x, y, z, id, 0, 0]);
        if ((prev === 39 || prev === 40) && id === 0) dryUpFluids(x, y, z, prev);
        dirty.add(ckey(cx, cz));
        // Boundary chunks
        if ((x & 15) === 0) dirty.add(ckey(cx - 1, cz));
        if ((x & 15) === 15) dirty.add(ckey(cx + 1, cz));
        if ((z & 15) === 0) dirty.add(ckey(cx, cz - 1));
        if ((z & 15) === 15) dirty.add(ckey(cx, cz + 1));
      };

      simCapture = captureWriter;
      try {
        run(captureWriter);
      } finally {
        simCapture = null;
      }
      for (const k of dirty) {
        const [cx, cz] = k.split(",").map(Number);
        buildMesh(cx, cz, 1.5);
      }
      simStamps.push({ cells });
      simLog(`stamp "${name}" — ${cells.length} voxels in ${Math.round(performance.now() - t0)} ms`);
      return { voxels: cells.length, ms: Math.round(performance.now() - t0) };
    }

    function simUndo(): number {
      const stamp = simStamps.pop();
      if (!stamp) return 0;
      const ridx = simPlaced.findIndex((p) => p.stampIdx === simStamps.length);
      if (ridx >= 0) simPlaced.splice(ridx, 1);
      const dirty = new Set<string>();
      for (const c of stamp.cells) {
        setRaw(c.x, c.y, c.z, c.prev);
        registerEmitter(c.x, c.y, c.z, c.prev);
        const cx = c.x >> 4, cz = c.z >> 4;
        dirty.add(ckey(cx, cz));
        if ((c.x & 15) === 0) dirty.add(ckey(cx - 1, cz));
        if ((c.x & 15) === 15) dirty.add(ckey(cx + 1, cz));
        if ((c.z & 15) === 0) dirty.add(ckey(cx, cz - 1));
        if ((c.z & 15) === 15) dirty.add(ckey(cx, cz + 1));
      }
      for (const k of dirty) {
        const [cx, cz] = k.split(",").map(Number);
        buildMesh(cx, cz, 1.5);
      }
      simLog(`undo — restored ${stamp.cells.length} voxels`);
      return stamp.cells.length;
    }

    function simExposeBridge() {
      (s as any).getBlockFn = getBlock;
      setupSimDeckBridge(s, {
        simStampRun,
        simUndo,
        simLog,
        simLogRing,
        simStamps,
        simPlaced,
        simFlat,
        mobMgr,
        showToast,
        surfaceAt,
        terrainHeight,
        rngAt,
        pine,
        buildHouse,
        clearUp,
        wellAt,
        lampPost,
        getChunk,
        genChunk,
        registerEmitter,
        buildMesh,
        setWorldTime,
        setHotbar,
        spawnVehicle,
        wandManager,
        updateAreaBoxMesh,
        scene,
        thumbs
      });
    }

    // 3D Area Selection Visualizer (Yellow Box)
    function updateAreaBoxMesh() {
      if (s.areaBoxMesh) {
        scene.remove(s.areaBoxMesh);
        s.areaBoxMesh.geometry.dispose();
        (s.areaBoxMesh.material as THREE.Material).dispose();
        s.areaBoxMesh = null;
      }
      if (s.areaBoxFill) {
        scene.remove(s.areaBoxFill);
        s.areaBoxFill.geometry.dispose();
        (s.areaBoxFill.material as THREE.Material).dispose();
        s.areaBoxFill = null;
      }
      if (s.areaGizmo) {
        scene.remove(s.areaGizmo);
        s.areaGizmo = null;
      }

      if (!s.areaPos1 || !s.areaPos2) return;

      const xMin = Math.min(s.areaPos1.x, s.areaPos2.x);
      const xMax = Math.max(s.areaPos1.x, s.areaPos2.x) + 1;
      const yMin = Math.min(s.areaPos1.y, s.areaPos2.y);
      const yMax = Math.max(s.areaPos1.y, s.areaPos2.y) + 1;
      const zMin = Math.min(s.areaPos1.z, s.areaPos2.z);
      const zMax = Math.max(s.areaPos1.z, s.areaPos2.z) + 1;

      const w = xMax - xMin;
      const h = yMax - yMin;
      const d = zMax - zMin;
      const cx = (xMin + xMax) / 2;
      const cy = (yMin + yMax) / 2;
      const cz = (zMin + zMax) / 2;

      const geom = new THREE.BoxGeometry(w, h, d);
      const edges = new THREE.EdgesGeometry(geom);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0xffea00, // Bright Yellow
        linewidth: 3,
        transparent: true,
        opacity: 0.95
      });
      const lineMesh = new THREE.LineSegments(edges, lineMat);
      lineMesh.position.set(cx, cy, cz);
      scene.add(lineMesh);
      s.areaBoxMesh = lineMesh;

      // Axis translation gizmo at the selection's min corner (U19)
      if (!s.areaGizmo) {
        s.areaGizmo = createAxisGizmo();
        scene.add(s.areaGizmo);
      }
      placeAxisGizmo(s.areaGizmo, xMin, yMin, zMin);

      const fillMat = new THREE.MeshBasicMaterial({
        color: 0xffd700,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const fillMesh = new THREE.Mesh(geom, fillMat);
      fillMesh.position.set(cx, cy, cz);
      scene.add(fillMesh);
      s.areaBoxFill = fillMesh;
    }

    // 9. EVENT LISTENERS
    // ==========================================
    const cv = renderer.domElement;


    // WebSocket Multiplayer Event Subscriptions
    const unsubBlock = multiplayer.onBlockUpdate((data) => {
      const previousId = getBlock(data.x, data.y, data.z);
      const directionKey = `${data.x},${data.y},${data.z}`;
      if (typeof data.dir === "number") s.blockDirs.set(directionKey, data.dir);
      setRaw(data.x, data.y, data.z, data.blockId);
      s.edits.set(data.x + "," + data.y + "," + data.z, data.blockId);
      registerEmitter(data.x, data.y, data.z, data.blockId);
      if (isCustomAssetBlock(data.blockId)) {
        ensureCustomAssetEntity(data.x, data.y, data.z, data.blockId);
        const entity = s.customAssetEntities.get(directionKey);
        if (entity && typeof data.dir === "number") entity.root.rotation.y = customAssetYaw(data.dir);
      } else if (isCustomAssetBlock(previousId)) removeCustomAssetEntity(directionKey);
      remesh(data.x, data.z);
    });

    const unsubMove = multiplayer.onPlayerMove((p) => {
      let avatar = s.remoteAvatars.get(p.userId);
      if (!avatar && s.scene) {
        avatar = createRemoteAvatar(p.username, p.skinColor);
        s.scene.add(avatar);
        s.remoteAvatars.set(p.userId, avatar);
      }
      if (avatar) {
        avatar.position.set(p.x, p.y, p.z);
        avatar.rotation.y = p.yaw || 0;
      }
    });

    const unsubLeave = multiplayer.onPlayerLeave((data) => {
      const avatar = s.remoteAvatars.get(data.userId);
      if (avatar && s.scene) {
        s.scene.remove(avatar);
        disposeEntityRoot(avatar);
        s.remoteAvatars.delete(data.userId);
      }
      showToast(`${data.username} left the game`);
      setChatMessages(prev => [...prev.slice(-40), { username: "Server", text: `${data.username} left the game`, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    });

    const unsubJoin = multiplayer.onPlayerJoin((p) => {
      showToast(`${p.username} joined the game! 👋`);
      setChatMessages(prev => [...prev.slice(-40), { username: "Server", text: `${p.username} joined the game`, timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }]);
    });

    const onPointerLockChange = () => {
      const locked = document.pointerLockElement === cv;
      s.pointerLocked = locked;
      if (locked) {
        s.active = true;
        s.steering = true;
        setActive(true);
        s.pauseOpen = false;
        setPauseOpen(false);
      } else {
        // When pointer lock is lost/unlocked while playing: automatically pause & show game menu (OG Minecraft behavior)
        // RIDING is exempt: the rider keeps the world alive and re-locks on the
        // next click — the mount must never auto-pause (it froze the whole world).
        if (s.active && !s.riddenAnimal && !s.inventoryOpen && !s.chestOpen && !s.craftTableOpen && !s.furnaceOpen && !s.mapOpen && !s.chatOpen && !s.menuOpen && !s.titleScreenOpen && !s.worldSelectOpen) {
          s.active = false;
          s.steering = false;
          s.keys = {};
          setActive(false);
          s.pauseOpen = true;
          setPauseOpen(true);
        }
      }
    };
    const onPointerLockError = () => {
      s.pointerLocked = false;
    };

    // Auto-Pause when window/tab loses focus or becomes idle (OG Minecraft standard)
    const onWindowBlur = () => {
      s.mouseLeftDown = false;
      if (s.mining) {
        s.mining = null;
        if (s.fx) s.fx.hideCrack();
      }
      if (s.active && !s.inventoryOpen && !s.chestOpen && !s.craftTableOpen && !s.furnaceOpen && !s.mapOpen && !s.chatOpen && !s.menuOpen && !s.titleScreenOpen && !s.worldSelectOpen) {
        s.active = false;
        s.steering = false;
        s.keys = {};
        setActive(false);
        s.pauseOpen = true;
        setPauseOpen(true);
        if (document.pointerLockElement) document.exitPointerLock?.();
      }
    };

    document.addEventListener("pointerlockchange", onPointerLockChange);
    document.addEventListener("pointerlockerror", onPointerLockError);
    window.addEventListener("blur", onWindowBlur);
    document.addEventListener("visibilitychange", onWindowBlur);

    const unsubChat = multiplayer.onChat((msg) => {
      setChatMessages(prev => [...prev.slice(-40), { username: msg.username, text: msg.text, timestamp: msg.timestamp }]);
      // @mention ping: notify + chime when someone mentions YOU
      const me = stateRef.current.myUsername;
      if (me && msg.username !== me) {
        const mentions = String(msg.text).match(/@([\w]+)/g) || [];
        if (mentions.some((m) => m.toLowerCase() === "@" + me.toLowerCase())) {
          showToast(`💬 ${msg.username} mentioned you`);
          playChatPing();
        }
      }
    });

    const unsubChest = multiplayer.onChestUpdate((data) => {
      const key = `${data.x},${data.y},${data.z}`;
      s.chestMap.set(key, [...data.slots]);
      try {
        localStorage.setItem(`mc_chest_${s.currentWorldId}_${key}`, JSON.stringify(data.slots));
      } catch {}
      // If player currently has this exact chest open, update active UI slots in real time!
      if (s.chestOpen && s.chestPos && s.chestPos.x === data.x && s.chestPos.y === data.y && s.chestPos.z === data.z) {
        s.chestSlots = [...data.slots];
        setChestSlots([...data.slots]);
        playChestOpen();
      }
    });

    const cleanupInput = setupGameInputListeners({
      cv,
      s,
      blueprintModalOpen,
      setActive,
      setMenuOpen,
      setInventoryOpen,
      setPauseOpen,
      setMapOpen,
      setHotbar,
      setActiveSlot,
      setCreative,
      setBlueprintModalOpen,
      setTradingVillager,
      setSeatName,
      wandManager,
      simStampRun,
      showToast,
      raycast,
      updateAreaBoxMesh,
      tryBreakBoat,
      tryMeleeAttack,
      tryBreakPainting,
      startMining,
      breakBlock,
      pickBlock,
      placeBlock,
      canTradeWith,
      tryBoatPlace,
      tryBoatEnter,
      tryAnimalInteraction,
      enterVehicle,
      exitVehicle,
      openChat,
      closeChat,
      look,
      simUndo,
      dropHeldItem,
      openRecallModal,
      closeCraftTable,
      closeFurnace,
      closeChest,
    });

    return () => {
      unsubBlock();
      unsubMove();
      unsubLeave();
      unsubJoin();
      unsubChat();
      unsubChest();
      multiplayer.disconnect();
      if (s.reqId) cancelAnimationFrame(s.reqId);
      cleanupInput();
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("visibilitychange", onWindowBlur);
      document.removeEventListener("pointerlockchange", onPointerLockChange);
      document.removeEventListener("pointerlockerror", onPointerLockError);
      window.removeEventListener("error", onErr);
      window.removeEventListener("unhandledrejection", onRej);
      for (const entity of s.customAssetEntities.values()) s.scene?.remove(entity.root);
      s.customAssetEntities.clear();
      disposePostFx(s.postFx);
      s.postFx = null;
      renderer.dispose();
    };
}
