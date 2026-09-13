import * as THREE from "three";
import type { GameState } from "../state/gameState";

export const TTL_COLS = 9;
export const TTL_ROWS = 7;
export const TTL_ZONES = TTL_COLS * TTL_ROWS;
const ZONE_PX = 12;
export const TTL_W = TTL_COLS * ZONE_PX;
export const TTL_H = TTL_ROWS * ZONE_PX;
const CADENCE_FRAMES = 5;
const HDR_W = 36;
const HDR_H = 28;
const HDR_CADENCE = 10;

let rt: THREE.WebGLRenderTarget | null = null;
let buf: Uint8Array | null = null;
let hdrRT: THREE.WebGLRenderTarget | null = null;
let hdrBuf: Uint16Array | null = null;
let frame = 0;

export function disposeTtlMeter(): void {
  try { rt?.dispose(); } catch {}
  try { hdrRT?.dispose(); } catch {}
  rt = null;
  buf = null;
  hdrRT = null;
  hdrBuf = null;
}

function ensure(): boolean {
  try {
    if (!rt || rt.width !== TTL_W || rt.height !== TTL_H) {
      try { rt?.dispose(); } catch {}
      rt = new THREE.WebGLRenderTarget(TTL_W, TTL_H, { depthBuffer: true });
      buf = new Uint8Array(TTL_W * TTL_H * 4);
    }
    return !!rt && !!buf;
  } catch {
    return false;
  }
}

function zoneArrays(s: GameState): { lin: number[]; rgb: number[]; clip: number[] } {
  const g = s as unknown as {
    ttlLin?: number[]; ttlRGB?: number[]; ttlClip?: number[];
  };
  if (!g.ttlLin || g.ttlLin.length !== TTL_ZONES) g.ttlLin = new Array(TTL_ZONES).fill(0);
  if (!g.ttlRGB || g.ttlRGB.length !== TTL_ZONES * 3) g.ttlRGB = new Array(TTL_ZONES * 3).fill(0);
  if (!g.ttlClip || g.ttlClip.length !== TTL_ZONES) g.ttlClip = new Array(TTL_ZONES).fill(0);
  return { lin: g.ttlLin as number[], rgb: g.ttlRGB as number[], clip: g.ttlClip as number[] };
}

export function maybeStepTtlMeter(s: GameState): void {
  const r = s.renderer;
  const scene = s.scene;
  const cam = s.camera;
  if (!r || !scene || !cam) return;
  frame++;
  if (frame % HDR_CADENCE === 0) {
    stepHDR(s, r, scene, cam);
    return;
  }
  if (frame % CADENCE_FRAMES !== 0) return;
  if (!ensure()) return;
  const t0 = performance.now();
  const prevTarget = r.getRenderTarget();
  const prevTone = r.toneMapping;
  const prevExp = r.toneMappingExposure;
  const prevShadowAuto = r.shadowMap.autoUpdate;
  try {
    r.shadowMap.autoUpdate = false;
    r.toneMapping = THREE.NoToneMapping;
    r.toneMappingExposure = 1;
    r.setRenderTarget(rt);
    r.render(scene, cam);
    r.readRenderTargetPixels(rt as THREE.WebGLRenderTarget, 0, 0, TTL_W, TTL_H, buf as Uint8Array);
  } catch {
    try {
      r.setRenderTarget(prevTarget);
      r.toneMapping = prevTone;
      r.toneMappingExposure = prevExp;
      r.shadowMap.autoUpdate = prevShadowAuto;
    } catch {}
    return;
  }
  try {
    r.setRenderTarget(prevTarget);
    r.toneMapping = prevTone;
    r.toneMappingExposure = prevExp;
    r.shadowMap.autoUpdate = prevShadowAuto;
  } catch {}
  const px = buf as Uint8Array;
  const { lin, rgb, clip } = zoneArrays(s);
  let frameSum = 0;
  for (let gz = 0; gz < TTL_ROWS; gz++) {
    for (let gx = 0; gx < TTL_COLS; gx++) {
      const zi = gz * TTL_COLS + gx;
      let sr = 0, sg = 0, sb = 0, n = 0, c = 0;
      for (let py = 0; py < ZONE_PX; py++) {
        const y = (TTL_ROWS - 1 - gz) * ZONE_PX + py;
        for (let pxx = 0; pxx < ZONE_PX; pxx++) {
          const x = gx * ZONE_PX + pxx;
          const o = (y * TTL_W + x) * 4;
          const R = px[o] / 255, G = px[o + 1] / 255, B = px[o + 2] / 255;
          sr += R; sg += G; sb += B; n++;
          if (R >= 0.99 && G >= 0.99 && B >= 0.99) c++;
        }
      }
      const mr = sr / n, mg = sg / n, mb = sb / n;
      const luma = 0.2126 * mr + 0.7152 * mg + 0.0722 * mb;
      lin[zi] = luma;
      rgb[zi * 3] = mr; rgb[zi * 3 + 1] = mg; rgb[zi * 3 + 2] = mb;
      clip[zi] = c / n;
      frameSum += luma;
    }
  }
  (s as unknown as { ttlFrameMean?: number }).ttlFrameMean = frameSum / TTL_ZONES;
  (s as unknown as { ttlReady?: boolean }).ttlReady = true;
  (s as unknown as { ttlAt?: number }).ttlAt = performance.now();
  (s as unknown as { ttlMs?: number }).ttlMs = performance.now() - t0;
}

function stepHDR(
  s: GameState,
  r: THREE.WebGLRenderer,
  scene: THREE.Scene,
  cam: THREE.PerspectiveCamera
): void {
  try {
    if (!hdrRT || hdrRT.width !== HDR_W || hdrRT.height !== HDR_H) {
      try { hdrRT?.dispose(); } catch {}
      hdrRT = new THREE.WebGLRenderTarget(HDR_W, HDR_H, { depthBuffer: true, type: THREE.HalfFloatType });
      hdrBuf = new Uint16Array(HDR_W * HDR_H * 4);
    }
    if (!hdrRT || !hdrBuf) return;
    const t0 = performance.now();
    const prevTarget = r.getRenderTarget();
    const prevTone = r.toneMapping;
    const prevExp = r.toneMappingExposure;
    const prevShadowAuto = r.shadowMap.autoUpdate;
    try {
      r.shadowMap.autoUpdate = false;
      r.toneMapping = THREE.NoToneMapping;
      r.toneMappingExposure = 1;
      r.setRenderTarget(hdrRT);
      r.render(scene, cam);
      r.readRenderTargetPixels(hdrRT, 0, 0, HDR_W, HDR_H, hdrBuf);
    } finally {
      try {
        r.setRenderTarget(prevTarget);
        r.toneMapping = prevTone;
        r.toneMappingExposure = prevExp;
        r.shadowMap.autoUpdate = prevShadowAuto;
      } catch {}
    }
    const g = s as unknown as {
      ttlHDR?: number[]; ttlHDRMean?: number; ttlAnchor?: number;
      ttlAnchorAt?: number; ttlHDROk?: boolean; ttlZoneLux?: number[];
    };
    if (!g.ttlHDR || g.ttlHDR.length !== TTL_ZONES) g.ttlHDR = new Array(TTL_ZONES).fill(0);
    const px = hdrBuf;
    let frameSum = 0;
    for (let gz = 0; gz < TTL_ROWS; gz++) {
      for (let gx = 0; gx < TTL_COLS; gx++) {
        let sum = 0, n = 0;
        for (let py = 0; py < 4; py++) {
          const y = (TTL_ROWS - 1 - gz) * 4 + py;
          for (let pxx = 0; pxx < 4; pxx++) {
            const x = gx * 4 + pxx;
            const o = (y * HDR_W + x) * 4;
            const R = THREE.DataUtils.fromHalfFloat(px[o]);
            const G = THREE.DataUtils.fromHalfFloat(px[o + 1]);
            const B = THREE.DataUtils.fromHalfFloat(px[o + 2]);
            if (Number.isFinite(R) && Number.isFinite(G) && Number.isFinite(B)) {
              sum += 0.2126 * R + 0.7152 * G + 0.0722 * B;
              n++;
            }
          }
        }
        const luma = n > 0 ? sum / n : 0;
        (g.ttlHDR as number[])[gz * TTL_COLS + gx] = luma;
        frameSum += luma;
      }
    }
    const hdrMean = frameSum / TTL_ZONES;
    g.ttlHDRMean = hdrMean;
    // Anchor solve (D1): slow cross-calibration of imaged units to analytic
    // lux. Global scale only (τ ~ tens of seconds); zones keep fast
    // distribution, so this cannot oscillate with the ~1 s meterExp loop.
    const zl = g.ttlZoneLux;
    const zlFresh = zl && zl.length === TTL_ZONES && performance.now() - (s.ttlZoneAt || 0) < 1500;
    let analytic = 0, za = 0;
    if (zlFresh) {
      for (const z of zl as number[]) za += Math.max(0, z);
      analytic = za / TTL_ZONES;
    } else {
      analytic = Math.max(0, s.meterSceneLux || 0);
    }
    if (hdrMean > 1e-6 && analytic > 0) {
      const inst = analytic / hdrMean;
      const prev = g.ttlAnchor && g.ttlAnchor > 0 ? g.ttlAnchor : inst;
      g.ttlAnchor = Math.max(1, Math.min(1e9, prev + (inst - prev) * 0.05));
      g.ttlAnchorAt = performance.now();
    }
    g.ttlHDROk = true;
    (s as unknown as { ttlMs?: number }).ttlMs = performance.now() - t0;
  } catch {
    (s as unknown as { ttlHDROk?: boolean }).ttlHDROk = false;
  }
}

export function ttlZoneAbsLux(s: GameState, zi: number): number {
  const g = s as unknown as { ttlHDR?: number[]; ttlAnchor?: number; ttlHDROk?: boolean };
  if (!g.ttlHDROk || !g.ttlHDR || !g.ttlAnchor || g.ttlAnchor <= 0) return 0;
  return Math.max(0, g.ttlHDR[zi] || 0) * g.ttlAnchor;
}

export function ttlCenterLin(s: GameState): number {
  const g = s as unknown as { ttlLin?: number[] };
  if (!g.ttlLin || g.ttlLin.length !== TTL_ZONES) return 0;
  let sum = 0;
  for (let gz = 2; gz <= 4; gz++) {
    for (let gx = 3; gx <= 5; gx++) sum += g.ttlLin[gz * TTL_COLS + gx];
  }
  return sum / 9;
}

export function ttlSpotLin(s: GameState): number {
  const g = s as unknown as { ttlLin?: number[] };
  if (!g.ttlLin || g.ttlLin.length !== TTL_ZONES) return 0;
  return g.ttlLin[3 * TTL_COLS + 4];
}
