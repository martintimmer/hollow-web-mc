/**
 * Worker pool for chunk meshing.
 * Spawns N module workers running src/game/engine/meshWorker.ts,
 * distributes ChunkMeshRequests FIFO, and forwards results with metadata
 * (chunk coords + version) so the main thread can drop stale results.
 * Auto-disables itself (falls back to main-thread slicing) on worker failure.
 */
import type { ChunkMeshRequest, ChunkMeshResponse } from "./meshWorker";
import type { MeshWorkerMsg } from "./meshWorker";

export interface MeshRequestMeta {
  cx: number;
  cz: number;
  version: number;
  t0: number;
  resolve: (ok: boolean) => void;
}

interface Pending {
  req: ChunkMeshRequest;
  meta: MeshRequestMeta;
}

export type MeshResultCb = (meta: MeshRequestMeta, res: ChunkMeshResponse) => void;
export type MeshFailCb = () => void;

export class MeshPool {
  private workers: Worker[] = [];
  private free: Worker[] = [];
  /** Job currently posted to each busy worker (index-aligned with this.workers). */
  private busy: Array<Pending | null> = [];
  private queue: Pending[] = [];
  private onResult: MeshResultCb;
  private onFail: MeshFailCb;
  private failed = 0;
  private disabled = false;

  constructor(onResult: MeshResultCb, onFail: MeshFailCb, count: number) {
    this.onResult = onResult;
    this.onFail = onFail;
    try {
      for (let i = 0; i < Math.max(1, Math.min(8, count)); i++) {
        const w = new Worker(new URL("./meshWorker.ts", import.meta.url), { type: "module" });
        w.onmessage = (e: MessageEvent<MeshWorkerMsg>) => this.handleMsg(w, e.data);
        w.onerror = () => this.handleError(w);
        this.workers.push(w);
        this.busy.push(null);
        this.free.push(w);
      }
    } catch {
      this.disabled = true;
    }
  }

  get ok(): boolean {
    return !this.disabled && this.workers.length > 0;
  }

  depth(): number {
    return this.queue.length;
  }

  busyCount(): number {
    return this.workers.length - this.free.length;
  }

  request(req: ChunkMeshRequest, meta: MeshRequestMeta): boolean {
    if (!this.ok) return false;
    // Coalesce: supersede any still-queued request for the same chunk (prevents queue
    // explosion while flying; stale results are dropped by the version check anyway).
    const dup = this.queue.findIndex((p) => p.req.cx === req.cx && p.req.cz === req.cz);
    if (dup >= 0) {
      this.queue[dup].meta.resolve(true);
      this.queue[dup] = { req, meta };
      return true;
    }
    const w = this.free.pop();
    if (w) {
      this.post(w, { req, meta });
      return true;
    }
    this.queue.push({ req, meta });
    return true;
  }

  private post(w: Worker, p: Pending) {
    const idx = this.workers.indexOf(w);
    if (idx >= 0) this.busy[idx] = p;
    w.postMessage(p.req);
  }

  private handleMsg(w: Worker, msg: MeshWorkerMsg) {
    const idx = this.workers.indexOf(w);
    const current = idx >= 0 ? this.busy[idx] : null;
    if (idx >= 0) this.busy[idx] = null;

    if (msg.error) {
      if (current) current.meta.resolve(false);
      this.recordFailure(w);
      return;
    }
    if (msg.res && current) {
      this.onResult(current.meta, msg.res);
    }
    // If the response doesn't match the currently assigned job (superseded worker queue),
    // resolve the waiter anyway so boot promises never hang.
    if (!current && msg.req) {
      for (let i = this.queue.length - 1; i >= 0; i--) {
        const p = this.queue[i];
        if (p.req.cx === msg.req.cx && p.req.cz === msg.req.cz) {
          this.queue.splice(i, 1);
          p.meta.resolve(true);
          break;
        }
      }
    }

    // Run next queued job on the now-idle worker
    const next = this.queue.shift();
    if (next) this.post(w, next);
    else this.free.push(w);
  }

  private recordFailure(w: Worker) {
    const i = this.workers.indexOf(w);
    if (i >= 0) {
      this.workers.splice(i, 1);
      this.busy.splice(i, 1);
      w.terminate();
    }
    this.failed++;
    if (this.failed >= 2 || this.workers.length === 0) {
      for (const w2 of this.workers) { w2.terminate(); }
      this.workers = [];
      this.busy = [];
      this.free = [];
      this.disabled = true;
      for (const p of this.queue.splice(0)) p.meta.resolve(false);
      this.onFail();
    }
  }

  private handleError(w: Worker) {
    const idx = this.workers.indexOf(w);
    const current = idx >= 0 ? this.busy[idx] : null;
    if (current) current.meta.resolve(false);
    this.recordFailure(w);
  }

  dispose() {
    for (const w of this.workers) w.terminate();
    this.workers = [];
    this.free = [];
    this.busy = [];
    this.queue = [];
    this.disabled = true;
  }
}

export function recommendedWorkerCount(): number {
  const hw = (globalThis as { navigator?: { hardwareConcurrency?: number } }).navigator;
  const n = hw?.hardwareConcurrency || 2;
  return Math.max(1, Math.min(8, n - 1));
}
