import React, { useEffect, useRef, useState } from "react";
import { BLOCK_MAP, getToolInfo } from "../../game/blocks";
import { LoadingOverlay } from "./LoadingOverlay";
import { VERSION } from "../../buildTag";

function getCustomBlockOverrideThumb(id: number): string | null {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem("mc_custom_atlas_overrides") : null;
    if (!raw) return null;
    const overrides = JSON.parse(raw);
    return (
      overrides[`block_${id}_single_top`] ||
      overrides[`block_${id}_top`] ||
      overrides[`block_${id}_single_side`] ||
      overrides[`block_${id}_side`] ||
      overrides[`block_${id}`] ||
      null
    );
  } catch {
    return null;
  }
}

// Highlight @username mentions in chat text (gold if it's YOUR name, cyan otherwise)
const MENTION_RE = /(@[\w]+)/g;
export function renderChatText(text: string, myUsername?: string): React.ReactNode {
  const parts = String(text).split(MENTION_RE);
  return parts.map((p, i) => {
    if (/^@[\w]+$/.test(p)) {
      const mine = !!myUsername && p.toLowerCase() === "@" + myUsername.toLowerCase();
      return (
        <span
          key={i}
          className={mine ? "text-[#ffd166] font-bold bg-white/10 px-0.5 rounded" : "text-[#4fc3f7] font-bold"}
        >
          {p}
        </span>
      );
    }
    return <span key={i}>{p}</span>;
  });
}

export interface HUDProps {
  fps: number;
  detectedHz: number;
  maxFps: number;
  chunkCount: number;
  timeFormatted: string;
  dayCount: number;
  posInfo: { x: number; y: number; z: number; heading: string; state: string };
  creative: boolean;
  seed: string | number;
  worldLabel: string;
  inventoryOpen: boolean;
  mapOpen: boolean;
  setMapOpen: (val: boolean) => void;
  miniCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  isUnderwater: boolean;
  isUnderLava: boolean;
  toastMsg: string | null;
  hurtTick: number;
  dead: boolean;
  loading: boolean;
  loadPct: number;
  loadMsg: string;
  titleScreenOpen: boolean;
  worldSelectOpen: boolean;
  menuOpen: boolean;
  health: number;
  oxygenBubbles: number;
  chatOpen: boolean;
  chatMessages: Array<{ username: string; text: string }>;
  myUsername?: string;
  chatInput: string;
  setChatInput: (val: string) => void;
  chatInputRef: React.RefObject<HTMLInputElement | null>;
  chatTextRef: React.MutableRefObject<string>;
  chatCancelRef: React.MutableRefObject<boolean>;
  openChat: () => void;
  closeChat: (send: boolean) => void;
  hoveredBlockName: string | null;
  setHoveredBlockName: (val: string | null) => void;
  hotbar: number[];
  hotbarCounts: number[];
  hotbarDamage?: number[];
  activeSlot: number;
  setActiveSlot: (slot: number) => void;
  isoThumbnails: Map<number, string>;
  aimedVillager: any;
  tradingVillager: any;
  setTradingVillager: (v: any) => void;
  onOpenMenu: () => void;
  onToggleInventory: () => void;
  musicOn: boolean;
  onToggleMusic: () => void;
  onOpenPets?: () => void;
  petsCount?: number;
  onAdvanceTime: () => void;
  onRespawnClick: () => void;
  onMobileKey: (key: string, pressed: boolean) => void;
  onMobileHitDown: () => void;
  onMobileHitUp: () => void;
  onMobileTake: () => void;
  onMobileLook: (dx: number, dy: number) => void;
  onToggleFly: () => void;
  forceTouchControls?: boolean;
  hungerBar: number;
  xpBar: { level: number; progress: number };
  onEnterStudio?: () => void;
  isStudioActive?: boolean;
  onToggleBuilding?: () => void;
  isBuildingMode?: boolean;
  isSimMode?: boolean;
  connOnline?: boolean;
  lastSyncAt?: number;
  pendingCount?: number;
  onSnap?: () => void;
  expoN?: number;
  expoT?: number;
  expoISO?: number;
  expoMode?: string;
  expoMM?: number;
  expoLux?: number;
  expoEV100?: number;
  expoClipUp?: number;
  expoModelTag?: string;
  evComp?: number;
  setEvComp?: (v: number) => void;
}

export const HUD: React.FC<HUDProps> = React.memo(({
  fps,
  detectedHz,
  maxFps,
  chunkCount,
  timeFormatted,
  dayCount,
  posInfo,
  creative,
  seed,
  worldLabel,
  inventoryOpen,
  mapOpen: _mapOpen,
  setMapOpen: _setMapOpen,
  miniCanvasRef,
  isUnderwater,
  isUnderLava,
  toastMsg,
  hurtTick,
  dead,
  loading,
  loadPct,
  loadMsg,
  titleScreenOpen,
  worldSelectOpen,
  menuOpen,
  health,
  oxygenBubbles,
  chatOpen,
  chatMessages,
  myUsername,
  chatInput,
  setChatInput,
  chatInputRef,
  chatTextRef,
  chatCancelRef,
  openChat: _openChat,
  closeChat,
  hoveredBlockName,
  setHoveredBlockName,
  hotbar,
  hotbarCounts,
  hotbarDamage,
  activeSlot,
  setActiveSlot,
  isoThumbnails,
  aimedVillager,
  tradingVillager,
  setTradingVillager,
  onOpenMenu,
  musicOn,
  onToggleMusic,
  onOpenPets,
  petsCount,
  onToggleInventory: _onToggleInventory,
  onAdvanceTime,
  onRespawnClick,
  onMobileKey,
  onMobileHitDown,
  onMobileHitUp,
  onMobileTake,
  onMobileLook,
  onToggleFly,
  forceTouchControls,
  hungerBar,
  xpBar,
  onEnterStudio: _onEnterStudio,
  isStudioActive: _isStudioActive,
  onToggleBuilding: _onToggleBuilding,
  isBuildingMode,
  isSimMode,
  connOnline = true,
  lastSyncAt = 0,
  pendingCount = 0,
  onSnap: _onSnap,
  expoN = 2.8,
  expoT = 1 / 50,
  expoISO = 100,
  expoMode = "matrix",
  expoMM = 17,
  expoLux = 0,
  expoEV100 = 0,
  expoClipUp = 0,
  expoModelTag = "LEG",
  evComp = 0,
  setEvComp
}) => {
  const [compOpen, setCompOpen] = useState(false);
  // ── Mobile touch controls: camera-look joystick + multi-touch action buttons ──
  const joyActiveRef = useRef<{ id: number; cx: number; cy: number } | null>(null);
  const joyOffsetRef = useRef({ x: 0, y: 0 });
  const joyBaseRef = useRef<HTMLDivElement>(null);
  const joyKnobRef = useRef<HTMLDivElement>(null);
  const lookCbRef = useRef(onMobileLook);
  lookCbRef.current = onMobileLook;
  const jumpTapAtRef = useRef(0);

  const setJoyKnob = (x: number, y: number) => {
    if (joyKnobRef.current) joyKnobRef.current.style.transform = `translate(${x}px, ${y}px)`;
  };

  useEffect(() => {
    let raf = 0;
    const loop = () => {
      const o = joyOffsetRef.current;
      if (o.x !== 0 || o.y !== 0) lookCbRef.current(o.x * 12, o.y * 12);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleJoyStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const t = e.changedTouches[0];
    const rect = joyBaseRef.current?.getBoundingClientRect();
    if (!rect) return;
    joyActiveRef.current = { id: t.identifier, cx: rect.left + rect.width / 2, cy: rect.top + rect.height / 2 };
  };

  const handleJoyMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const act = joyActiveRef.current;
    if (!act || !joyBaseRef.current) return;
    const r = joyBaseRef.current.getBoundingClientRect().width / 2;
    for (const t of Array.from(e.touches)) {
      if (t.identifier === act.id) {
        let dx = t.clientX - act.cx;
        let dy = t.clientY - act.cy;
        const len = Math.hypot(dx, dy);
        if (len > r) { dx = (dx / len) * r; dy = (dy / len) * r; }
        joyOffsetRef.current = { x: dx / r, y: dy / r };
        setJoyKnob(dx, dy);
        return;
      }
    }
  };

  const handleJoyEnd = (e: React.TouchEvent) => {
    const act = joyActiveRef.current;
    if (!act) return;
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === act.id) {
        joyActiveRef.current = null;
        joyOffsetRef.current = { x: 0, y: 0 };
        setJoyKnob(0, 0);
        return;
      }
    }
  };

  const jumpDownAtRef = useRef(0);
  const jumpClearTimerRef = useRef(0);

  const handleJumpStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const now = performance.now();
    if (now - jumpTapAtRef.current < 400) {
      jumpTapAtRef.current = 0;
      if (creative) { onToggleFly(); return; }
    } else {
      jumpTapAtRef.current = now;
    }
    window.clearTimeout(jumpClearTimerRef.current);
    jumpDownAtRef.current = now;
    onMobileKey("Space", true);
  };

  const handleJumpEnd = () => {
    const heldMs = performance.now() - jumpDownAtRef.current;
    if (heldMs >= 120) {
      onMobileKey("Space", false);
    } else {
      window.clearTimeout(jumpClearTimerRef.current);
      jumpClearTimerRef.current = window.setTimeout(() => onMobileKey("Space", false), 120 - heldMs);
    }
  };

  if (titleScreenOpen || worldSelectOpen) {
    if (loading) {
      return <LoadingOverlay pct={loadPct} message={loadMsg} />;
    }
    return null;
  }

  return (
    <>
      {/* Crosshair */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none z-10 opacity-90">
        <div className="absolute left-1/2 top-0 w-0.5 h-full -ml-[1px] bg-white mix-blend-difference" />
        <div className="absolute top-1/2 left-0 h-0.5 w-full -mt-[1px] bg-white mix-blend-difference" />
      </div>

      {/* Top-Left Debug & Position HUD - Hidden in Simulation Mode */}
      {!isSimMode ? (
        <div className="fixed left-3 top-3 z-20 flex flex-col gap-2 pointer-events-none">
          <div className="px-3 py-2 rounded-lg bg-black/65 backdrop-blur-md border border-[#e9e0cb]/20 text-[11.5px] leading-relaxed shadow-lg drop-shadow">
            <div className="font-bold text-[#e0913a] flex items-center gap-2">
              <span>{fps} FPS</span>
              <span className="text-white/40">|</span>
              <span>{chunkCount} Chunks</span>
              <span className="text-white/40">|</span>
              <span className="text-amber-300 font-bold">{timeFormatted}</span>
              <span className="text-[#e8d9a0] font-bold">📅 Day {dayCount + 1}</span>
              <span className="text-white/40">|</span>
              <span title={connOnline === false ? `Offline — ${(pendingCount ?? 0)} edit(s) will sync on reconnect` : (lastSyncAt ? `All changes synced · ${new Date(lastSyncAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}` : "Sync status unknown")}>
                {connOnline === false ? `🔴${(pendingCount ?? 0) > 0 ? ` ${pendingCount} pending` : " offline"}` : "🟢"}
              </span>
            </div>
            <div className="text-[#f4ecd8]/90 mt-0.5">
              X: <span className="text-white font-bold">{posInfo.x}</span> Y: <span className="text-white font-bold">{posInfo.y}</span> Z: <span className="text-white font-bold">{posInfo.z}</span>
            </div>
            <div className="text-xs text-[#8fbf6a] mt-0.5 font-semibold">
              {posInfo.heading} · <span className="capitalize">{creative || isBuildingMode ? `Creative (${posInfo.state})` : `Survival (${posInfo.state})`}</span>
            </div>
            <div className="text-[11px] text-[#55FF55] mt-0.5 font-bold mc-text-shadow">
              ⚡ {fps} FPS ({detectedHz} Hz Display) · {maxFps === 0 ? "∞ Unlimited" : `${maxFps} FPS Cap`}
            </div>
            <div className="text-[10px] text-white/50 mt-1">
              Seed: {seed} ({worldLabel})
            </div>
          </div>

          {/* Quick Access Top Bar: Minimal Clean HUD */}
          <div className="flex gap-2 pointer-events-auto">
            <button
              onClick={onOpenMenu}
              className="mc-button px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow"
            >
              <span>⚙️</span> Menu (Esc)
            </button>
            <button
              onClick={onAdvanceTime}
              title="Advance world time by 3 hours"
              className="mc-button px-2 py-1.5 text-xs font-bold flex items-center gap-1 shadow"
            >
              <span>⏩</span> +3h
            </button>
            <button
              onClick={onToggleMusic}
              title={musicOn ? "Pause music" : "Play music"}
              className="mc-button px-2 py-1.5 text-xs font-bold flex items-center gap-1 shadow"
            >
              <span>{musicOn ? "⏸️" : "▶️"}</span> Music
            </button>
            {onOpenPets && (
              <button
                onClick={onOpenPets}
                title="Your named pets"
                className="mc-button px-2 py-1.5 text-xs font-bold flex items-center gap-1 shadow"
              >
                <span>🐾</span> My Pets{petsCount ? ` (${petsCount})` : ""}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="fixed left-3 top-3 z-20 pointer-events-auto flex gap-2">
          <button
            onClick={onOpenMenu}
            className="mc-button px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow"
          >
            <span>⚙️</span> Menu (Esc)
          </button>
          <button
            onClick={onAdvanceTime}
            title="Advance world time by 6 hours"
            className="mc-button px-2 py-1.5 text-xs font-bold flex items-center gap-1 shadow"
          >
            <span>⏩</span> +6h
          </button>
          <button
            onClick={onToggleMusic}
            title={musicOn ? "Pause music" : "Play music"}
            className="mc-button px-2 py-1.5 text-xs font-bold flex items-center gap-1 shadow"
          >
            <span>{musicOn ? "⏸️" : "▶️"}</span> Music
          </button>
          {onOpenPets && (
            <button
              onClick={onOpenPets}
              title="Your named pets"
              className="mc-button px-2 py-1.5 text-xs font-bold flex items-center gap-1 shadow"
            >
              <span>🐾</span> My Pets{petsCount ? ` (${petsCount})` : ""}
            </button>
          )}
        </div>
      )}

      {/* Top-Right Minimap (Authentic Circular Compass Frame) - Hidden in Simulation Mode */}
      {!isSimMode && (
        <div className="fixed right-3 top-3 w-[156px] h-[156px] rounded-full border-4 border-[#373737] bg-[#0a0e12] overflow-hidden p-0.5 z-20 pointer-events-none shadow-2xl ring-2 ring-[#c6c6c6]/40">
          <canvas ref={miniCanvasRef} className="w-full h-full block rounded-full" />
        </div>
      )}

      {/* Fullscreen Underwater Submersion Overlay */}
      {isUnderwater && (
        <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden select-none">
          <div className="absolute inset-0 bg-[#0c3866]/40 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1864ab]/35 via-[#0c3866]/20 to-[#07213d]/60" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(8,30,55,0.7)_100%)]" />
        </div>
      )}

      {/* Fullscreen Under-Lava Molten Overlay */}
      {isUnderLava && (
        <div className="pointer-events-none fixed inset-0 z-10 overflow-hidden select-none bg-gradient-to-t from-[#c92a2a]/85 via-[#e8590c]/80 to-[#fcc419]/60 mix-blend-hard-light animate-pulse" />
      )}

      {/* Center Toast Notification (Minecraft Title / Action Bar) */}
      {toastMsg && (
        <div className="fixed left-1/2 top-10 -translate-x-1/2 px-6 py-2 bg-black/80 border-2 border-[#555555] text-sm font-bold tracking-wider uppercase text-[#FFFFA0] mc-text-shadow-yellow z-50 shadow-2xl animate-fade">
          {toastMsg}
        </div>
      )}

      {/* Damage Hurt Vignette Flash */}
      {hurtTick > 0 && <div key={hurtTick} className="hurt-vignette" />}

      {/* 1. Center Crosshair Reticle (HUD_example.png #1) */}
      {!loading && !titleScreenOpen && !worldSelectOpen && !inventoryOpen && !menuOpen && !dead && (
        <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none mix-blend-difference select-none">
          <svg width="18" height="18" viewBox="0 0 18 18" className="drop-shadow-sm">
            <rect x="8" y="1" width="2" height="6" fill="#ffffff" />
            <rect x="8" y="11" width="2" height="6" fill="#ffffff" />
            <rect x="1" y="8" width="6" height="2" fill="#ffffff" />
            <rect x="11" y="8" width="6" height="2" fill="#ffffff" />
          </svg>
        </div>
      )}

      {/* Multiplayer Chat Log & Input (Bottom-Left) */}
      {!loading && !titleScreenOpen && !worldSelectOpen && (
        <>
          {!chatOpen && chatMessages.length > 0 && (
            <div className="fixed left-3 bottom-24 z-20 pointer-events-none max-w-md space-y-0.5">
              {chatMessages.slice(-6).map((m, i) => (
                <div key={i} className="px-2 py-0.5 bg-black/45 text-xs text-white mc-text-shadow w-fit max-w-full truncate">
                  {m.username === "Server" ? (
                    <span className="text-[#ffd166] font-bold">§ {m.text}</span>
                  ) : (
                    <>
                      <span className="text-[#FFFFA0] font-bold">{m.username}:</span> {renderChatText(m.text, myUsername)}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
          {chatOpen && (
            <div className="fixed left-3 bottom-24 z-40 w-[480px] max-w-[80vw]">
              <div className="max-h-48 overflow-y-auto mb-1 space-y-0.5 pointer-events-auto">
                {chatMessages.slice(-12).map((m, i) => (
                  <div key={i} className="px-2 py-0.5 bg-black/60 text-xs text-white mc-text-shadow w-fit max-w-full">
                    {m.username === "Server" ? (
                      <span className="text-[#ffd166] font-bold">§ {m.text}</span>
                    ) : (
                      <>
                        <span className="text-[#FFFFA0] font-bold">{m.username}:</span> {renderChatText(m.text, myUsername)}
                      </>
                    )}
                  </div>
                ))}
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); closeChat(true); }}
                className="flex"
              >
                <input
                  ref={chatInputRef}
                  value={chatInput}
                  onChange={(e) => { setChatInput(e.target.value); chatTextRef.current = e.target.value; }}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); closeChat(true); } }}
                  onBlur={() => { if (!chatCancelRef.current) closeChat(false); }}
                  placeholder="Type a message… (Enter to send, Esc to cancel)"
                  maxLength={150}
                  autoFocus
                  className="flex-1 px-3 py-2 bg-black/75 border-2 border-white/60 text-sm text-white outline-none placeholder-white/40"
                />
                <button
                  type="submit"
                  onPointerDown={() => { chatCancelRef.current = true; }}
                  className="mc-button px-4 py-2 text-xs font-bold uppercase"
                >➤</button>
              </form>
            </div>
          )}
        </>
      )}

      {/* Death Screen Overlay */}
      {dead && (
        <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-8 bg-[#6b0f0f]/75 select-none animate-fade">
          <div className="text-5xl md:text-6xl font-bold text-white mc-text-shadow">You Died!</div>
          <div className="text-sm text-[#ffd7d7] tracking-wider uppercase">Better luck next time…</div>
          <button
            onClick={onRespawnClick}
            className="mc-button px-12 py-3 text-lg font-bold uppercase tracking-wider shadow-2xl"
          >
            Respawn
          </button>
        </div>
      )}

      {/* ======================================================= */}
      {/* AUTHENTIC MINECRAFT BOTTOM HUD ASSEMBLY */}
      {/* ======================================================= */}
      {!loading && !titleScreenOpen && !worldSelectOpen && !dead && !inventoryOpen && (
        <div className="fixed left-1/2 bottom-2 -translate-x-1/2 flex flex-col items-center z-20 pointer-events-none select-none">
          
          {/* Floating Hover Block / Item Name Tooltip */}
          {hoveredBlockName && !inventoryOpen && !menuOpen && (
            <div className="mb-2 px-3 py-1 bg-black/85 border border-[#555555] text-xs font-bold text-[#FFFFA0] mc-text-shadow-yellow shadow-2xl animate-fade">
              {hoveredBlockName}
            </div>
          )}

          {/* Status Bars Row (Health/Armor on Left, Hunger/Oxygen on Right) - Survival only */}
          {!creative && !isSimMode && (
            <div className="w-[370px] flex items-end justify-between mb-1 px-1">
              {/* Left Column: Armor Bar above Health Bar */}
              <div className="flex flex-col gap-0.5">
                {/* 2. Armor Bar (10 Shields) */}
                <div className="flex items-center gap-[2px]">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <span key={i} className="text-xs leading-none">🛡️</span>
                  ))}
                </div>
                {/* 3. Health Hearts (10 Red Hearts) */}
                <div className="flex items-center gap-[2px]">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const hp = health - i * 2;
                    return (
                      <span key={i} className={`text-xs leading-none drop-shadow ${hp <= 0 ? "opacity-30 grayscale" : ""}`}>
                        {hp >= 2 ? "❤️" : hp === 1 ? "💔" : "🖤"}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Oxygen above Hunger Bar */}
              <div className="flex flex-col gap-0.5 items-end">
                {/* Underwater Oxygen Bubbles */}
                {(isUnderwater || oxygenBubbles < 10) && (
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 10 }).map((_, i) => (
                      <div
                        key={i}
                        className={`w-2.5 h-2.5 rounded-full ${
                          i < oxygenBubbles
                            ? "bg-[#4da3ff] border border-[#d6ecff] shadow-[0_0_4px_#4da3ff]"
                            : "bg-transparent border border-white/20 opacity-20"
                        }`}
                      />
                    ))}
                  </div>
                )}
                {/* 6. Hunger Drumsticks (10 Drumsticks) */}
                <div className="flex items-center gap-[2px]">
                  {Array.from({ length: 10 }).map((_, i) => {
                    const hp = hungerBar - i * 2;
                    return (
                      <span key={i} className={`text-xs leading-none drop-shadow ${hp <= 0 ? "opacity-25 grayscale" : ""}`}>
                        {hp > 1 ? "🍗" : hp === 1 ? "🍖" : "🍗"}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 4. Experience Bar & Level Number (Hidden in Simulation Mode) */}
          {!isSimMode && (
            <div className="w-[370px] flex flex-col items-center mb-1">
              <span className="text-xs font-bold text-[#80FF20] mc-text-shadow leading-none mb-0.5">{xpBar.level}</span>
              <div className="w-full h-1.5 bg-[#000000] border border-[#2b2b2b] overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#70e010] to-[#99ff33]" style={{ width: `${Math.max(0, Math.min(100, xpBar.progress * 100))}%` }} />
              </div>
            </div>
          )}

          {/* 5. Connected 9-Slot Hotbar Container */}
          <div className="flex items-center bg-[#8B8B8B] p-[3px] border-t-2 border-l-2 border-[#373737] border-r-2 border-b-2 border-[#FFFFFF] shadow-[0_0_0_2px_#000000] pointer-events-auto">
            {hotbar.slice(0, 9).map((blockId, idx) => {
              const isSelected = idx === activeSlot;
              const count = hotbarCounts[idx] || 0;
              const effectiveId = (creative || isSimMode || count > 0) ? blockId : 0;
              const thumbUrl = effectiveId > 0 ? (isoThumbnails.get(effectiveId) || getCustomBlockOverrideThumb(effectiveId)) : null;
              const bName = BLOCK_MAP.get(effectiveId)?.name || "Empty";
              return (
                <button
                  key={idx}
                  title={effectiveId > 0 ? `${effectiveId}: ${bName}` : `Slot ${idx + 1}`}
                  onClick={() => setActiveSlot(idx)}
                  onMouseEnter={() => effectiveId > 0 && setHoveredBlockName(bName)}
                  onMouseLeave={() => setHoveredBlockName(null)}
                  className={`relative w-10 h-10 mc-hud-slot transition-none flex items-center justify-center p-0.5 ${
                    isSelected ? "mc-hotbar-slot-active" : ""
                  }`}
                >
                  {thumbUrl && effectiveId > 0 ? (
                    <img src={thumbUrl} alt={bName} className="w-full h-full object-contain drop-shadow pointer-events-none" />
                  ) : null}
                  <span className="absolute left-1 top-0.5 text-[8px] text-white/60 font-bold mc-text-shadow">{idx + 1}</span>
                  {!creative && !isSimMode && count > 1 && (
                    <span className="absolute right-1 bottom-0.5 text-[9px] font-bold text-white mc-text-shadow">
                      {count}
                    </span>
                  )}
                  {!creative && !isSimMode && (() => {
                    const tool = blockId > 0 ? getToolInfo(blockId) : null;
                    const dmg = hotbarDamage ? (hotbarDamage[idx] || 0) : 0;
                    if (!tool || dmg <= 0) return null;
                    const remPct = Math.max(0, Math.min(1, 1 - dmg / tool.maxDurability));
                    const barColor = remPct > 0.5 ? "#55FF55" : remPct > 0.2 ? "#FFFF55" : "#FF5555";
                    return (
                      <div className="absolute left-1 right-1 bottom-0.5 h-[2px] bg-black/80 pointer-events-none">
                        <div className="h-full transition-all duration-75" style={{ width: `${remPct * 100}%`, backgroundColor: barColor }} />
                      </div>
                    );
                  })()}
                </button>
              );
            })}
          </div>

        </div>
      )}

      {/* Floating Action Button to Trade when aiming at a villager in range */}
      {aimedVillager && !tradingVillager && !menuOpen && !inventoryOpen && !titleScreenOpen && !worldSelectOpen && (
        <button
          onClick={() => {
            setTradingVillager(aimedVillager);
            document.exitPointerLock?.();
          }}
          className="fixed left-1/2 bottom-28 -translate-x-1/2 px-5 py-2 mc-button text-xs font-bold uppercase !bg-[#2b8a3e] text-white shadow-2xl z-30 pointer-events-auto animate-bounce flex items-center gap-2"
        >
          <span>{aimedVillager.prof?.badge}</span>
          <span>Trade with {aimedVillager.prof?.name}</span>
        </button>
      )}

      {/* Touch Move Buttons for iPad / Mobile (forward / backward only) */}
      <div className={`fixed left-4 bottom-24 w-16 h-32 z-20 flex pointer-events-auto flex-col justify-between ${forceTouchControls ? "" : "md:hidden"}`}>
        <button
          onTouchStart={(e) => { e.preventDefault(); onMobileKey("KeyW", true); }}
          onTouchEnd={() => onMobileKey("KeyW", false)}
          onTouchCancel={() => onMobileKey("KeyW", false)}
          className="w-16 h-14 mc-button flex items-center justify-center text-base font-bold"
        >▲</button>
        <button
          onTouchStart={(e) => { e.preventDefault(); onMobileKey("KeyS", true); }}
          onTouchEnd={() => onMobileKey("KeyS", false)}
          onTouchCancel={() => onMobileKey("KeyS", false)}
          className="w-16 h-14 mc-button flex items-center justify-center text-base font-bold"
        >▼</button>
      </div>

      {/* Touch Action Buttons for iPad / Mobile: HIT (left-click) · TAKE (E/right-click) · JUMP */}
      <div className={`fixed right-4 bottom-36 flex flex-col gap-2.5 z-20 pointer-events-auto ${forceTouchControls ? "" : "md:hidden"}`}>
        <div className="flex gap-2">
          <button
            onTouchStart={(e) => { e.preventDefault(); onMobileHitDown(); }}
            onTouchEnd={onMobileHitUp}
            onTouchCancel={onMobileHitUp}
            className="w-14 h-14 mc-button flex items-center justify-center text-xs font-bold"
          >HIT</button>
          <button
            onTouchStart={(e) => { e.preventDefault(); onMobileTake(); }}
            className="w-14 h-14 mc-button flex items-center justify-center text-xs font-bold"
          >TAKE</button>
        </div>
        <button
          onTouchStart={handleJumpStart}
          onTouchEnd={handleJumpEnd}
          onTouchCancel={handleJumpEnd}
          className="w-14 h-14 mc-button flex items-center justify-center text-xs font-bold"
        >JUMP</button>
      </div>

      {/* Touch Camera-Look Joystick (multi-touch: works while holding buttons) */}
      <div
        ref={joyBaseRef}
        onTouchStart={handleJoyStart}
        onTouchMove={handleJoyMove}
        onTouchEnd={handleJoyEnd}
        onTouchCancel={handleJoyEnd}
        className={`fixed right-4 bottom-6 w-28 h-28 z-30 rounded-full pointer-events-auto bg-white/10 border-2 border-white/25 touch-none ${forceTouchControls ? "" : "md:hidden"}`}
      >
        <div
          ref={joyKnobRef}
          className="absolute left-1/2 top-1/2 w-12 h-12 -ml-6 -mt-6 rounded-full bg-white/60 border-2 border-white/90"
        />
      </div>

      {/* Lower Right Corner Version Indicator */}
      <div className="fixed right-3 bottom-1.5 z-20 text-[11px] font-bold text-white/80 select-none pointer-events-none mc-text-shadow font-mono tracking-wider">
        Hollowpine {VERSION}
      </div>

      {/* Lower Left Live Exposure (Program Auto) + EV-comp dial */}
      {!loading && !titleScreenOpen && !worldSelectOpen && !dead && (
        <div className="fixed left-3 bottom-1.5 z-20 select-none font-mono">
          <div className="flex items-center gap-1.5 text-[10px] font-bold text-white/85 mc-text-shadow tracking-wider">
            <span>P</span>
            <span>f/{expoN}</span>
            <span>{expoT >= 1 ? `${expoT}s` : `1/${Math.round(1 / expoT)}`}</span>
            <span>ISO{expoISO}</span>
            <span className="text-white/50 uppercase">{expoMode}</span>
            <span className="text-[#FFFFA0]">{expoMM}mm</span>
            <span className="text-white/70">{Math.round(expoLux)} LUX</span>
            <span className="text-sky-300/90">EV{expoEV100.toFixed(1)}</span>
            {expoClipUp > 0 && (
              <span className="text-red-400" title="zones above window">▲{expoClipUp}</span>
            )}
            <span className="text-white/40">{expoModelTag}</span>
            <div className="relative pointer-events-auto">
              <button
                className="mc-button px-1.5 py-px text-[10px] font-bold"
                title="Exposure compensation"
                onClick={() => setCompOpen((o) => !o)}
              >
                {(evComp > 0 ? "+" : "") + evComp.toFixed(1)}
              </button>
              {compOpen && (
                <div className="absolute left-0 bottom-6 flex flex-col mc-window p-0.5 min-w-[52px] max-h-44 overflow-y-auto">
                  {[-3, -2.5, -2, -1.5, -1, -0.7, -0.3, 0, 0.3, 0.7, 1, 1.5, 2, 2.5, 3].map((v) => (
                    <button
                      key={v}
                      className={`px-1.5 py-0.5 text-[10px] font-bold text-left hover:brightness-150 ${Math.abs(v - evComp) < 0.01 ? "text-[#FFFFA0]" : "text-white/80"}`}
                      onClick={() => { setEvComp?.(v); setCompOpen(false); }}
                    >
                      {(v > 0 ? "+" : "") + v.toFixed(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading Veil (Bedrock-style in-world overlay) */}
      {loading && (
        <LoadingOverlay pct={loadPct} message={loadMsg} />
      )}
    </>
  );
});
