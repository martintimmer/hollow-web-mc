import React, { useEffect, useState } from "react";
import type { GameState } from "../../game/state/gameState";
import { BLOCK_MAP } from "../../game/blocks";
import { VERSION } from "../../buildTag";

function fmt(n: number | undefined, digits = 0): string {
  if (n === undefined || !Number.isFinite(n)) return "?";
  return digits > 0 ? n.toFixed(digits) : String(Math.round(n));
}

export const MeterDebugOverlay: React.FC<{ stateRef: React.MutableRefObject<GameState> }> = ({ stateRef }) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 333);
    return () => clearInterval(iv);
  }, []);
  const s = stateRef.current;
  const sunY = Math.cos(((s.time - 6000) / 24000) * Math.PI * 2);
  const row: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 8 };
  const model = (s as unknown as { exposureModel?: string }).exposureModel === "iso-ettl" ? "ISO" : "LEG";
  const winW = Math.max(8, Math.min(17, Math.round(s.ev || 12)));
  const winM = s.meterExp > 0 ? s.meterExp : 0;
  const winLo = winM / Math.pow(2, winW / 2);
  const winHi = winM * Math.pow(2, winW / 2);
  let winClip = -1;
  if (s.ttlZoneLux && s.ttlZoneLux.length === 63 && winM > 0) {
    winClip = 0;
    for (const z of s.ttlZoneLux) if (z < winLo || z > winHi) winClip++;
  }
  const zones = s.ttlLin && s.ttlLin.length === 63 ? s.ttlLin : null;
  let zoneRows: string[] = [];
  if (zones) {
    const shades = " .:-=+*#%@";
    let mn = Infinity, mx = -Infinity;
    for (const v of zones) {
      const l = Math.log2(v + 1e-4);
      if (l < mn) mn = l;
      if (l > mx) mx = l;
    }
    const span = Math.max(1e-3, mx - mn);
    for (let gz = 0; gz < 7; gz++) {
      let line = "";
      for (let gx = 0; gx < 9; gx++) {
        const l = Math.log2(zones[gz * 9 + gx] + 1e-4);
        line += shades[Math.max(0, Math.min(shades.length - 1, Math.floor(((l - mn) / span) * shades.length)))];
      }
      zoneRows.push(line);
    }
  }
  return (
    <div className="fixed left-3 top-3 z-40 select-none font-mono text-[10px] leading-tight text-emerald-200 bg-black/75 border border-emerald-900 rounded px-2 py-1.5 pointer-events-none whitespace-nowrap">
      <div className="font-bold text-[#FFFFA0] mb-0.5">METER 3Hz · {(s.metering || "matrix").toUpperCase()} · {model} · {s.dimension || "overworld"} · {VERSION}</div>
      <div style={row}><span>time/sunY/moonPh</span><span>{fmt(s.time)}/{fmt(sunY, 2)}/{((s.dayCount || 0) % 8 + 8) % 8}</span></div>
      <div style={row}><span>wx type/cloud</span><span>{s.weatherType || "?"} / {s.cloudWeather || "?"}</span></div>
      <div style={row}><span>aim block/face/dist</span><span>{s.meterBlockId > 0 ? `${BLOCK_MAP.get(s.meterBlockId)?.name || s.meterBlockId} ${s.meterBlockFace} ${fmt(s.meterBlockDist, 1)}m` : "sky (no hit)"}</span></div>
      <div style={row}><span>LUX total(sc+em)</span><span>{fmt(s.meterLux)}({fmt(s.meterSceneLux)}+{fmt(s.meterEmitterLux)}) pk{fmt(s.meterPeakLux)}</span></div>
      <div style={row}><span>flashLux</span><span>{fmt((s.lastFlashEnv || 0) * 6000)}</span></div>
      <div style={row}><span>gain/ISO</span><span>×{fmt(s.meterGain, 2)}/ISO{fmt(s.meterISO)}</span></div>
      <div style={row}><span>P f/t/comp</span><span>f/{fmt(s.meterN, 1)} {s.meterT >= 1 ? `${s.meterT}s` : `1/${Math.round(1 / (s.meterT || 1 / 60))}`} {(s.evComp > 0 ? "+" : "") + (s.evComp || 0).toFixed(1)}</span></div>
      <div style={row}><span>wbK</span><span>{fmt(s.wbK)}K (tgt {fmt(s.wbTargetK)})</span></div>
      <div style={row}><span>ttl 9x7/mean/ms</span><span>{s.ttlReady ? `on ${fmt(s.ttlFrameMean, 3)} ${fmt(s.ttlMs, 1)}ms` : "off (legacy or warming)"}</span></div>
      <div style={row}><span>win {winW}st lo/hi/clip</span><span>{winM > 0 ? `${fmt(winLo)}/${fmt(winHi)}${winClip >= 0 ? ` c${winClip}/63` : ""}` : "?"}</span></div>
      <div style={row}><span>ttl anchor/hdr/drift</span><span>{s.ttlHDROk && s.ttlAnchor > 0 ? `${fmt(s.ttlAnchor)} ×${fmt((s.ttlHDRMean || 0) * s.ttlAnchor)}lx` : "hdr off"}</span></div>
      {zoneRows.length > 0 && (
        <pre className="mt-0.5 text-emerald-300/90">{zoneRows.join("\n")}</pre>
      )}
    </div>
  );
};
