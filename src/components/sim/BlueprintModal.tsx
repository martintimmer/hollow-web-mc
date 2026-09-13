import React, { useState, useEffect, useMemo } from "react";
import type { BlueprintDoc, ScanOptions } from "../../sim/blueprintScanner";
import { apiGetBlueprints, apiSaveBlueprint, apiDeleteBlueprint, apiGetBlueprint } from "../../services/api";
import { downloadBlueprintLitematic, downloadBlueprintSchematic, parseSchematicJSON } from "../../sim/schematics";

interface BlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanAndSave: (opts: ScanOptions) => Promise<BlueprintDoc | null>;
  onStampBlueprint: (doc: BlueprintDoc) => void;
  onLoadPreset?: (styleKey: string) => void;
  showToast: (msg: string) => void;
}

const STARTER_PRESETS = [
  { key: "cottage", name: "Cozy Cottage", icon: "🏡", desc: "Classic 7x7 single-story oak plank home with cobblestone gable roof and glass windows.", size: "7x7 • 1 Story", wall: "Oak Planks", roof: "Cobblestone" },
  { key: "forge", name: "Blacksmith Forge", icon: "⚒️", desc: "8x8 Stone Brick workshop with exterior lava basin, anvil station, chimney, and iron bars.", size: "8x8 • 1 Story", wall: "Cobblestone", roof: "Stone Bricks" },
  { key: "townhouse", name: "2-Story Townhouse", icon: "🏬", desc: "7x7 Multi-floor residence with wooden staircase, second-story balcony, and carpeted floors.", size: "7x7 • 2 Stories", wall: "Oak Planks", roof: "Cobblestone" },
  { key: "library", name: "Village Library", icon: "📚", desc: "8x8 Two-story knowledge hall with floor-to-ceiling bookshelves, reading desks, and hip roof.", size: "8x8 • 2 Stories", wall: "Stone Bricks", roof: "Oak Planks" },
  { key: "tavern", name: "Medieval Tavern", icon: "🍺", desc: "9x9 Spacious inn with stone hearth fireplace, dining tables, bar stools, and guest rooms.", size: "9x9 • 2 Stories", wall: "Dark Oak / Brick", roof: "Cobblestone" },
  { key: "watchtower", name: "Stone Watchtower", icon: "🗼", desc: "6x6 Three-story defensive outpost with spiral ascent ladder and crenelated archer battlement.", size: "6x6 • 3 Stories", wall: "Stone Bricks", roof: "Battlement" },
  { key: "manor", name: "Grand Manor", icon: "🏰", desc: "10x10 Three-story luxury estate with grand entrance, multiple bedrooms, and red carpets.", size: "10x10 • 3 Stories", wall: "Oak Planks", roof: "Terracotta" },
  { key: "cathedral", name: "Gothic Cathedral", icon: "⛪", desc: "9x9 Soaring four-story basilica with central nave, tall spire, stained glass, and altar.", size: "9x9 • 4 Stories", wall: "Stone Bricks", roof: "Spire" }
];

const CATEGORIES: Array<BlueprintDoc["category"]> = [
  "house",
  "tower",
  "castle",
  "farm",
  "bridge",
  "shrine",
  "misc"
];

const PACKAGE_PRESETS = [
  "Nordic Village",
  "Medieval Town",
  "Townhouse Series",
  "Modern Architecture",
  "Castle & Forts",
  "Farms & Wilderness",
  "Custom Collection"
];

const BIOMES = [
  "plains",
  "forest",
  "taiga",
  "desert",
  "mountains",
  "swamp",
  "ocean"
];

export const BlueprintModal: React.FC<BlueprintModalProps> = ({
  isOpen,
  onClose,
  onScanAndSave,
  onStampBlueprint,
  onLoadPreset,
  showToast
}) => {
  const [tab, setTab] = useState<"presets" | "save" | "library" | "import">("presets");
  const [name, setName] = useState("");
  const [packageName, setPackageName] = useState("Nordic Village");
  const [author, setAuthor] = useState("Player");
  const [category, setCategory] = useState<BlueprintDoc["category"]>("house");
  const [selectedBiomes, setSelectedBiomes] = useState<string[]>(["plains", "forest"]);
  const [spawnNaturally, setSpawnNaturally] = useState(true);
  const [saving, setSaving] = useState(false);

  const [blueprints, setBlueprints] = useState<any[]>([]);
  const [selectedPackageFilter, setSelectedPackageFilter] = useState<string>("ALL");
  const [loadingList, setLoadingList] = useState(false);
  const [importJson, setImportJson] = useState("");

  const areaBounds = useMemo(() => {
    if (!isOpen) return null;
    const api = (window as any).__sim?.api;
    return api?.getAreaBounds ? api.getAreaBounds() : null;
  }, [isOpen, tab]);

  const refreshList = async () => {
    setLoadingList(true);
    try {
      const list = await apiGetBlueprints();
      setBlueprints(list);
    } catch {
      setBlueprints([]);
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshList();
    }
  }, [isOpen]);

  const uniquePackages = useMemo(() => {
    const pkgs = new Set<string>();
    for (const b of blueprints) {
      if (b.package_name) pkgs.add(b.package_name);
    }
    return Array.from(pkgs);
  }, [blueprints]);

  const filteredBlueprints = useMemo(() => {
    if (selectedPackageFilter === "ALL") return blueprints;
    return blueprints.filter(b => (b.package_name || "Default Package") === selectedPackageFilter);
  }, [blueprints, selectedPackageFilter]);

  if (!isOpen) return null;

  const toggleBiome = (biome: string) => {
    setSelectedBiomes(prev =>
      prev.includes(biome) ? prev.filter(b => b !== biome) : [...prev, biome]
    );
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("Please enter a structure name");
      return;
    }

    setSaving(true);
    try {
      const scanned = await onScanAndSave({
        name: name.trim(),
        author: author.trim() || "Player",
        category,
        packageName: packageName.trim() || "Default Package",
        biomeAffinity: selectedBiomes.length > 0 ? selectedBiomes : ["plains"],
        spawnNaturally
      });

      if (!scanned) {
        showToast("No structure found on pad / selected area");
        setSaving(false);
        return;
      }

      await apiSaveBlueprint(scanned);
      showToast(`💾 Blueprint "${scanned.name}" saved to Package "${scanned.packageName || packageName}"!`);
      setName("");
      setTab("library");
      refreshList();
    } catch (err) {
      showToast(`Save failed: ${String(err)}`);
    } finally {
      setSaving(false);
    }
  };

  const handleStamp = async (bpMeta: any) => {
    try {
      const fullDoc = await apiGetBlueprint(bpMeta.id);
      if (fullDoc) {
        onStampBlueprint(fullDoc);
        showToast(`🏗️ Spawned "${fullDoc.name}"!`);
        onClose();
      } else {
        showToast("Failed to load blueprint payload");
      }
    } catch {
      showToast("Stamp error");
    }
  };

  const handleDelete = async (id: string, bpName: string) => {
    if (!confirm(`Delete blueprint "${bpName}"?`)) return;
    await apiDeleteBlueprint(id);
    showToast(`Deleted "${bpName}"`);
    refreshList();
  };

  const handleExportJson = async (bpMeta: any) => {
    try {
      const fullDoc = await apiGetBlueprint(bpMeta.id);
      if (!fullDoc) {
        showToast("Could not export blueprint");
        return;
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullDoc, null, 2));
      const dlAnchor = document.createElement("a");
      dlAnchor.setAttribute("href", dataStr);
      dlAnchor.setAttribute("download", `${fullDoc.name.toLowerCase().replace(/\s+/g, "_")}.blueprint.json`);
      dlAnchor.click();
      showToast(`📥 Exported ${fullDoc.name}.json`);
    } catch {
      showToast("Export failed");
    }
  };

  const handleExportLitematic = async (bpMeta: any) => {
    try {
      const fullDoc = await apiGetBlueprint(bpMeta.id);
      if (!fullDoc) {
        showToast("Could not export litematic");
        return;
      }
      downloadBlueprintLitematic(fullDoc);
      showToast(`📦 Exported ${fullDoc.name}.litematic!`);
    } catch (e) {
      showToast(`Litematic export failed: ${String(e)}`);
    }
  };

  const handleExportSchematic = async (bpMeta: any) => {
    try {
      const fullDoc = await apiGetBlueprint(bpMeta.id);
      if (!fullDoc) {
        showToast("Could not export schematic");
        return;
      }
      downloadBlueprintSchematic(fullDoc);
      showToast(`📜 Exported ${fullDoc.name}.schem.json!`);
    } catch (e) {
      showToast(`Schematic export failed: ${String(e)}`);
    }
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const parsed = parseSchematicJSON(importJson) || JSON.parse(importJson);
      if (!parsed.id || !parsed.blocks) {
        showToast("Invalid blueprint/schematic JSON format");
        return;
      }
      await apiSaveBlueprint(parsed);
      showToast(`Imported "${parsed.name || "Blueprint"}"!`);
      setImportJson("");
      setTab("library");
      refreshList();
    } catch {
      showToast("JSON parsing error");
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 select-none">
      <div className="relative w-full max-w-[620px] rounded-xl border-2 border-[#e9e0cb]/30 bg-[#161b22] text-[#e9e0cb] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-black/40">
          <div className="flex items-center gap-2">
            <span className="text-xl">📐</span>
            <span className="font-bold tracking-wide text-sm text-[#e0913a] uppercase">
              Blueprints & Worldgen Studio
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded hover:bg-white/10 flex items-center justify-center text-sm font-bold text-white/70 hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-black/20 text-xs font-bold">
          <button
            onClick={() => setTab("presets")}
            className={`flex-1 py-2.5 text-center transition-colors ${
              tab === "presets"
                ? "bg-[#e0913a]/20 text-[#e0913a] border-b-2 border-[#e0913a]"
                : "text-white/60 hover:text-white"
            }`}
          >
            🏛️ Starter Templates (8)
          </button>
          <button
            onClick={() => setTab("save")}
            className={`flex-1 py-2.5 text-center transition-colors ${
              tab === "save"
                ? "bg-[#e0913a]/20 text-[#e0913a] border-b-2 border-[#e0913a]"
                : "text-white/60 hover:text-white"
            }`}
          >
            💾 Capture Stage
          </button>
          <button
            onClick={() => {
              setTab("library");
              refreshList();
            }}
            className={`flex-1 py-2.5 text-center transition-colors ${
              tab === "library"
                ? "bg-[#e0913a]/20 text-[#e0913a] border-b-2 border-[#e0913a]"
                : "text-white/60 hover:text-white"
            }`}
          >
            📚 Library ({blueprints.length})
          </button>
          <button
            onClick={() => setTab("import")}
            className={`flex-1 py-2.5 text-center transition-colors ${
              tab === "import"
                ? "bg-[#e0913a]/20 text-[#e0913a] border-b-2 border-[#e0913a]"
                : "text-white/60 hover:text-white"
            }`}
          >
            📥 Import JSON
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 text-xs">
          {tab === "presets" && (
            <div className="flex flex-col gap-3">
              <div className="rounded-lg bg-black/30 p-3 border border-white/10">
                <div className="font-bold text-[#e0913a] mb-1">
                  🏛️ Load Architectural Template onto Stage
                </div>
                <p className="text-white/70 leading-relaxed">
                  Select any vanilla architectural structure to spawn it onto the flat-pad builder stage.
                  Fly around in Creative Mode, modify blocks, swap materials, and capture your custom variant!
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {STARTER_PRESETS.map(preset => (
                  <div
                    key={preset.key}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg bg-black/40 border border-white/10 hover:border-[#e0913a]/50 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl p-2 rounded-lg bg-black/40 border border-white/10">{preset.icon}</span>
                      <div>
                        <div className="font-bold text-white text-[13px] flex items-center gap-2">
                          <span>{preset.name}</span>
                          <span className="text-[10px] font-mono font-normal text-[#e0913a] px-1.5 py-0.5 rounded bg-[#e0913a]/10 border border-[#e0913a]/20">{preset.size}</span>
                        </div>
                        <div className="text-white/60 text-[11px] mt-0.5 max-w-[360px] leading-tight">
                          {preset.desc}
                        </div>
                        <div className="text-[10px] text-white/40 mt-1 flex gap-3">
                          <span>Wall: <strong className="text-white/70">{preset.wall}</strong></span>
                          <span>Roof: <strong className="text-white/70">{preset.roof}</strong></span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (onLoadPreset) onLoadPreset(preset.key);
                        onClose();
                      }}
                      className="py-2 px-3.5 rounded font-bold bg-[#e0913a] text-black hover:bg-[#e89d47] active:scale-95 transition-all text-xs flex items-center gap-1.5 shadow-md flex-shrink-0"
                    >
                      <span>🏗️</span>
                      <span>Load to Stage</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "save" && (
            <form onSubmit={handleSaveSubmit} className="flex flex-col gap-4">
              {/* 3D Selection Bounding Box Status */}
              {areaBounds ? (
                <div className="rounded-lg bg-[#e0913a]/15 p-3.5 border-2 border-[#e0913a]/60 flex flex-col gap-1.5">
                  <div className="font-bold text-[#ffea00] flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5">
                      <span>📐</span>
                      <span>Active 3D Yellow Bounding Box Target</span>
                    </span>
                    <span className="px-2 py-0.5 rounded bg-[#ffea00]/20 text-[#ffea00] font-mono text-[11px]">
                      {areaBounds.width} × {areaBounds.height} × {areaBounds.depth} ({areaBounds.totalBlocks} voxels)
                    </span>
                  </div>
                  <div className="text-[11px] text-white/80 font-mono">
                    Coords: X: [{areaBounds.x0} .. {areaBounds.x1}], Y: [{areaBounds.y0} .. {areaBounds.y1}], Z: [{areaBounds.z0} .. {areaBounds.z1}]
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const api = (window as any).__sim?.api;
                        if (api?.toggleAreaSelect) api.toggleAreaSelect(true);
                        showToast("📐 Click Point 1 (Left) & Point 2 (Right) on stage blocks");
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded bg-black/40 border border-white/20 hover:border-white/50 text-[11px] text-white"
                    >
                      📐 Re-Pick in 3D
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const api = (window as any).__sim?.api;
                        if (api?.clearAreaSelect) api.clearAreaSelect();
                        showToast("Reset to full stage scan");
                      }}
                      className="px-2.5 py-1 rounded bg-black/40 border border-white/20 hover:border-white/50 text-[11px] text-white/70"
                    >
                      🧹 Clear (Scan Full Pad)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-black/30 p-3.5 border border-white/10 flex flex-col gap-2">
                  <div className="font-bold text-[#e0913a] flex items-center justify-between">
                    <span>1. Area Target: Entire Stage (y ≥ 64)</span>
                    <button
                      type="button"
                      onClick={() => {
                        const api = (window as any).__sim?.api;
                        if (api?.toggleAreaSelect) api.toggleAreaSelect(true);
                        showToast("📐 3D Area Select active: Click Point 1 & Point 2 on blocks");
                        onClose();
                      }}
                      className="px-2.5 py-1 rounded bg-[#e0913a] text-black font-bold text-[11px] hover:bg-[#e89d47]"
                    >
                      📐 Select 3D Yellow Box
                    </button>
                  </div>
                  <p className="text-white/70 leading-relaxed text-[11px]">
                    No 3D sub-box is selected. The scanner will capture all blocks built on the stage.
                    Or click <strong>"Select 3D Yellow Box"</strong> to isolate a specific building!
                  </p>
                </div>
              )}

              {/* Building Name */}
              <div>
                <label className="block font-bold text-white/80 mb-1">
                  Building / Structure Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Nordic Longhouse, Watchtower Alpha, Forge Workshop"
                  className="w-full rounded bg-black/50 border border-white/20 px-3 py-2 text-white focus:border-[#e0913a] outline-none"
                  required
                />
              </div>

              {/* Package / Collection Group */}
              <div>
                <label className="block font-bold text-white/80 mb-1">
                  📦 Assign to Package / Catalog Collection
                </label>
                <input
                  type="text"
                  value={packageName}
                  onChange={e => setPackageName(e.target.value)}
                  placeholder="e.g. Nordic Village, Medieval Pack, Modern City"
                  className="w-full rounded bg-black/50 border border-white/20 px-3 py-1.5 text-white focus:border-[#e0913a] outline-none mb-1.5"
                />
                <div className="flex flex-wrap gap-1.5">
                  {PACKAGE_PRESETS.map(pkg => (
                    <button
                      type="button"
                      key={pkg}
                      onClick={() => setPackageName(pkg)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                        packageName === pkg
                          ? "bg-[#e0913a] text-black border-[#e0913a]"
                          : "bg-black/40 text-white/60 border-white/10 hover:border-white/30"
                      }`}
                    >
                      {pkg}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-white/80 mb-1">
                    Author
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={e => setAuthor(e.target.value)}
                    className="w-full rounded bg-black/50 border border-white/20 px-3 py-1.5 text-white focus:border-[#e0913a] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-white/80 mb-1">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full rounded bg-black/50 border border-white/20 px-3 py-1.5 text-white focus:border-[#e0913a] outline-none"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>
                        {c.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-white/80 mb-1.5">
                  Biome Affinity (Where should it spawn naturally?)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {BIOMES.map(b => {
                    const active = selectedBiomes.includes(b);
                    return (
                      <button
                        type="button"
                        key={b}
                        onClick={() => toggleBiome(b)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors ${
                          active
                            ? "bg-[#e0913a] text-black border-[#e0913a]"
                            : "bg-black/40 text-white/60 border-white/10 hover:border-white/30"
                        }`}
                      >
                        {b.toUpperCase()}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="spawn_worldgen"
                  checked={spawnNaturally}
                  onChange={e => setSpawnNaturally(e.target.checked)}
                  className="rounded bg-black border-white/30 text-[#e0913a] focus:ring-0"
                />
                <label
                  htmlFor="spawn_worldgen"
                  className="text-white/80 font-bold cursor-pointer"
                >
                  🌲 Spawn naturally in procedural world generation
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-2 w-full py-2.5 rounded-lg font-bold bg-[#e0913a] hover:bg-[#e89d47] text-black shadow-lg hover:shadow-orange-500/20 active:scale-[0.98] transition-all disabled:opacity-50 text-xs"
              >
                {saving ? "Capturing & Saving..." : "💾 Save Blueprint to Package & Catalog"}
              </button>
            </form>
          )}

          {tab === "library" && (
            <div className="flex flex-col gap-3">
              {/* Package Filter Bar */}
              <div className="flex items-center justify-between bg-black/30 p-2.5 rounded-lg border border-white/10">
                <div className="text-white/70 font-bold">Filter by Package:</div>
                <select
                  value={selectedPackageFilter}
                  onChange={e => setSelectedPackageFilter(e.target.value)}
                  className="bg-black/60 border border-white/20 rounded px-2.5 py-1 text-white text-xs outline-none"
                >
                  <option value="ALL">📦 All Packages ({blueprints.length})</option>
                  {uniquePackages.map(pkg => (
                    <option key={pkg} value={pkg}>
                      📁 {pkg}
                    </option>
                  ))}
                </select>
              </div>

              {loadingList && (
                <div className="text-center py-6 text-white/50">
                  Loading saved blueprints...
                </div>
              )}
              {!loadingList && filteredBlueprints.length === 0 && (
                <div className="text-center py-8 text-white/50">
                  No blueprints found in this package. Build something on stage, pick a 3D yellow box, and save it!
                </div>
              )}

              {filteredBlueprints.map(bp => (
                <div
                  key={bp.id}
                  className="flex items-center justify-between rounded-lg bg-black/40 border border-white/10 p-3 hover:border-white/20 transition-colors"
                >
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">
                        {bp.name}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-[10px] text-blue-300 font-bold">
                        📁 {bp.package_name || "Default Package"}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] uppercase text-[#e0913a]">
                        {bp.category}
                      </span>
                      {bp.spawn_naturally && (
                        <span className="px-1.5 py-0.5 rounded bg-green-500/20 text-[10px] text-green-400">
                          🌲 Worldgen
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-white/60">
                      By <strong>{bp.author}</strong> · Dimensions: <strong>{bp.width}×{bp.height}×{bp.depth}</strong> ({bp.total_blocks} voxels)
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleStamp(bp)}
                      className="px-3 py-1.5 rounded bg-[#e0913a] hover:bg-[#e89d47] text-black font-bold text-xs transition-colors flex items-center gap-1"
                      title="Spawn structure in front of player / on stage"
                    >
                      <span>🏗️</span>
                      <span>Spawn</span>
                    </button>
                    <button
                      onClick={() => handleExportJson(bp)}
                      className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors"
                      title="Export Blueprint JSON file"
                    >
                      📥
                    </button>
                    <button
                      onClick={() => handleExportLitematic(bp)}
                      className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors font-mono"
                      title="Export Minecraft .litematic schematic"
                    >
                      📦
                    </button>
                    <button
                      onClick={() => handleExportSchematic(bp)}
                      className="p-1.5 rounded hover:bg-white/10 text-white/70 hover:text-white text-xs transition-colors font-mono"
                      title="Export .schem schematic file"
                    >
                      📜
                    </button>
                    <button
                      onClick={() => handleDelete(bp.id, bp.name)}
                      className="p-1.5 rounded hover:bg-red-500/20 text-red-400 hover:text-red-300 text-xs transition-colors"
                      title="Delete Blueprint"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === "import" && (
            <form onSubmit={handleImportSubmit} className="flex flex-col gap-3">
              <label className="block font-bold text-white/80">
                Paste Blueprint JSON Payload:
              </label>
              <textarea
                value={importJson}
                onChange={e => setImportJson(e.target.value)}
                placeholder='{ "id": "bp_...", "name": "Castle", "blocks": [...] }'
                rows={8}
                className="w-full rounded bg-black/50 border border-white/20 p-3 font-mono text-[11px] text-white focus:border-[#e0913a] outline-none"
                required
              />
              <button
                type="submit"
                className="w-full py-2 rounded-lg font-bold bg-[#e0913a] text-black hover:bg-[#e89d47] transition-all"
              >
                📥 Import & Register Blueprint
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
