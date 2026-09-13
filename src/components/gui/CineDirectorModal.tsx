import React, { useEffect, useState } from "react";
import type { GameState } from "../../game/state/gameState";
import {
  buildPreload,
  startShot,
  stopShot,
  loadCineScenes,
  saveCineScene,
  deleteCineScene,
  type CineScene,
  type VideoProfile,
} from "../../game/engine/cinematic";
import { applyVideoProfile, type CinematicSetters } from "../hooks/useCinematicState";

export interface CineDirectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  stateRef: React.MutableRefObject<GameState>;
  cineValues: VideoProfile;
  videoSetters: CinematicSetters;
  showToast: (msg: string) => void;
}

function fmt(n: number): string {
  return Number.isFinite(n) ? n.toFixed(1) : "?";
}

export const CineDirectorModal: React.FC<CineDirectorModalProps> = ({
  isOpen,
  onClose,
  stateRef,
  cineValues,
  videoSetters,
  showToast,
}) => {
  const [, setTick] = useState(0);
  const [durInput, setDurInput] = useState("5");
  const [sceneName, setSceneName] = useState("");
  const [scenes, setScenes] = useState<CineScene[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    setScenes(loadCineScenes());
    setDurInput(String(stateRef.current.cineShotDur || 5));
    const iv = setInterval(() => setTick((t) => t + 1), 300);
    return () => clearInterval(iv);
  }, [isOpen, stateRef]);

  if (!isOpen) return null;
  const s = stateRef.current;
  const a = s.cineMarks?.a || null;
  const b = s.cineMarks?.b || null;
  const shot = s.cineShot;
  const playing = !!shot?.playing;
  const pre = s.cinePreload;
  const preActive = !!pre?.active;
  const prePct = pre && pre.total > 0 ? Math.round((pre.idx / pre.total) * 100) : 0;
  const shotPct = playing && shot && shot.dur > 0 ? Math.round((shot.t / shot.dur) * 100) : 0;
  const dur = Math.max(0.5, Math.min(120, Number(durInput) || 5));

  const markHere = (which: "a" | "b") => {
    if (!s.cine) return;
    if (!s.cineMarks) s.cineMarks = { a: null, b: null };
    s.cineMarks[which] = { ...s.cine };
    if (which === "a") {
      s.cineMarks.b = null;
      s.cineShot = null;
    }
    setTick((t) => t + 1);
    showToast(which === "a" ? "Camera A marked here" : "Camera B marked here");
  };

  const clearMarks = () => {
    s.cineMarks = { a: null, b: null };
    s.cineShot = null;
    s.cinePreload = null;
    s.cineAutoPlay = false;
    setTick((t) => t + 1);
  };

  const process = () => {
    s.cineShotDur = dur;
    s.cineAutoPlay = false;
    if (buildPreload(s)) showToast(`Loading ${s.cinePreload?.total || 0} chunks along the path…`);
    else showToast("Mark camera A and B first (Q key)");
    setTick((t) => t + 1);
  };

  const play = () => {
    s.cineShotDur = dur;
    if (preActive) {
      s.cineAutoPlay = true;
      showToast("Will play when chunk loading finishes");
    } else if (startShot(s, dur)) {
      showToast(`Playing ${dur}s dolly A → B`);
    } else {
      showToast("Mark camera A and B first (Q key)");
    }
    setTick((t) => t + 1);
  };

  const stop = () => {
    stopShot(s);
    s.cineAutoPlay = false;
    setTick((t) => t + 1);
  };

  const saveScene = () => {
    if (!a || !b) {
      showToast("Mark camera A and B first (Q key)");
      return;
    }
    const name = sceneName.trim() || `Scene ${scenes.length + 1}`;
    const scene: CineScene = {
      id: "scene_" + Date.now(),
      name,
      createdAt: Date.now(),
      a: { ...a },
      b: { ...b },
      dur,
      video: { ...cineValues },
    };
    setScenes(saveCineScene(scene));
    setSceneName("");
    showToast(`Scene saved: ${name}`);
  };

  const loadScene = (scene: CineScene, auto: boolean) => {
    s.cineMarks = { a: { ...scene.a }, b: { ...scene.b } };
    s.cineShot = null;
    s.cineShotDur = scene.dur;
    setDurInput(String(scene.dur));
    applyVideoProfile(videoSetters, scene.video);
    if (auto) {
      s.cineAutoPlay = true;
      if (!buildPreload(s)) {
        s.cineAutoPlay = false;
        startShot(s, scene.dur);
      }
      showToast(`Loading chunks, then playing: ${scene.name}`);
    } else {
      showToast(`Scene loaded: ${scene.name} — Process, then Play`);
    }
    setTick((t) => t + 1);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex items-start justify-end p-2 pointer-events-none select-none">
      <div className="pointer-events-auto flex flex-col gap-1.5 mc-window px-2 py-2 shadow-2xl border-4 border-[#2b2b2b] w-[290px] max-h-[calc(100vh-16px)] overflow-y-auto text-[10px]">
        <div className="flex items-center justify-between w-full pb-1 border-b-2 border-[#555555]/30">
          <span className="text-[11px] font-bold text-[#FFFFA0] uppercase tracking-wider">
            🎞️ Director
          </span>
          <button onClick={onClose} className="mc-button px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            ✕
          </button>
        </div>

        <div className="mc-window p-1.5 flex flex-col gap-1">
          <div className="font-bold text-[#FFFFA0] uppercase tracking-wider">Take (Q→A, move, Q→B)</div>
          <div className="font-mono text-gray-200">
            A: {a ? `${fmt(a.x)},${fmt(a.y)},${fmt(a.z)}` : "—"}
            {" · "}B: {b ? `${fmt(b.x)},${fmt(b.y)},${fmt(b.z)}` : "—"}
          </div>
          <div className="flex gap-1 flex-wrap">
            <button className="mc-button px-1.5 py-0.5 text-[10px] font-bold uppercase" onClick={() => markHere("a")}>A here</button>
            <button className="mc-button px-1.5 py-0.5 text-[10px] font-bold uppercase" onClick={() => markHere("b")}>B here</button>
            <button className="mc-button px-1.5 py-0.5 text-[10px] font-bold uppercase" onClick={clearMarks}>Clear</button>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <label className="font-bold text-gray-300">Secs:</label>
            <input
              value={durInput}
              onChange={(e) => setDurInput(e.target.value.replace(/[^0-9.]/g, "").slice(0, 5))}
              className="mc-slot px-1 py-0.5 text-[10px] text-white w-12 outline-none font-mono"
            />
            <button className="mc-button px-1.5 py-0.5 text-[10px] font-bold uppercase" onClick={process} title="Load the chunks visible along the path">⏳ Process</button>
            {!playing ? (
              <button className="mc-button px-1.5 py-0.5 text-[10px] font-bold uppercase !bg-[#2b8a3e] !text-white" onClick={play} title="Fly the camera A → B">▶ Play</button>
            ) : (
              <button className="mc-button px-1.5 py-0.5 text-[10px] font-bold uppercase" onClick={stop}>⏹ Stop</button>
            )}
          </div>
          {preActive && (
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-1.5 bg-black/60 rounded overflow-hidden">
                <div className="h-full bg-[#e0913a]" style={{ width: `${prePct}%` }} />
              </div>
              <span className="font-mono text-gray-300">{prePct}%</span>
            </div>
          )}
          {playing && (
            <div className="flex items-center gap-1.5">
              <div className="flex-1 h-1.5 bg-black/60 rounded overflow-hidden">
                <div className="h-full bg-[#2b8a3e]" style={{ width: `${shotPct}%` }} />
              </div>
              <span className="font-mono text-gray-300">{shotPct}%</span>
            </div>
          )}
        </div>

        <div className="mc-window p-1.5 flex flex-col gap-1">
          <div className="font-bold text-[#FFFFA0] uppercase tracking-wider">💾 Save take</div>
          <div className="flex gap-1">
            <input
              value={sceneName}
              onChange={(e) => setSceneName(e.target.value.slice(0, 32))}
              onKeyDown={(e) => { if (e.key === "Enter") saveScene(); }}
              placeholder="Name (optional)…"
              className="mc-slot px-1 py-0.5 text-[10px] text-white flex-1 outline-none"
            />
            <button className="mc-button px-1.5 py-0.5 text-[10px] font-bold uppercase" onClick={saveScene}>Save</button>
          </div>
        </div>

        <div className="mc-window p-1.5 flex flex-col gap-1">
          <div className="font-bold text-[#FFFFA0] uppercase tracking-wider">🎬 Scenes ({scenes.length})</div>
          {scenes.length === 0 && <div className="text-gray-400">None yet.</div>}
          <div className="flex flex-col gap-1 max-h-[30vh] overflow-y-auto pr-0.5">
            {scenes.map((scene) => (
              <div key={scene.id} className="mc-slot p-1 flex flex-col gap-0.5">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-white truncate flex-1">{scene.name}</span>
                  <span className="font-mono text-gray-400">{scene.dur}s</span>
                </div>
                <div className="flex gap-1 flex-wrap">
                  <button className="mc-button px-1.5 py-0.5 text-[10px] font-bold uppercase" title="Load marks + video settings" onClick={() => loadScene(scene, false)}>Load</button>
                  <button className="mc-button px-1.5 py-0.5 text-[10px] font-bold uppercase !bg-[#2b8a3e] !text-white" title="Load, process chunks, auto-play" onClick={() => loadScene(scene, true)}>▶</button>
                  <button
                    className="mc-button px-1.5 py-0.5 text-[10px] font-bold uppercase"
                    title="Delete scene"
                    onClick={() => setScenes(deleteCineScene(scene.id))}
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
