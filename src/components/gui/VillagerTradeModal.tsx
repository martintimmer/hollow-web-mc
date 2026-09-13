import React from "react";
import { countItems } from "../../game/inventory";

export interface VillagerTradeModalProps {
  tradingVillager: any;
  tradeTick: number;
  creative: boolean;
  inventoryState: any;
  isoThumbnails: Map<number, string>;
  onExecuteTrade: (tradeIndex: number) => void;
  onClose: () => void;
}

export const VillagerTradeModal: React.FC<VillagerTradeModalProps> = ({
  tradingVillager,
  tradeTick,
  creative,
  inventoryState,
  isoThumbnails,
  onExecuteTrade,
  onClose
}) => {
  if (!tradingVillager) return null;
  const prof = tradingVillager.prof;
  const offerIdx: number[] = Array.isArray(tradingVillager.offerIdx) && tradingVillager.offerIdx.length
    ? tradingVillager.offerIdx
    : prof.trades.map((_: any, i: number) => i);
  const purse = tradingVillager.purse || {};
  const purseEmeralds = purse[893] || 0;

  return (
    <div key={tradeTick} className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 animate-fade pointer-events-auto select-none">
      <div className="w-full max-w-lg mc-menu-bg border-4 border-[#373737] shadow-2xl p-4 text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b-2 border-[#555555]">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{prof.badge}</span>
            <div>
              <h3 className="text-base font-bold text-[#55FF55] mc-text-shadow">
                {prof.name} Villager
              </h3>
              <div className="text-[10px] text-white/70">Level 2 Apprentice Trader · new stock daily 🌅{purseEmeralds > 0 ? ` · purse: Emerald ×${purseEmeralds}` : ""}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="mc-button px-3 py-1 text-xs font-bold"
          >✕</button>
        </div>

        {/* Trades List */}
        <div className="py-3 space-y-2 max-h-72 overflow-y-auto pr-1">
          <div className="text-xs font-bold text-[#FFFFA0] uppercase tracking-wider mb-2">Today's Trades</div>
          {offerIdx.map((tradeIdx: number, pos: number) => {
            const tr = prof.trades[tradeIdx];
            if (!tr) return null;
            const left = (tradingVillager.usesLeft?.[tradeIdx] ?? 0) > 0;
            const canAfford = creative || (inventoryState && countItems(inventoryState, tr.costId) >= tr.costCount);
            return (
              <div
                key={pos}
                className="flex items-center justify-between gap-2 p-2.5 mc-slot bg-black/40 border border-[#555555]"
              >
                <div className="flex items-center gap-2">
                  {/* Player pays */}
                  <div className="flex flex-col items-center w-12">
                    {isoThumbnails.get(tr.costId) ? (
                      <img src={isoThumbnails.get(tr.costId)} alt="" className="w-8 h-8 object-contain drop-shadow" />
                    ) : (
                      <div className="w-8 h-8 bg-stone-700" />
                    )}
                    <span className="text-[9px] font-bold text-[#FFFFA0] mt-0.5">×{tr.costCount}</span>
                  </div>
                  <span className="text-xs font-bold text-white/70 mc-text-shadow">➔</span>
                  {/* Player receives */}
                  <div className="flex flex-col items-center w-12">
                    {isoThumbnails.get(tr.offerId) ? (
                      <img src={isoThumbnails.get(tr.offerId)} alt="" className="w-8 h-8 object-contain drop-shadow" />
                    ) : (
                      <div className="w-8 h-8 bg-stone-700" />
                    )}
                    <span className="text-[9px] font-bold text-[#55FF55] mt-0.5">×{tr.offerCount}</span>
                  </div>
                  <span className="text-[10px] text-white/60 max-w-[120px] leading-tight mc-text-shadow">{tr.label}</span>
                </div>
                <button
                  onClick={() => onExecuteTrade(pos)}
                  disabled={!left || !canAfford}
                  className={`mc-button px-4 py-1 text-xs font-bold uppercase !text-white ${
                    !left
                      ? "!bg-[#555555] opacity-60"
                      : !canAfford
                        ? "!bg-[#8a3e2e] opacity-80"
                        : "!bg-[#2b8a3e]"
                  }`}
                >
                  {!left ? "Traded" : !canAfford ? "Can't afford" : `Trade (${tradingVillager.usesLeft?.[tradeIdx] ?? 0})`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t-2 border-[#555555] flex justify-end">
          <button
            onClick={onClose}
            className="mc-button px-5 py-1.5 text-xs font-bold uppercase"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
