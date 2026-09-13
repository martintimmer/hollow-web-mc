import * as THREE from "three";
import type { GameState } from "../state/gameState";
import { CH, EYE } from "../world";
import { BLOCK_MAP, isSolid } from "../blocks";
import { perf, captureHeapMB, isTelemetryEnabled } from "../telemetry";
import { encodeCanvasToPngBlob } from "../snapshotEncoder";
import { applyOrbitCamera } from "./orbitControls";
import { updateChestAnimation } from "../chest";
import { createWorldFX, sampleAtlasColor } from "../particles";
import { moteForBlock } from "../ambientParticles";
import { ArrowManager } from "./arrows";
import { createWeatherMachine, seedStateFrom, weatherLightTarget, smoothWeatherLight } from "../weatherMachine";
import { createXpSystem, levelForXp } from "../xp";
import { isNightTime, advanceTime } from "../time";
import { tickAmbientMusic, setUnderwaterAudio } from "../music";
import { multiplayer } from "../../services/multiplayer";
import { villagerInTradeRange, isVillagerAimed, TRADE_AIM_DIST } from "../villagers";
import type { MapMarker } from "./worldMap";
import { renderWithPostFx, setPostFxFocus, isDofActive, setPostFxWhiteBalance, setPostFxGrade } from "./postFx";
import { stepLightMeter, emitterOutMul, emitterVisibility, whiteBalanceGain, WB_ADAPT_SECONDS, formatShutter, moonLitFrac } from "./lightMeter";
import { maybeStepTtlMeter } from "./ttlMeter";
import { refreshShadowCasterFlags } from "./chunkMesher";
import type { PlayerStepTimers } from "../physics/playerPhysics";
import type { MobManager } from "../entities/spawner";
import type { WebSpiderManager } from "../entities/webSpider";
import { updateWebSpiderKinematics } from "../entities/webSpider";
import type { SurfaceInfo } from "../terrain/terrainGenerator";
import { getFoodNutrition } from "../food";
import { playEat, playBurp, playCaveDrone, playThunderCrack, playRainPatter, playNetherRumble, playFireCrackle, setUnderwaterSfx } from "../sfx";
import { createWeatherSystem, type WeatherSystem } from "../weather";
import { makeClouds, paintMoonPhase } from "../visuals";
import { makeNoise } from "../noise";
import { createItemDropManager } from "../entities/itemDrops";
import { driveBoat } from "../entities/boat";


export interface RaycastHit {
  x: number;
  y: number;
  z: number;
  nx: number;
  ny: number;
  nz: number;
  id: number;
}

export interface RenderLoopCtx {
  s: GameState;
  qualityPreset: "smooth" | "balanced" | "beautiful";
  tex: THREE.CanvasTexture;
  stepTimers: PlayerStepTimers;
  mobMgr: MobManager;
  webSpiderMgr?: WebSpiderManager;
  wandManager: { state: { activeDoc: unknown }; updateGhostPosition: (hit: RaycastHit | null) => void };
  miniCanvasRef: { current: HTMLCanvasElement | null };
  bigCanvasRef: { current: HTMLCanvasElement | null };
  isoThumbsRef: { current: Map<number, string> };
  rescan: (pcx: number, pcz: number) => void;
  updateHorizonMesh: (force?: boolean) => void;
  stream: (budgetMs: number) => void;
  stepVillagers: (dt: number) => void;
  step: (dt: number) => void;
  stepLiquids: () => void;
  drawMap: (cv: HTMLCanvasElement | null, blocksPerPx: number, circular: boolean, markers?: MapMarker[]) => void;
  getMapMarkers?: () => MapMarker[];
  getBlock: (x: number, y: number, z: number) => number;
  damagePlayer: (raw: number) => void;
  spawnSafeAt: (x: number, y: number, z: number) => boolean;
  surfaceAt: (x: number, z: number) => SurfaceInfo;
  processTnt: (now: number, dt: number) => void;
  tickFurnace: (dt: number) => void;
  raycast: (max: number) => RaycastHit | null;
  mineHoldTime: (id: number, heldId: number) => number;
  minePenalty: () => number;
  breakBlock: (forceHit?: RaycastHit | null) => void;
  updateHeldItem: (blockId: number) => void;
  playDig: (id: number) => void;
  playLevelUp: () => void;
  showToast: (msg: string) => void;
  inventoryAddItem?: (id: number, count: number) => number;
  tickPortal?: (dt: number) => void;
  setDetectedHz: (v: number) => void;
  setTimeFormatted: (v: string) => void;
  setDayCount: (v: number) => void;
  setFps: (v: number) => void;
  setHealth: (v: number) => void;
  setHungerBar: (v: number) => void;
  setXpBar: (v: { level: number; progress: number }) => void;
  setHoveredBlockName: (v: string | null) => void;
  setAimedVillager: (v: any) => void;
  setIsUnderwater: (v: boolean) => void;
  setIsUnderLava: (v: boolean) => void;
  syncCustomAssets: () => void;
  syncPaintings: () => void;
}

export interface RenderLoop {
  frame: (now: number) => void;
  hudSnapshot: (opts: { fps: number; timeStr: string; seed: string | number; worldLabel: string }) => Promise<Blob | null>;
}

export function createRenderLoop(ctx: RenderLoopCtx): RenderLoop {
  const s = ctx.s;

  const _sunDir = new THREE.Vector3();
  const _moonDir = new THREE.Vector3();
  const _xpTarget = new THREE.Vector3();
  const _colZen = new THREE.Color();
  const _colHor = new THREE.Color();
  const _colFog = new THREE.Color();
  const _colLerp = new THREE.Color();
  const _white = new THREE.Color(0xffffff);
  const _specDir = new THREE.Vector3();
  const _specNoLight = new THREE.Color(0, 0, 0);
  const _bowDir = new THREE.Vector3();
  let weatherSys: WeatherSystem | null = null;
  if (s.scene) weatherSys = createWeatherSystem(s.scene);
  const weatherMachine = createWeatherMachine(seedStateFrom(s.cloudWeather || "cloudy"));
  (s as any).weatherMachine = weatherMachine;

  let last = performance.now(), lastFpsUpdate = performance.now(), frames = 0, mapDrawT = 0, ambientT = 0;
  let emitterNearCache: Array<{ x: number; y: number; z: number; id?: number }> = [];
  let emitterNearAt = 0;
  let lastRenderTime = performance.now();
  let lastShadowAt = 0, lastShadowCX = 1e9, lastShadowCZ = 1e9;
  let lastNetherShadow: boolean | null = null;
  let lastShadowsOnFlag: boolean | null = null;
  let lastDayShadow: boolean | null = null;
  let flashAt = -1e9, nextFlashAt = 0;
  let cloudMorph: { t: number; mode: "clear" | "cloudy" | "overcast"; swapped: boolean } | null = null;
  let lastCustomAssetSyncAt = 0;
  let coarseInput = false;
  try { coarseInput = matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 1; } catch {}
  let hzSamples: number[] = [], detectedRefresh = 120;
  const cSunCol = new THREE.Color();

  const _iconCache = new Map<number, HTMLImageElement>();
  interface HudSnapshotOpts {
    fps: number;
    timeStr: string;
    seed: string | number;
    worldLabel: string;
  }
  function hudSnapshot(opts: HudSnapshotOpts): Promise<Blob | null> {
    const src = s.renderer?.domElement as HTMLCanvasElement | undefined;
    if (!src) return Promise.resolve(null);
    return createImageBitmap(src).then((bmp) => {
      const w = bmp.width, h = bmp.height;
      const cv = document.createElement("canvas");
      cv.width = w; cv.height = h;
      const c2d = cv.getContext("2d")!;
      c2d.drawImage(bmp, 0, 0);
      bmp.close();
      const pad = Math.round(h * 0.018);
      const fontSize = Math.max(13, Math.round(h * 0.017));
      c2d.font = `600 ${fontSize}px ui-monospace, Menlo, monospace`;
      c2d.textBaseline = "top";

      const statusLines = [
        `⚡ ${opts.fps} FPS · ${s.detectedHz} Hz Display · Max ${s.maxFps > 0 ? s.maxFps : "∞"} · ${s.active ? "ACTIVE" : "PAUSED"}`,
        `XYZ ${s.player.x.toFixed(1)} / ${s.player.y.toFixed(1)} / ${s.player.z.toFixed(1)} · Chunks ${s.chunks.size} · RD ${s.render} · ${Math.round(s.meterLux || 0)} LUX(sc${Math.round(s.meterSceneLux || 0)}+em${Math.round(s.meterEmitterLux || 0)}) P f/${s.meterN || 2.8} ${formatShutter(s.meterT || 1 / 60)} ISO${s.meterISO || 100} ${(s.evComp > 0 ? "+" : "") + (s.evComp || 0).toFixed(1)} ${(s.metering || "matrix").toUpperCase()} · ${Math.round(s.wbK || 6500)}K`,
        `${opts.timeStr} · ${opts.worldLabel} · Seed ${opts.seed}`
      ];
      const startX = pad, startY = pad;
      const lineH = fontSize + Math.max(6, Math.round(h * 0.012));
      c2d.fillStyle = "rgba(10, 8, 6, 0.55)";
      c2d.fillRect(startX - Math.round(fontSize * 0.35), startY - Math.round(fontSize * 0.35), w * 0.72, lineH * 3 + Math.round(fontSize * 0.7));
      c2d.fillStyle = "rgba(255, 255, 255, 0.92)";
      statusLines.forEach((t, i) => c2d.fillText(t, startX, startY + i * lineH));
      c2d.fillStyle = "rgba(233, 224, 203, 0.85)";

      const cx = w / 2, cy = h / 2, csz = Math.max(4, Math.round(h * 0.006));
      c2d.strokeStyle = "rgba(255,255,255,0.9)";
      c2d.lineWidth = Math.max(1.5, Math.round(h * 0.0025));
      c2d.beginPath();
      c2d.moveTo(cx - csz * 1.6, cy); c2d.lineTo(cx - csz * 0.4, cy);
      c2d.moveTo(cx + csz * 0.4, cy); c2d.lineTo(cx + csz * 1.6, cy);
      c2d.moveTo(cx, cy - csz * 1.6); c2d.lineTo(cx, cy - csz * 0.4);
      c2d.moveTo(cx, cy + csz * 0.4); c2d.lineTo(cx, cy + csz * 1.6);
      c2d.stroke();

      const slots = s.hotbar.length;
      const slotW = Math.max(30, Math.round(h * 0.048));
      const gap = Math.max(3, Math.round(h * 0.004));
      const barW = slots * (slotW + gap) + gap;
      const barH = slotW + gap * 2;
      const bx = w / 2 - barW / 2, by = h - barH - pad;

      return new Promise<Blob | null>((resolve) => {
        let iconsPending = 0;
        c2d.fillStyle = "rgba(16, 13, 11, 0.62)";
        c2d.strokeStyle = "rgba(30, 25, 20, 0.9)";
        c2d.lineWidth = Math.max(1, Math.round(h * 0.0016));
        for (let i = 0; i < slots; i++) {
          const x = bx + gap + i * (slotW + gap), y = by + gap;
          c2d.fillRect(x, y, slotW, slotW);
          c2d.strokeRect(x, y, slotW, slotW);
          const id = s.hotbar[i];
          if (id && id > 0) {
            const cnt = s.hotbarCounts && s.hotbarCounts[i] != null ? s.hotbarCounts[i] : 64;
            const url = ctx.isoThumbsRef.current.get(id);
            const img = url ? _iconCache.get(id) : undefined;
            if (img && img.complete) c2d.drawImage(img, x, y, slotW, slotW);
            else if (url) {
              const im = new Image();
              im.onload = () => { c2d.drawImage(im, x, y, slotW, slotW); resolveSnapshotIfDone(); };
              im.onerror = () => { resolveSnapshotIfDone(); };
              iconsPending++;
              im.src = url;
              _iconCache.set(id, im);
            }
            if (cnt < 64) {
              c2d.font = `600 ${Math.round(slotW * 0.32)}px ui-monospace, Menlo, monospace`;
              c2d.textBaseline = "bottom";
              c2d.fillStyle = "#fff";
              c2d.fillText(String(cnt), x + slotW - Math.round(slotW * 0.08), y + slotW - Math.round(slotW * 0.06));
            }
          }
          if (i === s.slot) {
            c2d.strokeStyle = "rgba(255, 255, 255, 0.95)";
            c2d.lineWidth = Math.max(2, Math.round(h * 0.0028));
            c2d.strokeRect(x, y, slotW, slotW);
            c2d.strokeStyle = "rgba(30, 25, 20, 0.9)";
          }
        }
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          encodeCanvasToPngBlob(cv, w, h).then((b) => resolve(b));
        };
        const resolveSnapshotIfDone = () => { iconsPending--; if (iconsPending <= 0) finish(); };
        if (iconsPending <= 0) finish();
      });
    }, (err) => {
      void err;
      return Promise.resolve(null);
    });
  }

  function frame(now: number) {
    s.reqId = requestAnimationFrame(frame);
    perf.frameBegin();

    if (typeof document !== "undefined" && document.hidden) {
      if (!s.idleTimer) {
        cancelAnimationFrame(s.reqId);
        s.idleTimer = window.setInterval(() => {
          const st = s;
          if (!document.hidden) {
            if (st.idleTimer) { clearInterval(st.idleTimer); st.idleTimer = null; }
            st.reqId = requestAnimationFrame(frame);
          }
        }, 1000);
      }
      return;
    }
    if (s.idleTimer) { clearInterval(s.idleTimer); s.idleTimer = null; }
    s.lastFrameAt = now;

    if (s.maxFps > 0) {
      const minFrameMs = 1000 / s.maxFps;
      if (now - lastRenderTime < minFrameMs - 0.5) return;
    }
    lastRenderTime = now;

    const frameMs = now - last;
    const dt = Math.min(0.05, frameMs / 1000 || 0);
    last = now;

    if (frameMs > 2 && frameMs < 50 && hzSamples.length < 45) {
      hzSamples.push(1000 / frameMs);
      if (hzSamples.length === 45) {
        const avgHz = Math.round(hzSamples.reduce((a, b) => a + b, 0) / hzSamples.length);
        if (avgHz >= 110 && avgHz <= 130) detectedRefresh = 120;
        else if (avgHz >= 135 && avgHz <= 155) detectedRefresh = 144;
        else if (avgHz >= 220 && avgHz <= 260) detectedRefresh = 240;
        else if (avgHz >= 80 && avgHz <= 100) detectedRefresh = 90;
        else detectedRefresh = Math.max(60, avgHz);
        ctx.setDetectedHz(detectedRefresh);
        s.detectedHz = detectedRefresh;
      }
    }

    if (s.timeFlow && s.active && !s.inventoryOpen && !s.menuOpen && !s.mapOpen) {
      const adv = advanceTime(s.time, dt * 10 * s.timeSpeed, s.dayCount || 0);
      if (adv.dayCount !== (s.dayCount || 0)) {
        s.dayCount = adv.dayCount;
        ctx.setDayCount(adv.dayCount);
      }
      s.time = adv.time;
    }

    if (s.dimension !== "nether") {
      const totalHours = ((s.time / 1000) + 6) % 24;
      const hours12 = Math.floor(totalHours % 12) || 12;
      const mins = Math.floor((totalHours % 1) * 60);
      const ampm = totalHours >= 12 ? "PM" : "AM";
      const sunIcon = totalHours >= 6 && totalHours < 18 ? "☀️" : "🌙";
      const timeStr = `${hours12}:${mins < 10 ? "0" : ""}${mins} ${ampm} ${sunIcon}`;
      if (timeStr !== s.lastTimeStr) {
        s.lastTimeStr = timeStr;
        ctx.setTimeFormatted(timeStr);
      }
    }

    const isWorldPaused = !s.active || s.uiPaused || s.pauseOpen || s.titleScreenOpen || s.worldSelectOpen;

    if (!isWorldPaused && now - (s.lastMoveSentAt || 0) > 50) {
      const dx = Math.abs(s.player.x - (s.lastSentX || 0));
      const dy = Math.abs(s.player.y - (s.lastSentY || 0));
      const dz = Math.abs(s.player.z - (s.lastSentZ || 0));
      const dyaw = Math.abs(s.player.yaw - (s.lastSentYaw || 0));
      const dpitch = Math.abs(s.player.pitch - (s.lastSentPitch || 0));
      if (dx > 0.02 || dy > 0.02 || dz > 0.02 || dyaw > 0.02 || dpitch > 0.02) {
        multiplayer.sendMovement(s.player.x, s.player.y, s.player.z, s.player.yaw, s.player.pitch, s.hotbar[s.slot]);
        s.lastMoveSentAt = now;
        s.lastSentX = s.player.x;
        s.lastSentY = s.player.y;
        s.lastSentZ = s.player.z;
        s.lastSentYaw = s.player.yaw;
        s.lastSentPitch = s.player.pitch;
      }
    }

    const celestialAngle = ((s.time - 6000) / 24000) * Math.PI * 2;
    _sunDir.set(
      -Math.sin(celestialAngle) * 0.96,
      Math.cos(celestialAngle),
      Math.sin(celestialAngle) * 0.28
    ).normalize();
    _moonDir.copy(_sunDir).negate();
    const sunDir = _sunDir;
    const moonDir = _moonDir;

    const sunY = sunDir.y;
    const isDay = sunY > -0.05;
    const dayFactor = Math.max(0, Math.min(1, (sunY + 0.15) / 0.5));
    const sunsetFactor = Math.max(0, 1 - Math.abs(sunY) * 3.2);
    const nightFactor = 1 - dayFactor;

    const anchorX = s.cinematic && s.cine ? s.cine.x : s.player.x;
    const anchorZ = s.cinematic && s.cine ? s.cine.z : s.player.z;
    const pcx = Math.floor(anchorX / CH), pcz = Math.floor(anchorZ / CH);
    if (pcx !== s.lastCX || pcz !== s.lastCZ || now - s.scanT > 800) {
      s.lastCX = pcx; s.lastCZ = pcz; s.scanT = now; ctx.rescan(pcx, pcz);
      if (!s.simMode) {
        const _tH = perf.phaseStart();
        ctx.updateHorizonMesh();
        perf.phaseEnd("horizon", _tH);
      }
    }
    const dynamicBudget = s.active ? ((s.meshQ.length > 20 || s.genQ.length > 20) ? 2.5 : 1.5) : 10.0;
    const _tS = perf.phaseStart();
    ctx.stream(dynamicBudget);
    perf.phaseEnd("stream", _tS);
    stepLightMeter(s, dt, now, ctx.getBlock, ctx.raycast(64));
    if ((s as unknown as { exposureModel?: string }).exposureModel === "iso-ettl") {
      try { maybeStepTtlMeter(s); } catch {}
    }
    {
      const target = s.wbTargetK || 6500;
      const cur = s.wbK > 0 ? s.wbK : target;
      const kk = Math.min(1, Math.max(0, dt) / WB_ADAPT_SECONDS);
      s.wbK = Math.exp(Math.log(cur) + (Math.log(target) - Math.log(cur)) * kk);
      const [wr, wg, wbb] = whiteBalanceGain(s.wbK);
      setPostFxWhiteBalance(s.postFx, wr, wg, wbb);
      setPostFxGrade(s.postFx, s.meterGain || 1, s.ev || 12);
    }
    if (now - lastCustomAssetSyncAt > 500) {
      lastCustomAssetSyncAt = now;
      ctx.syncCustomAssets();
      ctx.syncPaintings();
    }
    if (!isWorldPaused) {
      const _tV = perf.phaseStart();
      ctx.stepVillagers(dt);
      perf.phaseEnd("villagers", _tV);
    }
    const isNight = isNightTime(s.time);
    if (!isWorldPaused && (!s.simMode || ctx.mobMgr.mobs.length > 0 || ctx.mobMgr.animals.length > 0)) {
      ctx.mobMgr.dimension = s.dimension || "overworld";
      const _tM = perf.phaseStart();
      let ride: { fx: number; fz: number; yaw: number; jump?: boolean } | null = null;
      if (s.riddenAnimal) {
        const rk = s.rideKeys;
        let fx = 0, fz = 0;
        if (rk.w) fz -= 1;
        if (rk.s) fz += 1;
        if (rk.a) fx -= 1;
        if (rk.d) fx += 1;
        if (fx === 0 && fz === 0) {
          if (s.keys["KeyW"]) fz -= 1;
          if (s.keys["KeyS"]) fz += 1;
          if (s.keys["KeyA"]) fx -= 1;
          if (s.keys["KeyD"]) fx += 1;
        }
        const l = Math.hypot(fx, fz) || 1;
        fx /= l; fz /= l;
        ride = { fx, fz, yaw: s.player.yaw, jump: !!s.keys["Space"] };
      }
      ctx.mobMgr.update(dt, s.player, ctx.getBlock, ctx.damagePlayer, isNight, s.gameplayMode || "survival", ctx.surfaceAt, ctx.spawnSafeAt, ride,
        // burning mobs: realistic fireplace buoyant embers & smoke wisps
        (x: number, y: number, z: number) => {
          if (!s.fx) return;
          s.fx.spawnFireplaceEmbers(x, y, z, 2);
        },
        (x: number, y: number, z: number) => {
          if (s.fx) s.fx.spawnBurst(x, y + 0.5, z, 0, 1, 0, new THREE.Color(0x8a8a8a), 8);
        },
        s.creative
      );
      perf.phaseEnd("mobs", _tM);

      if (s.riddenAnimal) {
        const ma = s.riddenAnimal;
        const MOUNT_H = ma.type === "horse" ? 1.62 : (ma.type === "pig" ? 1.18 : (ma.type === "sheep" ? 1.32 : 1.35));
        s.player.x = ma.x;
        s.player.y = ma.y + MOUNT_H;
        s.player.z = ma.z;
        s.player.vx = s.player.vy = s.player.vz = 0;
        s.player.fly = false;
        s.player.ground = true;
        const shiftNow = !!s.keys["ShiftLeft"];
        if (shiftNow && !s.rideShiftHeld && performance.now() - (s.lastDismountAt || 0) > 300) {
          s.lastDismountAt = performance.now();
          const ox = ma.x + Math.sin(ma.yaw) * 1.7;
          const oz = ma.z + Math.cos(ma.yaw) * 1.7;
          let dy = Math.max(4, Math.floor(ma.y) - 1);
          while (dy > 4 && !isSolid(ctx.getBlock(Math.floor(ox), dy, Math.floor(oz)))) dy--;
          s.player.x = ox;
          s.player.z = oz;
          s.player.y = dy + 1.05;
          ma.ridden = false;
          s.riddenAnimal = null;
          s.rideShiftHeld = false;
          ctx.showToast("🐾 Dismounted");
        } else {
          s.rideShiftHeld = shiftNow;
        }
      }

      if (s.riddenBoat && !s.riddenAnimal) {
        const rb = s.riddenBoat;
        driveBoat(rb, dt, {
          forward: !!s.keys["KeyW"],
          back: !!s.keys["KeyS"],
          left: !!s.keys["KeyA"],
          right: !!s.keys["KeyD"]
        });
        s.player.x = rb.x;
        s.player.y = rb.y + 0.5;
        s.player.z = rb.z;
        s.player.vx = s.player.vy = s.player.vz = 0;
        s.player.fly = false;
        s.player.ground = true;
        const shiftNow = !!s.keys["ShiftLeft"];
        if (shiftNow && !s.rideShiftHeld && performance.now() - (s.lastBoatDismountAt || 0) > 300) {
          s.lastBoatDismountAt = performance.now();
          const ox = rb.x + Math.cos(rb.yaw) * 1.6;
          const oz = rb.z - Math.sin(rb.yaw) * 1.6;
          let dy = Math.max(4, Math.floor(rb.y) + 1);
          while (dy > 4) {
            const bid = ctx.getBlock(Math.floor(ox), dy, Math.floor(oz));
            if (isSolid(bid) || bid === 39) break;
            dy--;
          }
          s.player.x = ox;
          s.player.z = oz;
          s.player.y = dy + 1.05;
          rb.isRidden = false;
          s.riddenBoat = null;
          s.rideShiftHeld = false;
          ctx.showToast("🛶 Disembarked");
        } else {
          s.rideShiftHeld = shiftNow;
        }
      }
    }
    if (!isWorldPaused && s.gameplayMode === "peaceful" && (s.health ?? 20) < 20 && !s.dead) {
      if (!s.lastRegenAt || now - s.lastRegenAt > 1200) {
        s.lastRegenAt = now;
        const nextH = Math.min(20, (s.health ?? 20) + 1);
        s.health = nextH;
        ctx.setHealth(nextH);
      }
    }
    if (!isWorldPaused) {
      const isEyeInWater = ctx.getBlock(Math.floor(s.player.x), Math.floor(s.player.y + 1.62), Math.floor(s.player.z)) === 39;
      tickAmbientMusic(dt, isEyeInWater);
      ctx.processTnt(now, dt);
      ctx.tickFurnace(dt);
    }
    if (s.chestEntities && s.chestEntities.size > 0) {
      for (const ce of s.chestEntities.values()) {
        updateChestAnimation(ce, dt);
      }
    }
    if (!isWorldPaused && ctx.webSpiderMgr) {
      ctx.webSpiderMgr.update(dt, ctx.getBlock, s.dayCount || 0);
    }
    // Mug-carried spider rider: wiggle legs in the player's hand.
    if (s.heldSpiderMesh && !isWorldPaused) {
      s.heldSpiderMesh.t += dt * 2.4;
      updateWebSpiderKinematics(s.heldSpiderMesh.mesh, s.heldSpiderMesh.t, true);
      s.heldSpiderMesh.mesh.root.rotation.y = -0.5 + Math.sin(s.heldSpiderMesh.t * 1.6) * 0.45;
    }

    s.tileBudgetReal = s.mapOpen ? 4 : 8;
    s.tileBudgetFar = s.mapOpen ? 20 : 4;
    if (s.matFoliage?.userData?.uTime) s.matFoliage.userData.uTime.value = now * 0.001;
    if (s.matGrass?.userData?.uTime) s.matGrass.userData.uTime.value = now * 0.001;
    if (s.matGlow?.userData?.uTime) s.matGlow.userData.uTime.value = now * 0.001;

    if (!isWorldPaused && s.active && !s.inventoryOpen) { ctx.step(dt); }
    else if (s.camera) s.camera.position.set(s.player.x, s.player.y + EYE, s.player.z);

    if (s.orbit?.enabled && s.camera) {
      applyOrbitCamera(s.camera as THREE.PerspectiveCamera, s.orbit);
    }

    if (s.firstPersonArm) {
      const heldId = s.hotbar[s.slot] || 0;
      const count = s.hotbarCounts[s.slot] || 0;
      const activeBlockId = (s.creative || count > 0) ? heldId : 0;
      ctx.updateHeldItem(activeBlockId);

      const isNakedHand = activeBlockId === 0;
      if (s.swingTimer > 0) {
        s.swingTimer -= dt * (isNakedHand ? 5.2 : 4.2);
      }
      const swingProg = Math.max(0, s.swingTimer);
      const swingSin = Math.sin(Math.sqrt(swingProg) * Math.PI);

      const hs = Math.hypot(s.player.vx, s.player.vz);
      const speedFactor = Math.min(1, hs / 3.2);
      const armBobX = Math.cos(s.player.bob) * 0.016 * speedFactor;
      const armBobY = Math.abs(Math.sin(s.player.bob)) * 0.016 * speedFactor;

      // Authentic Minecraft FOV adaptation:
      // When the FOV changes (settings slider 30°-110°, sprinting, speed effects, OptiFine zoom Z),
      // the camera projection changes the perspective of the held 3D object.
      // Scaling the arm's lateral offsets with tan(fov/2)/tan(70°/2) keeps the arm base securely anchored
      // below the bottom-right edge of the viewport so the bottom cutoff is never floating in mid-air.
      const curFov = (s.camera as THREE.PerspectiveCamera)?.fov || s.baseFov || 70;
      const fovFactor = Math.tan((curFov * Math.PI) / 360) / Math.tan((70 * Math.PI) / 360);

      const armX = 0.32 * fovFactor + armBobX - (isNakedHand ? swingSin * 0.06 : 0);
      const armY = -0.34 * fovFactor + armBobY - swingSin * (isNakedHand ? 0.08 : 0.12);
      const armZ = -0.48 - swingSin * (isNakedHand ? 0.20 : 0.14);

      s.firstPersonArm.position.set(armX, armY, armZ);
      s.firstPersonArm.rotation.set(
        -0.35 - swingSin * (isNakedHand ? 0.55 : 0.70),
        -0.24 - swingSin * (isNakedHand ? 0.25 : 0.40),
        0.12 + swingSin * 0.35
      );
    }

    if (s.leftArm && s.offhandItem && s.leftArm.visible) {
      const curFov = (s.camera as THREE.PerspectiveCamera)?.fov || s.baseFov || 70;
      const fovFactor = Math.tan((curFov * Math.PI) / 360) / Math.tan((70 * Math.PI) / 360);
      const hs = Math.hypot(s.player.vx, s.player.vz);
      const speedFactor = Math.min(1, hs / 3.2);
      const armBobX = -Math.cos(s.player.bob) * 0.016 * speedFactor;
      const armBobY = Math.abs(Math.sin(s.player.bob)) * 0.016 * speedFactor;
      s.leftArm.position.set(-0.32 * fovFactor + armBobX, -0.34 * fovFactor + armBobY, -0.384);
      s.leftArm.rotation.set(-0.35, 0.24, -0.12);
    }

    if (!s.fx && s.scene && s.renderer) {
      s.fx = createWorldFX(s.scene);
      s.atlasTex = ctx.tex;
    }
    if (!s.arrows && s.scene && s.renderer) {
      s.arrows = new ArrowManager();
      s.arrows.attach(s.scene);
    }
    if (!s.xp && s.scene && s.renderer) {
      s.xp = createXpSystem(s.scene);
    }
    if (!s.itemDrops && s.scene && s.matOpaque) {
      s.itemDrops = createItemDropManager(s.scene, s.matOpaque, ctx.getBlock);
    }
    if (s.fx) s.fx.update(dt);
    if (s.arrows) s.arrows.update(dt, ctx.getBlock, ctx.mobMgr, s.fx);
    if (s.itemDrops && s.active) {
      s.itemDrops.update(
        dt,
        s.player.x,
        s.player.y,
        s.player.z,
        (id, count) => (ctx.inventoryAddItem ? ctx.inventoryAddItem(id, count) : 0),
        ctx.showToast
      );
    }

    if (s.mining) {
      if (s.creative) {
        s.mining = null;
        if (s.fx) s.fx.hideCrack();
      } else {
        const hit = ctx.raycast(s.player.fly ? 7 : 5);
        const sameBlock = hit && hit.id > 0 && hit.x === s.mining.x && hit.y === s.mining.y && hit.z === s.mining.z;
        if (!sameBlock) {
          if (hit && hit.id > 0 && hit.id !== 39 && hit.id !== 40 && hit.id !== 14 && !s.creative && s.mouseLeftDown) {
            const holdTime = ctx.mineHoldTime(hit.id, s.hotbar[s.slot] || 0) * ctx.minePenalty();
            s.mining = {
              x: hit.x,
              y: hit.y,
              z: hit.z,
              prog: 0,
              needed: holdTime,
              durability: holdTime,
              maxDurability: holdTime,
              sndT: 0
            };
            s.swingTimer = Math.max(s.swingTimer, 0.4);
            if (s.fx) s.fx.showCrack(hit.x, hit.y, hit.z, hit.nx, hit.ny, hit.nz);
          } else {
            s.mining = null;
            if (s.fx) s.fx.hideCrack();
          }
        } else if (hit) {
          s.mining.prog += dt;
          s.mining.durability = Math.max(0, s.mining.durability - dt);
          // Continuous rhythmic arm punch / swing cycle
          if (s.swingTimer <= 0) {
            s.swingTimer = 1.0;
          }
          if (s.fx) {
            s.fx.showCrack(hit.x, hit.y, hit.z, hit.nx, hit.ny, hit.nz);
            const stage = Math.max(1, Math.min(10, Math.floor(1 + (s.mining.prog / s.mining.needed) * 9)));
            s.fx.setCrackStage(stage);
          }
          s.mining.sndT += dt;
          if (s.mining.sndT > 0.22) {
            s.mining.sndT = 0;
            ctx.playDig(hit.id);
            if (s.fx) {
              const bDef = BLOCK_MAP.get(hit.id);
              const tile = bDef?.side ?? hit.id;
              const col = sampleAtlasColor(s.atlasTex, tile) || new THREE.Color(0x9a9a9a);
              const isHand = (s.hotbar[s.slot] || 0) === 0;
              // Smaller particle puff when hitting with naked hands (vanilla feel)
              s.fx.spawnBurst(
                hit.x + 0.5 + hit.nx * 0.45,
                hit.y + 0.5 + hit.ny * 0.45,
                hit.z + 0.5 + hit.nz * 0.45,
                hit.nx, hit.ny, hit.nz,
                col,
                isHand ? 3 : 6
              );
            }
          }
          // Block breaks when its durability reaches zero
          if (s.mining.durability <= 0 || s.mining.prog >= s.mining.needed) {
            s.mining = null;
            ctx.breakBlock(hit);
            if (s.fx) s.fx.hideCrack();
          }
        }
      }
    } else if (!s.creative && s.mouseLeftDown && s.active && !s.menuOpen && !s.pauseOpen && !s.inventoryOpen) {
      // Survival timer system: user is holding the interaction button, begin ticking down target block durability
      const hit = ctx.raycast(s.player.fly ? 7 : 5);
      if (hit && hit.id > 0 && hit.id !== 39 && hit.id !== 40 && hit.id !== 14 && hit.y > 0) {
        const holdTime = ctx.mineHoldTime(hit.id, s.hotbar[s.slot] || 0) * ctx.minePenalty();
        s.mining = {
          x: hit.x,
          y: hit.y,
          z: hit.z,
          prog: 0,
          needed: holdTime,
          durability: holdTime,
          maxDurability: holdTime,
          sndT: 0
        };
        s.swingTimer = 1.0;
        ctx.playDig(hit.id);
        if (s.fx) {
          s.fx.showCrack(hit.x, hit.y, hit.z, hit.nx, hit.ny, hit.nz);
          s.fx.setCrackStage(1);
        }
      }
    }

    if (s.xp && s.active) {
      const gained = s.xp.update(dt, _xpTarget.set(s.player.x, s.player.y, s.player.z));
      if (gained > 0) {
        const lv = levelForXp(s.xp.total);
        if (lv.level > s.lastXpLevel) { ctx.playLevelUp(); ctx.showToast(`✦ Level ${lv.level}!`); }
        s.lastXpLevel = lv.level;
        if (now - (s.xpStateAt || 0) > 300) {
          s.xpStateAt = now;
          ctx.setXpBar({ level: lv.level, progress: lv.into / lv.span });
        }
      }
    }

    if (!s.creative && s.gameplayMode !== "peaceful" && !s.dead) {
      const spdNow = Math.hypot(s.player.vx, s.player.vz);
      const sprintNow = !s.player.fly && !!s.keys["ShiftLeft"] && spdNow > 2.5;
      const inWaterNow = ctx.getBlock(Math.floor(s.player.x), Math.floor(s.player.y + 0.2), Math.floor(s.player.z)) === 39;
      s.exhaustion += (sprintNow ? 0.1 * spdNow : 0) * dt;
      s.exhaustion += (inWaterNow ? 0.01 * spdNow : 0) * dt;
      if (s.exhaustion >= 4) {
        s.exhaustion -= 4;
        if (s.saturation > 0) s.saturation--;
        else s.hunger = Math.max(0, s.hunger - 1);
      }
      ctx.stepTimers.regenTimer += dt;
      if (s.hunger >= 18 && s.health < 20 && ctx.stepTimers.regenTimer >= (s.hunger >= 20 && s.saturation > 0 ? 0.5 : 4)) {
        ctx.stepTimers.regenTimer = 0;
        const nextH = Math.min(20, s.health + 1);
        s.health = nextH;
        ctx.setHealth(nextH);
        s.exhaustion += 6.0;
      } else if (s.hunger <= 0 && ctx.stepTimers.regenTimer >= 4) {
        ctx.stepTimers.regenTimer = 0;
        s.health = Math.max(1, s.health - 1);
        ctx.setHealth(s.health);
      }
      if (now - (s.hungerHudAt || 0) > 250) {
        s.hungerHudAt = now;
        ctx.setHungerBar(s.hunger);
      }
    }

    // ── Food Eating Consumption Loop (1.6s duration) ──────────────────────────
    if (s.eatingTimer > 0) {
      s.eatingTimer -= dt;
      // Rhythmic bobbing & chewing particles
      if (Math.random() < dt * 6.0) playEat();
      const heldFoodId = s.hotbar[s.eatingSlot || s.slot] || 0;
      if (s.fx && Math.random() < dt * 10.0 && s.camera) {
        const pCam = s.camera.position;
        _bowDir.set(0, 0, -1).applyEuler(s.camera.rotation).normalize();
        s.fx.spawnBurst(
          pCam.x + _bowDir.x * 0.45,
          pCam.y - 0.25,
          pCam.z + _bowDir.z * 0.45,
          0, 1, 0,
          new THREE.Color(0xb5824c),
          3
        );
      }

      if (s.eatingTimer <= 0) {
        s.eatingTimer = 0;
        playBurp();
        const nut = getFoodNutrition(heldFoodId);
        if (nut) {
          s.hunger = Math.min(20, s.hunger + nut.hunger);
          s.saturation = Math.min(20, s.saturation + nut.saturation);
          ctx.setHungerBar(s.hunger);
          ctx.showToast(`Restored +${nut.hunger} Hunger! 🍗`);
        }
        if (!s.creative && (s.hotbarCounts[s.slot] || 0) > 0) {
          s.hotbarCounts[s.slot] = Math.max(0, s.hotbarCounts[s.slot] - 1);
          if (s.hotbarCounts[s.slot] === 0) s.hotbar[s.slot] = 0;
        }
      }
    }

    // ── 3D Ambient Cave Drone Detection ───────────────────────────────────────
    if (!s.simMode && now - (s.lastAmbientCaveAt || 0) > 25000) {
      s.lastAmbientCaveAt = now;
      let solidEnclosedCount = 0;
      const px = Math.floor(s.player.x), py = Math.floor(s.player.y), pz = Math.floor(s.player.z);
      for (let cx = -4; cx <= 4; cx += 2) {
        for (let cy = -4; cy <= 4; cy += 2) {
          for (let cz = -4; cz <= 4; cz += 2) {
            const bid = ctx.getBlock(px + cx, py + cy, pz + cz);
            if (bid !== 0 && bid !== 39 && bid !== 40 && isSolid(bid)) solidEnclosedCount++;
          }
        }
      }
      // If deeply underground / surrounded by rock
      if (solidEnclosedCount >= 55 && py < 50) {
        playCaveDrone();
      }
    }

    if (s.dimension === "nether" && !s.simMode && now - (s.lastNetherRumbleAt || 0) > 30000) {
      s.lastNetherRumbleAt = now + Math.random() * 10000;
      if (Math.random() < 0.7) playNetherRumble();
    }

    // Burial factor (0 = open sky, 1 = deep cover): 8 overhead samples at 1 Hz.
    // Scales ambient so caves/interiors go truly dark without torches.
    if (now - (s.lastBurialAt || 0) > 1000) {
      s.lastBurialAt = now;
      const offs = [2, 3, 4, 6, 9, 13, 18, 24];
      const bx = Math.floor(s.player.x), by = Math.floor(s.player.y + EYE), bz = Math.floor(s.player.z);
      let n = 0;
      for (let k = 0; k < offs.length; k++) {
        const bid = ctx.getBlock(bx, by + offs[k], bz);
        if (bid !== 0 && bid !== 39 && bid !== 40 && isSolid(bid)) n++;
      }
      s.burial01 = n / offs.length;
      let cover = false;
      for (let k = 1; k <= 10; k++) {
        const bid = ctx.getBlock(bx, by + k, bz);
        if (bid !== 0 && bid !== 39 && bid !== 40 && isSolid(bid)) { cover = true; break; }
      }
      s.underCover = cover;
    }

    if (s.spinT > 0) {
      s.spinT -= dt;
      const p = Math.max(0, 1 - s.spinT / 0.22);
      s.player.yaw = s.spinFrom + (s.spinTo - s.spinFrom) * (p * p * (3 - 2 * p));
    }

    if (s.active && !s.inventoryOpen && !s.mapOpen) {
      const hit = ctx.raycast(5);
      const bName = (hit && hit.id > 0) ? (BLOCK_MAP.get(hit.id)?.name || "Block") : null;
      if (bName !== s.lastHoveredName) {
        s.lastHoveredName = bName;
        ctx.setHoveredBlockName(bName);
      }
      if (s.fx && !s.mining) {
        if (hit && hit.id > 0) s.fx.showOutline(hit.x, hit.y, hit.z);
        else s.fx.hideOutline();
      }
      let aimed: any = null;
      const nv = s.nearVillager;
      if (nv && s.camera) {
        const vHit = ctx.raycast(TRADE_AIM_DIST + 0.2);
        const vDist = vHit && s.camera
          ? Math.hypot(vHit.x + 0.5 - s.camera.position.x, vHit.y + 0.5 - s.camera.position.y, vHit.z + 0.5 - s.camera.position.z)
          : null;
        if (
          villagerInTradeRange(nv, s.player, EYE, ctx.getBlock, ctx.mobMgr.mobs, ctx.mobMgr.animals, s.villagers) &&
          isVillagerAimed(s.camera, vDist, nv, TRADE_AIM_DIST)
        ) {
          aimed = nv;
        }
      }
      if (aimed !== s.aimedVillager) {
        s.aimedVillager = aimed;
        ctx.setAimedVillager(aimed);
      }
    } else {
      if (s.lastHoveredName !== null) {
        s.lastHoveredName = null;
        ctx.setHoveredBlockName(null);
      }
      if (s.aimedVillager !== null) {
        s.aimedVillager = null;
        ctx.setAimedVillager(null);
      }
      if (s.fx) s.fx.hideOutline();
    }

    if (ctx.tickPortal) {
      ctx.tickPortal(dt);
    }

    const dayZen = 0x2b6bcc, dayHor = 0xcfe2f0, dayFog = 0xc3d9e9;
    const sunsetZen = 0x3d3566, sunsetHor = 0xe07a38, sunsetFog = 0x9e6858;
    const nightZen = 0x030711, nightHor = 0x0e1a2b, nightFog = 0x0e1a2b;

    _colZen.setHex(dayZen);
    _colHor.setHex(dayHor);
    _colFog.setHex(dayFog);

    if (sunsetFactor > 0.05) {
      _colZen.lerp(_colLerp.setHex(sunsetZen), sunsetFactor);
      _colHor.lerp(_colLerp.setHex(sunsetHor), sunsetFactor);
      _colFog.lerp(_colLerp.setHex(sunsetFog), sunsetFactor);
    }
    if (nightFactor > 0) {
      _colZen.lerp(_colLerp.setHex(nightZen), nightFactor);
      _colHor.lerp(_colLerp.setHex(nightHor), nightFactor);
      _colFog.lerp(_colLerp.setHex(nightFog), nightFactor);
    }
    const targetZen = _colZen;
    const targetHor = _colHor;
    const targetFog = _colFog;

    if (s.dimension === "nether") {
      targetZen.setHex(0x1a0505);
      targetHor.setHex(0x330808);
      targetFog.setHex(0x330808);
    }

    const headX = Math.floor(s.player.x), headY = Math.floor(s.player.y + EYE), headZ = Math.floor(s.player.z);
    const headBlock = ctx.getBlock(headX, headY, headZ);
    const headUnderWater = (headBlock === 39);
    const headUnderLava = (headBlock === 40);

    if (headUnderWater !== !!s.wasUnderwater) {
      s.wasUnderwater = headUnderWater;
      ctx.setIsUnderwater(headUnderWater);
      setUnderwaterAudio(headUnderWater);
      setUnderwaterSfx(headUnderWater);
    }
    if (headUnderLava !== !!s.wasUnderLava) {
      s.wasUnderLava = headUnderLava;
      ctx.setIsUnderLava(headUnderLava);
    }

    // Lightning scheduler: envelope computed here so sky + lights share it.
    let flashEnv = 0;
    if (s.weatherType === "thunder" && s.dimension !== "nether") {
      if (now > nextFlashAt) {
        flashAt = now;
        nextFlashAt = now + 3500 + Math.random() * 9000;
        playThunderCrack();
      }
    }
    const flashAge = now - flashAt;
    if (flashAge >= 0 && flashAge < 600) {
      const p1 = Math.exp(-flashAge / 90);
      const p2 = flashAge > 130 ? 0.65 * Math.exp(-(flashAge - 130) / 110) : 0;
      flashEnv = Math.min(1, p1 + p2);
    }
    s.lastFlashEnv = flashEnv;

    if (s.sky && (s.sky.material as THREE.ShaderMaterial).uniforms) {
      const u = (s.sky.material as THREE.ShaderMaterial).uniforms;
      u.zen.value.copy(targetZen);
      u.hor.value.copy(targetHor);
      if (flashEnv > 0) {
        u.zen.value.lerp(_white, flashEnv * 0.7);
        u.hor.value.lerp(_white, flashEnv * 0.7);
      }
      u.sdir.value.copy(sunDir);
      u.warm.value = sunsetFactor;
      u.night.value = nightFactor;
    }

    if (s.scene?.fog) {
      const fog = s.scene.fog as THREE.Fog;
      if (headUnderWater) {
        fog.color.setHex(0x103b66);
        fog.near = 0.5;
        fog.far = Math.min(26, s.render * 5);
      } else if (headUnderLava) {
        fog.color.setHex(0x881800);
        fog.near = 0.1;
        fog.far = 3.5;
      } else if (s.dimension === "nether") {
        fog.color.setHex(0x330808);
        fog.near = 10;
        fog.far = Math.min(85, s.render * CH);
        if (s.sunBox) s.sunBox.visible = false;
        if (s.moonBox) s.moonBox.visible = false;
        if (s.moonHalo) s.moonHalo.visible = false;
        if (s.stars) s.stars.visible = false;
        if (s.clouds) s.clouds.visible = false;
      } else {
        const storm = s.weatherType === "thunder" ? 0.5 : s.weatherType === "rain" ? 0.65 : 1;
        fog.color.copy(targetFog);
        if (storm < 1) {
          fog.color.lerp(_colLerp.setHex(0x55606e), storm < 0.6 ? 0.6 : 0.45);
        }
        const maxHorizonDist = ctx.qualityPreset === "smooth" ? 32 * CH : (ctx.qualityPreset === "balanced" ? 48 * CH : 64 * CH);
        fog.near = Math.max(25, s.render * CH * 0.65);
        fog.far = maxHorizonDist * storm;
        if (s.sunBox) s.sunBox.visible = true;
        if (s.moonBox) s.moonBox.visible = true;
        if (s.moonHalo) s.moonHalo.visible = true;
        if (s.stars) s.stars.visible = true;
        if (s.clouds) s.clouds.visible = true;
      }
    }

    const p = s.camera?.position || new THREE.Vector3();
    const activeLightDir = isDay ? sunDir : moonDir;

    const weatherMode = s.cloudWeather || "cloudy";
    s.wxLight = smoothWeatherLight(s.wxLight, weatherLightTarget(weatherMode), dt);
    const weatherDirectFactor = s.wxLight.direct;
    const weatherSunBoxOpacity = s.wxLight.sun;
    const weatherAmbFactor = s.wxLight.amb;

    if (s.sun && s.sun.target) {
      const texel = s.shadowRes && s.shadowRad ? (2 * s.shadowRad) / s.shadowRes : 0.08;
      // Snap the shadow camera target to whole shadow-map texels so shadows stay
      // stable (no swimming/wiggle) as the player moves. The light position is
      // derived from the snapped target so the pair can't drift apart sub-texel.
      const tx = Math.round(p.x / texel) * texel;
      const tz = Math.round(p.z / texel) * texel;
      s.sun.target.position.set(tx, p.y, tz);
      s.sun.position.set(
        tx + activeLightDir.x * 120,
        p.y + Math.max(15, activeLightDir.y * 120),
        tz + activeLightDir.z * 120
      );

      if (s.dimension === "nether") {
        s.sun.color.setHex(0xffaa88);
        s.sun.intensity = 1.35;
        s.sun.position.set(p.x + 20, p.y + 60, p.z + 20);
      } else if (isDay) {
        cSunCol.set(0xfff2da).lerp(new THREE.Color(0xffa250), sunsetFactor * 0.8);
        s.sun.color.copy(cSunCol);
        s.sun.intensity = Math.max(0.01, dayFactor * 2.1 * weatherDirectFactor) * (headUnderWater ? 0.35 : 1);
      } else {
        s.sun.color.set(0x38557a);
        s.sun.intensity = 0.045 * moonLitFrac(s);
      }
    }

    const specUd = (s.matMerged as unknown as { userData?: Record<string, { value: THREE.Vector3 | THREE.Color }> } | null)?.userData;
    if (specUd?.uSunDirView && s.camera) {
      _specDir.copy(activeLightDir).transformDirection(s.camera.matrixWorldInverse);
      (specUd.uSunDirView.value as THREE.Vector3).copy(_specDir);
      (specUd.uSunColor.value as THREE.Color).copy(s.sun ? s.sun.color : _specNoLight).multiplyScalar(s.sun ? s.sun.intensity : 0);
    }
    const specUd2 = (s.matTrans as unknown as { userData?: Record<string, { value: THREE.Vector3 | THREE.Color }> } | null)?.userData;
    if (specUd2?.uSunDirView) {
      (specUd2.uSunDirView.value as THREE.Vector3).copy(_specDir);
      (specUd2.uSunColor.value as THREE.Color).copy(s.sun ? s.sun.color : _specNoLight).multiplyScalar(s.sun ? s.sun.intensity : 0);
    }

    if (s.dimension === "nether") {
      if (s.hemi) {
        s.hemi.intensity = 0.55;
        s.hemi.color.setHex(0xff7766);
        s.hemi.groundColor.setHex(0x331111);
      }
      if (s.amb) {
        s.amb.intensity = 0.45;
        s.amb.color.setHex(0x882222);
      }
    } else {
      const dark = 1 - Math.min(1, s.burial01 || 0) * 0.94;
      const moonUpN = Math.max(0, moonDir.y);
      let nightWx = 1;
      if (s.weatherType === "rain") nightWx = 0.5;
      else if (s.weatherType === "thunder") nightWx = 0.35;
      else if (s.weatherType === "snow") nightWx = 0.6;
      if (s.cloudWeather === "overcast") nightWx *= 0.4;
      else if (s.cloudWeather === "cloudy") nightWx *= 0.7;
      const moonGlow = moonUpN * nightWx * moonLitFrac(s);
      if (s.hemi) {
        s.hemi.intensity = (0.004 + 0.23 * dayFactor * weatherAmbFactor + 0.03 * moonGlow) * dark;
        s.hemi.color.setHex(0xffffff);
        s.hemi.groundColor.setHex(0x444444);
      }
      if (s.amb) {
        s.amb.intensity = (0.002 + 0.11 * dayFactor * weatherAmbFactor + 0.012 * moonGlow) * dark;
        s.amb.color.setHex(0xffffff);
      }
    }
    if (flashEnv > 0) {
      if (s.sun) s.sun.intensity += flashEnv * 3;
      if (s.hemi) s.hemi.intensity += flashEnv * 0.9;
      if (s.amb) s.amb.intensity += flashEnv * 0.5;
    }

    if (s.clouds?.userData?.mat) {
      const cloudOp = s.wxLight.cloud * (0.3 + 0.7 * dayFactor);
      const cloudMat = s.clouds.userData.mat as THREE.MeshLambertMaterial;
      if (cloudMat.emissiveIntensity !== undefined) {
        cloudMat.emissiveIntensity = 0.55 * dayFactor * (s.wxLight.direct / 1.15);
      }
      if (s.dimension === "nether" || cloudOp < 0.02) {
        s.clouds.visible = false;
      } else {
        s.clouds.visible = true;
        s.clouds.userData.mat.opacity = cloudOp * (s.cloudMorphOp ?? 1);
      }
    }

    if (s.sky) s.sky.position.copy(p);
    if (s.clouds && s.clouds.visible) {
      const totalSpan = (s.clouds.userData?.totalSpan as number) || 1024;
      const driftX = (now * 0.001 * 0.5) % totalSpan;
      const driftZ = (now * 0.001 * 0.12) % totalSpan;
      s.clouds.position.set(driftX, 136, driftZ);
    }

    // ── Dynamic Weather System Particle Simulation ────────────────────────────
    if (weatherSys && s.scene && s.dimension !== "nether") {
      // Seed-derived biome temperature at the player (cold -> snow instead of rain).
      const surf = ctx.surfaceAt(Math.floor(p.x), Math.floor(p.z));
      const cold = !!(surf && (surf.cold || surf.frozen));
      const dry = !!(surf && surf.dry);
      const st = weatherMachine.step(dt, cold);
      s.weatherType = st === "snow" ? "snow" : (st === "rain" || st === "thunder") ? st : "clear";
      s.cloudWeather = st === "clear" ? "clear" : st === "cloudy" ? "cloudy" : "overcast";
      // Arid biomes render no precipitation (thunder flash still applies).
      weatherSys.update(dt, p.x, p.y, p.z, dry ? "clear" : s.weatherType, cold, !!s.underCover);
      if (!dry && (s.weatherType === "rain" || s.weatherType === "thunder") && now - (s.lastRainPatterAt || 0) > 4500) {
        s.lastRainPatterAt = now + Math.random() * 2500;
        playRainPatter();
      }
      // Coverage morph: fade out, swap canopy once at the dip, fade in.
      if (!cloudMorph && s.clouds && (s.clouds.userData?.mode as string) !== s.cloudWeather) {
        cloudMorph = { t: 0, mode: s.cloudWeather, swapped: false };
      }
    }
    if (cloudMorph && s.scene) {
      cloudMorph.t += dt;
      if (cloudMorph.t < 0.35) {
        s.cloudMorphOp = 1 - cloudMorph.t / 0.35;
      } else {
        if (!cloudMorph.swapped) {
          cloudMorph.swapped = true;
          if (s.clouds) {
            const ox = s.clouds.position.x, oz = s.clouds.position.z;
            s.scene.remove(s.clouds);
            (s.clouds.userData?.mat as THREE.Material | undefined)?.dispose?.();
            (s.clouds as THREE.Mesh).geometry.dispose();
            const { vnoise } = makeNoise(() => s.seedMix);
            const nc = makeClouds(vnoise, cloudMorph.mode);
            nc.position.set(ox, 136, oz);
            s.scene.add(nc);
            s.clouds = nc;
          }
        }
        s.cloudMorphOp = Math.min(1, (cloudMorph.t - 0.35) / 0.35);
        if (cloudMorph.t >= 0.7) {
          s.cloudMorphOp = 1;
          cloudMorph = null;
        }
      }
    }

    const heldId = s.currentHeldId;
    const offId = s.offhandItem || 0;
    const isLightId = (id: number) => {
      if (!id || id <= 0) return false;
      if (id >= 70 && id <= 79) return false;
      const b = BLOCK_MAP.get(id);
      return !!(b && b.glow) || id === 80 || id === 81 || id === 84 || id === 46 || id === 47 || id === 48 || id === 85 || id === 86 || id === 87 || id === 136;
    };
    const isHoldingLight = isLightId(heldId) || isLightId(offId);

    if (s.heldTorchLight) {
      if (isHoldingLight) {
        s.heldTorchLight.position.set(p.x, p.y + 0.4, p.z);
        s.heldTorchLight.intensity = 1.4 * emitterVisibility(s);
        s.heldTorchLight.distance = 12.0;
      } else {
        s.heldTorchLight.intensity = 0;
      }
    }

    if (s.sunBox) {
      if (s.dimension === "nether") {
        s.sunBox.visible = false;
      } else {
        const sunOp = Math.max(0, (sunY + 0.05) / 0.25) * weatherSunBoxOpacity;
        s.sunBox.visible = sunOp > 0.01;
        if (s.sunBox.visible) {
          s.sunBox.position.set(p.x + sunDir.x * 380, p.y + sunDir.y * 380, p.z + sunDir.z * 380);
          s.sunBox.lookAt(p);
          (s.sunBox.material as THREE.MeshBasicMaterial).opacity = sunOp;
        }
      }
    }
    const moonPhase = (s.dayCount || 0) % 8;
    if (s.moonBox) {
      if (s.dimension === "nether") {
        s.moonBox.visible = false;
      } else {
        const moonOp = Math.max(0, Math.min(1, (moonDir.y + 0.35) / 0.5));
        s.moonBox.visible = moonOp > 0.01;
        if (s.moonBox.visible) {
          s.moonBox.position.set(p.x + moonDir.x * 380, p.y + moonDir.y * 380, p.z + moonDir.z * 380);
          s.moonBox.lookAt(p);
          s.moonBox.rotation.z = celestialAngle + Math.PI;
          (s.moonBox.material as THREE.MeshBasicMaterial).opacity = moonOp;
          if ((s.moonPhase ?? -1) !== moonPhase) {
            s.moonPhase = moonPhase;
            const mm = s.moonBox.material as THREE.MeshBasicMaterial;
            if (mm.map) paintMoonPhase(mm.map as THREE.CanvasTexture, moonPhase);
          }
        }
      }
    }
    if (s.moonHalo) {
      if (s.dimension === "nether") {
        s.moonHalo.visible = false;
      } else {
        const phaseLight = 1 - Math.min(moonPhase, 8 - moonPhase) / 4;
        const haloOp = Math.max(0, Math.min(1, (nightFactor - 0.15) / 0.6)) * (0.25 + 0.75 * s.wxLight.sun) * (0.3 + 0.7 * phaseLight);
        s.moonHalo.visible = haloOp > 0.02;
        if (s.moonHalo.visible) {
          s.moonHalo.position.set(p.x + moonDir.x * 380, p.y + moonDir.y * 380, p.z + moonDir.z * 380);
          (s.moonHalo.material as THREE.SpriteMaterial).opacity = haloOp * 0.55;
        }
      }
    }
    if (s.stars) {
      if (s.dimension === "nether") {
        s.stars.visible = false;
      } else {
        const starOp = Math.max(0, Math.min(1, (nightFactor - 0.2) / 0.6));
        s.stars.visible = starOp > 0.01;
        if (s.stars.visible) {
          s.stars.position.copy(p);
          (s.stars.material as THREE.PointsMaterial).opacity = starOp;
        }
      }
    }

    if (now - (s.lastLightUpdateAt || 0) >= 60) {
      s.lastLightUpdateAt = now;
      // Point lights span the whole render distance (no 40-block cutoff): nearest
      // N emitters get real-time shading, baked tint + halo sprites cover the rest.
      // Shader cost is flat — the pool already exists in the scene either way.
      // All outputs fade with daylight: sub-1000-lux flames vanish against 100k sun.
      const vis = emitterVisibility(s);
      const maxLights = ctx.qualityPreset === "smooth" ? 10 : s.lights.length;
      const lightRange = s.render * CH + 32;
      const nearEmitters: [number, { x: number; y: number; z: number; col: number; dist: number; power: number; id?: number }][] = [];
      const px = p.x, py = p.y, pz = p.z;
      for (const em of s.emitters.values()) {
        const dx = em.x - px, dz = em.z - pz;
        if (Math.abs(dx) > lightRange || Math.abs(dz) > lightRange) continue;
        const d2 = dx * dx + (em.y - py)**2 + dz * dz;
        if (d2 < lightRange * lightRange) nearEmitters.push([d2, em]);
      }
      nearEmitters.sort((a, b) => {
        const aw = (a[1].id === 85 || a[1].id === 86 || a[1].id === 102 || a[1].id === 630) ? a[0] * 0.25 : a[0];
        const bw = (b[1].id === 85 || b[1].id === 86 || b[1].id === 102 || b[1].id === 630) ? b[0] * 0.25 : b[0];
        return aw - bw;
      });

      s.lights.forEach((L, i) => {
        if (i < maxLights && nearEmitters[i]) {
          const em = nearEmitters[i][1];
          const isFire = em.id === 85 || em.id === 86 || em.id === 102 || em.id === 630;
          L.position.set(em.x, em.y, em.z);
          L.color.setHex(em.col);
          L.distance = em.dist + 2;
          L.intensity = em.power * emitterOutMul(em.id) * (1.0 + 0.35 * nightFactor) * vis * (isFire ? (0.88 + 0.24 * Math.sin(now * 0.0013 + em.x * 1.7 + em.z * 2.3)) : 1);
          L.decay = 2.0;
          L.visible = true;
        } else {
          L.intensity = 0;
          L.visible = false;
        }
      });
    }

    if (now - (s.glowSpriteAt || 0) >= 300) {
      s.glowSpriteAt = now;
      const pool = s.glowSprites;
      const vis = emitterVisibility(s);
      if (pool && pool.length) {
        const range = s.render * CH + 32;
        const cand: [number, { x: number; y: number; z: number; col: number }][] = [];
        if (vis > 0.02) {
          for (const em of s.emitters.values()) {
            const dx = em.x - p.x, dy = em.y - p.y, dz = em.z - p.z;
            if (Math.abs(dx) > range || Math.abs(dz) > range || Math.abs(dy) > 80) continue;
            const d2 = dx * dx + dy * dy + dz * dz;
            if (d2 < range * range) cand.push([d2, em]);
          }
        }
        cand.sort((a, b) => a[0] - b[0]);
        let pi = 0;
        const placed: { x: number; y: number; z: number }[] = [];
        for (const [d2, em] of cand) {
          if (pi >= pool.length) break;
          let crowded = false;
          for (const q of placed) {
            const ox = em.x - q.x, oy = em.y - q.y, oz = em.z - q.z;
            if (ox * ox + oy * oy + oz * oz < 64) { crowded = true; break; }
          }
          if (crowded) continue;
          placed.push(em);
          const sp = pool[pi++];
          const dist = Math.sqrt(d2);
          sp.visible = true;
          sp.position.set(em.x, em.y, em.z);
          (sp.material as THREE.SpriteMaterial).color.setHex(em.col);
          const haloDim = Math.min(1, 8 / Math.max(1, s.meterGain || 1));
          (sp.material as THREE.SpriteMaterial).opacity = 0.5 * vis * haloDim;
          const sc = Math.max(1.5, Math.min(10, dist * 0.06));
          sp.scale.set(sc, sc, 1);
        }
        for (; pi < pool.length; pi++) pool[pi].visible = false;
      }
    }

    s.liquidTick = (s.liquidTick || 0) + dt;
    if (s.liquidTick > 0.16) {
      const _tL = perf.phaseStart();
      ctx.stepLiquids();
      perf.phaseEnd("liquids", _tL);
      s.liquidTick = 0;
    }

    frames++;
    const fpsElapsed = now - lastFpsUpdate;
    if (fpsElapsed >= 500) {
      ctx.setFps(Math.round((frames * 1000) / fpsElapsed));
      frames = 0;
      lastFpsUpdate = now;
    }

    if (ctx.wandManager.state.activeDoc) {
      const wandHit = ctx.raycast(s.player.fly ? 24 : 16);
      ctx.wandManager.updateGhostPosition(wandHit);
    }

    if (isDofActive(s.postFx)) {
      const fxHit = ctx.raycast(64);
      setPostFxFocus(s.postFx!, fxHit
        ? Math.hypot(fxHit.x - s.player.x, fxHit.y - (s.player.y + EYE), fxHit.z - s.player.z)
        : -1);
    }

      if (s.sun && s.renderer) {
        const inNether = s.dimension === "nether";
        const wantOn = s.shadowsOn !== false;
        if (lastNetherShadow !== inNether || lastShadowsOnFlag !== wantOn || lastDayShadow !== isDay) {
          lastNetherShadow = inNether;
          lastShadowsOnFlag = wantOn;
          lastDayShadow = isDay;
          s.sun.castShadow = !inNether && wantOn && isDay;
        }
      }
      if (s.renderer && s.scene && s.camera) {
      const _tR = perf.phaseStart();
      renderWithPostFx(s.postFx, s.renderer, s.scene, s.camera);
      perf.phaseEnd("render", _tR);
      if ((s.firstPersonArm?.visible || s.leftArm?.visible) && s.camera) {
        const rigCam = s.camera as THREE.PerspectiveCamera;
        const prevTone = s.renderer.toneMapping;
        const prevAuto = s.renderer.autoClear;
        rigCam.layers.set(1);
        s.renderer.toneMapping = THREE.NoToneMapping;
        s.renderer.autoClear = false;
        s.renderer.render(s.scene, rigCam);
        rigCam.layers.set(0);
        s.renderer.toneMapping = prevTone;
        s.renderer.autoClear = prevAuto;
      }
      const shadowUseless = s.dimension === "nether" || nightFactor > 0.9 || headUnderWater || headUnderLava;
      const shadowInterval = s.cloudWeather === "overcast" ? 2000 : 500;
      if (!shadowUseless && (now - lastShadowAt > shadowInterval || Math.abs(pcx - lastShadowCX) > 0 || Math.abs(pcz - lastShadowCZ) > 0)) {
        lastShadowAt = now;
        const crossedChunk = Math.abs(pcx - lastShadowCX) > 0 || Math.abs(pcz - lastShadowCZ) > 0;
        lastShadowCX = pcx;
        lastShadowCZ = pcz;
        if (crossedChunk) refreshShadowCasterFlags(s);
        s.renderer.shadowMap.needsUpdate = true;
      }

      const debugSnapshotsEnabled = typeof window !== "undefined" && ((window as any).__enableDebugSnapshots || window.location?.search?.includes("debugSnapshot=1"));
      if (debugSnapshotsEnabled && now - (s.lastSnapshotAt || 0) > 5000 && s.active && !s.captureBusy && !s.simMode && !coarseInput && frameMs < 50) {
        s.lastSnapshotAt = now;
        s.captureBusy = true;
        const tC = performance.now();
        renderWithPostFx(s.postFx, s.renderer, s.scene, s.camera);
        const tgt = s.renderer.domElement as HTMLCanvasElement;
        encodeCanvasToPngBlob(tgt, tgt.width, tgt.height)
          .then((blob) => {
            perf.asyncStage("capture", performance.now() - tC);
            if (blob) {
              fetch("/api/debug/snapshot", {
                method: "POST",
                headers: { "Content-Type": "image/png" },
                body: blob
              }).catch(() => {});
            }
          })
          .catch(() => {})
          .finally(() => { s.captureBusy = false; });
      }

      if (now - (s.lastArchiveAt || 0) > 300000 && s.active && !s.snapshotBusy && !s.simMode && !coarseInput && isTelemetryEnabled()) {
        s.lastArchiveAt = now;
        s.snapshotBusy = true;
        const totalHours = ((s.time / 1000) + 6) % 24;
        const hrs = Math.floor(totalHours % 12) || 12, mins = Math.floor((totalHours % 1) * 60);
        const ampm = totalHours >= 12 ? "PM" : "AM";
        const timeStr = `${hrs}:${mins < 10 ? "0" : ""}${mins} ${ampm}`;
        const d = new Date();
        const stamp = d.toISOString().slice(0, 19).replace(/[-:]/g, (c) => (c === "T" ? "_" : c === "-" ? "" : c));
        const tA = performance.now();
        renderWithPostFx(s.postFx, s.renderer, s.scene, s.camera);
        hudSnapshot({
          fps: Math.max(1, Math.round(1000 / Math.max(frameMs, 1))),
          timeStr,
          seed: s.seedText,
          worldLabel: s.currentWorldId
        }).then((blob) => {
          s.snapshotBusy = false;
          if (!blob) return;
          perf.asyncStage("archive", performance.now() - tA);
          fetch(`/api/debug/snapshot?name=${encodeURIComponent(`shot-${stamp}.png`)}`, {
            method: "POST",
            headers: { "Content-Type": "image/png" },
            body: blob
          }).catch(() => {});
        }).catch(() => { s.snapshotBusy = false; });
      }
    }

    mapDrawT += dt;
    const miniDue = !s.mapOpen && mapDrawT >= 0.15 && now >= (s.mapSkipUntilMs || 0);
    const bigDue = !!s.mapOpen && mapDrawT >= 0.1;
    if ((miniDue || bigDue) && !s.simMode) {
      const _tD = perf.phaseStart();
      if (s.mapOpen) ctx.drawMap(ctx.bigCanvasRef.current, s.bigScale, false, ctx.getMapMarkers ? ctx.getMapMarkers() : undefined);
      else ctx.drawMap(ctx.miniCanvasRef.current, 2.2, true);
      const dMs = performance.now() - _tD;
      perf.phaseEnd("mapdraw", _tD);
      if (!s.mapOpen && dMs > 10) s.mapSkipUntilMs = now + 350;
      mapDrawT = 0;
    }

    // Ambient block particles: sample a few nearby blocks a few times per
    // second; budgeted (<=3 motes/tick) so the shared pool never floods.
    // Lone emitters (a single fireplace) would never be hit by volume-random
    // sampling, so nearby registry entries are evaluated directly every tick.
    ambientT += dt;
    if (now - emitterNearAt > 4000) {
      emitterNearAt = now;
      const near: Array<{ x: number; y: number; z: number; id?: number }> = [];
      for (const e of s.emitters.values()) {
        const dx = e.x - s.player.x, dy = e.y - s.player.y, dz = e.z - s.player.z;
        if (dx * dx + dy * dy + dz * dz > 900) continue;
        near.push(e);
      }
      emitterNearCache = near;
    }
    const tryMoteAt = (bx: number, by: number, bz: number, id: number): boolean => {
      if (!id || !s.fx) return false;
      const specs = moteForBlock(id);
      if (!specs) return false;
      let out = false;
      for (const spec of specs) {
        if (Math.random() > spec.chance) continue;
        if (spec.needsAbove) {
          const above = ctx.getBlock(bx, by + 1, bz);
          if (spec.needsAbove === "water" && above !== 39) continue;
          if (spec.needsAbove === "lava" && above !== 40) continue;
          if (spec.needsAbove === "fluid" && above !== 39 && above !== 40) continue;
        }
        if (spec.needsSubmerged && ctx.getBlock(bx, by + 1, bz) !== 39) continue;
        s.fx.spawnMote(bx + 0.5, by + 0.5 + (spec.dy ?? 0), bz + 0.5, spec.color, spec.kind);
        out = true;
      }
      return out;
    };
    if (ambientT >= 0.35 && s.active && !s.mapOpen && s.fx) {
      ambientT = 0;
      let spawned = 0;
      for (let i = 0; i < 6 && spawned < 3; i++) {
        const a = Math.random() * Math.PI * 2;
        const d = 4 + Math.random() * 20;
        const bx = Math.floor(s.player.x + Math.sin(a) * d);
        const bz = Math.floor(s.player.z + Math.cos(a) * d);
        const by = Math.floor(s.player.y) + 6 - Math.floor(Math.random() * 14);
        if (tryMoteAt(bx, by, bz, ctx.getBlock(bx, by, bz))) spawned++;
      }
      for (const e of emitterNearCache) {
        if (spawned >= 6) break;
        const fx = Math.floor(e.x), fy = Math.floor(e.y), fz = Math.floor(e.z);
        if (tryMoteAt(fx, fy, fz, e.id ?? ctx.getBlock(fx, fy, fz))) spawned++;
      }
      let crackD2 = Infinity;
      for (const e of emitterNearCache) {
        const eid = e.id ?? ctx.getBlock(Math.floor(e.x), Math.floor(e.y), Math.floor(e.z));
        if (eid !== 85 && eid !== 86 && eid !== 102 && eid !== 630) continue;
        const dx = e.x - s.player.x, dy = e.y - s.player.y, dz = e.z - s.player.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < crackD2) crackD2 = d2;
      }
      if (crackD2 <= 9 && Math.random() < 0.5) playFireCrackle(Math.max(0, 1 - Math.sqrt(crackD2) / 3));
    }

    let meshed = 0;
    for (const c of s.chunks.values()) if (c.meshes) meshed++;
    perf.frameEnd(frameMs, () => ({
      chunkCount: s.chunks.size,
      meshed,
      genQ: s.genQ.length,
      meshQ: s.meshQ.length,
      renderCalls: s.renderer ? s.renderer.info.render.calls : 0,
      triangles: s.renderer ? s.renderer.info.render.triangles : 0,
      geoms: s.renderer ? s.renderer.info.memory.geometries : 0,
      textures: s.renderer ? s.renderer.info.memory.textures : 0,
      mobs: ctx.mobMgr.mobs.length,
      animals: ctx.mobMgr.animals.length,
      villagers: s.villagers.size,
      horizonTiles: s.horizonTileCount || 0,
      poolDepth: s.meshPoolDepth || 0,
      poolBusy: s.meshPoolBusy || 0,
      fallbacks: s.meshFallbacks || 0,
      horizonMs: s.horizonBuildMs || 0,
      heapMB: captureHeapMB(),
      renderDist: s.render,
      worldId: s.currentWorldId,
      pos: { x: s.player.x, y: s.player.y, z: s.player.z }
    }));
  }

  return { frame, hudSnapshot };
}
