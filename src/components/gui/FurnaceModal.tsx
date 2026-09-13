import React from "react";
import { SMELT_TIME } from "../../game/smelt";

export interface FurnaceUIState {
  input: { id: number; count: number } | null;
  fuel: { id: number; count: number } | null;
  output: { id: number; count: number } | null;
  prog: number;
  fuelLeft: number;
  lit: boolean;
}

export interface FurnaceModalProps {
  isOpen: boolean;
  loading: boolean;
  furnaceUI: FurnaceUIState;
  isoThumbnails: Map<number, string>;
  onSlotClick: (slotKey: "input" | "fuel" | "output") => void;
  onReset: () => void;
  onClose: () => void;
}

export const FurnaceModal: React.FC<FurnaceModalProps> = ({
  isOpen,
  loading,
  furnaceUI,
  isoThumbnails,
  onSlotClick,
  onReset,
  onClose
}) => {
  if (!isOpen || loading) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-2 select-none animate-fade pointer-events-auto">
      <div className="w-[min(320px,94vw)] mc-window p-4 flex flex-col gap-2.5 shadow-2xl border-4 border-[#373737]">
        <div className="flex items-center justify-between pb-1 border-b-2 border-[#555555]/20">
          <div className="text-xs font-bold text-[#373737] uppercase tracking-wide">Furnace</div>
          <button onClick={onClose} className="mc-button px-2.5 py-0.5 text-[11px] font-bold">
            ✕ Close (Esc)
          </button>
        </div>

        <div className="flex items-center justify-center gap-3 bg-[#c6c6c6] p-3 rounded border border-[#555555]/20">
          {/* Input (top) + Fuel (bottom) */}
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => onSlotClick("input")}
              title="Input: click hotbar-slot stack then here. Smeltable: cobblestone, sand"
              className="relative w-10 h-10 mc-slot flex items-center justify-center bg-black/25 p-0.5"
            >
              {furnaceUI.input ? (
                <>
                  <img src={isoThumbnails.get(furnaceUI.input.id)} alt="" className="w-full h-full object-contain drop-shadow" />
                  <span className="absolute right-0.5 bottom-0.5 text-[9px] font-bold text-white mc-text-shadow">
                    {furnaceUI.input.count}
                  </span>
                </>
              ) : null}
            </button>
            <button
              onClick={() => onSlotClick("fuel")}
              title="Fuel: planks / logs / doors / stems"
              className="relative w-10 h-10 mc-slot flex items-center justify-center bg-black/25 p-0.5"
            >
              {furnaceUI.fuel ? (
                <>
                  <img src={isoThumbnails.get(furnaceUI.fuel.id)} alt="" className="w-full h-full object-contain drop-shadow" />
                  <span className="absolute right-0.5 bottom-0.5 text-[9px] font-bold text-white mc-text-shadow">
                    {furnaceUI.fuel.count}
                  </span>
                </>
              ) : (
                <span className="text-xs opacity-40">🔥</span>
              )}
            </button>
          </div>

          {/* Burn state + progress */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xl">{furnaceUI.lit ? "🔥" : "💨"}</span>
            <div className="w-24 h-2 bg-black/40 rounded-sm overflow-hidden">
              <div
                className={`h-full transition-[width] duration-100 ease-linear ${furnaceUI.lit ? "bg-[#ff8833]" : "bg-white/30"}`}
                style={{ width: `${Math.min(100, Math.round(furnaceUI.prog * 100))}%` }}
              />
            </div>
            <div className="text-[9px] font-bold text-[#555555]">
              {furnaceUI.fuelLeft > 0 ? `${furnaceUI.fuelLeft} smelts` : "no fuel"}
            </div>
          </div>

          {/* Output */}
          <button
            onClick={() => onSlotClick("output")}
            title="Output: click to collect into inventory"
            className="relative w-10 h-10 mc-slot flex items-center justify-center bg-black/25 p-0.5"
          >
            {furnaceUI.output ? (
              <>
                <img src={isoThumbnails.get(furnaceUI.output.id)} alt="" className="w-full h-full object-contain drop-shadow" />
                <span className="absolute right-0.5 bottom-0.5 text-[9px] font-bold text-white mc-text-shadow">
                  {furnaceUI.output.count}
                </span>
              </>
            ) : null}
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-[10px] text-[#555555]">
            Smelts 1 item per {SMELT_TIME}s. Cobblestone → Stone, Sand → Glass.
          </div>
          <button
            onClick={onReset}
            title="Return all furnace slots to inventory"
            className="mc-button px-2 py-1 text-[9px] font-bold uppercase !text-white"
          >
            ✕ Reset
          </button>
        </div>
      </div>
    </div>
  );
};
