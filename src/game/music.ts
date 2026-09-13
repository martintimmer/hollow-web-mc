const TRACK_FILES = [
  "Green Meadows.mp3",
  "Minimal Ambient Cover with Solo Cello.mp3",
];

function baseUrl(): string {
  try {
    const b = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL;
    if (typeof b === "string" && b.length > 0) return b;
  } catch { /* ignore */ }
  return "/";
}

function trackUrl(file: string): string {
  const b = baseUrl();
  const sep = b.endsWith("/") ? "" : "/";
  return b + sep + "music/" + encodeURIComponent(file);
}

const TRACKS: string[] = TRACK_FILES.map(trackUrl);

let audio: HTMLAudioElement | null = null;
let musicCtx: AudioContext | null = null;
let musicFilter: BiquadFilterNode | null = null;
let graphWired = false;
let underwater = false;
let currentTrack = -1;
let currentMusicVolume = 0.5;
let musicEnabled = true;
let lastPlayAttempt = 0;
let gestureHooked = false;

function tryPlay(): void {
  if (!audio || !musicEnabled) return;
  if (typeof document !== "undefined" && document.hidden) return;
  const now = Date.now();
  if (now - lastPlayAttempt < 1000) return;
  lastPlayAttempt = now;
  if (musicCtx && musicCtx.state === "suspended") {
    musicCtx.resume().catch(() => {});
  }
  audio.play().catch(() => {});
}

function wireGraph(): void {
  if (graphWired || !audio) return;
  try {
    const w = window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext };
    const AC = w.AudioContext || w.webkitAudioContext;
    if (!AC) return;
    const c = new AC();
    const src = c.createMediaElementSource(audio);
    const filter = c.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = underwater ? 350 : 18000;
    src.connect(filter);
    filter.connect(c.destination);
    musicCtx = c;
    musicFilter = filter;
    graphWired = true;
  } catch {
    musicCtx = null;
    musicFilter = null;
  }
}

function hookGestures(): void {
  if (gestureHooked || typeof window === "undefined") return;
  gestureHooked = true;
  const retry = () => {
    if (audio && !audio.paused) {
      if (musicCtx && musicCtx.state === "suspended") musicCtx.resume().catch(() => {});
      return;
    }
    if (audio && currentMusicVolume > 0.01) tryPlay();
  };
  window.addEventListener("pointerdown", retry);
  window.addEventListener("keydown", retry);
  window.addEventListener("touchstart", retry);
}

function ensureAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (audio) return audio;
  try {
    const el = new Audio();
    el.preload = "auto";
    el.loop = false;
    el.volume = currentMusicVolume;
    el.addEventListener("ended", () => {
      playNext();
    });
    audio = el;
    hookGestures();
    wireGraph();
    return audio;
  } catch {
    return null;
  }
}

function playTrack(i: number): void {
  const el = ensureAudio();
  if (!el || TRACKS.length === 0) return;
  const idx = ((i % TRACKS.length) + TRACKS.length) % TRACKS.length;
  currentTrack = idx;
  try {
    if (!el.src || !el.src.endsWith(encodeURIComponent(TRACK_FILES[idx]))) {
      el.src = TRACKS[idx];
    }
    el.currentTime = 0;
  } catch { /* ignore seek errors before metadata */ }
  lastPlayAttempt = 0;
  tryPlay();
}

function playNext(): void {
  if (TRACKS.length === 0) return;
  let next = Math.floor(Math.random() * TRACKS.length);
  if (TRACKS.length > 1 && next === currentTrack) {
    next = (next + 1) % TRACKS.length;
  }
  playTrack(next);
}

export function setMusicVolume(v: number): void {
  currentMusicVolume = Math.max(0, Math.min(1, v));
  if (audio) {
    try {
      audio.volume = currentMusicVolume;
    } catch { /* ignore */ }
    if (musicEnabled && currentMusicVolume > 0.01 && audio.paused && audio.src) tryPlay();
  }
}

export function setMusicEnabled(on: boolean): void {
  musicEnabled = on;
  if (!audio) return;
  try {
    if (!on) audio.pause();
    else if (audio.src) tryPlay();
  } catch { /* ignore */ }
}

export function isMusicEnabled(): boolean {
  return musicEnabled;
}

export function getMusicVolume(): number {
  return currentMusicVolume;
}

export function setUnderwaterAudio(isUnder: boolean): void {
  underwater = isUnder;
  if (!musicFilter || !musicCtx) return;
  try {
    const targetFreq = underwater ? 350 : 18000;
    musicFilter.frequency.setTargetAtTime(targetFreq, musicCtx.currentTime, 0.2);
  } catch { /* ignore */ }
}

export function playAmbientMotif(): void {
  if (!musicEnabled) return;
  const el = ensureAudio();
  if (!el) return;
  if (musicCtx && musicCtx.state === "suspended") {
    musicCtx.resume().catch(() => {});
  }
  playNext();
}

export function tickAmbientMusic(_dt: number, isUnderWater = false): void {
  if (isUnderWater !== underwater) setUnderwaterAudio(isUnderWater);
  if (!musicEnabled) {
    if (audio && !audio.paused) {
      try { audio.pause(); } catch { /* ignore */ }
    }
    return;
  }
  const el = ensureAudio();
  if (!el) return;
  if (!el.src) {
    playNext();
    return;
  }
  if (el.paused) tryPlay();
}
