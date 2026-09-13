import React, { useEffect, useMemo, useRef, useState } from "react";
import { simLog, simLogRing, simFlat } from "../../services/simMode";
import {
  blocksPickList,
  treePickList,
  structurePickList,
  featurePickList,
  mobPickList,
  villagerPickList,
  entityPickList,
  SAN_ANDREAS_CATALOG,
  paramsSchemaFor
} from "../../sim/catalog";
import type { CatalogGroup } from "../../sim/catalog";
import { iconFor } from "../../sim/items";
import { SCENARIO_SUITES } from "../../sim/scenarios";
import type { ScenarioSuite } from "../../sim/scenarios";
import { apiGetBlueprints, apiGetBlueprint, apiSaveBlueprint } from "../../services/api";
import { stampCustomBlueprint } from "../../game/terrain/structures";
import * as THREE from "three";
import { assetSideloader, lintBlueprint, type LintReport } from "../../sim/assetSideloader";
import {
  specToBlueprint,
  generateAssetsWithRetry,
  type AssetValidation
} from "../../../catalog/ai/generateAssetsWithValidation";
import { createVehicleModelFromBuffer } from "../../game/vehicles/fbxVehicle";
import { registerVehicleStyle, vehicleStyle, listVehicleStyles } from "../../game/vehicles/vehicleDefs";
import { rotateBlueprintDoc } from "../../sim/blockRotation";
import { downloadBlueprintLitematic } from "../../sim/litematicExporter";
import { downscaleImage } from "../../sim/imageCompressor";
import { stampBlocksWithConformity } from "../../sim/terrainConformity";

interface SimDeckProps {
  ready: boolean;
  admin: boolean;
  thumbs: Map<number, string>;
  onOpenBlueprints?: () => void;
  onToggleBuilding?: () => void;
  isBuildingMode?: boolean;
}

export interface PlacedObject {
  id: string;
  kind: string;
  label: string;
  params: Record<string, number | string>;
  x: number;
  z: number;
  side: string;
}

interface SimApi {
  spawnVehicle?: (styleId?: string) => string | null;
  stampTree?: (k: string, p: Record<string, number | string>, x: number, z: number) => { voxels: number; ms: number };
  stampStructure?: (k: string, w: number, x: number, z: number, side: string) => { voxels: number; ms: number };
  stampBlock?: (id: number, x: number, z: number) => { voxels: number; ms: number };
  stampGarden?: (x: number, z: number) => { voxels: number; ms: number };
  stampFountain?: (x: number, z: number) => { voxels: number; ms: number };
  stampStiltLake?: (x: number, z: number) => { voxels: number; ms: number };
  stampWell?: (x: number, z: number) => { voxels: number; ms: number };
  stampLamp?: (x: number, z: number) => { voxels: number; ms: number };
  stampOcean?: (k: "coral" | "kelp" | "wreck", x: number, z: number) => { voxels: number; ms: number };
  stampMob?: (k: "zombie" | "creeper" | "skeleton" | "spider" | "all", x: number, z: number) => { type: string; count: number };
  stampVillager?: (profIdx: number, skinIdx: number, x: number, z: number) => { type: string; count: number };
  stampEntity?: (kind: string, x: number, z: number) => { type: string; count: number };
  stampRun?: (name: string, fn: (w: (x: number, y: number, z: number, id: number) => void) => void) => void;
  toggleAreaSelect?: (force?: boolean) => boolean;
  setAreaPos1?: (x: number, y: number, z: number) => void;
  setAreaPos2?: (x: number, y: number, z: number) => void;
  getAreaBounds?: () => { pos1: any; pos2: any; x0: number; y0: number; z0: number; x1: number; y1: number; z1: number; width: number; height: number; depth: number; totalBlocks: number } | null;
  clearAreaSelect?: () => void;
  isAreaSelectActive?: () => boolean;
  fillArea?: (blockId: number) => number;
  clearArea?: () => number;
  brushPaint?: (spec: { shape: "sphere" | "cylinder" | "cuboid" | "plane"; radius: number }, blockId: number, cx: number, cy: number, cz: number) => number;
  brushErase?: (spec: { shape: "sphere" | "cylinder" | "cuboid" | "plane"; radius: number }, cx: number, cy: number, cz: number) => number;
  orbitEnable?: (enable: boolean, target?: { x: number; y: number; z: number }) => boolean;
  orbitView?: (view: "perspective" | "top" | "side" | "front") => void;
  orbitFocus?: (x: number, y: number, z: number) => void;
  orbitSetTarget?: (x: number, y: number, z: number) => void;
  replaceArea?: (fromId: number, toId: number) => number;
  copyArea?: () => any;
  pasteArea?: () => boolean;
  cutArea?: () => any;
  areaMove?: (dx: number, dy: number, dz: number) => number;
  selectBlueprintWand?: (d: any) => void;
  rotateWand?: () => number;
  clearWand?: () => void;
  isWandActive?: () => boolean;
  getWandState?: () => any;
  setHotbar?: (hotbar: number[]) => void;
  spawnFront?: (d?: number) => { x: number; z: number };
  focusShots?: (radius?: number, height?: number) => Promise<{ count: number }> | { count: number };
  snapCurrentView?: () => Promise<{ ok: boolean; name?: string; tsName?: string }> | { ok: boolean; name?: string; tsName?: string };
  clearPad?: () => number;
  undo?: () => number;
  timeSet?: (tick: number) => void;
  objects?: () => PlacedObject[];
  removeObject?: (id: string) => boolean;
  moveObject?: (id: string, x: number, z: number) => unknown;
  updateParams?: (id: string, patch: Record<string, number | string>) => unknown;
  sceneGet?: () => any;
  sceneRestore?: (doc: any) => any;
}

function bridgeApi(): SimApi | undefined {
  return (window as unknown as { __sim?: { api?: SimApi } }).__sim?.api;
}

function bridgeState(): Record<string, unknown> | undefined {
  return (window as unknown as { __sim?: { s?: Record<string, unknown> } }).__sim?.s;
}

type DeckSection = "spawn" | "params" | "build" | "vehicles" | "world" | "placed" | "tests" | "inspect" | "scenes" | "sideload" | "designer";

export const SimDeck: React.FC<SimDeckProps> = ({
  ready,
  admin,
  thumbs,
  onOpenBlueprints,
  onToggleBuilding,
  isBuildingMode
}) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [section, setSection] = useState<DeckSection>("spawn");
  const [selectedVehicleStyle, setSelectedVehicleStyle] = useState<string>("sedan");
  const [typeKey, setTypeKey] = useState<CatalogGroup>("trees");
  const [query, setQuery] = useState("");

  // Parameter & Selection State
  const [selectedItemId, setSelectedItemId] = useState<string>("tree.oak.classic");
  const [customParams, setCustomParams] = useState<Record<string, number | string>>({ height: 9, layers: 4, snowy: "0" });
  const [placedObjects, setPlacedObjects] = useState<PlacedObject[]>([]);
  const [selectedPlacedId, setSelectedPlacedId] = useState<string | null>(null);

  // Scenario Runner State
  const [scenarioResults, setScenarioResults] = useState<Record<string, { pass: boolean; detail: string }>>({});
  const [runningScenarios, setRunningScenarios] = useState(false);

  // Inspector State
  const [inspectorData, setInspectorData] = useState<Record<string, unknown>>({});
  const [areaActive, setAreaActive] = useState(false);
  const [customBlueprints, setCustomBlueprints] = useState<any[]>([]);

  // Sideload State
  const [sideloadDoc, setSideloadDoc] = useState<any | null>(null);
  const [sideloadLint, setSideloadLint] = useState<LintReport | null>(null);
  const [sideloadList, setSideloadList] = useState<any[]>(() => assetSideloader.listBlueprints());
  const [isDragOver, setIsDragOver] = useState(false);

  // Designer Studio State (Phase 1, 2, 2.5)
  const [designerSubTab, setDesignerSubTab] = useState<"photos" | "report" | "recipe" | "scene" | "transform">("photos");
  const [uploadedPhotos, setUploadedPhotos] = useState<Array<{ name: string; dataUrl: string }>>([]);
  const [designerIntent, setDesignerIntent] = useState("Grove Street 90s Craftsman Cul-de-Sac");
  const [packageSlug, setPackageSlug] = useState("san-andreas");
  const [packageTitle, setPackageTitle] = useState("San Andreas Grove Street");
  const [isPackaging, setIsPackaging] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [generatedPromptInfo, setGeneratedPromptInfo] = useState<{ folder: string; promptPath: string; promptContent: string } | null>(null);
  const [showPromptViewer, setShowPromptViewer] = useState(false);
  const [isAnalyzingAI, setIsAnalyzingAI] = useState(false);
  const [recognitionReport, setRecognitionReport] = useState<any | null>(null);
  const [designerAssets, setDesignerAssets] = useState<any[]>([]);
  const [assetValidations, setAssetValidations] = useState<AssetValidation[]>([]);
  const [activeAssetIdx, setActiveAssetIdx] = useState(0);
  const [designerScene, setDesignerScene] = useState<any | null>(null);
  const [vehYaw, setVehYaw] = useState(0);
  const [vehPitch, setVehPitch] = useState(0);
  const [vehRoll, setVehRoll] = useState(0);
  const [vehElev, setVehElev] = useState(0);
  const [vehScale, setVehScale] = useState(1);
  const [vehCollW, setVehCollW] = useState(0.95);
  const [vehCollL, setVehCollL] = useState(2.2);
  const [vehCollH, setVehCollH] = useState(1.35);
  const [collisionDebug, setCollisionDebug] = useState(false);
  const collisionHelpersRef = useRef<THREE.Group | null>(null);

  const sRef = useRef<SimApi | undefined>(undefined);

  const fetchCustomBlueprints = async () => {
    try {
      const bps = await apiGetBlueprints();
      setCustomBlueprints(bps || []);
    } catch {}
  };

  const pullLogsAndState = () => {
    const ring = simLogRing();
    setLogs(ring.slice(-4));
    const api = bridgeApi();
    sRef.current = api;
    if (api?.isAreaSelectActive) {
      setAreaActive(api.isAreaSelectActive());
    }
    if (api?.objects) {
      const objs = api.objects();
      setPlacedObjects(objs || []);
    }
    const s = bridgeState();
    if (s) {
      const player = s.player as { x?: number; y?: number; z?: number; yaw?: number; pitch?: number; hunger?: number; fly?: boolean } | undefined;
      const chunks = s.chunks as Map<string, unknown> | undefined;
      const emitters = s.emitters as Map<string, unknown> | undefined;
      const liquidQ = s.liquidQ as unknown[] | undefined;
      setInspectorData({
        playerPos: player ? `(${player.x?.toFixed(1)}, ${player.y?.toFixed(1)}, ${player.z?.toFixed(1)})` : "n/a",
        playerYaw: player?.yaw !== undefined ? `${((player.yaw * 180) / Math.PI).toFixed(1)}°` : "n/a",
        flying: player?.fly ? "Active" : "Grounded",
        hunger: player?.hunger !== undefined ? `${player.hunger} / 20` : "20 / 20",
        mountedChunks: chunks ? chunks.size : 0,
        activeLightEmitters: emitters ? emitters.size : 0,
        liquidQueueLength: liquidQ ? liquidQ.length : 0,
        worldSeed: String(s.seedText ?? "sim:default")
      });
    }
  };

  useEffect(() => {
    fetchCustomBlueprints();
    const t = setInterval(pullLogsAndState, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (section === "spawn") fetchCustomBlueprints();
  }, [section]);

  const items = useMemo(() => {
    if (typeKey === "trees") {
      return treePickList().map(([id, label]) => ({
        id,
        label,
        icon: () => iconFor(id),
        spawn: (api: SimApi, ax: number, az: number) =>
          api.stampTree?.(id, customParams, ax, az)
      }));
    }
    if (typeKey === "blocks") {
      return blocksPickList().map(([bid, label]) => ({
        id: `block:${bid}`,
        label,
        icon: () => thumbs.get(bid) || iconFor("default"),
        spawn: (api: SimApi, ax: number, az: number) => api.stampBlock?.(bid, ax, az)
      }));
    }
    if (typeKey === "houses") {
      const presets = structurePickList().map(([id, label]) => ({
        id,
        label,
        icon: () => iconFor(id),
        spawn: (api: SimApi, ax: number, az: number) =>
          api.stampStructure?.(id.slice(6), Number(customParams.width ?? 8), ax, az, String(customParams.side ?? "S"))
      }));
      const customs = customBlueprints.map((bp) => ({
        id: `custom_bp:${bp.id}`,
        label: `📦 ${bp.name} (${bp.package_name || "Custom"})`,
        icon: () => iconFor("house:cottage"),
        spawn: async (api: SimApi, ax: number, az: number) => {
          const fullDoc = await apiGetBlueprint(bp.id);
          if (fullDoc) {
            if (api.selectBlueprintWand) {
              api.selectBlueprintWand(fullDoc);
              return;
            }
            const s = bridgeState();
            const px = Math.floor(Number((s?.player as any)?.x ?? ax ?? 8));
            const pz = Math.floor(Number((s?.player as any)?.z ?? az ?? 8));
            if (api.stampRun) {
              const clipped = fullDoc.blocks.filter((b: { dy: number }) => 65 + b.dy >= 128).length;
              api.stampRun(`blueprint:${fullDoc.name}`, (w) => {
                stampCustomBlueprint(fullDoc.blocks, px, 65, pz, w);
              });
              if (clipped > 0) setStatus(`⚠️ "${fullDoc.name}" is taller than the world: top ${clipped} voxels clipped at y=128`);
            }
          }
        }
      }));
      return [...presets, ...customs];
    }
    if (typeKey === "mobs") {
      return mobPickList().map(([id, label]) => ({
        id,
        label,
        icon: () => iconFor(id),
        spawn: (api: SimApi, ax: number, az: number) => {
          api.stampMob?.(id.slice(4) as "zombie" | "creeper" | "skeleton" | "spider" | "all", ax, az);
        }
      }));
    }
    if (typeKey === "villagers") {
      return villagerPickList().map(([id, label]) => ({
        id,
        label,
        icon: () => iconFor(id),
        spawn: (api: SimApi, ax: number, az: number) => {
          const profIdx = Number(customParams.professionIdx ?? 0);
          const skinIdx = Number(customParams.skinIdx ?? 0);
          api.stampVillager?.(profIdx, skinIdx, ax, az);
        }
      }));
    }
    if (typeKey === "entities") {
      return entityPickList().map(([id, label]) => ({
        id,
        label,
        icon: () => iconFor(id),
        spawn: (api: SimApi, ax: number, az: number) => {
          api.stampEntity?.(id.slice(7), ax, az);
        }
      }));
    }
    if (typeKey === "san_andreas") {
      return SAN_ANDREAS_CATALOG.map((entry) => ({
        id: entry.catalogId,
        label: entry.label,
        icon: () => iconFor("house:cottage"),
        spawn: async (api: SimApi, ax: number, az: number) => {
          if (entry.catalogId === "sa:grove_culdesac") {
            try {
              const cjHouse = await (await fetch("/catalog/blueprints/bp_cj_house_grove_st.json")).json();
              const cjGarage = await (await fetch("/catalog/blueprints/bp_cj_garage_grove_st.json")).json();
              const sweetsHouse = await (await fetch("/catalog/blueprints/bp_sweets_house_grove_st.json")).json();
              const palmTree = await (await fetch("/catalog/blueprints/bp_fan_palm_grove_st.json")).json();
              const utilityPole = await (await fetch("/catalog/blueprints/bp_utility_pole_grove_st.json")).json();

              const s = bridgeState();
              const px = Math.floor(Number((s?.player as any)?.x ?? ax ?? 8));
              const pz = Math.floor(Number((s?.player as any)?.z ?? az ?? 8));

              if (api.stampRun) {
                api.stampRun("scene:grove_street_culdesac", (w) => {
                  stampBlocksWithConformity(cjHouse.blocks, px + 6, 65, pz + 10, w);
                  stampBlocksWithConformity(cjGarage.blocks, px - 4, 65, pz + 11, w);
                  stampBlocksWithConformity(sweetsHouse.blocks, px - 15, 65, pz + 12, w);
                  stampBlocksWithConformity(palmTree.blocks, px + 16, 65, pz + 6, w);
                  stampBlocksWithConformity(utilityPole.blocks, px + 16, 65, pz + 16, w);
                });
                setStatus("Stamped Full Grove Street Cul-de-Sac (5 structures)!");
              }
            } catch (err) {
              setStatus(`Failed to stamp Grove Street: ${String(err)}`);
            }
            return;
          }

          if (entry.blueprintFile) {
            try {
              const res = await fetch(`/catalog/blueprints/${entry.blueprintFile}`);
              if (!res.ok) throw new Error(`Fetch error: ${res.status}`);
              const fullDoc = await res.json();

              const s = bridgeState();
              const px = Math.floor(Number((s?.player as any)?.x ?? ax ?? 8));
              const pz = Math.floor(Number((s?.player as any)?.z ?? az ?? 8));
              const bAx = fullDoc.anchor?.ax || 0;
              const bAy = fullDoc.anchor?.ay || 0;
              const bAz = fullDoc.anchor?.az || 0;

              if (api.stampRun) {
                const clipped = fullDoc.blocks.filter((b: { dy: number }) => 65 + (b.dy - bAy) >= 128).length;
                api.stampRun(`blueprint:${fullDoc.name}`, (w) => {
                  for (const b of fullDoc.blocks) {
                    w(px + (b.dx - bAx), 65 + (b.dy - bAy), pz + (b.dz - bAz), b.id);
                  }
                });
                setStatus(clipped > 0
                  ? `Stamped "${fullDoc.name}" (${fullDoc.totalBlocks || fullDoc.blocks?.length} voxels)! ⚠️ top ${clipped} voxels clipped at y=128`
                  : `Stamped "${fullDoc.name}" (${fullDoc.totalBlocks || fullDoc.blocks?.length} voxels)!`);
              }
              if (api.selectBlueprintWand) {
                api.selectBlueprintWand(fullDoc);
              }
            } catch (err) {
              setStatus(`Failed to load blueprint: ${String(err)}`);
            }
          }
        }
      }));
    }
    return featurePickList().map(([id, label]) => ({
      id,
      label,
      icon: () => iconFor(id),
      spawn: (api: SimApi, ax: number, az: number) => {
        const k = id.slice(8);
        if (k === "well") return api.stampWell?.(ax, az);
        if (k === "lamp") return api.stampLamp?.(ax, az);
        if (k === "garden") return api.stampGarden?.(ax, az);
        if (k === "fountain") return api.stampFountain?.(ax, az);
        if (k === "stilt") return api.stampStiltLake?.(ax, az);
        return api.stampOcean?.(k as "coral" | "kelp" | "wreck", ax, az);
      }
    }));
  }, [typeKey, customParams, thumbs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.label.toLowerCase().includes(q));
  }, [items, query]);

  // Virtualized-infinite catalog: 150 items per page keeps the DOM light with 700+ blocks
  const [gridLimit, setGridLimit] = useState(150);
  useEffect(() => setGridLimit(150), [typeKey, query]);
  const gridVisible = filtered.slice(0, gridLimit);

  const currentSchema = useMemo(() => {
    return paramsSchemaFor(selectedItemId);
  }, [selectedItemId]);

  const spawnFromCell = async (cell: { id: string; label: string; spawn: (api: SimApi, ax: number, az: number) => Promise<any> | { voxels?: number; ms?: number } | void }) => {
    setSelectedItemId(cell.id);
    const api = sRef.current || bridgeApi();
    if (!api) {
      simLog("bridge not ready");
      setStatus("bridge not ready");
      return;
    }
    setBusy(true);
    try {
      const front = api.spawnFront?.(6);
      const ax = front ? front.x : (simFlat() ? 8 : 10);
      const az = front ? front.z : (simFlat() ? 8 : 10);
      if (simFlat() && placedObjects.length === 0) {
        try { api.undo?.(); } catch { /* first spawn */ }
      }
      const out = await cell.spawn(api, ax, az);
      setStatus(out && (out as any).voxels !== undefined ? `Spawned ${cell.label} @ (${ax},${az}) → ${(out as any).voxels} voxels` : `Spawned ${cell.label}`);
      pullLogsAndState();
    } catch (e) {
      setStatus(`error: ${String(e)}`);
    } finally {
      setBusy(false);
    }
  };

  const handleRunScenarios = async () => {
    setRunningScenarios(true);
    const results: Record<string, { pass: boolean; detail: string }> = {};
    for (const suite of SCENARIO_SUITES) {
      for (const step of suite.steps) {
        try {
          const res = step.run();
          results[`${suite.id}:${step.name}`] = res;
        } catch (err) {
          results[`${suite.id}:${step.name}`] = { pass: false, detail: `Threw error: ${String(err)}` };
        }
      }
    }
    setScenarioResults(results);
    setRunningScenarios(false);
    simLog(`Ran ${Object.keys(results).length} simulation scenario assertions`);
  };

  const timeSet = (tick: number, label: string) => {
    const api = sRef.current || bridgeApi();
    if (!api?.timeSet) return;
    api.timeSet(tick);
    setStatus(`Time set → ${label} (${tick} ticks)`);
  };

  if (collapsed) {
    return (
      <div className="fixed top-3 right-3 z-[70] rounded-lg border-2 border-[#e0913a]/80 bg-[#12161c]/95 text-[#e9e0cb] text-xs shadow-2xl select-none backdrop-blur-md">
        <button onClick={() => setCollapsed(false)} className="px-3.5 py-2 font-bold tracking-widest text-[#ffd489] hover:text-white flex items-center gap-2">
          <span>▲</span>
          <span>SIM DECK</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#e0913a]/20 text-[#ffd489] font-mono">EXPAND</span>
        </button>
      </div>
    );
  }

  return (
    <div
      className="fixed top-3 right-3 z-[70] w-[340px] max-h-[94vh] flex flex-col rounded-lg border-2 border-[#e0913a]/90 bg-[#12161c]/95 text-[#e9e0cb] text-xs shadow-2xl select-none backdrop-blur-md overflow-hidden"
      data-sim-deck
    >
      {/* Tier 1: Primary Header & Mode Bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-[#e0913a]/30 via-[#e0913a]/15 to-transparent border-b border-[#e0913a]/40 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold tracking-widest text-[#ffd489] text-sm">SIM DECK</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${admin ? "bg-green-700/80 text-white border border-green-500/50" : "bg-amber-700/80 text-white border border-amber-500/50"}`}>
            {admin ? "SANDBOX" : "LOCAL FLAT-PAD"}
          </span>
        </div>
        
        <div className="flex items-center gap-1.5">
          {onOpenBlueprints && (
            <button
              onClick={onOpenBlueprints}
              className="px-2.5 py-1 rounded bg-[#3b82f6]/30 border border-[#3b82f6]/70 hover:brightness-125 text-[10px] uppercase font-bold text-[#bfdbfe]"
              title="Open Blueprint Studio / Save Custom Structure"
            >
              <span>BLUEPRINTS</span>
            </button>
          )}

          <button
            onClick={() => setCollapsed(true)}
            className="w-6 h-6 rounded bg-white/10 hover:bg-white/20 text-[#ffd489] hover:text-white font-bold grid place-items-center text-xs ml-1"
            title="Minimize SimDeck (hide the panel)"
          >
            —
          </button>
        </div>
      </div>

      {/* Section Navigator */}
      <div className="px-3 py-2 bg-[#0e1217] border-b border-[#252b36] shrink-0">
        <select
          value={section}
          onChange={(e) => {
            const tab = e.target.value as DeckSection;
            setSection(tab);
            if (tab === "sideload") setSideloadList(assetSideloader.listBlueprints());
          }}
          className="w-full bg-[#161c26] border border-[#e0913a]/50 rounded-md px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#ffd489] outline-none focus:border-[#e0913a]"
          title="SimDeck section"
        >
          <option value="spawn">🚀 Spawn Catalog</option>
          <option value="params">🎚️ Item Params</option>
          <option value="build">🔧 Build Tools</option>
          <option value="vehicles">🚗 Vehicles</option>
          <option value="world">🌍 World & Time</option>
          <option value="placed">📦 Placed ({placedObjects.length})</option>
          <option value="tests">🧪 Tests</option>
          <option value="inspect">🔍 Inspect</option>
          <option value="scenes">🎬 Scenes</option>
          <option value="sideload">📥 Sideload</option>
          <option value="designer">🤖 AI Designer</option>
        </select>
      </div>

      {/* Section Body */}
      <div className="p-3 overflow-y-auto flex-1 bg-[#12161c]">
        {section === "spawn" && (
          <div>
            {/* Category Filter Buttons */}
            <div className="grid grid-cols-4 gap-1 mb-2.5">
              {(["trees", "blocks", "houses", "san_andreas", "features", "mobs", "villagers", "entities"] as CatalogGroup[]).map((grp) => (
                <button
                  key={grp}
                  onClick={() => setTypeKey(grp)}
                  className={`py-1.5 px-1 text-[9.5px] font-bold uppercase rounded border transition-all truncate text-center ${
                    typeKey === grp
                      ? "bg-[#2fae3d] text-black border-[#55ff88] font-extrabold shadow"
                      : grp === "san_andreas"
                      ? "bg-[#352514] text-[#ffd489] border-[#d97706]/50 hover:bg-[#453018]"
                      : "bg-[#181f2a] text-[#94a3b8] border-[#2e3846] hover:bg-[#232c3b] hover:text-white"
                  }`}
                >
                  {grp === "trees"
                    ? "Trees"
                    : grp === "blocks"
                    ? "Blocks"
                    : grp === "houses"
                    ? "Houses"
                    : grp === "san_andreas"
                    ? "🌴 San Andreas"
                    : grp === "features"
                    ? "Features"
                    : grp === "mobs"
                    ? "Mobs"
                    : grp === "villagers"
                    ? "NPC"
                    : "Entities"}
                </button>
              ))}
            </div>

            <div className="relative mb-2.5">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${typeKey} catalog (${items.length} items)…`}
                className="w-full bg-[#0a0d11] border border-[#2e3846] rounded-md px-3 py-1.5 text-[11px] text-white placeholder-[#64748b] focus:border-[#e0913a] outline-none"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
              {gridVisible.map((cell) => (
                <button
                  key={cell.id}
                  onClick={() => spawnFromCell(cell)}
                  disabled={busy || !ready}
                  className={`flex items-center gap-2 p-1.5 rounded-md border text-left transition-all ${
                    selectedItemId === cell.id
                      ? "border-[#e0913a] bg-[#e0913a]/20 shadow-md"
                      : "border-[#252d3a] bg-[#161c26] hover:border-[#e0913a]/60 hover:bg-[#1d2533]"
                  }`}
                >
                  <div className="w-8 h-8 rounded bg-black/50 border border-white/10 p-0.5 shrink-0 flex items-center justify-center">
                    <img src={cell.icon()} alt="" className="w-full h-full object-contain" style={{ imageRendering: "pixelated" }} />
                  </div>
                  <span className="text-[10px] font-medium leading-tight truncate text-[#e2e8f0]">{cell.label}</span>
                </button>
              ))}
            </div>
            {filtered.length > gridVisible.length && (
              <button
                onClick={() => setGridLimit((l) => l + 150)}
                className="w-full mt-1.5 py-1.5 rounded bg-[#2fae3d]/20 border border-[#2fae3d]/60 text-[#a7f3d0] text-[10px] font-bold uppercase hover:brightness-125 active:brightness-90"
              >
                Show more ({filtered.length - gridVisible.length} more of {filtered.length})
              </button>
            )}
            {filtered.length > 0 && gridVisible.length >= filtered.length && (
              <div className="text-center text-[9px] text-[#64748b] mt-1.5">
                {filtered.length} items — full catalog loaded
              </div>
            )}
          </div>
        )}

        {section === "build" && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
                {onToggleBuilding && (
                  <button
                    onClick={onToggleBuilding}
                    className={`px-2.5 py-1 rounded border text-[10px] uppercase font-bold transition-all shadow ${
                      isBuildingMode
                        ? "bg-emerald-600 border-emerald-400 text-white ring-1 ring-emerald-300"
                        : "bg-[#e0913a] border-[#e0913a] text-black hover:brightness-110"
                    }`}
                    title="Toggle interactive building mode with hotbar and block breaking/placing"
                  >
                    <span>{isBuildingMode ? "STOP BUILD" : "START BUILDING"}</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    const api = sRef.current || bridgeApi();
                    if (api?.toggleAreaSelect) {
                      const next = api.toggleAreaSelect();
                      setAreaActive(next);
                      setStatus(next ? "3D Area Select active: Click Point 1 & Point 2 on blocks" : "Area select closed");
                    }
                  }}
                  className={`px-2.5 py-1 rounded border text-[10px] uppercase font-bold transition-all shadow ${
                    areaActive
                      ? "bg-yellow-500 border-yellow-300 text-black animate-pulse ring-2 ring-yellow-400"
                      : "bg-yellow-600/30 border-yellow-500/70 text-yellow-300 hover:brightness-125"
                  }`}
                  title="Toggle 3D Area Selection tool (Click Point 1 and Point 2 to create yellow bounding box)"
                >
                  <span>{areaActive ? "PICKING BOX…" : "AREA BOX"}</span>
                </button>
            </div>
            {/* Tier 2.5: Builder Palettes Bar */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#0e1217] border-b border-[#252b36] shrink-0 text-[10px]">
              <span className="text-[#ffd489]/70 font-bold uppercase tracking-wider text-[9px] mr-0.5">Palettes:</span>
              {[
                { name: "Medieval", hotbar: [5, 6, 17, 4, 37, 8, 105, 101, 102], col: "bg-amber-900/40 text-amber-200 border-amber-600/50" },
                { name: "Modern", hotbar: [62, 65, 37, 66, 63, 46, 105, 135, 5], col: "bg-cyan-900/40 text-cyan-200 border-cyan-600/50" },
                { name: "Nature", hotbar: [18, 17, 13, 1, 103, 125, 124, 44, 135], col: "bg-emerald-900/40 text-emerald-200 border-emerald-600/50" },
                { name: "Redstone", hotbar: [45, 42, 41, 43, 8, 67, 46, 47, 49], col: "bg-rose-900/40 text-rose-200 border-rose-600/50" },
                { name: "Clear", hotbar: [0, 0, 0, 0, 0, 0, 0, 0, 0], col: "bg-slate-800/40 text-slate-300 border-slate-600/50" }
              ].map((pal) => (
                <button
                  key={pal.name}
                  onClick={() => {
                    const api = sRef.current || bridgeApi();
                    if (api?.setHotbar) {
                      api.setHotbar(pal.hotbar);
                      setStatus(`Loaded "${pal.name}" palette to hotbar!`);
                    }
                  }}
                  className={`flex-1 py-0.5 px-1 rounded border text-[9px] font-bold hover:brightness-125 transition-all text-center truncate ${pal.col}`}
                  title={`Equip ${pal.name} palette into hotbar`}
                >
                  {pal.name}
                </button>
              ))}
            </div>
            {/* Sculpt Brushes Bar (U21) */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-[#0a0f14] border-b border-[#252b36] shrink-0 text-[10px]">
              <span className="text-[#ffd489]/70 font-bold uppercase tracking-wider text-[9px] mr-0.5">Sculpt:</span>
              {(["sphere", "cylinder", "cuboid", "plane"] as const).map((shape) => (
                <button
                  key={shape}
                  onClick={() => {
                    const api = sRef.current || bridgeApi();
                    const st = bridgeState();
                    const p = (st?.player as any) || { x: 8.5, y: 65, z: 8.5 };
                    const held = Number((st?.hotbar as any)?.[Number(st?.slot ?? 0)] || 5);
                    const n = api?.brushPaint?.({ shape, radius: 3 }, Math.floor(p.x), Math.floor(p.y) - 1, Math.floor(p.z), held);
                    if (n !== undefined) setStatus(`🖌️ ${shape} brush → ${n} blocks (#${held}) at player`);
                  }}
                  className="flex-1 py-0.5 rounded bg-violet-600/30 border border-violet-500/60 text-violet-200 font-bold hover:brightness-125 text-center capitalize text-[9px]"
                  title={`Paint ${shape} (radius 3) at the player with the held block`}
                >
                  {shape}
                </button>
              ))}
              <button
                onClick={() => {
                  const api = sRef.current || bridgeApi();
                  const st = bridgeState();
                  const p = (st?.player as any) || { x: 8.5, y: 65, z: 8.5 };
                  const n = api?.brushErase?.({ shape: "sphere", radius: 3 }, Math.floor(p.x), Math.floor(p.y) - 1, Math.floor(p.z));
                  if (n !== undefined) setStatus(`🖌️ erased ${n} blocks`);
                }}
                className="py-0.5 px-1.5 rounded bg-red-600/30 border border-red-500/60 text-red-200 font-bold hover:brightness-125 text-[9px]"
                title="Erase a sphere of air at the player"
              >
                erase
              </button>
            </div>
            {/* Area Box CAD Tools Bar (Active when Area Box mode is ON) */}
            {areaActive && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-950/40 border-b border-yellow-500/40 shrink-0 text-[10px]">
                <span className="text-yellow-400 font-bold uppercase tracking-wider text-[9px] mr-1">Area CAD:</span>
                <button
                  onClick={() => {
                    const api = sRef.current || bridgeApi();
                    const s = bridgeState();
                    const held = Number((s?.hotbar as any)?.[Number(s?.slot ?? 0)] || 5);
                    const n = api?.fillArea?.(held);
                    if (n) setStatus(`Filled ${n} blocks with #${held}`);
                  }}
                  className="flex-1 py-0.5 rounded bg-yellow-600/30 border border-yellow-500/60 text-yellow-200 font-bold hover:brightness-125 text-center"
                  title="Fill selected 3D box with block in hand"
                >
                  Fill Box
                </button>
                <button
                  onClick={() => {
                    const api = sRef.current || bridgeApi();
                    const n = api?.clearArea?.();
                    if (n) setStatus(`Cleared ${n} blocks`);
                  }}
                  className="flex-1 py-0.5 rounded bg-red-600/30 border border-red-500/60 text-red-200 font-bold hover:brightness-125 text-center"
                  title="Clear all non-air blocks in selected box"
                >
                  Clear Box
                </button>
                <button
                  onClick={() => {
                    const api = sRef.current || bridgeApi();
                    const doc = api?.copyArea?.();
                    if (doc) setStatus(`Copied ${doc.totalBlocks} blocks to clipboard`);
                  }}
                  className="flex-1 py-0.5 rounded bg-blue-600/30 border border-blue-500/60 text-blue-200 font-bold hover:brightness-125 text-center"
                  title="Copy selected area into clipboard"
                >
                  Copy
                </button>
                <button
                  onClick={() => {
                    const api = sRef.current || bridgeApi();
                    const ok = api?.pasteArea?.();
                    if (ok) setStatus("Pasting: Aim crosshair, 'R' to rotate, Click to place");
                  }}
                  className="flex-1 py-0.5 rounded bg-emerald-600/30 border border-emerald-500/60 text-emerald-200 font-bold hover:brightness-125 text-center"
                  title="Paste clipboard via holographic wand"
                >
                  Paste
                </button>
                <button
                  onClick={() => {
                    const api = sRef.current || bridgeApi();
                    const doc = api?.cutArea?.();
                    if (doc) setStatus(`Cut ${doc.totalBlocks} blocks to clipboard`);
                  }}
                  className="flex-1 py-0.5 rounded bg-purple-600/30 border border-purple-500/60 text-purple-200 font-bold hover:brightness-125 text-center"
                  title="Cut selected area to clipboard and clear"
                >
                  Cut
                </button>
                <span className="text-yellow-400/70 text-[9px] font-bold ml-1">Nudge:</span>
                {([["X+", 1, 0, 0], ["X-", -1, 0, 0], ["Y+", 0, 1, 0], ["Y-", 0, -1, 0], ["Z+", 0, 0, 1], ["Z-", 0, 0, -1]] as const).map(([lbl, dx, dy, dz]) => (
                  <button
                    key={lbl}
                    onClick={() => {
                      const api = sRef.current || bridgeApi();
                      const n = api?.areaMove?.(dx as number, dy as number, dz as number);
                      if (n) setStatus(`Moved selection ${lbl} (${n} blocks)`);
                    }}
                    className="py-0.5 px-1.5 rounded bg-yellow-600/20 border border-yellow-500/50 text-yellow-200 font-bold hover:brightness-125 text-[9px]"
                    title={`Move selected blocks ${lbl} by 1`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Vehicle Transform — rotate XYZ + elevate + collision debug */}
        {section === "vehicles" && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 flex-wrap">
                <select
                  value={selectedVehicleStyle}
                  onChange={(e) => setSelectedVehicleStyle(e.target.value)}
                  className="px-1.5 py-1 rounded bg-[#e0913a]/20 border border-[#f0b469]/70 text-[10px] uppercase font-bold text-[#f0b469]"
                  title="Car style to spawn (GTA: San Andreas visual pass — see docs/CAR_VISUAL_STYLE_PLAN.md)"
                >
                  {listVehicleStyles().filter(st => !st.id.startsWith("fbx_")).map(st => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    const api = sRef.current || bridgeApi();
                    if (!api?.spawnVehicle) { setStatus("Vehicle system unavailable"); return; }
                    const id = api.spawnVehicle(selectedVehicleStyle);
                    setStatus(id ? "🚗 Car spawned & entered — WASD drive · Space handbrake (hold to hop, lowrider) · E exit" : "Spawn failed");
                  }}
                  className="px-2.5 py-1 rounded bg-[#e0913a] border border-[#f0b469] hover:brightness-125 text-[10px] uppercase font-bold text-black"
                  title="Spawn the selected car style and get in (WASD drive, Space handbrake, E exit)"
                >
                  <span>🚗 SPAWN CAR</span>
                </button>

                <input id="fbx-file-input" type="file" accept=".fbx,.glb,.gltf,model/gltf-binary,model/gltf+json,application/octet-stream" className="hidden" onChange={async (e) => {
                  const f = (e.target as HTMLInputElement).files?.[0];
                  if (!f) return;
                  const ext = f.name.toLowerCase().split(".").pop();
                  if (ext && !["fbx","glb","gltf"].includes(ext)) { setStatus(`❌ Unsupported: .${ext} — use .fbx/.glb/.gltf`); (e.target as HTMLInputElement).value = ""; return; }
                  try {
                    setStatus(`⏳ Loading ${f.name}...`);
                    const buf = await f.arrayBuffer();
                    const model = await createVehicleModelFromBuffer(buf, f.name);
                    const styleId = `fbx_${f.name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "_")}`;
                    const displayName = f.name.replace(/\.[^.]+$/, "");
                    registerVehicleStyle({ id: styleId, name: displayName, tunables: vehicleStyle("sedan").tunables, model: () => model } as any);
                    const api = sRef.current || bridgeApi();
                    const vehId = (api as any)?.spawnVehicle?.(styleId);
                    setStatus(vehId ? `📦 ${displayName} imported & spawned — WASD drive · E exit · Arrows to change seat` : `📦 ${displayName} registered (spawn via TEST CAR)`);
                  } catch (err) { setStatus(`Import failed: ${String(err)}`); }
                  (e.target as HTMLInputElement).value = "";
                }} />
                <button
                  onClick={() => document.getElementById("fbx-file-input")?.click()}
                  className="px-2.5 py-1 rounded bg-[#7c6cff]/30 border border-[#9b8cff]/70 hover:brightness-125 text-[10px] uppercase font-bold text-[#d8ccff]"
                  title="Import .fbx/.glb/.gltf car model as drivable asset — GLB recommended (open standard, lighter); FBX also supported (per docs/VEHICLE_SYSTEM_PLAN.md V1)"
                >
                  <span>📁 IMPORT FBX/GLB</span>
                </button>
              </div>
            {(() => {
              const hasVehicle = (typeof window !== "undefined" && (window as any).__sim?.s?.vehicles?.size > 0);
              if (!hasVehicle) return null;
              return (
                <div className="px-3 py-2 bg-[#0f141e]/90 border-b border-[#252b36] space-y-2">
                  <div className="text-[9px] font-bold tracking-widest text-[#ffd489] uppercase">Vehicle Transform</div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { label: "Yaw Y", min: 0, max: 360, step: 1, val: vehYaw, set: (v: number) => { setVehYaw(v); const s=(window as any).__sim?.s; const veh=s?.activeVehicle||Array.from(s?.vehicles?.values()||[])[0] as any; if(veh){ veh.state.yaw=v*Math.PI/180; veh.root.rotation.y=veh.state.yaw; } } },
                      { label: "Pitch X", min: -30, max: 30, step: 1, val: vehPitch, set: (v: number) => { setVehPitch(v); const s=(window as any).__sim?.s; const veh=s?.activeVehicle||Array.from(s?.vehicles?.values()||[])[0] as any; if(veh){ veh.state.pitch=v*Math.PI/180; veh.root.rotation.x=veh.state.pitch; } } },
                      { label: "Roll Z", min: -30, max: 30, step: 1, val: vehRoll, set: (v: number) => { setVehRoll(v); const s=(window as any).__sim?.s; const veh=s?.activeVehicle||Array.from(s?.vehicles?.values()||[])[0] as any; if(veh){ veh.state.roll=v*Math.PI/180; veh.root.rotation.z=veh.state.roll; } } },
                      { label: "Elevate Y", min: -2, max: 5, step: 0.2, val: vehElev, set: (v: number) => { setVehElev(v); const s=(window as any).__sim?.s; const veh=s?.activeVehicle||Array.from(s?.vehicles?.values()||[])[0] as any; if(veh){ const prev=(veh as any)._elevOffset ?? 0; veh.state.y += v - prev; (veh as any)._elevOffset=v; veh.root.position.y=veh.state.y; } } },
                      { label: "Scale", min: 0.5, max: 2.5, step: 0.1, val: vehScale, set: (v: number) => { setVehScale(v); const s=(window as any).__sim?.s; const veh=s?.activeVehicle||Array.from(s?.vehicles?.values()||[])[0] as any; if(veh){ veh.root.scale.setScalar(v); veh.tunables.halfWidth=0.95*v; veh.tunables.halfLength=2.2*v; veh.tunables.bodyHeight=1.35*v; veh.tunables.wheelRadius=0.36*v; } } },
                      { label: "Coll W", min: 0.5, max: 2.0, step: 0.1, val: vehCollW, set: (v: number) => { setVehCollW(v); const s=(window as any).__sim?.s; const veh=s?.activeVehicle||Array.from(s?.vehicles?.values()||[])[0] as any; if(veh) veh.tunables.halfWidth=v; } },
                      { label: "Coll L", min: 1.0, max: 4.0, step: 0.1, val: vehCollL, set: (v: number) => { setVehCollL(v); const s=(window as any).__sim?.s; const veh=s?.activeVehicle||Array.from(s?.vehicles?.values()||[])[0] as any; if(veh) veh.tunables.halfLength=v; } },
                      { label: "Coll H", min: 0.5, max: 2.5, step: 0.1, val: vehCollH, set: (v: number) => { setVehCollH(v); const s=(window as any).__sim?.s; const veh=s?.activeVehicle||Array.from(s?.vehicles?.values()||[])[0] as any; if(veh) veh.tunables.bodyHeight=v; } },
                    ].map((ctrl) => (
                      <div key={ctrl.label} className="space-y-0.5">
                        <div className="flex justify-between text-[8px] text-white/60"><span>{ctrl.label}</span><span>{ctrl.val}</span></div>
                        <input type="range" min={ctrl.min} max={ctrl.max} step={ctrl.step} value={ctrl.val} onChange={(e)=>ctrl.set(Number(e.target.value))} className="w-full h-1 accent-[#e0913a]" />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      const s=(window as any).__sim?.s; if(!s) return;
                      if (collisionHelpersRef.current) {
                        collisionHelpersRef.current.parent?.remove(collisionHelpersRef.current);
                        collisionHelpersRef.current.traverse((o:any)=>{ o.geometry?.dispose?.(); o.material?.dispose?.(); });
                        collisionHelpersRef.current=null; setCollisionDebug(false); setStatus("Collision debug OFF");
                        return;
                      }
                      const veh=s.activeVehicle||Array.from(s.vehicles.values())[0] as any; if(!veh) return;
                      const t=veh.tunables;
                      const g=new THREE.Group();
                      // collision box (local to vehicle, follows yaw/pitch/roll)
                      const boxH=new THREE.Mesh(new THREE.BoxGeometry(t.halfWidth*2, t.bodyHeight, t.halfLength*2), new THREE.MeshBasicMaterial({ color:0x00ff88, wireframe:true, transparent:true, opacity:0.6 }));
                      boxH.position.set(0, t.bodyHeight/2, 0);
                      g.add(boxH);
                      // 5 ground sample points (center + 4 wheels) — local, follows vehicle
                      const hw=t.halfWidth*0.9, hl=t.halfLength*0.9;
                      for(const [dx,dz] of [[0,0],[hw,hl],[-hw,hl],[hw,-hl],[-hw,-hl]] as const){
                        const m=new THREE.Mesh(new THREE.SphereGeometry(0.12,8,8), new THREE.MeshBasicMaterial({ color:0xff4444 }));
                        m.position.set(dx, 0.12, dz);
                        g.add(m);
                      }
                      veh.root.add(g); (g as any).isCollisionDebug=true; collisionHelpersRef.current=g; setCollisionDebug(true); setStatus("Collision debug ON — box = car AABB, red spheres = 5 ground points (follow car)");
                    }}
                    className={`w-full py-1 rounded text-[9px] font-bold uppercase border ${collisionDebug?"bg-emerald-600 border-emerald-400 text-white":"bg-white/10 border-white/20 text-white/70 hover:bg-white/15"}`}
                  >
                    {collisionDebug ? "✓ Collision Points ON" : "Show Collision Points"}
                  </button>
                </div>
              );
            })()}
          </div>
        )}

        {section === "world" && (
          <div className="space-y-2">
            {/* Tier 2: Studio Tools Strip */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0a0d11]/80 border-b border-[#252b36] shrink-0 text-[10px]">
              <span className="text-[#ffd489]/70 font-bold uppercase tracking-wider text-[9px] mr-1">Studio:</span>
              <button
                onClick={() => {
                  const api = sRef.current || bridgeApi();
                  if (!api?.snapCurrentView) return;
                  setBusy(true);
                  setStatus("Snapping current view…");
                  Promise.resolve(api.snapCurrentView())
                    .then((r) => setStatus(r && r.ok ? "Snap saved! (snapshots/live-snap.jpg)" : "Snap failed"))
                    .finally(() => { setBusy(false); pullLogsAndState(); });
                }}
                disabled={busy}
                className="flex-1 py-1 rounded bg-[#3b82f6]/25 border border-[#3b82f6]/50 hover:brightness-125 font-bold text-[#bfdbfe] flex items-center justify-center gap-1"
                title="Snap the exact current camera view and save to snapshots"
              >
                <span>Snap View</span>
              </button>

              <button
                onClick={() => {
                  const api = sRef.current || bridgeApi();
                  if (!api?.focusShots) return;
                  setBusy(true);
                  setStatus("Capturing 3 orbital views…");
                  Promise.resolve(api.focusShots())
                    .then((r) => setStatus(r && r.count ? `Saved ${r.count} views (focus-0..2.jpg)` : "Captured"))
                    .finally(() => { setBusy(false); pullLogsAndState(); });
                }}
                disabled={busy}
                className="flex-1 py-1 rounded bg-[#10b981]/25 border border-[#10b981]/50 hover:brightness-125 font-bold text-[#a7f3d0] flex items-center justify-center gap-1"
                title="3 orbital photos around the target"
              >
                <span>3 Views</span>
              </button>

              <button
                onClick={() => {
                  const api = sRef.current || bridgeApi();
                  if (!api?.clearPad) return;
                  const n = api.clearPad();
                  setStatus(`Pad cleared (${n} items removed)`);
                  pullLogsAndState();
                }}
                className="flex-1 py-1 rounded bg-[#f43f5e]/25 border border-[#f43f5e]/50 hover:brightness-125 font-bold text-[#fecdd3] flex items-center justify-center gap-1"
                title="Clear all spawned structures and blocks from the pad"
              >
                <span>Clear Pad</span>
              </button>

              <button
                onClick={() => {
                  const api = sRef.current || bridgeApi();
                  if (!api?.undo) return;
                  const n = api.undo();
                  setStatus(n > 0 ? `Undid last action (${n} voxels)` : "Nothing to undo");
                  pullLogsAndState();
                }}
                className="py-1 px-2.5 rounded bg-white/10 border border-white/20 hover:brightness-125 font-bold text-white/80"
                title="Undo last action or block placement (Shortcut: Z or Ctrl+Z)"
              >
                ↩ Undo
              </button>

              <button
                onClick={() => {
                  const api = sRef.current || bridgeApi();
                  const on = api?.orbitEnable?.(true);
                  setStatus(on ? "Orbit camera ON — alt-drag orbit, wheel zoom, shift-drag pan" : "Orbit unavailable");
                }}
                className="py-1 px-2.5 rounded bg-[#8b5cf6]/25 border border-[#8b5cf6]/50 hover:brightness-125 font-bold text-[#ddd6fe]"
                title="Enable orbiting camera (alt-drag to orbit, wheel to zoom)"
              >
                Orbit
              </button>
              {(["perspective", "top", "side", "front"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    const api = sRef.current || bridgeApi();
                    api?.orbitEnable?.(true);
                    api?.orbitView?.(v);
                    setStatus(`Orbit view: ${v}`);
                  }}
                  className="py-1 px-1.5 rounded bg-white/10 border border-white/20 hover:brightness-125 font-bold text-white/70 text-[9px]"
                  title={`Orbit camera: ${v} view`}
                >
                  {v}
                </button>
              ))}
            </div>
            {/* Time Controls Bar */}
            <div className="flex gap-1.5 px-3 py-1.5 bg-[#0a0d11] border-b border-[#252b36] shrink-0">
              {([["Sunrise", 0], ["Noon", 6000], ["Sunset", 12000], ["Night", 18000]] as const).map(([lbl, tick]) => (
                <button
                  key={lbl}
                  onClick={() => timeSet(tick, lbl)}
                  className="flex-1 py-1 rounded bg-[#1e2530] border border-[#333d4d] hover:border-[#e0913a] hover:text-[#ffd489] text-[9.5px] uppercase font-bold transition-all text-[#cbd5e1]"
                >
                  {lbl}
                </button>
              ))}
            </div>

          </div>
        )}

        {section === "params" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-[#333] pb-1">
              <span className="font-bold text-[#ffd489] text-[11px]">Selected: {selectedItemId}</span>
              <button
                onClick={() => {
                  const it = items.find((i) => i.id === selectedItemId);
                  if (it) spawnFromCell(it);
                }}
                className="px-2 py-0.5 bg-[#2fae3d] text-black font-bold text-[10px] uppercase rounded hover:brightness-125"
              >
                Spawn Now
              </button>
            </div>

            {Object.keys(currentSchema).length === 0 ? (
              <div className="text-[10px] text-[#888] py-4 text-center">No customizable parameters for this item.</div>
            ) : (
              Object.entries(currentSchema).map(([key, field]) => (
                <div key={key} className="bg-[#181818] p-2 border border-[#333] rounded">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-[#ccc] uppercase font-semibold">{key}</span>
                    <span className="text-[#ffd489] font-mono">{String(customParams[key] ?? field.default)}</span>
                  </div>
                  {field.type === "number" ? (
                    <input
                      type="range"
                      min={field.min ?? 1}
                      max={field.max ?? 20}
                      step={field.step ?? 1}
                      value={Number(customParams[key] ?? field.default)}
                      onChange={(e) => setCustomParams({ ...customParams, [key]: Number(e.target.value) })}
                      className="w-full accent-[#e0913a]"
                    />
                  ) : (
                    <select
                      value={String(customParams[key] ?? field.default)}
                      onChange={(e) => setCustomParams({ ...customParams, [key]: e.target.value })}
                      className="w-full bg-black border border-[#444] px-1 py-0.5 text-[10px] text-white"
                    >
                      {field.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {section === "placed" && (
          <div>
            <div className="text-[10px] text-[#aaa] mb-1.5">Placed Items on the Stage ({placedObjects.length}):</div>
            {placedObjects.length === 0 ? (
              <div className="text-[10px] text-[#666] py-6 text-center">Pad is currently empty. Spawn items from the Catalog.</div>
            ) : (
              <div className="space-y-1 max-h-[220px] overflow-y-auto mb-2">
                {placedObjects.map((obj) => (
                  <div
                    key={obj.id}
                    onClick={() => setSelectedPlacedId(obj.id)}
                    className={`flex items-center justify-between p-1.5 border rounded cursor-pointer ${
                      selectedPlacedId === obj.id ? "border-[#e0913a] bg-[#e0913a]/20 text-white" : "border-[#333] bg-[#1a1a1a] text-[#ccc]"
                    }`}
                  >
                    <div>
                      <span className="font-bold text-[10px]">{obj.label}</span>
                      <span className="text-[9px] text-[#888] ml-2">@ ({obj.x}, {obj.z})</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const api = sRef.current || bridgeApi();
                        api?.removeObject?.(obj.id);
                        pullLogsAndState();
                      }}
                      className="px-1.5 py-0.5 bg-red-900/60 border border-red-500/60 text-red-200 text-[9px] hover:bg-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Transform Controls */}
            {selectedPlacedId && (
              <div className="bg-[#181818] p-2 border border-[#444] rounded mt-2">
                <div className="text-[10px] font-bold text-[#ffd489] mb-1">Transform Selected ({selectedPlacedId}):</div>
                <div className="grid grid-cols-4 gap-1 mb-1">
                  <button
                    onClick={() => { const api = sRef.current || bridgeApi(); api?.moveObject?.(selectedPlacedId, -1, 0); pullLogsAndState(); }}
                    className="py-1 bg-[#2a2a2a] border border-[#444] text-[9px] font-bold hover:border-[#e0913a]"
                  >
                    ◀ West
                  </button>
                  <button
                    onClick={() => { const api = sRef.current || bridgeApi(); api?.moveObject?.(selectedPlacedId, 1, 0); pullLogsAndState(); }}
                    className="py-1 bg-[#2a2a2a] border border-[#444] text-[9px] font-bold hover:border-[#e0913a]"
                  >
                    ▶ East
                  </button>
                  <button
                    onClick={() => { const api = sRef.current || bridgeApi(); api?.moveObject?.(selectedPlacedId, 0, -1); pullLogsAndState(); }}
                    className="py-1 bg-[#2a2a2a] border border-[#444] text-[9px] font-bold hover:border-[#e0913a]"
                  >
                    ▲ North
                  </button>
                  <button
                    onClick={() => { const api = sRef.current || bridgeApi(); api?.moveObject?.(selectedPlacedId, 0, 1); pullLogsAndState(); }}
                    className="py-1 bg-[#2a2a2a] border border-[#444] text-[9px] font-bold hover:border-[#e0913a]"
                  >
                    ▼ South
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {section === "tests" && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-[#ffd489]">In-Browser Assertion Suites</span>
              <button
                onClick={handleRunScenarios}
                disabled={runningScenarios}
                className="px-2 py-0.5 bg-[#2fae3d] text-black font-bold text-[10px] uppercase rounded hover:brightness-125 disabled:opacity-50"
              >
                {runningScenarios ? "Running…" : "▶ Run All Tests"}
              </button>
            </div>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {SCENARIO_SUITES.map((suite: ScenarioSuite) => (
                <div key={suite.id} className="bg-[#181818] p-2 border border-[#333] rounded">
                  <div className="font-bold text-[10px] text-[#e0913a]">{suite.name}</div>
                  <div className="text-[9px] text-[#888] mb-1.5">{suite.description}</div>
                  <div className="space-y-1">
                    {suite.steps.map((st) => {
                      const res = scenarioResults[`${suite.id}:${st.name}`];
                      return (
                        <div key={st.name} className="flex items-center justify-between text-[9px] bg-black/40 px-1.5 py-1 border border-[#2a2a2a] rounded">
                          <span className="text-[#ccc]">{st.name}</span>
                          {res ? (
                            <span className={`font-bold px-1 rounded ${res.pass ? "bg-green-800 text-green-200" : "bg-red-800 text-red-200"}`}>
                              {res.pass ? "PASS" : "FAIL"}
                            </span>
                          ) : (
                            <span className="text-[#666]">Pending</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {section === "inspect" && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-bold text-[#ffd489] mb-1">Live Engine Telemetry & State</div>
            {Object.entries(inspectorData).map(([k, v]) => (
              <div key={k} className="flex justify-between items-center text-[10px] bg-[#181818] px-2 py-1 border border-[#333] rounded">
                <span className="text-[#888] font-mono">{k}</span>
                <span className="text-[#ffd489] font-mono font-bold">{String(v)}</span>
              </div>
            ))}
          </div>
        )}

        {section === "scenes" && (
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-[#ffd489]">Scene Import / Export</div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  const api = sRef.current || bridgeApi();
                  const doc = api?.sceneGet?.();
                  if (!doc) { setStatus("No scene doc"); return; }
                  const str = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(doc, null, 2));
                  const a = document.createElement("a");
                  a.href = str;
                  a.download = `scene-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
                  a.click();
                  setStatus("Exported scene.json");
                }}
                className="py-1.5 bg-[#2a2a2a] border border-[#555] hover:border-[#e0913a] text-[10px] font-bold"
              >
                📥 Download JSON
              </button>
              <label className="py-1.5 bg-[#2a2a2a] border border-[#555] hover:border-[#e0913a] text-[10px] font-bold text-center cursor-pointer">
                📤 Upload JSON
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const r = new FileReader();
                    r.onload = () => {
                      try {
                        const parsed = JSON.parse(String(r.result));
                        const api = sRef.current || bridgeApi();
                        const n = api?.sceneRestore?.(parsed);
                        setStatus(`Restored scene (${n} cells)`);
                        pullLogsAndState();
                      } catch (err) { setStatus(`Parse error: ${String(err)}`); }
                    };
                    r.readAsText(f);
                  }}
                />
              </label>
            </div>
          </div>
        )}

        {section === "sideload" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#ffd489] uppercase tracking-wider">Asset Sideloader & Linter</span>
              <span className="text-[9px] text-[#94a3b8]">{sideloadList.length} registered</span>
            </div>

            {/* Drag and Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (!file) return;
                const r = new FileReader();
                r.onload = () => {
                  try {
                    const parsed = JSON.parse(String(r.result));
                    let raw = parsed;
                    if (raw && raw.assets && Array.isArray(raw.assets)) raw = raw.assets[0];
                    let bp = raw;
                    if (raw && raw.palette && raw.dimensions) bp = specToBlueprint(raw);
                    const report = lintBlueprint(bp);
                    setSideloadDoc(bp);
                    setSideloadLint(report);
                    setStatus(`Loaded "${bp.name}" (${report.valid ? "VALID" : "INVALID"})`);
                  } catch (err) {
                    setStatus(`JSON Parse error: ${String(err)}`);
                  }
                };
                r.readAsText(file);
              }}
              className={`p-3 rounded-lg border-2 border-dashed transition-all text-center cursor-pointer ${
                isDragOver
                  ? "border-[#e0913a] bg-[#e0913a]/20 scale-[1.01]"
                  : "border-[#333d4d] bg-[#121720] hover:border-[#e0913a]/60 hover:bg-[#161d28]"
              }`}
            >
              <input
                type="file"
                accept=".json"
                id="sideload-file-input"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = new FileReader();
                  r.onload = () => {
                    try {
                      const parsed = JSON.parse(String(r.result));
                      let raw = parsed;
                      if (raw && raw.assets && Array.isArray(raw.assets)) raw = raw.assets[0];
                      let bp = raw;
                      if (raw && raw.palette && raw.dimensions) bp = specToBlueprint(raw);
                      const report = lintBlueprint(bp);
                      setSideloadDoc(bp);
                      setSideloadLint(report);
                      setStatus(`Loaded "${bp.name}" (${report.valid ? "VALID" : "INVALID"})`);
                    } catch (err) {
                      setStatus(`JSON Parse error: ${String(err)}`);
                    }
                  };
                  r.readAsText(f);
                }}
              />
              <label htmlFor="sideload-file-input" className="cursor-pointer block">
                <div className="text-xl mb-1">📦</div>
                <div className="text-[10.5px] font-bold text-[#e2e8f0]">
                  Drag & Drop <span className="text-[#ffd489]">.json</span> blueprint here
                </div>
                <div className="text-[9px] text-[#94a3b8] mt-0.5">
                  Supports BlueprintDoc or SemanticAssetSpec recipes
                </div>
              </label>
            </div>

            {/* Loaded Document Inspector & Actions */}
            {sideloadDoc && sideloadLint && (
              <div className="bg-[#10141d] border border-[#252e3d] rounded-lg p-2.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-[#ffd489] truncate">{sideloadDoc.name}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                    sideloadLint.valid ? "bg-emerald-950 text-emerald-300 border border-emerald-500/50" : "bg-red-950 text-red-300 border border-red-500/50"
                  }`}>
                    {sideloadLint.valid ? "✅ LINT PASS" : "❌ LINT FAIL"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-[9.5px]">
                  <div className="bg-[#181f2b] p-1.5 rounded border border-[#2b3545]">
                    <div className="text-[#64748b]">Voxels</div>
                    <div className="font-bold text-white">{sideloadDoc.totalBlocks || sideloadDoc.blocks?.length || 0}</div>
                  </div>
                  <div className="bg-[#181f2b] p-1.5 rounded border border-[#2b3545]">
                    <div className="text-[#64748b]">Dimensions</div>
                    <div className="font-bold text-white">{sideloadLint.dimensions.width}×{sideloadLint.dimensions.height}×{sideloadLint.dimensions.depth}</div>
                  </div>
                  <div className="bg-[#181f2b] p-1.5 rounded border border-[#2b3545]">
                    <div className="text-[#64748b]">Category</div>
                    <div className="font-bold text-white capitalize">{sideloadDoc.category || "house"}</div>
                  </div>
                </div>

                {sideloadLint.warnings.length > 0 && (
                  <div className="bg-yellow-950/40 border border-yellow-500/40 rounded p-1.5 text-[9px] text-yellow-200 space-y-0.5">
                    {sideloadLint.warnings.map((w, i) => <div key={i}>⚠️ {w}</div>)}
                  </div>
                )}

                {/* Actions */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      const api = sRef.current || bridgeApi();
                      if (api?.stampRun) {
                        const st = bridgeState();
                        const p = (st?.player as any) || { x: 8, y: 1, z: 8 };
                        const px = Math.floor(p.x);
                        const py = Math.floor(p.y);
                        const pz = Math.floor(p.z);
                        const ax = sideloadDoc.anchor?.ax || 0;
                        const ay = sideloadDoc.anchor?.ay || 0;
                        const az = sideloadDoc.anchor?.az || 0;

                        api.stampRun(`sideload_${sideloadDoc.name}`, (w) => {
                          for (const b of sideloadDoc.blocks) {
                            w(px + (b.dx - ax), py + (b.dy - ay), pz + (b.dz - az), b.id);
                          }
                        });
                        setStatus(`Stamped "${sideloadDoc.name}" (${sideloadDoc.blocks.length} voxels)!`);
                      }
                    }}
                    className="py-1.5 rounded bg-[#2fae3d]/30 border border-[#2fae3d]/70 text-[#a7f3d0] font-bold text-[10px] uppercase hover:brightness-125"
                  >
                    🧱 Stamp on Pad
                  </button>

                  <button
                    onClick={() => {
                      const rep = assetSideloader.registerBlueprint(sideloadDoc);
                      setSideloadList(assetSideloader.listBlueprints());
                      setStatus(rep.valid ? `Saved "${sideloadDoc.name}" to catalog!` : "Save failed validation");
                    }}
                    className="py-1.5 rounded bg-[#3b82f6]/30 border border-[#3b82f6]/70 text-[#bfdbfe] font-bold text-[10px] uppercase hover:brightness-125"
                  >
                    💾 Save to Catalog
                  </button>
                </div>
              </div>
            )}

            {/* Sideloaded Catalog List */}
            {sideloadList.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Registered Sideloaded Blueprints</div>
                <div className="space-y-1 max-h-[160px] overflow-y-auto pr-1">
                  {sideloadList.map((bp) => (
                    <div key={bp.id} className="flex items-center justify-between p-1.5 bg-[#141922] border border-[#263040] rounded text-[9.5px]">
                      <div className="truncate mr-2">
                        <div className="font-bold text-[#e2e8f0] truncate">{bp.name}</div>
                        <div className="text-[8.5px] text-[#64748b]">{bp.totalBlocks || bp.blocks?.length} voxels • {bp.packageName || "Default"}</div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <button
                          onClick={() => {
                            const api = sRef.current || bridgeApi();
                            if (api?.stampRun) {
                              const st = bridgeState();
                              const p = (st?.player as any) || { x: 8, y: 1, z: 8 };
                              const px = Math.floor(p.x);
                              const py = Math.floor(p.y);
                              const pz = Math.floor(p.z);
                              const ax = bp.anchor?.ax || 0;
                              const ay = bp.anchor?.ay || 0;
                              const az = bp.anchor?.az || 0;

                              api.stampRun(`stamp_${bp.name}`, (w) => {
                                for (const b of bp.blocks) {
                                  w(px + (b.dx - ax), py + (b.dy - ay), pz + (b.dz - az), b.id);
                                }
                              });
                              setStatus(`Stamped "${bp.name}"!`);
                            }
                          }}
                          className="px-2 py-0.5 rounded bg-[#2fae3d]/20 border border-[#2fae3d]/50 text-[#a7f3d0] font-bold hover:brightness-125"
                        >
                          Stamp
                        </button>
                        <button
                          onClick={() => {
                            assetSideloader.removeBlueprint(bp.id);
                            setSideloadList(assetSideloader.listBlueprints());
                            setStatus(`Removed "${bp.name}"`);
                          }}
                          className="px-1.5 py-0.5 rounded bg-red-900/20 border border-red-500/40 text-red-300 font-bold hover:brightness-125"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {section === "designer" && (
          <div className="space-y-2.5">
            {/* Designer Sub-Navigation Bar */}
            <div className="flex bg-[#121722] border border-[#252f40] rounded p-0.5 text-[9.5px]">
              {(["photos", "report", "recipe", "scene", "transform"] as const).map((sub) => (
                <button
                  key={sub}
                  onClick={() => setDesignerSubTab(sub)}
                  className={`flex-1 py-1 font-bold capitalize rounded transition-colors ${
                    designerSubTab === sub
                      ? "bg-[#e0913a] text-black font-extrabold"
                      : "text-[#94a3b8] hover:text-white"
                  }`}
                >
                  {sub === "photos" ? "📷 Photos" : sub === "report" ? "📋 Report" : sub === "recipe" ? "✏️ Recipe" : sub === "scene" ? "🏙️ Scene" : "🎯 Transform"}
                </button>
              ))}
            </div>

            {/* 1. Photos & Input Tab */}
            {designerSubTab === "photos" && (
              <div className="space-y-2.5">
                <div
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const files = Array.from(e.dataTransfer.files).slice(0, 3);
                    for (const f of files) {
                      try {
                        const down = await downscaleImage(f, 768, 0.85);
                        setUploadedPhotos((prev) => [...prev, { name: f.name, dataUrl: down.dataUrl }].slice(0, 3));
                        setStatus(`Added & compressed ${f.name} (${down.width}×${down.height})`);
                      } catch (err) {
                        setStatus(`Image error: ${String(err)}`);
                      }
                    }
                  }}
                  className="p-3 rounded-lg border-2 border-dashed border-[#333d4d] bg-[#10141d] hover:border-[#e0913a]/60 text-center cursor-pointer"
                >
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    id="designer-photo-input"
                    className="hidden"
                    onChange={async (e) => {
                      const files = Array.from(e.target.files || []).slice(0, 3);
                      for (const f of files) {
                        try {
                          const down = await downscaleImage(f, 768, 0.85);
                          setUploadedPhotos((prev) => [...prev, { name: f.name, dataUrl: down.dataUrl }].slice(0, 3));
                          setStatus(`Added & compressed ${f.name} (${down.width}×${down.height})`);
                        } catch (err) {
                          setStatus(`Image error: ${String(err)}`);
                        }
                      }
                    }}
                  />
                  <label htmlFor="designer-photo-input" className="cursor-pointer block">
                    <div className="text-xl mb-1">🖼️</div>
                    <div className="text-[10.5px] font-bold text-[#e2e8f0]">
                      Drop 2–3 reference photos here
                    </div>
                    <div className="text-[8.5px] text-[#64748b] mt-0.5">
                      Auto-downscaled to 768px for sub-3s Gemini vision turnaround
                    </div>
                  </label>
                </div>

                {/* Uploaded Thumbnails */}
                {uploadedPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5">
                    {uploadedPhotos.map((p, idx) => (
                      <div key={idx} className="relative group rounded border border-[#2b3545] overflow-hidden bg-black/40">
                        <img src={p.dataUrl} alt={p.name} className="w-full h-16 object-cover" />
                        <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5 text-[8px] text-white truncate font-mono">
                          {p.name}
                        </div>
                        <button
                          onClick={() => setUploadedPhotos((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-red-600/80 text-white text-[8px] flex items-center justify-center font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Scene Package Details */}
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-[#94a3b8]">Package Slug (/docs/...):</span>
                    <input
                      type="text"
                      value={packageSlug}
                      onChange={(e) => setPackageSlug(e.target.value)}
                      placeholder="e.g. san-andreas"
                      className="w-full px-2 py-1 bg-[#121720] border border-[#252f40] rounded text-[9.5px] text-white focus:outline-none focus:border-[#e0913a] font-mono"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-bold text-[#94a3b8]">Display Title:</span>
                    <input
                      type="text"
                      value={packageTitle}
                      onChange={(e) => setPackageTitle(e.target.value)}
                      placeholder="e.g. Grove Street Pack"
                      className="w-full px-2 py-1 bg-[#121720] border border-[#252f40] rounded text-[9.5px] text-white focus:outline-none focus:border-[#e0913a]"
                    />
                  </div>
                </div>

                {/* Text Intent Prompt */}
                <div className="space-y-1">
                  <span className="text-[9.5px] font-bold text-[#94a3b8]">Architectural Intent & Notes:</span>
                  <input
                    type="text"
                    value={designerIntent}
                    onChange={(e) => setDesignerIntent(e.target.value)}
                    placeholder="e.g. Grove Street 90s Craftsman House..."
                    className="w-full px-2 py-1.5 bg-[#121720] border border-[#252f40] rounded text-[10px] text-white focus:outline-none focus:border-[#e0913a]"
                  />
                </div>

                {/* Action 1: Save to /docs & Generate Master AI Prompt */}
                <button
                  disabled={isPackaging}
                  onClick={async () => {
                    setIsPackaging(true);
                    setStatus(`Staging package to /docs/${packageSlug}...`);
                    try {
                      const res = await fetch("/api/ai/package", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          slug: packageSlug,
                          title: packageTitle,
                          images: uploadedPhotos.map((p) => p.dataUrl),
                          notes: designerIntent
                        })
                      });
                      if (!res.ok) throw new Error(`Server returned ${res.status}`);
                      const data = await res.json();
                      setGeneratedPromptInfo(data);
                      setStatus(`✅ Created ${data.folder} with ${data.imageCount} photos + AI_PROMPT.md!`);
                    } catch (err) {
                      setStatus(`Package error: ${String(err)}`);
                    } finally {
                      setIsPackaging(false);
                    }
                  }}
                  className="w-full py-2 rounded bg-gradient-to-r from-[#2563eb] to-[#3b82f6] text-white font-extrabold text-[10.5px] uppercase tracking-wider hover:brightness-110 shadow disabled:opacity-50"
                >
                  {isPackaging ? "⏳ Staging Package & Generating Prompt..." : "📁 Save to /docs & Generate Master AI Prompt"}
                </button>

                {/* Generated Prompt Banner & Copy Box */}
                {generatedPromptInfo && (
                  <div className="p-2 bg-[#0d1520] border border-blue-500/40 rounded space-y-2">
                    <div className="flex items-center justify-between text-[9.5px]">
                      <span className="font-bold text-[#93c5fd]">
                        ✅ Staged in <code className="bg-blue-950 px-1 py-0.5 rounded text-blue-200">{generatedPromptInfo.folder}/</code>
                      </span>
                      <button
                        onClick={() => setShowPromptViewer(!showPromptViewer)}
                        className="text-[9px] text-blue-300 underline hover:text-white"
                      >
                        {showPromptViewer ? "Hide Prompt" : "View Prompt"}
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedPromptInfo.promptContent);
                        setCopiedPrompt(true);
                        setTimeout(() => setCopiedPrompt(false), 2500);
                        setStatus("📋 AI Prompt copied to clipboard!");
                      }}
                      className="w-full py-1.5 rounded bg-emerald-600/30 border border-emerald-500/60 text-emerald-300 font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 hover:bg-emerald-600/40"
                    >
                      {copiedPrompt ? "✅ Copied to Clipboard!" : "📋 Copy Master AI Prompt"}
                    </button>

                    {showPromptViewer && (
                      <textarea
                        readOnly
                        value={generatedPromptInfo.promptContent}
                        rows={6}
                        className="w-full p-1.5 bg-black/60 border border-[#2b3545] rounded text-[8.5px] font-mono text-[#cbd5e1] focus:outline-none"
                      />
                    )}
                  </div>
                )}

                {/* Action 2: Direct AI Recognition Run */}
                <button
                  disabled={isAnalyzingAI || uploadedPhotos.length === 0}
                  onClick={async () => {
                    setIsAnalyzingAI(true);
                    setStatus("Analyzing reference photos (param-spec → validated blueprint)...");
                    try {
                      const provider = async ({ images, intent, feedback }: { images: any[]; intent: string; feedback?: string }) => {
                        const res = await fetch("/api/ai/asset", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ images, intent, feedback })
                        });
                        if (!res.ok) throw new Error(`Bridge returned ${res.status}`);
                        const data = await res.json();
                        return { assets: data.assets || [], scene: data.scene || null, report: data.report || null };
                      };
                      const { report, scene, validations, allValid, retriesUsed } = await generateAssetsWithRetry(
                        provider,
                        { images: uploadedPhotos, intent: designerIntent }
                      );
                      setRecognitionReport(report);
                      setDesignerScene(scene);
                      setAssetValidations(validations);
                      setDesignerAssets(validations.map(v => v.spec));
                      // Always persist every lint-valid asset as a DB blueprint so it
                      // appears under the BLUEPRINTS button / blueprint modal & catalog.
                      const saved: string[] = [];
                      for (const v of validations) {
                        if (!v.valid || !v.blueprint) continue;
                        try {
                          const res = await apiSaveBlueprint(v.blueprint);
                          if (res?.ok) saved.push(v.blueprint.name);
                        } catch (err) {
                          console.warn(`[ai] save blueprint ${v.spec.id} failed`, err);
                        }
                      }
                      setDesignerSubTab("report");
                      const bad = validations.filter(v => !v.valid).length;
                      setStatus(
                        `AI Recognized ${validations.length} objects — ${allValid ? "all lint-valid ✅" : `${bad} need attention`} — ${saved.length} saved to Blueprints (spawn via BLUEPRINTS button) (retries: ${retriesUsed})`
                      );
                    } catch (err) {
                      setStatus(`AI Bridge error: ${String(err)}`);
                    } finally {
                      setIsAnalyzingAI(false);
                    }
                  }}
                  className="w-full py-1.5 rounded bg-[#1e293b] border border-[#334155] text-[#ffd489] font-bold text-[10px] uppercase hover:bg-[#2e3e55] shadow disabled:opacity-50"
                >
                  {isAnalyzingAI ? "⏳ Analyzing..." : "✨ Or Run Instant AI Recognition (In-Browser)"}
                </button>
              </div>
            )}

            {/* 2. Recognition Report Tab */}
            {designerSubTab === "report" && (
              <div className="space-y-2">
                {recognitionReport ? (
                  <>
                    <div className="bg-[#121722] border border-[#252f40] rounded p-2 space-y-1.5">
                      <div className="text-[10.5px] font-bold text-[#ffd489] flex items-center justify-between">
                        <span>{recognitionReport.sceneIntent}</span>
                        <span className="text-[8.5px] text-emerald-400 font-mono">LINKED PERSPECTIVES</span>
                      </div>
                      <div className="text-[9px] text-[#94a3b8]">
                        🔗 {recognitionReport.linkedPerspectives}
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Detected Assets in Scene</div>
                      <div className="space-y-1 max-h-[140px] overflow-y-auto">
                        {recognitionReport.detectedObjects?.map((obj: any) => (
                          <div key={obj.id} className="flex items-center justify-between p-1.5 bg-[#10141d] border border-[#222b3a] rounded text-[9.5px]">
                            <div className="font-bold text-[#e2e8f0] truncate">{obj.name}</div>
                            <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                              {obj.status || "ready"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      <button
                        onClick={() => setDesignerSubTab("recipe")}
                        className="py-1.5 rounded bg-[#3b82f6]/30 border border-[#3b82f6]/70 text-[#bfdbfe] font-bold text-[10px] uppercase hover:brightness-125"
                      >
                        ✏️ Edit Recipes
                      </button>
                      <button
                        onClick={() => setDesignerSubTab("scene")}
                        className="py-1.5 rounded bg-[#2fae3d]/30 border border-[#2fae3d]/70 text-[#a7f3d0] font-bold text-[10px] uppercase hover:brightness-125"
                      >
                        🏙️ Assemble Scene
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 text-[10px] text-[#64748b]">
                    No report yet. Upload reference photos in the Photos tab and click Run AI Recognition.
                  </div>
                )}
              </div>
            )}

            {/* 3. Object Recipe Editor Tab */}
            {designerSubTab === "recipe" && (
              <div className="space-y-2">
                {designerAssets.length > 0 ? (
                  (() => {
                    const curSpec = designerAssets[activeAssetIdx] || designerAssets[0];
                    const generatedDoc = specToBlueprint(curSpec);
                    const lint = lintBlueprint(generatedDoc);

                    return (
                      <div className="space-y-2">
                        {/* Asset Switcher */}
                        {designerAssets.length > 1 && (
                          <div className="flex gap-1 overflow-x-auto pb-1">
                            {designerAssets.map((a, idx) => (
                              <button
                                key={a.id}
                                onClick={() => setActiveAssetIdx(idx)}
                                className={`px-2 py-0.5 rounded text-[9px] font-bold truncate ${
                                  activeAssetIdx === idx ? "bg-[#e0913a] text-black" : "bg-[#18202c] text-[#94a3b8]"
                                }`}
                              >
                                {a.name}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="bg-[#10141d] border border-[#222b3a] rounded p-2 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#ffd489] text-[11px] truncate">{curSpec.name}</span>
                            <span className="text-[9px] font-bold text-emerald-400">
                              {generatedDoc.totalBlocks} voxels ({lint.dimensions.width}×{lint.dimensions.height}×{lint.dimensions.depth})
                            </span>
                          </div>

                          {/* Dimensions & Stories Sliders */}
                          <div className="grid grid-cols-3 gap-1.5 text-[9px]">
                            <div className="bg-[#161c27] p-1.5 rounded border border-[#283344]">
                              <div className="text-[#64748b]">Width: {curSpec.dimensions.width}</div>
                              <input
                                type="range"
                                min={5}
                                max={16}
                                value={curSpec.dimensions.width}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  setDesignerAssets((prev) => prev.map((a, i) => i === activeAssetIdx ? { ...a, dimensions: { ...a.dimensions, width: v } } : a));
                                }}
                                className="w-full h-1 accent-[#e0913a]"
                              />
                            </div>
                            <div className="bg-[#161c27] p-1.5 rounded border border-[#283344]">
                              <div className="text-[#64748b]">Depth: {curSpec.dimensions.depth}</div>
                              <input
                                type="range"
                                min={5}
                                max={16}
                                value={curSpec.dimensions.depth}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  setDesignerAssets((prev) => prev.map((a, i) => i === activeAssetIdx ? { ...a, dimensions: { ...a.dimensions, depth: v } } : a));
                                }}
                                className="w-full h-1 accent-[#e0913a]"
                              />
                            </div>
                            <div className="bg-[#161c27] p-1.5 rounded border border-[#283344]">
                              <div className="text-[#64748b]">Stories: {curSpec.dimensions.stories}</div>
                              <input
                                type="range"
                                min={1}
                                max={3}
                                value={curSpec.dimensions.stories}
                                onChange={(e) => {
                                  const v = Number(e.target.value);
                                  setDesignerAssets((prev) => prev.map((a, i) => i === activeAssetIdx ? { ...a, dimensions: { ...a.dimensions, stories: v } } : a));
                                }}
                                className="w-full h-1 accent-[#e0913a]"
                              />
                            </div>
                          </div>

                          {/* Materials Usage Table */}
                          <div className="space-y-1 pt-1">
                            <div className="text-[9.5px] font-bold text-[#94a3b8]">Materials Used Breakdown</div>
                            <div className="grid grid-cols-2 gap-1 max-h-[80px] overflow-y-auto pr-1">
                              {Object.entries(lint.materialsCount || {}).map(([mat, cnt]) => (
                                <div key={mat} className="flex justify-between bg-[#161c27] px-1.5 py-0.5 rounded text-[8.5px] border border-[#242e3e]">
                                  <span className="text-[#cbd5e1] truncate">{mat}</span>
                                  <span className="font-bold text-[#ffd489]">{String(cnt)}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Stamping and Saving */}
<div className="space-y-1">
                      <div className="text-[10px] font-bold text-[#94a3b8] uppercase tracking-wider">Validation & Lint Gate</div>
                      {assetValidations.length === 0 ? (
                        <div className="text-[9px] text-[#64748b] p-1.5">No assets validated yet.</div>
                      ) : (
                        <div className="space-y-1 max-h-[120px] overflow-y-auto">
                          {assetValidations.map((v) => (
                            <div key={v.spec.id} className="p-1.5 bg-[#10141d] border border-[#222b3a] rounded text-[9px] space-y-0.5">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#e2e8f0] truncate">{v.spec.name}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                  v.valid ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40" : "bg-red-950 text-red-300 border border-red-500/40"
                                }`}>
                                  {v.valid ? `✓ ${v.lint?.blockCount ?? 0} voxels` : "✗ INVALID"}
                                </span>
                              </div>
                              {v.valid && (v.lint?.warnings?.length ?? 0) > 0 && (
                                <div className="text-[8.5px] text-amber-300/90">⚠ {v.lint!.warnings.join(" · ")}</div>
                              )}
                              {!v.valid && (v.lint?.errors?.length ?? 0) > 0 && (
                                <div className="text-[8.5px] text-red-300/90">✗ {v.lint!.errors.join(" · ")}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                            <button
                              onClick={() => {
                                const api = sRef.current || bridgeApi();
                                if (api?.stampRun) {
                                  const ax = generatedDoc.anchor?.ax || 0;
                                  const ay = generatedDoc.anchor?.ay || 0;
                                  const az = generatedDoc.anchor?.az || 0;

                                  api.stampRun(`designer_${generatedDoc.name}`, (w) => {
                                    for (const b of generatedDoc.blocks) {
                                      w(4 + (b.dx - ax), 65 + (b.dy - ay), 4 + (b.dz - az), b.id);
                                    }
                                  });
                                  setStatus(`Stamped "${generatedDoc.name}" (${generatedDoc.totalBlocks} voxels)!`);
                                }
                              }}
                              className="py-1.5 rounded bg-[#2fae3d]/30 border border-[#2fae3d]/70 text-[#a7f3d0] font-bold text-[10px] uppercase hover:brightness-125"
                            >
                              🧱 Stamp on Pad
                            </button>
                            <button
                              onClick={async () => {
                                assetSideloader.registerBlueprint(generatedDoc);
                                setSideloadList(assetSideloader.listBlueprints());
                                try {
                                  const res = await apiSaveBlueprint(generatedDoc);
                                  setStatus(
                                    res?.ok
                                      ? `Saved "${generatedDoc.name}" to Blueprints catalog!`
                                      : `Saved locally ("${generatedDoc.name}" DB save failed)`
                                  );
                                } catch (err) {
                                  setStatus(`Blueprint save error: ${String(err)}`);
                                }
                              }}
                              className="py-1.5 rounded bg-[#3b82f6]/30 border border-[#3b82f6]/70 text-[#bfdbfe] font-bold text-[10px] uppercase hover:brightness-125"
                            >
                              💾 Save Blueprint
                            </button>
                            <button
                              onClick={() => {
                                try {
                                  downloadBlueprintLitematic(generatedDoc);
                                  setStatus(`📦 Exported "${generatedDoc.name}" as .litematic (drop into Litematica / MC)!`);
                                } catch (err) {
                                  setStatus(`Litematic export error: ${String(err)}`);
                                }
                              }}
                              className="py-1.5 rounded bg-[#8b5cf6]/30 border border-[#8b5cf6]/70 text-[#d8b4fe] font-bold text-[10px] uppercase hover:brightness-125"
                            >
                              📦 Export .litematic
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-center py-6 text-[10px] text-[#64748b]">
                    No recipe specs active. Run AI Recognition in the Photos tab to generate recipes.
                  </div>
                )}
              </div>
            )}

            {/* 4. Scene Assembly Tab */}
            {designerSubTab === "scene" && (
              <div className="space-y-2">
                {designerScene ? (
                  <div className="bg-[#10141d] border border-[#222b3a] rounded p-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#ffd489] text-[11px]">{designerScene.name}</span>
                      <span className="text-[9px] text-[#94a3b8]">{designerScene.layout?.length || 0} structures</span>
                    </div>

                    <div className="space-y-1 max-h-[130px] overflow-y-auto">
                      {designerScene.layout?.map((item: any, i: number) => (
                        <div key={i} className="flex justify-between items-center p-1.5 bg-[#161c27] rounded text-[9px] border border-[#263040]">
                          <span className="font-bold text-white truncate">{item.objectId}</span>
                          <span className="font-mono text-[#ffd489]">({item.x}, {item.z}) • {item.rot || 0}°</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={async () => {
                        const api = sRef.current || bridgeApi();
                        if (!api?.stampRun) return;
                        const bpById = new Map<string, any>();
                        for (const v of assetValidations) if (v.blueprint) bpById.set(v.blueprint.id, v.blueprint);
                        for (const b of sideloadList) if (b?.id) bpById.set(b.id, b);
                        const st = bridgeState();
                        const p = (st?.player as any) || { x: 8, y: 64, z: 8 };
                        const px = Math.floor(p.x);
                        const groundY = 64;
                        const pz = Math.floor(p.z);
                        let placed = 0;
                        try {
                          api.stampRun(`scene_${designerScene.name}`, (w) => {
                            for (const item of designerScene.layout || []) {
                              let bp = bpById.get(item.objectId);
                              if (!bp) {
                                // defer DB lookups (async) — stamp the rest sync, then fetch after
                                continue;
                              }
                              stampBlocksWithConformity(bp.blocks, px + item.x, groundY, pz + item.z, w);
                              placed++;
                            }
                          });
                        } catch (err) {
                          setStatus(`Scene stamp error: ${String(err)}`);
                          return;
                        }
                        // fetch any objects missing from the local maps (DB-backed blueprints)
                        for (const item of designerScene.layout || []) {
                          if (bpById.has(item.objectId)) continue;
                          try {
                            const bp = await apiGetBlueprint(item.objectId);
                            if (bp?.blocks) {
                              api.stampRun(`scene_${designerScene.name}_${item.objectId}`, (w) => {
                                stampBlocksWithConformity(bp.blocks, px + item.x, groundY, pz + item.z, w);
                              });
                              placed++;
                            }
                          } catch { /* not in DB */ }
                        }
                        setStatus(`Generated & Stamped "${designerScene.name}" (${placed} structures)!`);
                      }}
                      className="w-full py-2 rounded bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-extrabold text-[10.5px] uppercase tracking-wider hover:brightness-110 shadow"
                    >
                      🧱 Generate & Stamp Full Scene
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-6 text-[10px] text-[#64748b]">
                    No scene layout generated yet.
                  </div>
                )}
              </div>
            )}

            {/* 5. Transform / Marquee Tool */}
            {designerSubTab === "transform" && (
              <div className="bg-[#10141d] border border-[#222b3a] rounded p-2.5 space-y-2">
                <div className="text-[10px] font-bold text-[#ffd489] uppercase tracking-wider">Photoshop-Style Marquee Transform</div>
                <div className="text-[8.5px] text-[#94a3b8]">
                  Select an area or loaded blueprint to rotate 90° or translate coordinates in-world.
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      if (sideloadDoc) {
                        const rotated = rotateBlueprintDoc(sideloadDoc, 1);
                        setSideloadDoc(rotated);
                        setStatus(`Rotated "${rotated.name}" 90° clockwise!`);
                      } else {
                        setStatus("No blueprint selected to rotate");
                      }
                    }}
                    className="py-1.5 rounded bg-amber-600/30 border border-amber-500/70 text-amber-300 font-bold text-[10px] uppercase hover:brightness-125"
                  >
                    ⟳ Rotate 90° CW
                  </button>

                  <button
                    onClick={() => {
                      const api = sRef.current || bridgeApi();
                      const active = api?.toggleAreaSelect?.();
                      setAreaActive(!!active);
                      setStatus(active ? "Area Marquee Selection: ACTIVE" : "Area Marquee: Cleared");
                    }}
                    className={`py-1.5 rounded border text-[10px] font-bold uppercase hover:brightness-125 ${
                      areaActive ? "bg-red-600/30 border-red-500 text-red-300" : "bg-purple-600/30 border-purple-500 text-purple-200"
                    }`}
                  >
                    {areaActive ? "Clear Box" : "Box Marquee"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {status && <div className="pt-2 text-[#8dffb0] text-[10px] font-mono truncate">{status}</div>}
      </div>

      {/* Footer Log Tail */}
      <div className="h-9 overflow-auto border-t border-[#333] px-2 py-1 text-[9px] leading-tight text-[#cfe2f0]/60 shrink-0 bg-[#0d0d0d]">
        {logs.map((l, i) => <div key={i}>{l}</div>)}
      </div>
    </div>
  );
};
