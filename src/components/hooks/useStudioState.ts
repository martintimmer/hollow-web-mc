import { useState } from "react";
import type { GameState } from "../../game/state/gameState";
import type { WorldMeta } from "../../services/api";
import { isSim, isSimPort } from "../../services/simMode";
import {
  cachePlayerLocation,
  getCachedPlayerLocation,
  setStudioActive
} from "../../game/studioMode";
import {
  scanStructureFromReader,
  scanStructureFromBounds,
  type BlueprintDoc,
  type ScanOptions
} from "../../sim/blueprintScanner";
import { STYLES, stampCustomBlueprint, spawnPresetHouseOnPad } from "../../game/terrain/structures";
import { CHH } from "../../game/world";

export interface UseStudioStateOptions {
  stateRef: React.MutableRefObject<GameState>;
  activeWorld: WorldMeta | null;
  seedText: string;
  worldType: string;
  setCreative: (c: boolean) => void;
  setHotbar: React.Dispatch<React.SetStateAction<number[]>>;
  setMenuOpen: (o: boolean) => void;
  setInventoryOpen: (o: boolean) => void;
  setPauseOpen: (o: boolean) => void;
  showToast: (msg: string) => void;
}

export interface UseStudioStateReturn {
  simBuildingMode: boolean;
  setSimBuildingMode: React.Dispatch<React.SetStateAction<boolean>>;
  handleRebuildWorld: () => Promise<void>;
  handleEnterStudio: () => Promise<void>;
  handleReturnFromStudio: () => Promise<void>;
  handleToggleBuildingMode: () => void;
  handleLoadPresetStructure: (styleKey: string) => void;
  handleScanAndSaveBlueprint: (opts: ScanOptions) => Promise<BlueprintDoc | null>;
  handleStampBlueprint: (doc: BlueprintDoc) => void;
}

export function useStudioState(options: UseStudioStateOptions): UseStudioStateReturn {
  const {
    stateRef,
    activeWorld,
    seedText,
    worldType,
    setCreative,
    setHotbar,
    setMenuOpen,
    setInventoryOpen,
    setPauseOpen,
    showToast
  } = options;

  const [simBuildingMode, setSimBuildingMode] = useState(false);

  const handleRebuildWorld = async () => {
    setMenuOpen(false);
    setInventoryOpen(false);
    if (stateRef.current.rebuildAndSpawnWorld) {
      const p = stateRef.current.player;
      await stateRef.current.rebuildAndSpawnWorld(seedText || "0", worldType || "standard", {
        x: p.x, y: p.y, z: p.z, yaw: p.yaw, pitch: p.pitch, fly: p.fly
      });
      showToast("World generated and loaded!");
    }
  };

  const handleEnterStudio = async () => {
    if (!isSimPort()) return;
    const s = stateRef.current;
    cachePlayerLocation({
      worldId: s.currentWorldId || "default",
      worldName: activeWorld?.name || "Overworld",
      seedText: s.seedText,
      worldType: s.type,
      x: s.player.x,
      y: s.player.y,
      z: s.player.z,
      yaw: s.player.yaw,
      pitch: s.player.pitch,
      fly: s.player.fly,
      gameMode: s.gameplayMode || "survival",
      hotbar: [...s.hotbar],
      activeSlot: s.slot
    });
    setStudioActive(true);
    setPauseOpen(false);
    setMenuOpen(false);
    s.creative = true;
    setCreative(true);
    s.hotbar = [17, 6, 10, 8, 41, 42, 105, 62, 5];
    if (s.rebuildAndSpawnWorld) {
      s.simMode = true;
      await s.rebuildAndSpawnWorld("sim-studio", "standard", { x: 8.5, y: 65.25, z: 8.5, fly: true });
      showToast("🛠️ Builder Studio Active! Press [E] / [I] for All 105+ Items, [B] for Templates & Blueprints.");
    }
  };

  const handleReturnFromStudio = async () => {
    const cached = getCachedPlayerLocation();
    if (!cached) {
      showToast("No previous world location saved.");
      return;
    }
    const s = stateRef.current;
    setStudioActive(false);
    s.simMode = isSim();
    if (cached.gameMode !== "creative") {
      s.creative = false;
      setCreative(false);
    }
    if (cached.hotbar && cached.hotbar.length) {
      s.hotbar = [...cached.hotbar];
    }
    if (s.rebuildAndSpawnWorld) {
      await s.rebuildAndSpawnWorld(cached.seedText, cached.worldType, {
        x: cached.x,
        y: cached.y,
        z: cached.z,
        yaw: cached.yaw,
        pitch: cached.pitch,
        fly: cached.fly
      });
      showToast(`↩ Returned to ${cached.worldName}!`);
    }
  };

  const handleToggleBuildingMode = () => {
    const s = stateRef.current;
    const next = !simBuildingMode;
    setSimBuildingMode(next);
    s.simBuildingMode = next;
    if (next) {
      s.creative = true;
      setCreative(true);
      s.player.fly = true;
      s.hotbar = [0, 0, 0, 0, 0, 0, 0, 0, 0];
      setHotbar([0, 0, 0, 0, 0, 0, 0, 0, 0]);
      showToast("🛠️ Building Mode ON! Press [I] to pick blocks, [Q] Break, [E] Place/Interact");
    } else {
      showToast("🛑 Building Mode Inactive");
    }
  };

  const handleLoadPresetStructure = (styleKey: string) => {
    const s = stateRef.current;
    const S = STYLES.find(st => st.key === styleKey);
    const styleName = S?.name || styleKey;
    const api = (window as unknown as { __sim?: { api?: { clearPad?: () => void; stampStructure?: (k: string, w: number, x: number, z: number, side?: string) => unknown } } }).__sim?.api;
    if (api?.stampStructure) {
      api.clearPad?.();
      const w = S ? Math.round((S.wMin + S.wMax) / 2) : 9;
      api.stampStructure(styleKey, w, 8, 8, "S");
      showToast(`🏗️ Spawned template "${styleName}" on stage!`);
      return;
    }

    for (let x = -16; x <= 32; x++) {
      for (let z = -16; z <= 32; z++) {
        for (let y = 65; y <= 96; y++) {
          const c = s.chunks.get(`${x >> 4},${z >> 4}`);
          if (c?.data) {
            const off = y * 256 + (z & 15) * 16 + (x & 15);
            c.data[off] = 0;
          }
        }
      }
    }
    spawnPresetHouseOnPad(styleKey, 8, 8, 64, (wx, wy, wz, bid) => {
      const cx = wx >> 4, cz = wz >> 4;
      const c = s.chunks.get(`${cx},${cz}`);
      if (c?.data) {
        c.data[wy * 256 + (wz & 15) * 16 + (wx & 15)] = bid;
        if (bid && wy > c.maxY) c.maxY = wy;
      }
    });
    for (let cx = -2; cx <= 3; cx++) {
      for (let cz = -2; cz <= 3; cz++) {
        s.meshQ.push([cx, cz, 0]);
      }
    }
    if (s.rescan) s.rescan(0, 0);
    showToast(`🏗️ Loaded template "${styleName}"! Modify any blocks freely & press [B] to save.`);
  };

  const handleScanAndSaveBlueprint = async (opts: ScanOptions): Promise<BlueprintDoc | null> => {
    const s = stateRef.current;
    const reader = (x: number, y: number, z: number) => {
      const getB = (s as unknown as Record<string, unknown>).getBlock as ((x: number, y: number, z: number) => number) | undefined;
      if (getB) return getB(x, y, z);
      const c = s.chunks?.get(`${x >> 4},${z >> 4}`);
      return c?.data ? c.data[y * 256 + (z & 15) * 16 + (x & 15)] : 0;
    };

    let doc: BlueprintDoc | null = null;
    if (s.areaPos1 && s.areaPos2) {
      doc = scanStructureFromBounds(
        reader,
        s.areaPos1.x, s.areaPos1.y, s.areaPos1.z,
        s.areaPos2.x, s.areaPos2.y, s.areaPos2.z,
        opts
      );
    } else {
      doc = scanStructureFromReader(reader, -32, -32, 32, 32, opts);
    }
    return doc;
  };

  const handleStampBlueprint = (doc: BlueprintDoc) => {
    const s = stateRef.current;
    const api = (window as unknown as { __sim?: { api?: { selectBlueprintWand?: (d: BlueprintDoc) => void; stampRun?: (name: string, fn: (w: (x: number, y: number, z: number, id: number) => void) => void) => void } } }).__sim?.api;
    if (api?.selectBlueprintWand) {
      api.selectBlueprintWand(doc);
      return;
    }
    const frontX = Math.floor(s.player.x - Math.sin(s.player.yaw) * 6);
    const frontZ = Math.floor(s.player.z - Math.cos(s.player.yaw) * 6);
    const baseH = (isSim() || s.simMode) ? 64 : ((s as any).surfaceAt ? (s as any).surfaceAt(frontX, frontZ).h : 64);
    if (api?.stampRun) {
      api.stampRun(`blueprint:${doc.name}`, (wWriter) => {
        stampCustomBlueprint(doc.blocks, frontX, baseH + 1, frontZ, wWriter);
      });
      showToast(`🏗️ Spawned "${doc.name}" in front of you!`);
    } else {
      const dirty = new Set<string>();
      stampCustomBlueprint(doc.blocks, frontX, baseH + 1, frontZ, (bx, by, bz, bid) => {
        if (by < 0 || by >= CHH) return;
        const cx = bx >> 4, cz = bz >> 4;
        let c = s.chunks.get(`${cx},${cz}`);
        if (!c && (s as any).genChunk) c = (s as any).genChunk(cx, cz);
        if (c?.data) {
          const off = by * 256 + (bz & 15) * 16 + (bx & 15);
          c.data[off] = bid;
          if (bid && by > c.maxY) c.maxY = by;
          dirty.add(`${cx},${cz}`);
        }
      });
      for (const k of dirty) {
        const [cx, cz] = k.split(",").map(Number);
        s.meshJobs.delete(k);
        if ((s as any).buildMesh) (s as any).buildMesh(cx, cz, 0);
      }
      showToast(`🏗️ Spawned "${doc.name}"!`);
    }
  };

  return {
    simBuildingMode,
    setSimBuildingMode,
    handleRebuildWorld,
    handleEnterStudio,
    handleReturnFromStudio,
    handleToggleBuildingMode,
    handleLoadPresetStructure,
    handleScanAndSaveBlueprint,
    handleStampBlueprint
  };
}
