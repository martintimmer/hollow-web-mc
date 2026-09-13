// Hollowpine — Sim-mode detection & helpers (browser side).
// The sim is a *separate* boot of the same bundle: ?sim=1 in the URL.
// Server-side admin gating happens in server/sim.js; this module
// only decides which client-side behaviours are enabled.

const QS = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");

/**
 * Sim-mode detection:
 * - The dev/sim port = the Sim Deck environment, ALWAYS sim (auto flat area, no world prompts)
 * - Any port + ?sim=1 = explicit sim flag (dev convenience)
 * - The prod entry = normal game: prompts for the world as usual.
 */
export function isSim(): boolean {
  return isSimPort() || QS.get("sim") === "1";
}

export function isSimPort(): boolean {
  if (typeof window === "undefined") return false;
  const p = window.location.port;
  return p === "5450" || p === "5451";
}

/** Server-confirmed admin access. Gates the SimDeck overlay via /api/sim/access. */
let simAccess: boolean | null = null;

export function isSimAllowed(): boolean {
  return simAccess === true;
}

export async function probeSimAccess(): Promise<boolean> {
  try {
    const res = await fetch("/api/sim/access", { credentials: "include" }).catch(() => null);
    simAccess = !!(res && res.ok);
    return simAccess;
  } catch {
    simAccess = false;
    return false;
  }
}

export function simSeed(): string {
  return QS.get("seed") || "sim:default";
}

export function simType(): string {
  return QS.get("type") || "standard";
}

export function simBuilder(): boolean {
  return QS.get("builder") === "1";
}

/** Flat-Pad mode: only a big flat grass plane + single catalogued specimen at the center.
 *  On the sim port this is the DEFAULT experience; ?flat=1 works from any port; ?flat=0 disables on the sim port. */
export function simFlat(): boolean {
  if (QS.has("flat")) return QS.get("flat") === "1";
  return isSimPort();
}

/** Dev hook: auto-place a cottage and park a camera in front of its door (headless door inspection). */
export function simDoorMode(): boolean {
  return QS.get("simdoor") === "1";
}

export function simPersist(): boolean {
  return QS.get("simPersist") === "1";
}

const LOG_RING: string[] = [];
export function simLog(msg: string) {
  const line = `[sim] ${new Date().toISOString().slice(11, 23)} ${msg}`;
  LOG_RING.push(line);
  if (LOG_RING.length > 200) LOG_RING.shift();
  try { console.info(line); } catch { /* noop */ }
}

export function simLogRing(): string[] {
  return [...LOG_RING];
}
