import React, { useRef, useState } from "react";
import type { SpawnPortal } from "../../game/state/portalStorage";

export interface WorldMapModalProps {
  isOpen: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onWheel: (e: React.WheelEvent<HTMLDivElement>) => void;
  onClose: () => void;
  nearestVillage?: { name: string; x: number; z: number; dist: number; angle: number; bearing: string } | null;
  playerPos?: { x: number; y: number; z: number; yaw: number };
  compassHeading?: number;
  onHoverMove?: (cssX: number, cssY: number, cssW: number, cssH: number) => { x: number; z: number } | null;
  onHoverLeave?: () => void;
  onMapRightClick?: (cssX: number, cssY: number, cssW: number, cssH: number) => { x: number; z: number } | null;
  onSaveSpawn?: (name: string, x: number, z: number) => void;
  onSpawnAt?: (x: number, z: number) => void;
  portals?: SpawnPortal[];
  onTeleportSpawn?: (p: SpawnPortal) => void;
  onSetHomeSpawn?: (id: string) => void;
  onDeleteSpawn?: (id: string) => void;
  onRenameSpawn?: (id: string, name: string) => void;
  onFlashSpawn?: (p: SpawnPortal) => void;
  onMapPan?: (dxPx: number, dyPx: number) => void;
  onMapPinch?: (factor: number) => void;
  onMapRecenter?: () => void;
}

export const WorldMapModal: React.FC<WorldMapModalProps> = React.memo(({
  isOpen,
  canvasRef,
  onWheel,
  onClose,
  nearestVillage,
  playerPos,
  compassHeading = 0,
  onHoverMove,
  onHoverLeave,
  onMapRightClick,
  onSaveSpawn,
  onSpawnAt,
  portals = [],
  onTeleportSpawn,
  onSetHomeSpawn,
  onDeleteSpawn,
  onRenameSpawn,
  onFlashSpawn,
  onMapPan,
  onMapPinch,
  onMapRecenter
}) => {
  const coordsRef = useRef<HTMLSpanElement | null>(null);
  const [pending, setPending] = useState<{ sx: number; sy: number; x: number; z: number } | null>(null);
  const [pendingName, setPendingName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const touchRef = useRef<{ mode: "pan" | "pinch" | null; lx: number; ly: number; dist: number; lastTap: number; sx: number; sy: number; st: number; moved: boolean }>({ mode: null, lx: 0, ly: 0, dist: 0, lastTap: 0, sx: 0, sy: 0, st: 0, moved: false });
  const dragRef = useRef<{ down: boolean; lx: number; ly: number; sx: number; sy: number; moved: boolean }>({ down: false, lx: 0, ly: 0, sx: 0, sy: 0, moved: false });
  const autoSpawnName = `Spawn ${portals.length + 1}`;
  if (!isOpen) return null;

  // Calculate relative angle to nearest village for the rotating compass needle
  let villageAngleRel = 0;
  if (nearestVillage && playerPos) {
    const dx = nearestVillage.x - playerPos.x;
    const dz = nearestVillage.z - playerPos.z;
    const worldRad = Math.atan2(dx, -dz);
    villageAngleRel = worldRad - playerPos.yaw;
  }

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-3 pointer-events-none animate-fade select-none">
      <div
        onWheel={onWheel}
        className="pointer-events-auto flex flex-col items-center gap-2.5 mc-window p-3.5 shadow-2xl border-4 border-[#2b2b2b] max-w-[96vw] max-h-[96vh]"
        style={{
          boxShadow: "0 0 0 2px #555555, 0 10px 30px rgba(0,0,0,0.8)"
        }}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between w-full pb-2 border-b-2 border-[#555555]/30">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#FFFFA0] uppercase tracking-wider flex items-center gap-1.5 drop-shadow">
              🗺️ World Map & Explorer's Cartography
            </span>
            <span className="text-[11px] text-gray-300">
              (Scroll zoom • Right-click to add spawn • Touch: drag to move, pinch to zoom, double-tap to recenter)
            </span>
          </div>
          <button
            onClick={onClose}
            className="mc-button px-3 py-1 text-xs font-bold uppercase tracking-wider"
          >
            ✕ Close (M)
          </button>
        </div>

        {/* HUD Village Locator & Live Rotating Compass Bar */}
        <div className="w-full bg-[#1b1b1b]/95 border-2 border-[#444444] rounded p-2 flex flex-wrap items-center justify-between gap-2 shadow-inner text-xs font-mono">
          {/* 1. Live Compass Widget */}
          <div className="flex items-center gap-2.5 bg-[#111111] px-2.5 py-1.5 rounded border border-[#333333]">
            <div className="relative w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-br from-[#2a2a2a] to-[#0a0a0a] border-2 border-[#aa8833] shadow-md">
              {/* Bezel markers */}
              <span className="absolute top-0 text-[7px] font-bold text-red-400">N</span>
              <span className="absolute bottom-0 text-[7px] font-bold text-gray-400">S</span>
              <span className="absolute left-0.5 text-[7px] font-bold text-gray-400">W</span>
              <span className="absolute right-0.5 text-[7px] font-bold text-gray-400">E</span>
              
              {/* Rotating Compass Needle */}
              <div
                className="w-full h-full absolute flex items-center justify-center transition-transform duration-100 ease-out"
                style={{
                  transform: `rotate(${Math.round((villageAngleRel * 180) / Math.PI)}deg)`
                }}
              >
                <div className="w-0.5 h-3 bg-red-500 rounded-t -translate-y-1.5 shadow-[0_0_4px_rgba(255,0,0,0.8)]" />
                <div className="w-0.5 h-3 bg-blue-300 rounded-b translate-y-1.5" />
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-400 z-10 border border-black" />
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest">Compass Heading</span>
              <span className="font-bold text-[#FFFFA0]">
                {Math.round(compassHeading)}° ({["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(compassHeading / 45) % 8]})
              </span>
            </div>
          </div>

          {/* 2. Nearest Village Locator Tracker */}
          {nearestVillage ? (
            <div className="flex items-center gap-2 bg-[#1a2818] border border-[#3b6630] px-3 py-1.5 rounded shadow-sm">
              <span className="text-base">🏰</span>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Nearest Settlement:</span>
                  <span className="font-bold text-white drop-shadow">{nearestVillage.name}</span>
                </div>
                <div className="text-[11px] text-emerald-200 flex items-center gap-2">
                  <span>📏 <strong className="text-[#FFFFA0]">{nearestVillage.dist}m</strong> away</span>
                  <span>🧭 Bearing: <strong className="text-[#FFFFA0]">{nearestVillage.bearing} ({Math.round(nearestVillage.angle)}°)</strong></span>
                  <span className="text-gray-400">📍 (X:{nearestVillage.x}, Z:{nearestVillage.z})</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-[#1f1f1f] px-3 py-1.5 rounded border border-[#333333] text-gray-400">
              <span>🏰</span>
              <span>Scanning world territory for settlements…</span>
            </div>
          )}

          {/* 3. Player Position Coordinates */}
          {playerPos && (
            <div className="flex items-center gap-2 bg-[#111111] px-2.5 py-1.5 rounded border border-[#333333] text-[11px]">
              <span className="text-gray-400">Player:</span>
              <span className="font-bold text-[#FFFFA0]">
                X: {Math.floor(playerPos.x)}, Y: {Math.floor(playerPos.y)}, Z: {Math.floor(playerPos.z)}
              </span>
              <span ref={coordsRef} className="font-bold text-emerald-300" />
            </div>
          )}
        </div>

        {/* Map + Spawn Sidebar */}
        <div className="flex flex-row gap-2.5 w-full items-start">
          {/* Spawn Points Sidebar */}
          <div className="w-52 shrink-0 mc-window p-2 flex flex-col gap-1.5 max-h-[65vh]">
            <div className="text-[11px] font-bold text-[#FFFFA0] uppercase tracking-wider">
              📍 Spawns ({portals.length})
            </div>
            <div className="overflow-y-auto flex flex-col gap-1.5 pr-0.5">
              {portals.length === 0 && (
                <div className="text-[11px] text-gray-400">
                  No spawns yet — right-click the map to add one.
                </div>
              )}
              {portals.map((p) => (
                <div
                  key={p.id}
                  className="mc-slot p-1.5 flex flex-col gap-1 cursor-pointer hover:brightness-125"
                  onClick={() => onFlashSpawn?.(p)}
                  title="Click to flash on map"
                >
                  <div className="flex items-center gap-1">
                    <span className="text-sm leading-none">{p.isHome ? "🏠" : "📍"}</span>
                    {editingId === p.id ? (
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value.slice(0, 24))}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && editingName.trim()) {
                            onRenameSpawn?.(p.id, editingName.trim());
                            setEditingId(null);
                          } else if (e.key === "Escape") {
                            setEditingId(null);
                          }
                        }}
                        className="mc-slot px-1 py-0.5 text-[11px] text-white w-full outline-none"
                      />
                    ) : (
                      <span className="text-[11px] font-bold text-white truncate flex-1">{p.name}</span>
                    )}
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono">
                    X:{p.x} Y:{p.y} Z:{p.z}
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {editingId === p.id ? (
                      <>
                        <button
                          className="mc-button px-1.5 py-0.5 text-[10px] font-bold uppercase"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (editingName.trim()) onRenameSpawn?.(p.id, editingName.trim());
                            setEditingId(null);
                          }}
                        >
                          ✓
                        </button>
                        <button
                          className="mc-button px-1.5 py-0.5 text-[10px] font-bold uppercase"
                          onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="mc-button px-1.5 py-0.5 text-[10px] font-bold uppercase"
                          title="Teleport here"
                          onClick={(e) => { e.stopPropagation(); onTeleportSpawn?.(p); }}
                        >
                          ➜
                        </button>
                        <button
                          className="mc-button px-1.5 py-0.5 text-[10px] font-bold uppercase"
                          title="Rename"
                          onClick={(e) => { e.stopPropagation(); setEditingId(p.id); setEditingName(p.name); }}
                        >
                          ✏️
                        </button>
                        {!p.isHome && (
                          <button
                            className="mc-button px-1.5 py-0.5 text-[10px] font-bold uppercase"
                            title="Set as home"
                            onClick={(e) => { e.stopPropagation(); onSetHomeSpawn?.(p.id); }}
                          >
                            🏠
                          </button>
                        )}
                        <button
                          className="mc-button px-1.5 py-0.5 text-[10px] font-bold uppercase"
                          title="Remove"
                          onClick={(e) => { e.stopPropagation(); onDeleteSpawn?.(p.id); }}
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Map Canvas with Minecraft Parchment Shadow */}
          <div
            className="mc-slot p-1.5 bg-[#0a0e12] rounded border-2 border-[#444444] shadow-2xl relative flex-1"
            style={{ touchAction: "none" }}
            onTouchStart={(e) => {
              const t = touchRef.current;
              if (e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                t.mode = "pinch";
                t.dist = Math.hypot(dx, dy);
              } else if (e.touches.length === 1) {
                t.mode = "pan";
                t.lx = e.touches[0].clientX;
                t.ly = e.touches[0].clientY;
                t.sx = e.touches[0].clientX;
                t.sy = e.touches[0].clientY;
                t.st = Date.now();
                t.moved = false;
              }
            }}
            onTouchMove={(e) => {
              const t = touchRef.current;
              if (t.mode === "pinch" && e.touches.length === 2) {
                const dx = e.touches[0].clientX - e.touches[1].clientX;
                const dy = e.touches[0].clientY - e.touches[1].clientY;
                const dist = Math.hypot(dx, dy);
                if (t.dist > 0 && dist > 0) onMapPinch?.(dist / t.dist);
                t.dist = dist;
              } else if (t.mode === "pan" && e.touches.length === 1) {
                const dx = e.touches[0].clientX - t.lx;
                const dy = e.touches[0].clientY - t.ly;
                t.lx = e.touches[0].clientX;
                t.ly = e.touches[0].clientY;
                if (Math.abs(e.touches[0].clientX - t.sx) + Math.abs(e.touches[0].clientY - t.sy) > 8) t.moved = true;
                if (dx !== 0 || dy !== 0) onMapPan?.(dx, dy);
              }
            }}
            onTouchEnd={(e) => {
              const t = touchRef.current;
              if (t.mode === "pan" && e.touches.length === 0) {
                const now = Date.now();
                if (!t.moved && now - t.st < 300 && onHoverMove) {
                  const cv = canvasRef.current;
                  if (cv) {
                    const r = cv.getBoundingClientRect();
                    const hit = onHoverMove(t.sx - r.left, t.sy - r.top, r.width, r.height);
                    if (hit) {
                      setPendingName("");
                      setPending({ sx: t.sx - r.left, sy: t.sy - r.top, x: hit.x, z: hit.z });
                    }
                  }
                } else if (!t.moved && now - t.lastTap < 300) {
                  setPending(null);
                  onMapRecenter?.();
                }
                t.lastTap = now;
              }
              if (e.touches.length === 0) t.mode = null;
            }}
            onClick={(e) => {
              if (dragRef.current.moved) { dragRef.current.moved = false; return; }
              const cv = canvasRef.current;
              if (!cv || !onHoverMove) return;
              if ((e.target as HTMLElement).closest("button,input")) return;
              const r = cv.getBoundingClientRect();
              const hit = onHoverMove(e.clientX - r.left, e.clientY - r.top, r.width, r.height);
              if (hit) {
                setPendingName("");
                setPending({ sx: e.clientX - r.left, sy: e.clientY - r.top, x: hit.x, z: hit.z });
              }
            }}
            onMouseDown={(e) => {
              if (e.button !== 0) return;
              if ((e.target as HTMLElement).closest("button,input")) return;
              dragRef.current = { down: true, lx: e.clientX, ly: e.clientY, sx: e.clientX, sy: e.clientY, moved: false };
            }}
            onMouseMove={(e) => {
            const cv = canvasRef.current;
            if (!cv || !onHoverMove) return;
            const r = cv.getBoundingClientRect();
            const hit = onHoverMove(e.clientX - r.left, e.clientY - r.top, r.width, r.height);
            const d = dragRef.current;
            if (d.down) {
              const dx = e.clientX - d.lx, dy = e.clientY - d.ly;
              d.lx = e.clientX; d.ly = e.clientY;
              if (dx !== 0 || dy !== 0) {
                onMapPan?.(dx, dy);
                setPending(null);
                if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 4) d.moved = true;
              }
            }
            if (coordsRef.current) {
              coordsRef.current.textContent = hit ? `→ X: ${Math.floor(hit.x)}, Z: ${Math.floor(hit.z)}` : "";
            }
          }}
          onMouseUp={() => { dragRef.current.down = false; }}
          onMouseLeave={() => {
            dragRef.current.down = false;
            dragRef.current.moved = false;
            if (coordsRef.current) coordsRef.current.textContent = "";
            setPending(null);
            onHoverLeave?.();
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            const cv = canvasRef.current;
            if (!cv || !onMapRightClick) return;
            const r = cv.getBoundingClientRect();
            const hit = onMapRightClick(e.clientX - r.left, e.clientY - r.top, r.width, r.height);
            if (hit) {
              setPendingName("");
              setPending({ sx: e.clientX - r.left, sy: e.clientY - r.top, x: hit.x, z: hit.z });
            }
          }}
        >
          <canvas
            ref={canvasRef}
            className="w-[min(90vw,880px)] h-[min(65vh,600px)] bg-[#0a0e12] block rounded cursor-crosshair"
          />
          {pending && (
            <div
              className="absolute z-10 mc-window p-2 flex items-center gap-1.5"
              style={{ left: Math.min(pending.sx + 12, 480), top: Math.max(pending.sy - 12, 8) }}
            >
              <span className="text-[11px] text-gray-300 font-bold whitespace-nowrap">
                📍 X:{Math.floor(pending.x)} Z:{Math.floor(pending.z)}
              </span>
              <input
                autoFocus
                value={pendingName}
                onChange={(e) => setPendingName(e.target.value.slice(0, 24))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onSaveSpawn?.(pendingName.trim() || autoSpawnName, pending.x, pending.z);
                    setPending(null);
                  } else if (e.key === "Escape") {
                    setPending(null);
                  }
                }}
                placeholder="Spawn name (optional)…"
                className="mc-slot px-1.5 py-1 text-xs text-white w-36 outline-none"
              />
              <button
                className="mc-button px-2 py-1 text-[11px] font-bold uppercase"
                title={pendingName.trim() ? "Save spawn" : `Save as "${autoSpawnName}"`}
                onClick={() => {
                  onSaveSpawn?.(pendingName.trim() || autoSpawnName, pending.x, pending.z);
                  setPending(null);
                }}
              >
                Add
              </button>
              <button
                className="mc-button px-2 py-1 text-[11px] font-bold uppercase !bg-[#2b8a3e] !text-white"
                title="Teleport onto the surface here"
                onClick={() => {
                  onSpawnAt?.(pending.x, pending.z);
                  setPending(null);
                }}
              >
                🛬 Spawn
              </button>
              <button
                className="mc-button px-2 py-1 text-[11px] font-bold uppercase"
                onClick={() => setPending(null)}
              >
                ✕
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
});
