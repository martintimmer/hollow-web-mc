/* Procedural WebAudio SFX engine (Phase 6).
 * Zero external asset files: every sound is synthesized with Web Audio oscillators,
 * resonant biquad filters, and shaped noise bursts.
 * Singleton AudioContext with safe user-gesture unlock.
 */

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let diveFilter: BiquadFilterNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let currentVolume = 0.7;

function ensureCtx(): AudioContext | null {
  if (ctx) return ctx;
  try {
    const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const AC = w.AudioContext || w.webkitAudioContext;
    if (!AC) return null;
    const c = new AC();
    const g = c.createGain();
    g.gain.value = currentVolume;
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 18000;
    g.connect(f);
    f.connect(c.destination);

    // 1.5s of white noise buffer baked once
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * 1.5), c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;

    ctx = c;
    master = g;
    diveFilter = f;
    noiseBuf = buf;
  } catch {
    ctx = null;
  }
  return ctx;
}

/** Resume/init the AudioContext on any user gesture */
export function unlockAudio(): void {
  const c = ensureCtx();
  if (c && c.state === "suspended") c.resume().catch(() => {});
}

export function setVolume(v: number): void {
  currentVolume = Math.max(0, Math.min(1, v));
  if (master) master.gain.value = currentVolume;
}

/** Shared underwater muffle for ALL sfx (one permanent node, frequency only) */
export function setUnderwaterSfx(under: boolean): void {
  if (!diveFilter || !ctx) return;
  try {
    diveFilter.frequency.setTargetAtTime(under ? 500 : 18000, ctx.currentTime, 0.2);
  } catch { /* ignore */ }
}

function envGain(c: AudioContext, t0: number, peak: number, attack: number, decay: number): GainNode {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  return g;
}

function tone(
  freq0: number,
  freq1: number,
  peak: number,
  attack: number,
  decay: number,
  type: OscillatorType = "sine",
  when = 0
): void {
  const c = ensureCtx();
  if (!c || !master) return;
  const t0 = c.currentTime + when;
  const o = c.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq0, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, freq1), t0 + attack + decay);
  const g = envGain(c, t0, peak, attack, decay);
  o.connect(g);
  g.connect(master);
  o.start(t0);
  o.stop(t0 + attack + decay + 0.05);
}

function noise(
  peak: number,
  attack: number,
  decay: number,
  filterFrom: number,
  filterTo: number,
  type: BiquadFilterType = "lowpass",
  when = 0
): void {
  const c = ensureCtx();
  if (!c || !master || !noiseBuf) return;
  const t0 = c.currentTime + when;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(filterFrom, t0);
  f.frequency.exponentialRampToValueAtTime(Math.max(40, filterTo), t0 + attack + decay);
  const g = envGain(c, t0, peak, attack, decay);
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(t0);
  src.stop(t0 + attack + decay + 0.1);
}

// =========================================================================
// MATERIAL-AWARE GAME SOUND EFFECTS
// =========================================================================

/** Material categorizer based on block ID */
function getMaterialType(blockId?: number): "grass" | "stone" | "wood" | "sand" | "snow" | "gravel" {
  if (!blockId || blockId === 1 || blockId === 2 || blockId === 55 || blockId === 4) return "grass";
  if (blockId === 5 || blockId === 6 || blockId === 8 || blockId === 30 || blockId === 31 || blockId === 35) return "stone";
  if (blockId === 16 || blockId === 17 || blockId === 19 || blockId === 20 || blockId === 22 || blockId === 23 || blockId === 41 || blockId === 43) return "wood";
  if (blockId === 10 || blockId === 11) return "sand";
  if (blockId === 51 || blockId === 52 || blockId === 54) return "snow";
  if (blockId === 12) return "gravel";
  return "grass";
}

/** Footstep sound matched to terrain material beneath player */
export function playStep(blockId?: number): void {
  const mat = getMaterialType(blockId);
  const pitchRnd = (Math.random() - 0.5) * 0.15;

  switch (mat) {
    case "wood":
      tone(180 * (1 + pitchRnd), 90 * (1 + pitchRnd), 0.16, 0.003, 0.08, "triangle");
      noise(0.08, 0.002, 0.05, 1400, 300, "lowpass");
      break;
    case "stone":
      tone(320 * (1 + pitchRnd), 180 * (1 + pitchRnd), 0.12, 0.002, 0.05, "triangle");
      noise(0.14, 0.002, 0.04, 3800, 800, "bandpass");
      break;
    case "sand":
      noise(0.15, 0.006, 0.09, 2800, 1000, "bandpass");
      break;
    case "snow":
      noise(0.18, 0.003, 0.08, 4400, 900, "bandpass");
      break;
    case "gravel":
      noise(0.16, 0.004, 0.07, 2400, 600, "bandpass");
      tone(140, 70, 0.10, 0.002, 0.05, "triangle");
      break;
    case "grass":
    default:
      noise(0.14, 0.004, 0.06, 1800, 380, "bandpass");
      tone(120 * (1 + pitchRnd), 60, 0.08, 0.003, 0.05, "sine");
      break;
  }
}

/** Breaking a block */
export function playDig(blockId?: number): void {
  const mat = getMaterialType(blockId);
  if (mat === "stone") {
    noise(0.55, 0.002, 0.12, 4200, 500, "bandpass");
    tone(280, 80, 0.35, 0.003, 0.11, "triangle");
  } else if (mat === "wood") {
    noise(0.40, 0.003, 0.10, 1600, 250, "lowpass");
    tone(220, 90, 0.30, 0.004, 0.12, "triangle");
  } else {
    noise(0.45, 0.004, 0.11, 900, 140, "lowpass");
    tone(160, 70, 0.22, 0.004, 0.10, "triangle");
  }
}

/** Placing a block */
export function playPlace(blockId?: number): void {
  const mat = getMaterialType(blockId);
  if (mat === "stone") {
    tone(280, 140, 0.28, 0.003, 0.08, "triangle");
    noise(0.26, 0.002, 0.05, 3600, 800, "bandpass");
  } else if (mat === "wood") {
    tone(210, 100, 0.28, 0.003, 0.10, "triangle");
    noise(0.18, 0.003, 0.06, 1500, 400, "lowpass");
  } else {
    tone(210, 120, 0.25, 0.004, 0.09, "triangle");
    noise(0.22, 0.003, 0.06, 2200, 500, "lowpass");
  }
}

/** Weapon or tool swift swing whoosh */
export function playSwing(): void {
  noise(0.12, 0.01, 0.11, 1400, 400, "bandpass");
  tone(380, 180, 0.08, 0.01, 0.10, "sine");
}

/** Chest lid opening: slow wooden creak + hinge rattle */
export function playChestOpen(): void {
  noise(0.34, 0.004, 0.22, 700, 120, "lowpass");
  tone(150, 68, 0.30, 0.006, 0.16, "triangle");
  tone(210, 120, 0.12, 0.004, 0.20, "sine", 0.09);
}

/** Chest lid closing: soft wooden thud + latch snap */
export function playChestClose(): void {
  noise(0.28, 0.003, 0.18, 500, 100, "lowpass");
  tone(120, 50, 0.26, 0.004, 0.12, "triangle");
}

/** Wooden door creak & latch-handle click (toggle open/closed) */
export function playDoorUse(): void {
  noise(0.16, 0.006, 0.12, 1500, 260, "bandpass");
  tone(240, 60, 0.28, 0.003, 0.14, "sine");
  tone(5000, 3800, 0.035, 0.001, 0.02, "square", 0.05);
}

/** UI: menu button click (soft thock) */
export function playMenuClick(): void {
  tone(300, 150, 0.20, 0.002, 0.09, "square");
  noise(0.06, 0.003, 0.04, 2600, 700, "lowpass");
}

/** UI: hover tick (tiny click) */
export function playMenuHover(): void {
  tone(900, 700, 0.03, 0.001, 0.03, "square", 0.02);
}

/** UI: slider/toggle snap */
export function playSliderTick(): void {
  tone(520, 760, 0.10, 0.004, 0.07, "square");
}

/** Chat @mention ping: two quick high blips */
export function playChatPing(): void {
  tone(880, 1000, 0.07, 0.001, 0.06, "square", 0.05);
  tone(1180, 1300, 0.07, 0.001, 0.06, "square", 0.05);
}

/** Boot chime (logo reveal) */
export function playBootTone(): void {
  tone(523, 523, 0.16, 0.006, 0.3, "sine", 0);
  tone(659, 659, 0.12, 0.006, 0.32, "sine", 0.10);
  tone(784, 784, 0.12, 0.006, 0.36, "sine", 0.20);
}

/** UI: tab switch whoosh */
export function playTabSwitch(): void {
  noise(0.10, 0.012, 0.08, 2000, 600, "bandpass");
}

/** Big explosion — TNT */
export function playExplode(): void {
  noise(0.9, 0.002, 0.75, 1200, 60);
  tone(70, 32, 0.5, 0.002, 0.6, "sine");
  noise(0.25, 0.002, 0.12, 4000, 600, "bandpass");
}

/** Player hurt damage */
export function playHurt(): void {
  tone(420, 160, 0.3, 0.005, 0.18, "square");
  tone(320, 120, 0.25, 0.005, 0.22, "sine", 0.06);
}

/** Death sting — descending tone + hiss */
export function playDeath(): void {
  tone(300, 60, 0.35, 0.01, 0.8, "sawtooth");
  noise(0.3, 0.01, 0.7, 800, 100);
}

/** Water splash (entering liquid) */
export function playSplash(): void {
  noise(0.3, 0.005, 0.18, 3000, 900, "bandpass");
  tone(500, 900, 0.06, 0.005, 0.12, "sine");
}

/** Fire sizzle / TNT fuse */
export function playIgnite(): void {
  noise(0.18, 0.002, 0.22, 5000, 3000, "highpass");
  tone(2400, 1800, 0.05, 0.002, 0.2, "sine");
}

/** Villager trade chime */
export function playTrade(): void {
  tone(659, 659, 0.16, 0.004, 0.16, "sine"); // E5
  tone(523, 523, 0.16, 0.004, 0.2, "sine", 0.09); // C5
}

/** Crafting completion click-clack */
export function playCraft(): void {
  tone(880, 700, 0.08, 0.002, 0.05, "square");
  tone(520, 520, 0.08, 0.002, 0.08, "square", 0.05);
}

/** Level up / Experience ding */
export function playLevelUp(): void {
  tone(523.25, 523.25, 0.12, 0.004, 0.15, "triangle");        // C5
  tone(659.25, 659.25, 0.14, 0.004, 0.18, "triangle", 0.08); // E5
  tone(783.99, 783.99, 0.16, 0.004, 0.22, "triangle", 0.16); // G5
  tone(1046.50, 1046.50, 0.20, 0.004, 0.35, "sine", 0.24);    // C6
}

/** Furnace burn */
export function playFurnace(on: boolean): void {
  if (on) {
    tone(220, 140, 0.12, 0.01, 0.25, "sawtooth");
    noise(0.08, 0.01, 0.3, 1200, 300);
  } else {
    tone(320, 180, 0.06, 0.005, 0.12, "sine");
  }
}

/** Nether portal eerie ambient drone / hum */
export function playPortalHum(): void {
  tone(110, 82, 0.08, 0.15, 0.6, "sawtooth");
  tone(165, 123, 0.06, 0.1, 0.5, "sine", 0.1);
}

/** Nether portal dimensional warp whoosh / teleportation sound */
export function playPortalTravel(): void {
  tone(80, 220, 0.18, 0.2, 0.8, "sawtooth");
  tone(220, 55, 0.22, 0.3, 1.2, "sine", 0.4);
  noise(0.15, 0.1, 1.0, 800, 200);
}

/** Food eating / chewing sound bursts */
export function playEat(): void {
  noise(0.22, 0.003, 0.08, 1400, 450, "bandpass");
  tone(180, 95, 0.15, 0.005, 0.06, "square");
}

/** Eating completion / burp-gulp */
export function playBurp(): void {
  tone(160, 240, 0.22, 0.01, 0.18, "sine");
  tone(220, 110, 0.18, 0.02, 0.22, "triangle", 0.06);
}

/** Lever flip click */
export function playLeverClick(on: boolean): void {
  if (on) {
    tone(800, 400, 0.25, 0.002, 0.05, "square");
    noise(0.08, 0.002, 0.03, 3000, 800, "lowpass");
  } else {
    tone(550, 280, 0.25, 0.002, 0.05, "square");
    noise(0.08, 0.002, 0.03, 2400, 600, "lowpass");
  }
}

/** 3D ambient cave drone */
export function playCaveDrone(): void {
  tone(55, 48, 0.09, 0.8, 2.5, "sawtooth");
  tone(110, 98, 0.06, 0.5, 2.0, "sine", 0.3);
  noise(0.05, 0.4, 2.8, 400, 80, "lowpass");
}

/** Thunder crack + rolling boom (one-shot, scheduled by the storm flash timer) */
export function playThunderCrack(): void {
  const delay = Math.random() * 0.15;
  noise(0.5, 0.005, 0.18, 4500, 900, "bandpass", delay);
  tone(90, 34, 0.5, 0.01, 1.6, "sine", delay + 0.05);
  noise(0.3, 0.02, 1.8, 500, 90, "lowpass", delay + 0.1);
}

/** Rain patter burst (retriggered on a timer while raining — no loop node) */
export function playRainPatter(): void {
  noise(0.12, 0.05, 0.5, 3200, 1100, "bandpass");
  noise(0.07, 0.08, 0.7, 1800, 700, "bandpass", 0.15);
}

/** Fireplace crackle: woody pops + hiss, volume-scaled by proximity (0..1) */
export function playFireCrackle(volume = 1): void {
  const v = Math.max(0, Math.min(1, volume));
  if (v <= 0.01) return;
  const n = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < n; i++) {
    const at = Math.random() * 0.22;
    noise(0.22 * v, 0.002, 0.03 + Math.random() * 0.05, 2600 + Math.random() * 2200, 700, "bandpass", at);
    if (Math.random() < 0.5) tone(140 + Math.random() * 220, 70, 0.10 * v, 0.002, 0.05 + Math.random() * 0.05, "triangle", at);
  }
  noise(0.05 * v, 0.05, 0.4, 4000, 1500, "highpass");
}

/** Deep Nether rumble (one-shot, scheduled on a long timer like the cave drone) */
export function playNetherRumble(): void {
  tone(42, 30, 0.25, 0.4, 2.2, "sine");
  noise(0.1, 0.3, 2.5, 300, 70, "lowpass", 0.2);
}

/** Item pickup pop */
export function playPop(): void {
  tone(550, 1150, 0.28, 0.002, 0.06, "triangle");
  noise(0.08, 0.002, 0.03, 3500, 1200, "bandpass");
}


