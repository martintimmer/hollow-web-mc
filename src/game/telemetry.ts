// Hollowpine Web Minecraft — Client Performance Telemetry (pure TS, no React/three deps)
// Logs: FPS drops (60→10→60), main-thread blockages, chunk load activity, render budget.
// Flushed in batches to POST /api/debug/perf → data/telemetry-perf.jsonl
// Disabled by default: append ?telemetry=1 to the URL to opt a session back in.

export interface PerfFrameContext {
  chunkCount: number;
  meshed?: number;
  genQ: number;
  meshQ: number;
  renderCalls: number;
  triangles: number;
  geoms?: number;
  horizonTiles?: number;
  poolDepth?: number;
  poolBusy?: number;
  fallbacks?: number;
  horizonMs?: number;
  heapMB: number;
  renderDist: number;
  worldId: string;
  pos: { x: number; y: number; z: number };
}

interface ChunkOp {
  kind: "gen" | "mesh";
  key: string;
  ms: number;
}

const FLUSH_MS = 2000;
const SLOW_FRAME_MS = 40;          // ≈ 25 FPS or worse counts as a slow frame
const DROP_START_SLOW = 20;        // slow frames in window → drop begins
const DROP_END_SLOW = 4;           // slow frames in window → drop recovered
const STUTTER_SLOW_MIN = 4;        // slow frames in short window → mid-size stutter
const STALL_MS = 35;               // chunk op above this is a main-thread blockage candidate
const WINDOW = 30;

function heapMB(): number {
  try {
    const m = (performance as unknown as { memory?: { usedJSHeapSize?: number } }).memory;
    return m && m.usedJSHeapSize ? Math.round(m.usedJSHeapSize / 1048576) : 0;
  } catch { return 0; }
}

export function captureHeapMB(): number {
  return heapMB();
}

export function isTelemetryEnabled(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("telemetry") === "1";
  } catch {
    return false;
  }
}

class PerfMonitor {
  private frames: number[] = [];
  private phases: Array<[string, number]> = [];
  private worstPhases: Map<string, number> = new Map();
  private chunkOps: ChunkOp[] = [];
  private pending: string[] = [];
  private drop: { startTs: number; peak: number; n: number; ctx: PerfFrameContext } | null = null;
  private pulseAt = 0;
  private flushAt = 0;
  private started = false;
  private lastStutterAt = 0;

  frameBegin() {
    this.phases = [];
  }

  phaseStart(): number {
    return performance.now();
  }

  phaseEnd(name: string, t0: number) {
    const ms = performance.now() - t0;
    if (ms < 0.1) return;
    this.phases.push([name, ms]);
    const prev = this.worstPhases.get(name) || 0;
    if (ms > prev) this.worstPhases.set(name, ms);
  }

  asyncStage(name: string, ms: number) {
    const prev = this.worstPhases.get(name) || 0;
    if (ms > prev) this.worstPhases.set(name, ms);
  }
  chunkOp(kind: "gen" | "mesh", key: string, ms: number) {
    this.chunkOps.push({ kind, key, ms });
    if (this.chunkOps.length > 40) this.chunkOps.shift();
    if (ms > STALL_MS) {
      this.push("CHUNK_OP_STALL", { kind, key, ms });
    }
  }

  stall(ms: number) {
    this.push("EVENT_LOOP_STALL", { ms });
  }

  frameEnd(frameMs: number, ctx: () => PerfFrameContext) {
    if (!this.started) {
      this.started = true;
      this.pulseAt = performance.now();
      this.flushAt = this.pulseAt;
    }
    if (typeof document !== "undefined" && document.hidden) {
      this.frames.length = 0;
      this.frameBegin();
      return;
    }
    this.frames.push(frameMs);
    if (this.frames.length > WINDOW * 2) this.frames.shift();
    const now = performance.now();
    const windowFrames = this.frames.slice(-WINDOW);
    const slow = windowFrames.reduce((a, f) => a + (f > SLOW_FRAME_MS ? 1 : 0), 0);

    if (!this.drop && slow >= DROP_START_SLOW) {
      const snap = ctx();
      this.drop = { startTs: performance.now(), peak: 0, n: frameMs, ctx: snap };
      this.push("DROP_START", { slowFrames: slow, ctx: snap });
    }

    if (this.drop) {
      this.drop.peak = Math.max(this.drop.peak, frameMs);
      this.drop.n++;
      if (slow <= DROP_END_SLOW) {
        const d = this.drop;
        const dur = (performance.now() - d.startTs) / 1000;
        const topPhases = [...this.worstPhases.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
        const worstChunk = [...this.chunkOps].sort((a, b) => b.ms - a.ms).slice(0, 3);
        this.push("DROP_END", {
          durationMs: Math.round(dur * 1000),
          framesMissed: d.n,
          minFps: Math.round(1000 / Math.max(d.peak, 1)),
          peakFrameMs: Math.round(d.peak),
          phases: Object.fromEntries(topPhases),
          chunks: worstChunk,
          ctx: d.ctx
        });
        this.drop = null;
        this.worstPhases.clear();
      }
    } else {
      const prev = this.worstPhases.get("__fps");
      const fps = Math.round(1000 / Math.max(frameMs, 1));
      const worst = prev || 60;
      if (fps < worst) this.worstPhases.set("__fps", fps);
    }

    // Mid-size stutter (below full-drop detection): 4-19 slow frames in the rolling window
    if (!this.drop && slow >= STUTTER_SLOW_MIN && slow < DROP_START_SLOW && now - this.lastStutterAt > 800) {
      this.lastStutterAt = now;
      const peak = Math.max(...this.frames.slice(-10));
      this.push("STUTTER", { slowFrames: slow, peakFrameMs: Math.round(peak) });
    }

    if (now - this.pulseAt >= 2000) {
      this.pulseAt = now;
      const avg = windowFrames.reduce((a, f) => a + f, 0) / Math.max(1, windowFrames.length);
      const fps = Math.round(1000 / Math.max(avg, 1));
      const topPhases = [...this.worstPhases.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([n, ms]) => ({ phase: n, ms: Math.round(ms) }));
      const loading = [...this.chunkOps].sort((a, b) => b.ms - a.ms).slice(0, 5);
      this.worstPhases.clear();
      this.chunkOps = [];
      this.push("PULSE", {
        fps,
        frameMsAvg: Math.round(avg),
        chunkLoads: loading,
        phases: topPhases,
        ctx: ctx()
      });
    }

    if (now - this.flushAt >= FLUSH_MS) {
      this.flushAt = now;
      this.flush();
    }
  }

  private push(kind: string, data: Record<string, unknown>) {
    this.pending.push(JSON.stringify({
      ts: new Date().toISOString(),
      kind,
      ...data
    }));
    if (this.pending.length >= 25) this.flush();
  }

  async flush() {
    if (!this.pending.length) return;
    if (!isTelemetryEnabled()) { this.pending.length = 0; return; }
    const lines = this.pending.splice(0, this.pending.length);
    try {
      await fetch("/api/debug/perf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines })
      });
    } catch { /* offline: drop batch */ }
  }

  recentChunkOps(): ChunkOp[] {
    return this.chunkOps.slice();
  }
}

export const perf = new PerfMonitor();
