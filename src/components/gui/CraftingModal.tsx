import React from "react";
import { BLOCK_MAP } from "../../game/blocks";

export interface CraftingModalProps {
  isOpen: boolean;
  loading: boolean;
  craftGrid: Array<{ id: number; count: number } | null>;
  craftResult: { output: { id: number; count: number } } | null;
  isoThumbnails: Map<number, string>;
  onCellClick: (index: number) => void;
  onResultClick: () => void;
  onReset: () => void;
  onClose: () => void;
}

export const CraftingModal: React.FC<CraftingModalProps> = ({
  isOpen,
  loading,
  craftGrid,
  craftResult,
  isoThumbnails,
  onCellClick,
  onResultClick,
  onReset,
  onClose
}) => {
  if (!isOpen || loading) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-2 select-none animate-fade pointer-events-auto">
      <div className="w-[min(360px,94vw)] mc-window p-4 flex flex-col gap-2.5 shadow-2xl border-4 border-[#373737]">
        <div className="flex items-center justify-between pb-1 border-b-2 border-[#555555]/20">
          <div className="text-xs font-bold text-[#373737] uppercase tracking-wide">Crafting Table</div>
          <button onClick={onClose} className="mc-button px-2.5 py-0.5 text-[11px] font-bold">
            ✕ Close (Esc)
          </button>
        </div>

        <div className="flex flex-col items-center gap-2 bg-[#c6c6c6] p-3 rounded border border-[#555555]/20">
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 9 }).map((_, i) => {
              const cell = craftGrid[i];
              const cellThumb = cell ? isoThumbnails.get(cell.id) : null;
              return (
                <button
                  key={i}
                  onClick={() => onCellClick(i)}
                  title={
                    cell
                      ? `${BLOCK_MAP.get(cell.id)?.name || "Item"} ×${cell.count} - Click to return to inventory`
                      : "Click the hotbar slot you want, then this cell to add a stack"
                  }
                  className="relative w-10 h-10 mc-slot flex items-center justify-center bg-black/25 p-0.5"
                >
                  {cellThumb ? <img src={cellThumb} alt="" className="w-full h-full object-contain drop-shadow" /> : null}
                  {cell && (
                    <span className="absolute right-0.5 bottom-0.5 text-[9px] font-bold text-white mc-text-shadow">
                      {cell.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#555555]">➔</span>
            <button
              onClick={onResultClick}
              title={craftResult ? `Craft ${BLOCK_MAP.get(craftResult.output.id)?.name} ×${craftResult.output.count}` : "No recipe match"}
              className="relative w-10 h-10 mc-slot flex items-center justify-center bg-black/30 border-2 border-[#555555] p-0.5"
            >
              {craftResult ? (
                <>
                  <img src={isoThumbnails.get(craftResult.output.id)} alt="" className="w-full h-full object-contain drop-shadow" />
                  <span className="absolute right-0.5 bottom-0.5 text-[9px] font-bold text-white mc-text-shadow">
                    {craftResult.output.count}
                  </span>
                </>
              ) : null}
            </button>
            <button
              onClick={onReset}
              title="Return all crafting cells to inventory"
              className="mc-button px-2 py-1 text-[10px] font-bold uppercase !text-white"
            >
              ✕ Reset
            </button>
          </div>
        </div>

        <div className="text-center text-[10px] text-[#555555]">
          Click a hotbar slot, then a crafting cell to add its stack. Craft consumes 1 of each cell.
        </div>
      </div>
    </div>
  );
};
