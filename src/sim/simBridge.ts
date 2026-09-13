import type { GameState } from "../game/state/gameState";
import { simLog, simLogRing } from "../services/simMode";

export interface SimBridgeApi {
  s: GameState;
  api: Record<string, any>;
  [key: string]: any;
}

export function exposeSimBridge(s: GameState, api: Record<string, any>): void {
  const win = window as unknown as {
    __sim?: SimBridgeApi;
    __simLogRing?: () => string[];
  };

  win.__sim = {
    s,
    api
  };

  win.__simLogRing = simLogRing;
  simLog("__sim bridge exposed (modularized)");
}
