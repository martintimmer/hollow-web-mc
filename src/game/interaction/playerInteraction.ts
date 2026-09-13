import * as THREE from "three";
import type { GameState } from "../state/gameState";
import type { Chunk } from "../world";
import { CH, CHH, PR, PH } from "../world";
import { BLOCK_MAP, BED_BYTE, BED_ID, isItemOnly, type BlockDef, getBlockDrops, getBlockHardness, getBlockTool, getToolInfo, getMineTime } from "../blocks";
import { sampleAtlasColor } from "../particles";
import { tryIgniteNetherPortal, breakPortalAperture } from "../entities/netherGate";
import { isEdibleItem } from "../food";
import { toggleLever } from "../redstone";
import { playEat, playLeverClick, playFireCrackle } from "../sfx";
import { computeChestPair } from "../chest";
import { PAINTING_ITEM_ID } from "../entities/paintings";
import { moteForBlock } from "../ambientParticles";
import { isFireId } from "../engine/chunkMesh";
import { isCobwebId, SPIDER_EGG_ID, MUG_ID } from "../cobweb";
import { ORE_XP } from "../xp";
import { isNightTime } from "../time";

// Reusable aim vector for the bow (avoid per-shot allocation).
const _bowDir = new THREE.Vector3();

export interface RaycastHit {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  id: number;
}

export interface PlayerInteractionCtx {
  s: GameState;
  raycast: (max: number) => RaycastHit | null;
  raycastLiquid: (max: number) => RaycastHit | null;
  edit: (x: number, y: number, z: number, id: number, broadcast?: boolean) => void;
  setRaw: (x: number, y: number, z: number, id: number) => void;
  remesh: (x: number, z: number) => void;
  getBlock: (x: number, y: number, z: number) => number;
  getChunk: (cx: number, cz: number) => Chunk | undefined;
  primeTnt: (x: number, y: number, z: number, fuse?: number) => void;
  checkFallingBlocks: (x: number, y: number, z: number) => void;
  dryUpFluids: (x: number, y: number, z: number, id: number) => void;
  openCraftTable: () => void;
  openFurnace: (x: number, y: number, z: number) => void;
  openChest: (x: number, y: number, z: number) => void;
  showToast: (msg: string) => void;
  setHotbar: (hb: number[]) => void;
  deductHotbarSlot: (slot: number, n?: number) => void;
  playDoorUse: () => void;
  playDig: (id: number) => void;
  playSplash: () => void;
  playPlace: (id: number) => void;
  mobs: ReadonlyArray<{ x: number; y: number; z: number }>;
  currentWorldId: string;
  apiSaveBlockEdits: (worldId: string, batch: Array<{ x: number; y: number; z: number; blockId: number; prevBlockId: number; action: string }>) => Promise<unknown> | void;
  spawnChestEntity?: (x: number, y: number, z: number, facing?: number) => void;
  tryPlacePainting?: (hit: { x: number; y: number; z: number; nx: number; ny: number; nz: number }) => boolean;
  spawnWebSpider?: (x: number, y: number, z: number) => boolean;
  catchWebSpider?: (x: number, y: number, z: number) => { hatchDay: number; name?: string | null; ownerId?: string | null; sex?: string } | null;
  releaseWebSpider?: (x: number, y: number, z: number) => boolean;
  webSpiderAt?: (x: number, y: number, z: number) => boolean;
  refreshHeldItem?: () => void;
  openPortalModal?: (x: number, y: number, z: number) => void;
  setHotbarCounts?: React.Dispatch<React.SetStateAction<number[]>>;
  setHotbarDamage?: React.Dispatch<React.SetStateAction<number[]>>;
  inventoryAddItem?: (id: number, count: number) => number;
  mobMgr?: any;
  playSwing?: () => void;
}

export interface PlayerInteraction {
  placeBlock: () => void;
  breakBlock: (forceHit?: { x: number; y: number; z: number; nx: number; ny: number; nz: number; id: number } | null) => void;
  pickBlock: () => void;
  startMining: () => void;
  minePenalty: () => number;
}

export function createPlayerInteraction(ctx: PlayerInteractionCtx): PlayerInteraction {
  const s = ctx.s;

  function facingFromPlayerYaw(): number {
    const sy = Math.sin(s.player.yaw);
    const cy = Math.cos(s.player.yaw);
    if (Math.abs(cy) > Math.abs(sy)) return cy < 0 ? 0 : 1;
    return sy > 0 ? 3 : 2;
  }

  function placeBlock() {
    // Bow fires first — it works whether or not you're aiming at a block.
    const heldId = s.hotbar[s.slot] || 0;
    const curBlock = (s.creative || (s.hotbarCounts[s.slot] || 0) > 0) ? heldId : 0;
    if (curBlock === 730) {
      s.swingTimer = 1.0; // bow pull / snap recoil
      if (s.arrows && s.camera) {
        const dir = _bowDir.set(0, 0, -1).applyEuler(s.camera.rotation).normalize();
        s.arrows.spawnArrow(s.camera.position.x, s.camera.position.y, s.camera.position.z, dir.x, dir.y, dir.z);
        ctx.playPlace(730);
      } else {
        ctx.showToast("Aim the camera and fire the bow 🔥");
      }
      return;
    }

    // Edible items: right-click initiates eating loop when hungry (or golden apple)
    if (isEdibleItem(curBlock) && (s.hunger < 20 || curBlock === 1076 || s.creative)) {
      s.eatingTimer = 1.6; // 1.6s consumption timer
      s.eatingSlot = s.slot;
      playEat();
      const foodName = BLOCK_MAP.get(curBlock)?.name || "Food";
      ctx.showToast(`Eating ${foodName}... 🍖`);
      return;
    }

    s.swingTimer = 1.0;
    const hit = ctx.raycast(s.player.fly ? 7 : 5);
    if (!hit) {
      // If aiming at air with food, we already handled eating above
      return;
    }

    // Lever direct activation (toggle power state and connected receivers)
    if (hit.id === 435) {
      toggleLever(hit.x, hit.y, hit.z, s.blockDirs, {
        getBlock: ctx.getBlock,
        edit: ctx.edit,
        playLeverClick,
        playDoorUse: ctx.playDoorUse,
        showToast: ctx.showToast
      });
      return;
    }

    // Spider egg: right-click a cobweb to hatch a decorative web spider
    if (curBlock === SPIDER_EGG_ID) {
      if (isCobwebId(hit.id)) {
        const hatched = ctx.spawnWebSpider ? ctx.spawnWebSpider(hit.x, hit.y, hit.z) : false;
        if (hatched) {
          ctx.playPlace(SPIDER_EGG_ID);
          if (!s.creative) ctx.deductHotbarSlot(s.slot);
        } else {
          ctx.showToast("🕷 A spider already lives on this web");
        }
      } else {
        ctx.showToast("🕷 Place the Spider Egg onto a cobweb to hatch it");
      }
      return;
    }

    if ((hit.id === 85 || hit.id === 86 || isFireId(hit.id)) && (curBlock === 0 || curBlock === 1129)) {
      s.swingTimer = 1.0;
      ctx.playSwing?.();
      playFireCrackle(1);
      if (s.fx) {
        const specs = moteForBlock(hit.id);
        if (specs) for (const spec of specs) s.fx.spawnMote(hit.x + 0.5, hit.y + 0.6 + (spec.dy ?? 0), hit.z + 0.5, spec.color, spec.kind, 3);
      }
      const key = hit.x + "," + hit.y + "," + hit.z;
      const em = s.emitters.get(key);
      if (em) {
        const timers = ((s as any).stokeTimers ??= new Map<string, number>());
        const prev = timers.get(key);
        if (prev) clearTimeout(prev);
        em.power = (BLOCK_MAP.get(hit.id)?.lightPower || em.power) * 2.2;
        timers.set(key, window.setTimeout(() => {
          timers.delete(key);
          if (ctx.getBlock(hit.x, hit.y, hit.z) !== hit.id) return;
          const cur = s.emitters.get(key);
          if (cur) cur.power = BLOCK_MAP.get(hit.id)?.lightPower || cur.power;
        }, 1800));
      }
      return;
    }

    // Mug: catch a web spider to relocate it (hand shows the caught spider).
    if (curBlock === MUG_ID) {
      if (s.carriedSpider) {
        if (isCobwebId(hit.id)) {
          const released = ctx.releaseWebSpider ? ctx.releaseWebSpider(hit.x, hit.y, hit.z) : false;
          if (released) {
            const nm = s.carriedSpider.name ? ` ${s.carriedSpider.name}` : "";
            s.carriedSpider = null;
            ctx.refreshHeldItem?.();
            ctx.playPlace(MUG_ID);
            ctx.showToast(`🕷${nm} moved into the new web`);
          } else {
            ctx.showToast("🕷 A spider already lives on this web");
          }
        } else {
          ctx.showToast("🕷 Carry it to another cobweb to release");
        }
        return;
      }
      if (isCobwebId(hit.id)) {
        if (ctx.webSpiderAt && ctx.webSpiderAt(hit.x, hit.y, hit.z)) {
          const caught = ctx.catchWebSpider ? ctx.catchWebSpider(hit.x, hit.y, hit.z) : null;
          if (caught) {
            s.carriedSpider = caught;
            ctx.refreshHeldItem?.();
            ctx.playPlace(MUG_ID);
            const nm = caught.name ? ` ${caught.name}` : "";
            ctx.showToast(`🏺 Caught${nm}! Right-click a cobweb to release`);
          } else {
            ctx.showToast("🏺 Couldn't catch it");
          }
        } else {
          ctx.showToast("🏺 No spider lives on this web");
        }
        return;
      }
      // Otherwise a mug places as a normal cup block (falls through below).
    }

    if (hit.id === 105 || hit.id === 106) {
      const nextDoorId = (hit.id === 105) ? 106 : 105;
      if (nextDoorId === 105) {
        const cells: Array<[number, number, number]> = [[hit.x, hit.y, hit.z]];
        const above = ctx.getBlock(hit.x, hit.y + 1, hit.z);
        const below = ctx.getBlock(hit.x, hit.y - 1, hit.z);
        if (above === 105 || above === 106) cells.push([hit.x, hit.y + 1, hit.z]);
        if (below === 105 || below === 106) cells.push([hit.x, hit.y - 1, hit.z]);
        const blocked = cells.some(([cx2, cy2, cz2]) =>
          s.player.x + PR > cx2 && s.player.x - PR < cx2 + 1 &&
          s.player.z + PR > cz2 && s.player.z - PR < cz2 + 1 &&
          s.player.y + PH > cy2 && s.player.y < cy2 + 1);
        if (blocked) {
          ctx.showToast("🚪 Blocked — step out of the doorway first");
          return;
        }
      }
      ctx.edit(hit.x, hit.y, hit.z, nextDoorId);
      const above = ctx.getBlock(hit.x, hit.y + 1, hit.z);
      const below = ctx.getBlock(hit.x, hit.y - 1, hit.z);
      if (above === 105 || above === 106) ctx.edit(hit.x, hit.y + 1, hit.z, nextDoorId);
      if (below === 105 || below === 106) ctx.edit(hit.x, hit.y - 1, hit.z, nextDoorId);
      ctx.playDoorUse();
      ctx.showToast(nextDoorId === 106 ? "🚪 Door Opened" : "🚪 Door Closed");
      return;
    }
    if (hit.id === 107 || hit.id === 108) {
      const nextTrapId = (hit.id === 107) ? 108 : 107;
      ctx.edit(hit.x, hit.y, hit.z, nextTrapId);
      ctx.showToast(nextTrapId === 108 ? "🪟 Window Shutter Opened" : "🪟 Window Shutter Closed");
      return;
    }
    if (hit.id === 1204) {
      if (ctx.openPortalModal) {
        ctx.openPortalModal(hit.x, hit.y, hit.z);
        return;
      }
    }
    if (hit.id === 15 || hit.id === 93) {
      if (tryIgniteNetherPortal(ctx.getBlock, ctx.edit, hit.x, hit.y, hit.z)) {
        ctx.showToast("🌀 Nether Portal Activated!");
        return;
      }
    }
    if (hit.id === 45) {
      ctx.primeTnt(hit.x, hit.y, hit.z);
      return;
    }
    if (hit.id === 41) {
      ctx.openCraftTable();
      return;
    }
    if (hit.id === 42 || hit.id === 96) {
      ctx.openFurnace(hit.x, hit.y, hit.z);
      return;
    }
    if (hit.id === 43) {
      ctx.openChest(hit.x, hit.y, hit.z);
      return;
    }
    if (hit.id === BED_BYTE || hit.id === BED_ID) {
      if (s.dimension === "nether") {
        ctx.showToast("💥 Intentional Game Design: Beds explode in the Nether!");
        ctx.primeTnt(hit.x, hit.y, hit.z);
        return;
      }
      if (!isNightTime(s.time)) {
        ctx.showToast("You can only sleep at night! ☀️");
        return;
      }
      let monsterNear = false;
      for (const m of ctx.mobs) {
        if (Math.hypot(m.x - hit.x, m.z - hit.z) < 8.0 && Math.abs(m.y - hit.y) < 5.0) {
          monsterNear = true;
          break;
        }
      }
      if (monsterNear) {
        ctx.showToast("You cannot rest now, there are monsters nearby! 🧟");
        return;
      }
      s.player.spawnX = hit.x;
      s.player.spawnZ = hit.z;
      s.time = 24000;
      (s as unknown as { weatherMachine?: { force?: (w: string) => void } }).weatherMachine?.force?.("clear");
      ctx.showToast("Respawn point set! Good morning ☀️");
      return;
    }

    // Respawn Anchor interaction (ID 601)
    if (hit.id === 601) {
      if (s.dimension === "overworld") {
        ctx.showToast("💥 Intentional Game Design: Respawn Anchors explode in the Overworld!");
        ctx.edit(hit.x, hit.y, hit.z, 0);
        ctx.primeTnt(hit.x, hit.y, hit.z);
        return;
      }

      // In the Nether:
      const heldId = s.hotbar[s.slot];
      const anchorKey = `${hit.x},${hit.y},${hit.z}`;
      if (!s.anchorCharges) s.anchorCharges = new Map();
      const currentCharges = s.anchorCharges.get(anchorKey) || 0;

      if (heldId === 47) {
        // Charge with Glowstone
        if (currentCharges < 4) {
          const nextCharges = currentCharges + 1;
          s.anchorCharges.set(anchorKey, nextCharges);
          ctx.deductHotbarSlot(s.slot);
          ctx.playPlace?.(47);
          ctx.showToast(`✨ Respawn Anchor charged (${nextCharges}/4)`);
          return;
        } else {
          ctx.showToast("✨ Respawn Anchor is fully charged (4/4)!");
          return;
        }
      } else {
        // Set spawn point
        if (currentCharges > 0) {
          s.netherSpawnPoint = { x: hit.x, y: hit.y + 1, z: hit.z, anchorKey };
          ctx.showToast(`🧭 Respawn point set! (${currentCharges} charges remaining)`);
          return;
        } else {
          ctx.showToast("⚠️ Respawn Anchor has no charges! Right-click with Glowstone to charge it.");
          return;
        }
      }
    }

    const isShovel = curBlock === 128 || !!BLOCK_MAP.get(curBlock)?.name?.toLowerCase()?.includes("shovel");
    if (hit.id === 1 && hit.ny > 0 && isShovel) {
      ctx.edit(hit.x, hit.y, hit.z, 55);
      ctx.playDig(1);
      ctx.showToast("🌾 Flattened into Dirt Path");
      return;
    }
    const isHoe = curBlock === 129 || !!BLOCK_MAP.get(curBlock)?.name?.toLowerCase()?.includes("hoe");
    if (hit.id === 2 && hit.ny > 0 && isHoe) {
      ctx.edit(hit.x, hit.y, hit.z, 55);
      ctx.playDig(2);
      ctx.showToast("🌱 Tilled Soil into Farmland");
      return;
    }

    const bx = hit.x + hit.nx, by = hit.y + hit.ny, bz = hit.z + hit.nz;
    const x = bx, y = by, z = bz;
    if (curBlock === PAINTING_ITEM_ID) {
      if (ctx.tryPlacePainting && ctx.tryPlacePainting(hit)) return;
    }
    const existingAtSpot = ctx.getBlock(x, y, z);
    if (y < 0 || y >= CHH || (existingAtSpot !== 0 && existingAtSpot !== 39 && existingAtSpot !== 40)) return;
    const overlap = s.player.x + PR > x && s.player.x - PR < x + 1 &&
                    s.player.z + PR > z && s.player.z - PR < z + 1 &&
                    s.player.y + PH > y && s.player.y < y + 1;
    if (overlap) return;
    const tallPlace = curBlock === 105 || curBlock === 106 || curBlock === 1200 || curBlock === 1202 || curBlock === 1204 || curBlock === 98;
    if (tallPlace && y + 1 < CHH && !ctx.getBlock(x, y + 1, z)) {
      const headOverlap = s.player.x + PR > x && s.player.x - PR < x + 1 &&
                      s.player.z + PR > z && s.player.z - PR < z + 1 &&
                      s.player.y + PH > y + 1 && s.player.y < y + 2;
      if (headOverlap) return;
    }
    if (curBlock <= 0) {
      return;
    }

    const swapSlotTo = (id: number) => {
      const hb = [...s.hotbar];
      hb[s.slot] = id;
      s.hotbar = hb;
      ctx.setHotbar(hb);
    };
    if (curBlock === 135 || curBlock === 136) {
      if (curBlock === 135 && s.dimension === "nether") {
        ctx.showToast("💨 The extreme heat vaporizes the water into steam!");
        ctx.playSplash();
        if (!s.creative) swapSlotTo(134);
        return;
      }
      const liquidId = curBlock === 135 ? 39 : 40;
      if (existingAtSpot === 39 || existingAtSpot === 40) {
        ctx.showToast("Can only pour into air 🧪");
        return;
      }
      ctx.setRaw(x, y, z, liquidId);
      s.edits.set(x + "," + y + "," + z, liquidId);
      ctx.remesh(x, z);
      s.liquidQ.push([x, y, z, liquidId, 0]);
      s.dirtySave = true;
      const targetWorldId = s.dimension === "nether" ? `${ctx.currentWorldId}_nether` : ctx.currentWorldId;
      if (!s.simMode) ctx.apiSaveBlockEdits(targetWorldId, [{ x, y, z, blockId: liquidId, prevBlockId: 0, action: "place" }]);
      if (curBlock === 135) ctx.playSplash(); else ctx.playPlace(136);
      if (!s.creative) swapSlotTo(134);
      return;
    }
    if (curBlock === 134) {
      const lhit = ctx.raycastLiquid(s.player.fly ? 7 : 5);
      if (lhit && (lhit.id === 39 || lhit.id === 40)) {
        ctx.setRaw(lhit.x, lhit.y, lhit.z, 0);
        ctx.dryUpFluids(lhit.x, lhit.y, lhit.z, lhit.id);
        s.edits.set(lhit.x + "," + lhit.y + "," + lhit.z, 0);
        ctx.remesh(lhit.x, lhit.z);
        const dirs = [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, 0], [0, -1, 0]];
        for (const [ddx, ddy, ddz] of dirs) {
          const adj = ctx.getBlock(lhit.x + ddx, lhit.y + ddy, lhit.z + ddz);
          if (adj === 39 || adj === 40) s.liquidQ.push([lhit.x + ddx, lhit.y + ddy, lhit.z + ddz, adj, 0]);
        }
        ctx.playSplash();
        if (!s.creative) swapSlotTo(lhit.id === 39 ? 135 : 136);
        ctx.showToast(lhit.id === 39 ? "💧 Water captured" : "🌋 Lava captured");
        return;
      }
      ctx.showToast("Aim at a water or lava source with the empty bucket 🪣");
      return;
    }

    {
      const bedIdx = curBlock === BED_ID;
      if (bedIdx && BLOCK_MAP.get(curBlock)?.name === "Red bed") {
        s.blockDirs.set(x + "," + y + "," + z, 0);
        ctx.edit(x, y, z, BED_BYTE);
        ctx.playPlace(BED_BYTE);
        if (!s.creative) ctx.deductHotbarSlot(s.slot);
        return;
      }
    }

    if (isItemOnly(curBlock)) {
      const itemName = BLOCK_MAP.get(curBlock)?.name || "Item";
      ctx.showToast(`✕ ${itemName} is an item — use the Creative Catalog hotbar but it can't be placed as a block`);
      return;
    }

    if (BLOCK_MAP.get(curBlock)?.stair) {
      const sy = Math.sin(s.player.yaw);
      const cy = Math.cos(s.player.yaw);
      let facing = 0;
      if (Math.abs(cy) > Math.abs(sy)) {
        facing = cy < 0 ? 0 : 1;
      } else {
        facing = sy > 0 ? 3 : 2;
      }
      s.blockDirs.set(x + "," + y + "," + z, facing);
      const dirC = ctx.getChunk(x >> 4, z >> 4);
      if (dirC) {
        if (!dirC.dirs) dirC.dirs = new Uint16Array(CH * CHH * CH);
        dirC.dirs[y * 256 + (z & 15) * 16 + (x & 15)] = facing + 1;
      }
    }

    if (curBlock === 105 || curBlock === 106 || curBlock === 107 || curBlock === 108) {
      const sy = Math.sin(s.player.yaw);
      const cy = Math.cos(s.player.yaw);
      let facing = 0;
      if (Math.abs(cy) > Math.abs(sy)) facing = cy < 0 ? 0 : 1;
      else facing = sy > 0 ? 3 : 2;
      const frac = (hit.y + hit.ny) - Math.floor(hit.y + hit.ny);
      const halfTop = (curBlock === 107 || curBlock === 108) && frac > 0.5;
      const dv = facing + 1 + (halfTop ? 4 : 0);
      const doorCells: Array<[number, number, number]> = [[x, y, z]];
      if (curBlock === 105 || curBlock === 106) doorCells.push([x, y + 1, z]);
      for (const [cx2, cy2, cz2] of doorCells) {
        s.blockDirs.set(cx2 + "," + cy2 + "," + cz2, dv);
        const dirC = ctx.getChunk(cx2 >> 4, cz2 >> 4);
        if (dirC) {
          if (!dirC.dirs) dirC.dirs = new Uint16Array(CH * CHH * CH);
          dirC.dirs[cy2 * 256 + (cz2 & 15) * 16 + (cx2 & 15)] = dv;
        }
      }
    }

    if (curBlock === 43) {
      // Chests face towards the player when placed
      const sy = Math.sin(s.player.yaw);
      const cy = Math.cos(s.player.yaw);
      let facing = 0;
      if (Math.abs(cy) > Math.abs(sy)) facing = cy < 0 ? 0 : 1;
      else facing = sy > 0 ? 3 : 2;
      s.blockDirs.set(x + "," + y + "," + z, facing);
      const dirC = ctx.getChunk(x >> 4, z >> 4);
      if (dirC) {
        if (!dirC.dirs) dirC.dirs = new Uint16Array(CH * CHH * CH);
        dirC.dirs[y * 256 + (z & 15) * 16 + (x & 15)] = facing + 1;
      }
    }

    if ((BLOCK_MAP.get(curBlock) as BlockDef & { customAssetId?: number } | undefined)?.customAssetId) {
      const facing = facingFromPlayerYaw();
      s.blockDirs.set(x + "," + y + "," + z, facing);
      const dirC = ctx.getChunk(x >> 4, z >> 4);
      if (dirC) {
        if (!dirC.dirs) dirC.dirs = new Uint16Array(CH * CHH * CH);
        dirC.dirs[y * 256 + (z & 15) * 16 + (x & 15)] = facing + 1;
      }
    }

    if (curBlock === 80 || curBlock === 81 || curBlock === 84) {
      let torchOrient = 0;
      if (hit.ny === -1) torchOrient = 5;
      else if (hit.nx === 1) torchOrient = 3;
      else if (hit.nx === -1) torchOrient = 4;
      else if (hit.nz === 1) torchOrient = 1;
      else if (hit.nz === -1) torchOrient = 2;
      s.blockDirs.set(x + "," + y + "," + z, torchOrient);
      const dirC = ctx.getChunk(x >> 4, z >> 4);
      if (dirC) {
        if (!dirC.dirs) dirC.dirs = new Uint16Array(CH * CHH * CH);
        dirC.dirs[y * 256 + (z & 15) * 16 + (x & 15)] = torchOrient;
      }
    }

    // Cobweb Sparse: single diagonal plane follows the placer's facing
    // (diag 0 for ±Z, diag 1 for ±X), stored in chunk dirs like stairs.
    if (curBlock === 1207) {
      const diag = facingFromPlayerYaw() % 2;
      s.blockDirs.set(x + "," + y + "," + z, diag);
      const dirC = ctx.getChunk(x >> 4, z >> 4);
      if (dirC) {
        if (!dirC.dirs) dirC.dirs = new Uint16Array(CH * CHH * CH);
        dirC.dirs[y * 256 + (z & 15) * 16 + (x & 15)] = diag + 1;
      }
    }

    let placeBlock = curBlock;
    if (curBlock === 87 && (hit.id === 57 || hit.id === 632)) {
      placeBlock = 630; // Soul Fire
    }
    ctx.edit(x, y, z, placeBlock);
    if ((curBlock === 105 || curBlock === 106) && y + 1 < CHH && !ctx.getBlock(x, y + 1, z)) {
      ctx.edit(x, y + 1, z, curBlock);
    }
    if (curBlock === 1200 && y + 1 < CHH && !ctx.getBlock(x, y + 1, z)) {
      ctx.edit(x, y + 1, z, 1201);
    }
    if (curBlock === 1202 && y + 1 < CHH && !ctx.getBlock(x, y + 1, z)) {
      ctx.edit(x, y + 1, z, 1203);
    }
    if ((curBlock === 1204 || curBlock === 98) && y + 1 < CHH && !ctx.getBlock(x, y + 1, z)) {
      ctx.edit(x, y + 1, z, curBlock);
    }
    if (curBlock === 1204) {
      ctx.openPortalModal?.(x, y, z);
    }
    if (curBlock === 15 || curBlock === 93) {
      tryIgniteNetherPortal(ctx.getBlock, ctx.edit, x, y, z);
    }
    // Chest: after the voxel is written, reconcile the pair (single ↔ large) so a
    // chest placed beside another merges into a large chest (or stays single next
    // to a large one).
    if (curBlock === 43 && ctx.spawnChestEntity) {
      ctx.spawnChestEntity(x, y, z);
    }

    ctx.playPlace(curBlock);
    if (s.fx) {
      const tile = (BLOCK_MAP.get(curBlock)?.side ?? 1);
      const col = sampleAtlasColor(s.atlasTex, tile) || new THREE.Color(0x9a9a9a);
      s.fx.spawnBurst(x + 0.5 - hit.nx * 0.5, y + 0.5 - hit.ny * 0.5, z + 0.5 - hit.nz * 0.5, -hit.nx, -hit.ny, -hit.nz, col, 10);
    }
    if (!s.creative) ctx.deductHotbarSlot(s.slot);
    if (curBlock === 39 || curBlock === 40) {
      s.liquidQ.push([x, y, z, curBlock, 0]);
    }
    if (curBlock === 138) {
      let absorbed = 0;
      const R = 3;
      for (let dx = -R; dx <= R; dx++) {
        for (let dy = -R; dy <= R; dy++) {
          for (let dz = -R; dz <= R; dz++) {
            if (dx*dx + dy*dy + dz*dz <= R*R + 1) {
              const wx = x + dx, wy = y + dy, wz = z + dz;
              if (ctx.getBlock(wx, wy, wz) === 39) {
                ctx.edit(wx, wy, wz, 0, false);
                absorbed++;
              }
            }
          }
        }
      }
      if (absorbed > 0) {
        ctx.edit(x, y, z, 139);
        ctx.playSplash();
        ctx.showToast(`🧽 Sponge absorbed ${absorbed} water blocks!`);
        return;
      }
    }

    if (curBlock === 10 || curBlock === 12) {
      ctx.checkFallingBlocks(x, y, z);
    }
    if (curBlock === 8 || curBlock === 80 || curBlock === 81 || curBlock === 46 || curBlock === 82 || curBlock === 40 || curBlock === 85 || curBlock === 86) {
      const dirs = [[1,0,0], [-1,0,0], [0,0,1], [0,0,-1], [0,1,0], [0,-1,0]];
      for (const [ddx, ddy, ddz] of dirs) {
        if (ctx.getBlock(x + ddx, y + ddy, z + ddz) === 52) {
          ctx.edit(x + ddx, y + ddy, z + ddz, 39);
          ctx.playSplash();
        }
      }
    }
    if (curBlock === 84) {
      const dirs = [[1,0,0], [-1,0,0], [0,0,1], [0,0,-1], [0,1,0], [0,-1,0]];
      for (const [ddx, ddy, ddz] of dirs) {
        const adjId = ctx.getBlock(x + ddx, y + ddy, z + ddz);
        if (adjId === 105) { ctx.edit(x + ddx, y + ddy, z + ddz, 106); ctx.playDoorUse(); }
        else if (adjId === 107) { ctx.edit(x + ddx, y + ddy, z + ddz, 108); }
        else if (adjId === 45) { ctx.primeTnt(x + ddx, y + ddy, z + ddz); }
      }
    }
  }

  function minePenalty(): number {
    const eyeB = ctx.getBlock(Math.floor(s.player.x), Math.floor(s.player.y + 1.62), Math.floor(s.player.z));
    if (eyeB !== 39) return 1;
    if (!s.player.ground && ctx.getBlock(Math.floor(s.player.x), Math.floor(s.player.y - 0.02), Math.floor(s.player.z)) !== 0) return 5;
    if (!s.player.ground) return 25;
    return 5;
  }

  function startMining(): void {
    s.swingTimer = 1.0;
    const lookDir = {
      x: -Math.sin(s.player.yaw) * Math.cos(s.player.pitch),
      y: Math.sin(s.player.pitch),
      z: -Math.cos(s.player.yaw) * Math.cos(s.player.pitch)
    };
    if (ctx.mobMgr?.fireballMgr?.tryDeflect?.({ x: s.player.x, y: s.player.y + 1.6, z: s.player.z }, lookDir)) {
      ctx.showToast("🔥 Return to Sender! Deflected Ghast Fireball!");
      ctx.playSwing?.();
      return;
    }
    const hit = ctx.raycast(s.player.fly ? 7 : 5);
    if (!hit || hit.id === 14 || hit.y <= 0) { ctx.playSwing?.(); return; }
    if (hit.id === 39 || hit.id === 40) return;
    const holdDuration = (s.creative ? 0 : getMineTime(hit.id, s.hotbar[s.slot] || 0)) * minePenalty();
    s.mining = {
      x: hit.x,
      y: hit.y,
      z: hit.z,
      prog: 0,
      needed: holdDuration,
      durability: holdDuration,
      maxDurability: holdDuration,
      sndT: 0
    };
    if (s.fx) {
      s.fx.showCrack(hit.x, hit.y, hit.z, hit.nx, hit.ny, hit.nz);
      s.fx.setCrackStage(1);
    }
    ctx.playSwing?.();
  }

  function pickBlock(): void {
    const hit = ctx.raycast(s.player.fly ? 7 : 5);
    if (!hit || hit.id <= 0) return;
    const hb = [...s.hotbar];
    hb[s.slot] = hit.id === 1201 ? 1200 : (hit.id === 1203 ? 1202 : hit.id);
    s.hotbar = hb;
    ctx.setHotbar(hb);
    ctx.setHotbarCounts?.(prev => { const c = [...prev]; c[s.slot] = 64; return c; });
    if (s.fx) s.fx.spawnBurst(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5, hit.nx, hit.ny, hit.nz, new THREE.Color(0x66ffe0), 4);
    ctx.playSwing?.();
  }

  function breakBlock(forceHit?: { x: number; y: number; z: number; nx: number; ny: number; nz: number; id: number } | null): void {
    s.swingTimer = 1.0; // Trigger First-Person Arm Swing
    const hit = forceHit !== undefined ? forceHit : ctx.raycast(s.player.fly ? 7 : 5);
    if (!hit) {
      ctx.playSwing?.();
      return;
    }
    if (hit && hit.y > 0) {
      if (!s.creative && hit.id === 14) { ctx.showToast("Bedrock is unbreakable!"); return; }
      // Capture the chest pair BEFORE the voxel is cleared so contents split
      // correctly (broken half ejects; surviving half stays a small chest).
      const chestPairBefore = hit.id === 43 ? computeChestPair(ctx.getBlock, hit.x, hit.y, hit.z) : null;
      ctx.edit(hit.x, hit.y, hit.z, 0);

      // Multi-block / Double Objects Broken as 1 Cohesive Piece:
      // 1. Doors (105 closed, 106 open): Breaking upper or lower half breaks both halves simultaneously!
    if (hit.id === 105 || hit.id === 106) {
        const above = ctx.getBlock(hit.x, hit.y + 1, hit.z);
        const below = ctx.getBlock(hit.x, hit.y - 1, hit.z);
        if (above === 105 || above === 106) ctx.edit(hit.x, hit.y + 1, hit.z, 0);
        if (below === 105 || below === 106) ctx.edit(hit.x, hit.y - 1, hit.z, 0);
      }
      // 2. Double-Tall Plants, Flowers & Portals (124, 125, 126, 1200, 1201, 1202, 1203, 1204, 98):
      if (hit.id === 124 || hit.id === 125 || hit.id === 126 || hit.id === 1200 || hit.id === 1201 || hit.id === 1202 || hit.id === 1203 || hit.id === 1204 || hit.id === 98) {
        const above = ctx.getBlock(hit.x, hit.y + 1, hit.z);
        const below = ctx.getBlock(hit.x, hit.y - 1, hit.z);
        if (above === hit.id || (hit.id === 1200 && above === 1201) || (hit.id === 1202 && above === 1203)) ctx.edit(hit.x, hit.y + 1, hit.z, 0);
        if (below === hit.id || (hit.id === 1201 && below === 1200) || (hit.id === 1203 && below === 1202)) ctx.edit(hit.x, hit.y - 1, hit.z, 0);
      }
      // 3. Bed (Double Horizontal Blocks):
      if (hit.id === BED_BYTE || hit.id === BED_ID) {
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [dx, dz] of dirs) {
          if (ctx.getBlock(hit.x + dx, hit.y, hit.z + dz) === 104) {
            ctx.edit(hit.x + dx, hit.y, hit.z + dz, 0);
          }
        }
      }
      // 4. Obsidian Portal Frame (dispels connected portal aperture if broken):
      if (hit.id === 15 || hit.id === 93) {
        breakPortalAperture(ctx.getBlock, ctx.edit, hit.x, hit.y, hit.z);
      }
      // 4. Chest Entity cleanup & Large chest split: re-pair surviving neighbours
      //    (a broken half's partner becomes a single; further pairs are untouched).
      if (hit.id === 43) {
        const key = `${hit.x},${hit.y},${hit.z}`;
        const ce = s.chestEntities?.get(key);
        if (ce) {
          if (s.scene) s.scene.remove(ce.root);
          if (s.chestEntities) s.chestEntities.delete(key);
        }
        if (ctx.getBlock(hit.x - 1, hit.y, hit.z) === 43) ctx.spawnChestEntity?.(hit.x - 1, hit.y, hit.z);
        if (ctx.getBlock(hit.x + 1, hit.y, hit.z) === 43) ctx.spawnChestEntity?.(hit.x + 1, hit.y, hit.z);
      }

      ctx.playDig(hit.id);
      // Block-break particle burst, colored from the atlas tile
      if (s.fx) {
        const tile = (BLOCK_MAP.get(hit.id)?.side ?? 1);
        const col = sampleAtlasColor(s.atlasTex, tile) || new THREE.Color(0x9a9a9a);
        s.fx.spawnBurst(hit.x + 0.5 - hit.nx * 0.5, hit.y + 0.5 - hit.ny * 0.5, hit.z + 0.5 - hit.nz * 0.5, hit.nx, hit.ny, hit.nz, col, 16);
        s.fx.hideCrack();
      }
      // XP from ores (wiki values) + survival exhaustion cost + autosave feedback
      if (s.xp) {
        const base = ORE_XP[hit.id] || 0;
        if (base > 0) s.xp.spawnOrbs(hit.x + 0.5, hit.y + 0.9, hit.z + 0.5, Math.max(1, Math.round(base * (0.6 + Math.random() * 0.7))));
      }
      if (!s.creative) {
        s.exhaustion += 0.05;
        const nowT = performance.now();
        if (nowT - (s.lastSaveToastAt || 0) > 30000) {
          s.lastSaveToastAt = nowT;
          ctx.showToast("💾 World saved ✓");
        }
      }
      // Survival: mine the block → drop 3D mini-blocks onto the ground (authentic 2010 vanilla drops)
      if (!s.creative) {
        const heldId = s.hotbar[s.slot] || 0;
        const drops = getBlockDrops(hit.id, heldId);
        const isNakedHand = heldId === 0;
        for (const d of drops) {
          if (d.count <= 0) continue;
          if (s.itemDrops) {
            s.itemDrops.spawnDrop(hit.x + 0.5, hit.y + 0.35, hit.z + 0.5, d.id, d.count, isNakedHand);
          } else if (ctx.inventoryAddItem) {
            const leftover = ctx.inventoryAddItem(d.id, d.count);
            if (leftover > 0) ctx.showToast("Inventory full! Some drops lost 😢");
          }
        }

        // Tool Durability Loss & Tool Breaking (vanilla parity)
        const tool = getToolInfo(heldId);
        if (tool) {
          const hardness = getBlockHardness(hit.id);
          if (hardness > 0.05) {
            const optimal = getBlockTool(hit.id);
            const cost = (optimal && optimal === tool.type) ? 1 : 2;
            if (!s.hotbarDamage) s.hotbarDamage = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            const curDmg = s.hotbarDamage[s.slot] || 0;
            const newDmg = curDmg + cost;
            if (newDmg >= tool.maxDurability) {
              // Tool breaks!
              s.hotbar[s.slot] = 0;
              s.hotbarCounts[s.slot] = 0;
              s.hotbarDamage[s.slot] = 0;
              ctx.setHotbar([...s.hotbar]);
              ctx.setHotbarCounts?.([...s.hotbarCounts]);
              ctx.setHotbarDamage?.([...s.hotbarDamage]);
              ctx.playDig(6);
              ctx.showToast(`Your ${BLOCK_MAP.get(heldId)?.name || "Tool"} broke! 💥`);
            } else {
              s.hotbarDamage[s.slot] = newDmg;
              ctx.setHotbarDamage?.([...s.hotbarDamage]);
            }
          }
        }
      }
      // Chest: eject stored contents (vanilla parity). A large-chest pair splits:
      // the broken half's 27 slots are ejected, the other half stays a small chest.
      if (hit.id === 43 && chestPairBefore) {
        const pair = chestPairBefore;
        const pairKey = `${pair.leftX},${hit.y},${hit.z}`;
        const merged = pair.isLarge ? s.chestMap.get(pairKey) : null;
        const eject = (slots: Array<{ id: number; count: number } | null>) => {
          for (const sl of slots) {
            if (!sl) continue;
            if (s.itemDrops) {
              s.itemDrops.spawnDrop(hit.x + 0.5, hit.y + 0.4, hit.z + 0.5, sl.id, sl.count);
            } else if (ctx.inventoryAddItem) {
              const leftover = ctx.inventoryAddItem(sl.id, sl.count);
              if (leftover > 0) ctx.showToast("Inventory full! Some chest items lost 😢");
            }
          }
        };
        if (pair.isLarge && merged && merged.length === 54) {
          const isLeftHalf = hit.x === pair.leftX;
          const mine = isLeftHalf ? merged.slice(0, 27) : merged.slice(27, 54);
          const other = isLeftHalf ? merged.slice(27, 54) : merged.slice(0, 27);
          const survivorX = isLeftHalf ? pair.rightX : pair.leftX;
          s.chestMap.delete(pairKey);
          s.chestMap.set(`${survivorX},${hit.y},${hit.z}`, other);
          eject(mine);
        } else {
          const own = s.chestMap.get(`${hit.x},${hit.y},${hit.z}`) || (pair.isLarge ? s.chestMap.get(pairKey) : null) || [];
          s.chestMap.delete(`${hit.x},${hit.y},${hit.z}`);
          if (!pair.isLarge) s.chestMap.delete(pairKey);
          eject(own);
        }
      }
      // If broken block was holding liquid, trigger liquid flow from adjacent blocks
      const dirs = [[0, 1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]];
      for (const [dx, dy, dz] of dirs) {
        const adj = ctx.getBlock(hit.x + dx, hit.y + dy, hit.z + dz);
        if (adj === 39 || adj === 40) {
          s.liquidQ.push([hit.x + dx, hit.y + dy, hit.z + dz, adj, 0]);
        }
      }
      // Trigger Sand/Gravel gravity check for any unsupported blocks above
      ctx.checkFallingBlocks(hit.x, hit.y + 1, hit.z);
    }
  }

  return { placeBlock, breakBlock, pickBlock, startMining, minePenalty };
}

export interface MiningTimerState {
  x: number;
  y: number;
  z: number;
  prog: number;
  needed: number;
  durability: number;
  maxDurability: number;
  sndT: number;
}

/**
 * Sets up an event listener for Creative mode instant block deletion upon click.
 * Returns an unbind function for cleanup.
 */
export function setupCreativeInteractionListener(
  target: EventTarget,
  listener: (e: MouseEvent) => void
): () => void {
  const handler = (e: Event) => listener(e as MouseEvent);
  target.addEventListener("click", handler);
  return () => {
    target.removeEventListener("click", handler);
  };
}

/**
 * Initializes a survival mining timer for a targeted block with its specified durability.
 */
export function startMiningTimer(
  hit: RaycastHit,
  durability: number
): MiningTimerState {
  return {
    x: hit.x,
    y: hit.y,
    z: hit.z,
    prog: 0,
    needed: durability,
    durability,
    maxDurability: durability,
    sndT: 0
  };
}

/**
 * Advances the survival mining timer while the interaction button is held.
 * Decreases the block's durability over time until it reaches zero.
 */
export function tickMiningTimer(
  state: MiningTimerState,
  dt: number
): { broken: boolean; stage: number } {
  state.prog += dt;
  state.durability = Math.max(0, state.durability - dt);
  const stage = Math.floor(1 + Math.min(1, state.prog / state.needed) * 9);
  const broken = state.durability <= 0 || state.prog >= state.needed;
  return { broken, stage };
}
