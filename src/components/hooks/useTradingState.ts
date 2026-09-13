import { useState, useRef, useEffect } from "react";
import type { GameState } from "../../game/state/gameState";
import { BLOCK_MAP } from "../../game/blocks";
import { countItems, removeItems } from "../../game/inventory";
import { saveVillagerLedger } from "../../game/villagers";
import { playTrade } from "../../game/sfx";

export interface UseTradingStateOptions {
  stateRef: React.MutableRefObject<GameState>;
  showToast: (msg: string) => void;
  inventoryAddItem: (id: number, count: number) => number;
}

export interface UseTradingStateReturn {
  tradingVillager: any | null;
  setTradingVillager: React.Dispatch<React.SetStateAction<any | null>>;
  tradingVillagerRef: React.MutableRefObject<any | null>;
  tradeTick: number;
  handleExecuteTrade: (tradeIdx: number) => void;
}

export function useTradingState(options: UseTradingStateOptions): UseTradingStateReturn {
  const { stateRef, showToast, inventoryAddItem } = options;

  const [tradingVillager, setTradingVillager] = useState<any | null>(null);
  const [tradeTick, setTradeTick] = useState(0);
  const tradingVillagerRef = useRef<any | null>(null);
  tradingVillagerRef.current = tradingVillager;

  // Auto-close the trade modal when the player walks away or looks elsewhere
  useEffect(() => {
    if (!tradingVillager) return;
    const id = window.setInterval(() => {
      const s = stateRef.current;
      const tv = tradingVillagerRef.current;
      if (tv && s.aimedVillager !== tv) {
        tradingVillagerRef.current = null;
        setTradingVillager(null);
        showToast("Villager too far — trade closed");
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [tradingVillager, showToast, stateRef]);

  const handleExecuteTrade = (offerPos: number) => {
    const s = stateRef.current;
    const v = tradingVillager;
    if (!v || !v.prof || !v.prof.trades?.length) return;
    const offers: number[] = Array.isArray(v.offerIdx) && v.offerIdx.length ? v.offerIdx : v.prof.trades.map((_: any, i: number) => i);
    const tradeIdx = offers[offerPos];
    const trade = v.prof.trades[tradeIdx];
    if (tradeIdx === undefined || !trade) return;
    if ((v.usesLeft?.[tradeIdx] || 0) <= 0) {
      showToast("Already traded — new stock tomorrow 🌅");
      return;
    }
    // Survival: validate + deduct the cost; Creative: free trades (infinite inventory)
    if (!s.creative) {
      if (countItems(s, trade.costId) < trade.costCount) {
        showToast("Need " + (BLOCK_MAP.get(trade.costId)?.name || "Item") + " ×" + trade.costCount + " to trade");
        return;
      }
      removeItems(s, trade.costId, trade.costCount);
    }
    if (!v.purse) v.purse = {};
    if (!s.creative) v.purse[trade.costId] = (v.purse[trade.costId] || 0) + trade.costCount;
    const leftover = inventoryAddItem(trade.offerId, trade.offerCount);
    v.usesLeft[tradeIdx] -= 1;
    saveVillagerLedger(s, v);
    setTradeTick(t => t + 1);
    playTrade();
    showToast(
      leftover > 0
        ? "Inventory full — leftover " + (BLOCK_MAP.get(trade.offerId)?.name || "Item") + " dropped!"
        : "Traded! Got " + (BLOCK_MAP.get(trade.offerId)?.name || "Item") + " ×" + trade.offerCount + " ✨"
    );
  };

  return {
    tradingVillager,
    setTradingVillager,
    tradingVillagerRef,
    tradeTick,
    handleExecuteTrade
  };
}
