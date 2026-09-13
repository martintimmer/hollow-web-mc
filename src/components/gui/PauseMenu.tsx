import React from "react";
import { PlayerPaperdoll } from "./PlayerPaperdoll";
import type { EquippedArmorState } from "./InventoryModal";

const Item: React.FC<{ label: string; onClick: () => void; wide?: boolean; accent?: boolean }> = ({ label, onClick, wide, accent }) => (
  <button
    onClick={onClick}
    className={`${wide ? "w-full" : "flex-1"} py-[9px] px-3 text-[13px] font-bold uppercase tracking-wide mc-window
      ${accent ? "bg-[#3f6a3f]/20 text-[#eafbea]" : ""} hover:brightness-125 active:brightness-90 transition-[filter]`}
  >
    {label}
  </button>
);

const IconBtn: React.FC<{ icon: string; title: string; onClick: () => void }> = ({ icon, title, onClick }) => (
  <button
    onClick={onClick}
    title={title}
    className="w-10 h-10 mc-window grid place-items-center text-base hover:brightness-125 active:brightness-90 transition-[filter]"
  >
    {icon}
  </button>
);

export interface PauseMenuProps {
  isOpen: boolean;
  onResume: () => void;
  onOptions: () => void;
  onStatistics: () => void;
  onCinematic?: () => void;
  isCinematicActive?: boolean;
  onWorldSelect: () => void;
  onSnapshot: () => void;
  onToggleMap: () => void;
  onRefreshTextures?: () => void;
  onHelp: () => void;
  onEnterStudio?: () => void;
  isStudioActive?: boolean;
  skinColor: string;
  equippedArmor: EquippedArmorState;
  isSimMode?: boolean;
  onToggleBuilding?: () => void;
  isBuildingMode?: boolean;
  onQuitToLogin?: () => void;
}

/**
 * Press-Esc pause overlay (vanilla-style Game Menu in Prod, clean 4-button menu in Sim):
 */
export const PauseMenu: React.FC<PauseMenuProps> = ({
  isOpen,
  onResume,
  onOptions,
  onStatistics,
  onCinematic,
  isCinematicActive,
  onWorldSelect,
  onSnapshot,
  onToggleMap,
  onRefreshTextures,
  onHelp,
  onEnterStudio,
  isStudioActive,
  skinColor,
  equippedArmor,
  isSimMode,
  onToggleBuilding,
  isBuildingMode,
  onQuitToLogin
}) => {
  if (!isOpen) return null;

  // ── SIMULATION MODE PAUSE / ESC MENU ──
  if (isSimMode) {
    return (
      <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 select-none p-4 backdrop-blur-sm">
        <div className="relative w-[min(480px,94vw)] mc-window p-5 flex flex-col gap-3 bg-[#c6c6c9]/95 shadow-2xl">
          {/* X Close button (touch-friendly — iPads have no Esc key) */}
          <button
            type="button"
            onClick={onResume}
            aria-label="Close menu"
            title="Close"
            className="absolute top-2 right-2 w-7 h-7 bg-[#c6c6c6] border-2 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555] flex items-center justify-center text-[12px] font-bold text-[#373737] shadow hover:bg-[#d8d8d8] active:border-t-[#555555] active:border-l-[#555555] cursor-pointer"
          >✕</button>
          <div className="text-center text-lg font-bold uppercase tracking-[0.28em] text-[#373737] mb-1 mc-text-shadow-sm">
            Simulation Menu
          </div>

          {/* 1. Back to Simulator */}
          <Item label="Back to Simulator" onClick={onResume} accent wide />

          {/* 2. Building Mode / Simulation Mode Toggler */}
          {onToggleBuilding && (
            <button
              onClick={onToggleBuilding}
              className={`w-full py-[10px] px-3 text-[13px] font-bold uppercase tracking-wide mc-window ${
                isBuildingMode
                  ? "bg-[#2fae3d]/30 text-[#0c3d14] border-[#2fae3d]"
                  : "bg-[#e0913a]/25 text-[#542d05] border-[#e0913a]"
              } hover:brightness-125 active:brightness-90 transition-[filter] flex items-center justify-center gap-2`}
            >
              <span>{isBuildingMode ? "Building Mode: ACTIVE (Switch to Sim Mode)" : "Simulation Mode: ACTIVE (Switch to Building Mode)"}</span>
            </button>
          )}

          {/* 3. Options */}
          <Item label="Options…" onClick={onOptions} wide />

          {/* 4. Quit to Login */}
          <Item label="Quit to Login" onClick={onQuitToLogin || onWorldSelect} wide />
        </div>
      </div>
    );
  }

  // ── PRODUCTION MODE GAME MENU ──
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 select-none p-4">
      <div className="relative w-[min(820px,94vw)] max-h-[90vh] grid grid-cols-[1fr_220px] gap-3">
        {/* X Close button (touch-friendly — iPads have no Esc key) */}
        <button
          type="button"
          onClick={onResume}
          aria-label="Close menu"
          title="Close"
          className="absolute -top-2 -right-2 z-10 w-8 h-8 bg-[#c6c6c6] border-2 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555] flex items-center justify-center text-[12px] font-bold text-[#373737] shadow hover:bg-[#d8d8d8] active:border-t-[#555555] active:border-l-[#555555] cursor-pointer"
        >✕</button>
        {/* Left panel */}
        <div className="mc-window p-4 flex flex-col gap-2.5 bg-[#c6c6c9]/95">
          <div className="text-center text-lg font-bold uppercase tracking-[0.28em] text-[#373737] mb-1 mc-text-shadow-sm">
            Game Menu
          </div>
          <Item label="Back to Game" onClick={onResume} accent wide />
          {onEnterStudio && (
            <button
              onClick={onEnterStudio}
              className={`w-full py-[9px] px-3 text-[13px] font-bold uppercase tracking-wide mc-window ${
                isStudioActive ? "bg-[#2fae3d]/30 text-[#0c3d14] border-[#2fae3d]" : "bg-[#e0913a]/25 text-[#542d05] border-[#e0913a]"
              } hover:brightness-125 active:brightness-90 transition-[filter] flex items-center justify-center gap-2`}
            >
              <span>{isStudioActive ? "↩" : "🛠️"}</span>
              <span>{isStudioActive ? "Return to Game World" : "Builder Studio / Flat-Pad"}</span>
            </button>
          )}
          <div className="flex gap-2">
            <Item label="Advancements" onClick={onStatistics} />
            <Item label="Statistics" onClick={onStatistics} />
            {onCinematic && <Item label={isCinematicActive ? "⏹ STOP Cinematic" : "🎬 Cinematic"} onClick={onCinematic} />}
          </div>
          <div className="flex justify-center gap-2 my-0.5">
            <IconBtn icon="📸" title="Take snapshot" onClick={onSnapshot} />
            <IconBtn icon="🗺️" title="World map" onClick={onToggleMap} />
            {onRefreshTextures && (
              <IconBtn icon="↻" title="Refresh block textures from server" onClick={onRefreshTextures} />
            )}
            <IconBtn icon="ℹ️" title="Help / docs" onClick={onHelp} />
          </div>
          <Item label="Options…" onClick={onOptions} wide />
          <Item label="Save and Quit to Title" onClick={onWorldSelect} wide />
        </div>
        {/* Right player preview */}
        <div className="hidden sm:flex flex-col items-center justify-end gap-2 pb-2">
          <div className="w-28 h-40 pointer-events-none">
            <PlayerPaperdoll equippedArmor={equippedArmor} skinColor={skinColor} />
          </div>
          <div className="px-3 py-1 bg-[#d9d9d9]/95 text-[#373737] text-xs font-bold uppercase tracking-wide mc-window">
            Dressing Room
          </div>
        </div>
      </div>
    </div>
  );
};
