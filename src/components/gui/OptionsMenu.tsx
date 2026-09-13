import React from "react";
import type { User, WorldMeta } from "../../services/api";
import { playTabSwitch } from "../../game/sfx";
import type { MeteringMode } from "../../game/engine/lightMeter";
import type { ExposureModel } from "../../game/engine/lightMeter";
import { fovToMM } from "../../game/engine/lightMeter";

export type MenuTab = "video" | "lighting" | "audio" | "gameplay" | "world" | "generator" | "account";

export interface OptionsMenuProps {
  isOpen: boolean;
  loading: boolean;
  menuTab: MenuTab;
  setMenuTab: (tab: MenuTab) => void;
  qualityPreset: "smooth" | "balanced" | "beautiful";
  onApplyPreset: (preset: "smooth" | "balanced" | "beautiful") => void;
  weather: "clear" | "cloudy" | "overcast";
  setWeather: (val: "clear" | "cloudy" | "overcast") => void;
  renderDistance: number;
  setRenderDistance: (val: number) => void;
  vibrance: number;
  setVibrance: (val: number) => void;
  brightness: number;
  setBrightness: (val: number) => void;
  contrast: number;
  setContrast: (val: number) => void;
  fov: number;
  setFov: (val: number) => void;
  ev: number;
  setEv: (val: number) => void;
  metering: MeteringMode;
  setMetering: (val: MeteringMode) => void;
  exposureModel: ExposureModel;
  onApplyLegacyExposure: () => void;
  onApplyIsoExposure: () => void;
  evComp: number;
  setEvComp: (val: number) => void;
  maxFps: number;
  setMaxFps: (val: number) => void;
  detectedHz: number;
  soundOn: boolean;
  setSoundOn: (val: boolean) => void;
  volume: number;
  setVolume: (val: number) => void;
  musicOn: boolean;
  setMusicOn: (val: boolean) => void;
  musicVolume: number;
  setMusicVolume: (val: number) => void;
  onPlayAmbientTheme: () => void;
  unlockAudio: () => void;
  shadows: boolean;
  setShadows: (val: boolean) => void;
  shadowTier: "basic" | "detailed" | "advanced";
  setShadowTier: (val: "basic" | "detailed" | "advanced") => void;
  setShadowTierOverridden: (v: boolean) => void;
  dof: boolean;
  setDof: (val: boolean) => void;
  dofStrength: number;
  setDofStrength: (val: number) => void;
  ca: boolean;
  setCa: (val: boolean) => void;
  caStrength: number;
  setCaStrength: (val: number) => void;
  colorGamut: string;
  setColorGamut: (val: string) => void;
  bokeh: boolean;
  setBokeh: (val: boolean) => void;
  specular: boolean;
  setSpecular: (val: boolean) => void;
  specularStrength: number;
  setSpecularStrength: (val: number) => void;
  creative: boolean;
  setCreative: (val: boolean) => void;
  gameplayMode: "peaceful" | "survival" | "hardcore";
  setGameplayMode: (val: "peaceful" | "survival" | "hardcore") => void;
  autoStep: boolean;
  setAutoStep: (val: boolean) => void;
  touchControls: boolean;
  setTouchControls: (val: boolean) => void;
  worldTime: number;
  setWorldTime: (val: number) => void;
  timeFormatted: string;
  timeFlow: boolean;
  setTimeFlow: (val: boolean) => void;
  timeSpeed: number;
  setTimeSpeed: (val: number) => void;
  seedText: string;
  setSeedText: (val: string) => void;
  worldType: string;
  setWorldType: (val: string) => void;
  currentUser: User | null;
  activeWorld: WorldMeta | null;
  onRegenerateVillage: () => void;
  onRebuildWorld: () => void;
  onOpenAuditLogs: () => void;
  onWorldSelection: () => void;
  onLogout: () => void;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const OptionsMenu: React.FC<OptionsMenuProps> = ({
  isOpen,
  loading,
  menuTab,
  setMenuTab,
  qualityPreset,
  onApplyPreset,
  weather,
  setWeather,
  renderDistance,
  setRenderDistance,
  vibrance,
  setVibrance,
  brightness,
  setBrightness,
  contrast,
  setContrast,
  fov,
  setFov,
  ev,
  setEv,
  metering,
  setMetering,
  exposureModel,
  onApplyLegacyExposure,
  onApplyIsoExposure,
  evComp,
  setEvComp,
  maxFps,
  setMaxFps,
  detectedHz,
  soundOn,
  setSoundOn,
  volume,
  setVolume,
  musicOn,
  setMusicOn,
  musicVolume,
  setMusicVolume,
  onPlayAmbientTheme,
  unlockAudio,
  shadows,
  setShadows,
  shadowTier,
  setShadowTier,
  setShadowTierOverridden,
  dof,
  setDof,
  dofStrength,
  setDofStrength,
  ca,
  setCa,
  caStrength,
  setCaStrength,
  colorGamut,
  setColorGamut,
  bokeh,
  setBokeh,
  specular,
  setSpecular,
  specularStrength,
  setSpecularStrength,
  creative,
  setCreative,
  gameplayMode,
  setGameplayMode,
  autoStep,
  setAutoStep,
  touchControls,
  setTouchControls,
  worldTime,
  setWorldTime,
  timeFormatted,
  timeFlow,
  setTimeFlow,
  timeSpeed,
  setTimeSpeed,
  seedText,
  setSeedText,
  currentUser,
  activeWorld,
  onRegenerateVillage,
  onRebuildWorld,
  onOpenAuditLogs,
  onWorldSelection,
  onLogout,
  onClose,
  showToast
}) => {
  if (!isOpen || loading) return null;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-black/70 select-none">
      {/* Bedrock-style header strip */}
      <div className="flex items-center px-3 h-11 bg-[#c9c9c9] shadow-[0_2px_0_#7a7a7a]">
        <button onClick={onClose} className="w-9 h-9 grid place-items-center text-xl font-bold text-[#373737] hover:brightness-125" aria-label="Back">
          ‹
        </button>
        <div className="flex-1 text-center text-[15px] font-bold uppercase tracking-[0.35em] text-[#373737]">
          Settings
        </div>
        <div className="w-9" />
      </div>

      <div className="flex-1 min-h-0 flex">
        {/* Bedrock sidebar */}
        <aside className="w-[236px] shrink-0 bg-[#1e1e1e] overflow-y-auto py-2 px-1.5">
          {([
            { id: "video" as const, icon: "🖥️", label: "Video", group: "General" },
            { id: "lighting" as const, icon: "💡", label: "Lighting", group: "General" },
            { id: "audio" as const, icon: "🔊", label: "Audio & Music", group: "General" },
            { id: "gameplay" as const, icon: "🎮", label: "Gameplay", group: "General" },
            { id: "world" as const, icon: "☀️", label: "World & Time", group: "General" },
            { id: "generator" as const, icon: "🌍", label: "World Gen", group: "General" },
            { id: "account" as const, icon: "👤", label: "Account", group: "General" }
          ] as Array<{ id: MenuTab; icon: string; label: string; group: string }>).map((tab, idx, arr) => {
            const showGroup = idx === 0 || arr[idx - 1].group !== tab.group;
            const selected = menuTab === tab.id;
            return (
              <div key={tab.id}>
                {showGroup && (
                  <div className="be-hairline-t my-1.5 pt-1.5 text-[10px] uppercase tracking-widest text-[#8d8d8d] pl-2">{tab.group}</div>
                )}
                <button
                  onClick={() => { setMenuTab(tab.id); playTabSwitch(); }}
                  className={`w-full flex items-center gap-2.5 px-2 py-[7px] text-left text-[13px] font-semibold transition-colors ${
                    selected ? "bg-[#4c4c4c] text-white be-left-tick" : "text-[#d8d8d8] hover:bg-[#333333]"
                  }`}
                >
                  <span className="be-icon-box">{tab.icon}</span>
                  {tab.label}
                </button>
              </div>
            );
          })}
        </aside>

        {/* Content pane */}
        <div className="flex-1 min-w-0 flex flex-col bg-[#131313]">
          <div className="flex-1 overflow-y-auto p-4 mc-slot bg-transparent space-y-3">
          
          {/* TAB 1: VIDEO SETTINGS */}
          {menuTab === "video" && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-[#FFFFA0] uppercase tracking-wider mb-2">Video & Display Settings</div>
              
              {/* Quick Quality Presets */}
              <div className="bg-[#222222] p-2 rounded border border-[#555555]/60 shadow-inner">
                <div className="text-[11px] font-bold text-[#FFFFA0] uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Performance & Quality Presets:</span>
                  <span className="text-gray-400 capitalize">{qualityPreset} Mode</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  <button
                    onClick={() => onApplyPreset("smooth")}
                    className={`py-1.5 px-2 text-xs font-bold transition-colors ${
                      qualityPreset === "smooth"
                        ? "bg-green-700/80 text-white border-2 border-green-400 shadow-md"
                        : "mc-btn text-gray-200 hover:text-white"
                    }`}
                  >
                    ⚡ Smooth (Max FPS)
                  </button>
                  <button
                    onClick={() => onApplyPreset("balanced")}
                    className={`py-1.5 px-2 text-xs font-bold transition-colors ${
                      qualityPreset === "balanced"
                        ? "bg-yellow-700/80 text-white border-2 border-yellow-400 shadow-md"
                        : "mc-btn text-gray-200 hover:text-white"
                    }`}
                  >
                    ⚖️ Balanced (60 FPS)
                  </button>
                  <button
                    onClick={() => onApplyPreset("beautiful")}
                    className={`py-1.5 px-2 text-xs font-bold transition-colors ${
                      qualityPreset === "beautiful"
                        ? "bg-purple-700/80 text-white border-2 border-purple-400 shadow-md"
                        : "mc-btn text-gray-200 hover:text-white"
                    }`}
                  >
                    💎 Beautiful (Ultra)
                  </button>
                </div>
              </div>

              {/* Render Distance */}
              <div>
                <div className="flex justify-between text-xs font-bold text-white mc-text-shadow mb-1">
                  <span>Render Distance:</span>
                  <span className="text-[#FFFFA0]">{renderDistance} chunks ({renderDistance * 16}m)</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="16"
                  step="1"
                  value={renderDistance}
                  onChange={e => setRenderDistance(Number(e.target.value))}
                  className="w-full mc-slider"
                />
              </div>

              {/* FOV */}
              <div>
                <div className="flex justify-between text-xs font-bold text-white mc-text-shadow mb-1">
                  <span>Field of View (FOV):</span>
                  <span className="text-[#FFFFA0]">{fov}° · {fovToMM(fov)}mm</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="110"
                  step="1"
                  value={fov}
                  onChange={e => setFov(Number(e.target.value))}
                  className="w-full mc-slider"
                />
              </div>

              {/* Max Framerate */}
              <div>
                <div className="flex justify-between text-xs font-bold text-white mc-text-shadow mb-1">
                  <span>Max Framerate:</span>
                  <span className="text-[#FFFFA0]">
                    {maxFps === 0 ? `VSync / Monitor Hz (${detectedHz} Hz)` : `${maxFps} FPS`}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5 mt-1">
                  {[
                    { label: "VSync", val: 0 },
                    { label: "30 FPS", val: 30 },
                    { label: "60 FPS", val: 60 },
                    { label: "120 FPS", val: 120 }
                  ].map(item => (
                    <button
                      key={item.val}
                      onClick={() => setMaxFps(item.val)}
                      className={`py-1 px-1 text-xs font-bold ${
                        maxFps === item.val
                          ? "bg-[#58a03b] text-black border-2 border-[#86d962]"
                          : "mc-button"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Post-Processing Effects */}
              <div className="pt-1 space-y-2">
                <div className="text-xs font-bold text-[#FFFFA0] uppercase tracking-wider">Post-Processing Effects</div>
                <button
                  onClick={() => {
                    setDof(!dof);
                    showToast(!dof ? "Depth of Field: ENABLED" : "Depth of Field: DISABLED");
                  }}
                  className="w-full mc-button py-2 text-xs font-bold uppercase"
                >
                  🎯 Depth of Field: {dof ? "ON" : "OFF"}
                </button>
                {dof && (
                  <div>
                    <div className="flex justify-between text-xs font-bold text-white mc-text-shadow mb-1">
                      <span>Dof Strength:</span>
                      <span className="text-[#FFFFA0]">{Math.round(dofStrength * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(dofStrength * 100)}
                      onChange={e => setDofStrength(Number(e.target.value) / 100)}
                      className="w-full mc-slider"
                    />
                  </div>
                )}
                <button
                  onClick={() => {
                    setCa(!ca);
                    showToast(!ca ? "Chromatic Aberration: ENABLED" : "Chromatic Aberration: DISABLED");
                  }}
                  className="w-full mc-button py-2 text-xs font-bold uppercase"
                >
                  🌈 Chromatic Aberration: {ca ? "ON" : "OFF"}
                </button>
                {ca && (
                  <div>
                    <div className="flex justify-between text-xs font-bold text-white mc-text-shadow mb-1">
                      <span>CA Amount:</span>
                      <span className="text-[#FFFFA0]">{Math.round(caStrength * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(caStrength * 100)}
                      onChange={e => setCaStrength(Number(e.target.value) / 100)}
                      className="w-full mc-slider"
                    />
                  </div>
                )}
                {dof && (
                  <button
                    onClick={() => {
                      setBokeh(!bokeh);
                      showToast(!bokeh ? "Bokeh Mode: CIRCULAR LENS" : "Bokeh Mode: SOFT LENS");
                    }}
                    className="w-full mc-button py-2 text-xs font-bold uppercase"
                  >
                    🔵 Circular Bokeh: {bokeh ? "ON" : "OFF"}
                  </button>
                )}
                <div>
                  <div className="flex justify-between text-xs font-bold text-white mc-text-shadow mb-1">
                    <span>Color Gamut:</span>
                    <span className="text-[#FFFFA0]">
                      {colorGamut === "srgb" ? "sRGB" : colorGamut === "rec709" ? "Rec.709" : "P3 D65"}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 mt-1">
                    {[
                      { label: "sRGB", val: "srgb" },
                      { label: "P3 D65", val: "display-p3" },
                      { label: "Rec.709", val: "rec709" }
                    ].map(item => (
                      <button
                        key={item.val}
                        onClick={() => setColorGamut(item.val)}
                        className={`py-1 px-1 text-xs font-bold ${
                          colorGamut === item.val
                            ? "bg-[#58a03b] text-black border-2 border-[#86d962]"
                            : "mc-button"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: LIGHTING (exposure model presets + all light-related settings) */}
          {menuTab === "lighting" && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-[#FFFFA0] uppercase tracking-wider mb-2">Lighting & Exposure Settings</div>

              {/* Exposure Model Presets */}
              <div className="bg-[#222222] p-2 rounded border border-[#555555]/60 shadow-inner">
                <div className="text-[11px] font-bold text-[#FFFFA0] uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Exposure Model Preset:</span>
                  <span className="text-gray-400 capitalize">{exposureModel === "iso-ettl" ? "ISO E-TTL (beta)" : "Legacy Sim"}</span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  <button
                    onClick={() => { onApplyLegacyExposure(); }}
                    className={`py-1.5 px-2 text-xs font-bold transition-colors ${
                      exposureModel === "legacy-sim"
                        ? "bg-amber-700/80 text-white border-2 border-amber-400 shadow-md"
                        : "mc-btn text-gray-200 hover:text-white"
                    }`}
                  >
                    📷 Legacy Sim
                  </button>
                  <button
                    onClick={() => { onApplyIsoExposure(); }}
                    className={`py-1.5 px-2 text-xs font-bold transition-colors ${
                      exposureModel === "iso-ettl"
                        ? "bg-blue-700/80 text-white border-2 border-blue-400 shadow-md"
                        : "mc-btn text-gray-200 hover:text-white"
                    }`}
                  >
                    🧪 ISO E-TTL (beta)
                  </button>
                </div>
                <div className="text-[10px] text-gray-400 mt-1">
                  {exposureModel === "iso-ettl"
                    ? "Standards-anchored scaffold (C=250, neutral grade, 1x emitters). See kb/mechanics/ettl-iso2721."
                    : "Today's look: dark-cinematic grade with 6x emitter emphasis."}
                </div>
              </div>

              {/* Light Metering */}
              <div>
                <div className="flex justify-between text-xs font-bold text-white mc-text-shadow mb-1">
                  <span>Light Metering:</span>
                  <span className="text-[#FFFFA0]">
                    {metering === "matrix" ? "Matrix" : metering === "center" ? "Center" : "Spot"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  {[
                    { label: "Matrix", val: "matrix" },
                    { label: "Center", val: "center" },
                    { label: "Spot", val: "spot" }
                  ].map(item => (
                    <button
                      key={item.val}
                      onClick={() => setMetering(item.val as MeteringMode)}
                      className={`py-1 px-1 text-xs font-bold ${
                        metering === item.val
                          ? "bg-[#58a03b] text-black border-2 border-[#86d962]"
                          : "mc-button"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Range (EV = stops of latitude) */}
              <div>
                <div className="flex justify-between text-xs font-bold text-white mc-text-shadow mb-1">
                  <span>Dynamic Range:</span>
                  <span className="text-[#FFFFA0]">
                    {ev} EV ({ev <= 9 ? "Narrow" : ev <= 11 ? "Standard" : ev <= 13 ? "Balanced" : ev <= 15 ? "Wide DR" : ev <= 16 ? "HDR" : "Max Latitude"})
                  </span>
                </div>
                <input
                  type="range"
                  min="8"
                  max="17"
                  step="1"
                  value={ev}
                  onChange={e => setEv(Number(e.target.value))}
                  className="w-full mc-slider"
                />
              </div>

              {/* Exposure Compensation */}
              <div>
                <div className="flex justify-between text-xs font-bold text-white mc-text-shadow mb-1">
                  <span>Exposure Compensation:</span>
                  <span className="text-[#FFFFA0]">{(evComp > 0 ? "+" : "") + evComp.toFixed(1)} EV</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 mt-1">
                  {[-1, -0.3, 0, 0.3, 1].map(v => (
                    <button
                      key={v}
                      onClick={() => setEvComp(v)}
                      className={`py-1 px-1 text-xs font-bold ${
                        Math.abs(v - evComp) < 0.01
                          ? "bg-[#58a03b] text-black border-2 border-[#86d962]"
                          : "mc-button"
                      }`}
                    >
                      {(v > 0 ? "+" : "") + v.toFixed(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Vibrance / Saturation */}
              <div>
                <div className="flex justify-between text-xs font-bold text-white mc-text-shadow mb-1">
                  <span>Color Vibrance / Saturation:</span>
                  <span className="text-[#FFFFA0]">{vibrance}%</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="220"
                  value={vibrance}
                  onChange={e => setVibrance(Number(e.target.value))}
                  className="w-full mc-slider"
                />
              </div>

              {/* Brightness / Gamma */}
              <div>
                <div className="flex justify-between text-xs font-bold text-white mc-text-shadow mb-1">
                  <span>Brightness / Gamma:</span>
                  <span className="text-[#FFFFA0]">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min="70"
                  max="140"
                  value={brightness}
                  onChange={e => setBrightness(Number(e.target.value))}
                  className="w-full mc-slider"
                />
              </div>

              {/* Contrast */}
              <div>
                <div className="flex justify-between text-xs font-bold text-white mc-text-shadow mb-1">
                  <span>Image Contrast:</span>
                  <span className="text-[#FFFFA0]">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min="70"
                  max="160"
                  value={contrast}
                  onChange={e => setContrast(Number(e.target.value))}
                  className="w-full mc-slider"
                />
              </div>

              {/* Weather & Sky Conditions */}
              <div className="bg-[#222222] p-2 rounded border border-[#555555]/60 shadow-inner">
                <div className="text-[11px] font-bold text-[#FFFFA0] uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Sky & Weather Conditions:</span>
                  <span className="text-gray-400 capitalize">{weather} Sky</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 mt-1">
                  <button
                    onClick={() => {
                      setWeather("clear");
                      showToast("Weather: Clear Sky ☀️");
                    }}
                    className={`py-1.5 px-2 text-xs font-bold transition-colors ${
                      weather === "clear"
                        ? "bg-amber-600 text-white border-2 border-amber-300 shadow-md"
                        : "mc-btn text-gray-200 hover:text-white"
                    }`}
                  >
                    ☀️ Clear Sky
                  </button>
                  <button
                    onClick={() => {
                      setWeather("cloudy");
                      showToast("Weather: Scattered Clouds ⛅");
                    }}
                    className={`py-1.5 px-2 text-xs font-bold transition-colors ${
                      weather === "cloudy"
                        ? "bg-blue-600 text-white border-2 border-blue-300 shadow-md"
                        : "mc-btn text-gray-200 hover:text-white"
                    }`}
                  >
                    ⛅ Cloudy
                  </button>
                  <button
                    onClick={() => {
                      setWeather("overcast");
                      showToast("Weather: Overcast & Gloomy 🌧️");
                    }}
                    className={`py-1.5 px-2 text-xs font-bold transition-colors ${
                      weather === "overcast"
                        ? "bg-gray-600 text-white border-2 border-gray-300 shadow-md"
                        : "mc-btn text-gray-200 hover:text-white"
                    }`}
                  >
                    🌧️ Overcast
                  </button>
                </div>
              </div>

              {/* Dynamic Shadows */}
              <div className="pt-1">
                <button
                  onClick={() => {
                    setShadows(!shadows);
                    showToast(!shadows ? "Dynamic Shadows: ENABLED" : "Dynamic Shadows: DISABLED");
                  }}
                  className="w-full mc-button py-2 text-xs font-bold uppercase"
                >
                  Dynamic Point Light & Celestial Shadows: {shadows ? "ON" : "OFF"}
                </button>
                <div className="flex gap-2 mt-2">
                  {(["basic", "detailed", "advanced"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setShadowTier(t); setShadowTierOverridden(true); }}
                      className={"py-1.5 text-[11px] font-bold uppercase transition-colors " + (shadowTier === t ? "bg-blue-700/80 text-white border-2 border-blue-400 shadow-md" : "mc-btn text-gray-200 hover:text-white")}
                    >
                      {t === "basic" ? "Basic" : t === "detailed" ? "Detailed" : "Advanced"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sun Glint / Reflections */}
              <div className="pt-1 space-y-2">
                <button
                  onClick={() => {
                    setSpecular(!specular);
                    showToast(!specular ? "Sun Glint: ENABLED (water, glass & stone reflect the sun)" : "Sun Glint: DISABLED");
                  }}
                  className="w-full mc-button py-2 text-xs font-bold uppercase"
                >
                  ✨ Sun Glint / Reflections: {specular ? "ON" : "OFF"}
                </button>
                {specular && (
                  <div>
                    <div className="flex justify-between text-xs font-bold text-white mc-text-shadow mb-1">
                      <span>Glow Strength:</span>
                      <span className="text-[#FFFFA0]">{Math.round(specularStrength * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={Math.round(specularStrength * 100)}
                      onChange={e => setSpecularStrength(Number(e.target.value) / 100)}
                      className="w-full mc-slider"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: AUDIO & MUSIC SETTINGS */}
          {menuTab === "audio" && (
            <div className="space-y-4">
              <div className="text-xs font-bold text-[#FFFFA0] uppercase tracking-wider mb-2">Sound & Music Settings</div>

              {/* 1. Sound Effects (SFX) Volume */}
              <div className="bg-[#222222] p-3 rounded border border-[#555555]/60 shadow-inner space-y-2">
                <div className="flex justify-between text-xs font-bold text-white mc-text-shadow">
                  <span>🔊 Sound Effects (SFX):</span>
                  <span className="text-[#FFFFA0]">{soundOn ? `${Math.round(volume * 100)}%` : "Muted 🔇"}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={soundOn ? Math.round(volume * 100) : 0}
                  onChange={e => {
                    unlockAudio();
                    setVolume(Number(e.target.value) / 100);
                    if (!soundOn) setSoundOn(true);
                  }}
                  className="w-full mc-slider"
                />
                <button
                  onClick={() => {
                    setSoundOn(!soundOn);
                    unlockAudio();
                    showToast(!soundOn ? "Sound Effects: ENABLED 🔉" : "Sound Effects: MUTED 🔇");
                  }}
                  className="w-full mc-button py-1.5 text-xs font-bold uppercase"
                >
                  Sound Effects: {soundOn ? "ON 🔉" : "OFF 🔇"}
                </button>
              </div>

              {/* 2. Music & Ambient Melodies Volume */}
              <div className="bg-[#222222] p-3 rounded border border-[#555555]/60 shadow-inner space-y-2">
                <div className="flex justify-between text-xs font-bold text-white mc-text-shadow">
                  <span>🎵 Music & Ambient Melodies:</span>
                  <span className="text-[#FFFFA0]">{musicOn ? `${Math.round(musicVolume * 100)}%` : "Muted 🔇"}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={musicOn ? Math.round(musicVolume * 100) : 0}
                  onChange={e => {
                    unlockAudio();
                    setMusicVolume(Number(e.target.value) / 100);
                    if (!musicOn) setMusicOn(true);
                  }}
                  className="w-full mc-slider"
                />
                <button
                  onClick={() => {
                    setMusicOn(!musicOn);
                    unlockAudio();
                    showToast(!musicOn ? "Music: ENABLED 🎵" : "Music: MUTED 🔇");
                  }}
                  className="w-full mc-button py-1.5 text-xs font-bold uppercase"
                >
                  Music Tracks: {musicOn ? "ON 🎵" : "OFF 🔇"}
                </button>
              </div>

              {/* 3. Instant Music Test */}
              <div className="pt-1">
                <button
                  onClick={() => {
                    unlockAudio();
                    setMusicOn(true);
                    onPlayAmbientTheme();
                    showToast("Playing ambient track 🎵");
                  }}
                  className="w-full mc-button py-2 text-xs font-bold uppercase !bg-[#3867d6] !text-white hover:!bg-[#4b7bec]"
                >
                  ▶️ Play Ambient Music
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: GAMEPLAY & CONTROLS */}
          {menuTab === "gameplay" && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-[#FFFFA0] uppercase tracking-wider mb-2">Gameplay Mechanics & Difficulty</div>

              {/* Game Play Difficulty Switcher */}
              <div className="bg-[#222222] p-2.5 rounded border border-[#555555]/60 shadow-inner">
                <div className="text-[11px] font-bold text-[#FFFFA0] uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Combat & Difficulty Mode:</span>
                  <span className="text-gray-300 capitalize">
                    {gameplayMode === "peaceful" ? "🕊️ Peaceful" : (gameplayMode === "survival" ? "⚔️ Survival" : "💀 Hardcore")}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 mt-1.5">
                  <button
                    onClick={() => {
                      setGameplayMode("peaceful");
                      showToast("Difficulty: Peaceful 🕊️ (No monsters, auto-regen)");
                    }}
                    className={`py-1.5 px-1.5 text-xs font-bold transition-colors ${
                      gameplayMode === "peaceful"
                        ? "bg-green-700/90 text-white border-2 border-green-300 shadow-md"
                        : "mc-btn text-gray-200 hover:text-white"
                    }`}
                  >
                    🕊️ Peaceful
                  </button>
                  <button
                    onClick={() => {
                      setGameplayMode("survival");
                      showToast("Difficulty: Survival ⚔️ (Standard mobs, minor damage)");
                    }}
                    className={`py-1.5 px-1.5 text-xs font-bold transition-colors ${
                      gameplayMode === "survival"
                        ? "bg-amber-700/90 text-white border-2 border-amber-300 shadow-md"
                        : "mc-btn text-gray-200 hover:text-white"
                    }`}
                  >
                    ⚔️ Survival
                  </button>
                  <button
                    onClick={() => {
                      setGameplayMode("hardcore");
                      showToast("Difficulty: Hardcore 💀 (Aggressive mobs, lethal damage!)");
                    }}
                    className={`py-1.5 px-1.5 text-xs font-bold transition-colors ${
                      gameplayMode === "hardcore"
                        ? "bg-red-800/90 text-white border-2 border-red-400 shadow-md"
                        : "mc-btn text-gray-200 hover:text-white"
                    }`}
                  >
                    💀 Hardcore
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    const next = !creative;
                    setCreative(next);
                    showToast(next ? "Game Mode: Creative" : "Game Mode: Survival");
                  }}
                  className="mc-button py-2 text-xs font-bold uppercase"
                >
                  Mode: {creative ? "Creative (Fly/Inv)" : "Survival (Health)"}
                </button>

                <button
                  onClick={() => {
                    const next = !autoStep;
                    setAutoStep(next);
                    showToast(next ? "Auto-Jump: ON" : "Auto-Jump: OFF (Jump needed)");
                  }}
                  className="mc-button py-2 text-xs font-bold uppercase"
                >
                  Auto-Jump: {autoStep ? "ON" : "OFF"}
                </button>

                <button
                  onClick={() => {
                    const next = !touchControls;
                    setTouchControls(next);
                    showToast(next ? "Touch Controls: SHOWN (all resolutions)" : "Touch Controls: AUTO (touch devices only)");
                  }}
                  className="mc-button py-2 text-xs font-bold uppercase"
                >
                  Touch Buttons: {touchControls ? "FORCED ON" : "AUTO"}
                </button>
              </div>

              {/* Controls Overview */}
              <div className="mc-tooltip p-3 text-[10px] space-y-1 mt-2">
                <div className="font-bold text-[#FFFFA0] mb-1">Keyboard & Mouse Controls:</div>
                <div><span className="text-white font-bold">W A S D</span> — Walk / Fly</div>
                <div><span className="text-white font-bold">Space</span> — Jump / Elevate (Double-tap Space to fall/walk)</div>
                <div><span className="text-white font-bold">Shift</span> — Sprint (Ground) / Descend (Fly)</div>
                <div><span className="text-white font-bold">E</span> — Use / Place block / Enter aimed vehicle (right-click)</div>
                <div><span className="text-white font-bold">I</span> — Open Material Inventory (105+ Blocks)</div>
                <div><span className="text-white font-bold">Left Click</span> — Hold to Dig / Mine Block</div>
                <div><span className="text-white font-bold">Q</span> — Drop Held Item</div>
                <div><span className="text-white font-bold">Right Click</span> — Place Selected Block / Liquid</div>
                <div><span className="text-white font-bold">1 – 9 / Scroll</span> — Select Hotbar Item</div>
                <div><span className="text-white font-bold">M</span> — Fullscreen Map</div>
                <div><span className="text-white font-bold">R</span> — Respawn at Village Center</div>
              </div>
              {/* Client Reset */}
              <div className="mc-tooltip p-3 text-[10px] space-y-1 mt-2">
                <div className="font-bold text-[#FFFFA0] mb-1">Client Reset:</div>
                <button
                  onClick={async () => {
                    showToast("♻️ Clearing cache — rebooting with fresh files…");
                    try {
                      if ("serviceWorker" in navigator) {
                        const regs = await navigator.serviceWorker.getRegistrations();
                        for (const r of regs) { try { await r.unregister(); } catch {} }
                      }
                    } catch {}
                    try {
                      if (window.caches?.keys) {
                        const keys = await window.caches.keys();
                        for (const k of keys) { try { await window.caches.delete(k); } catch {} }
                      }
                    } catch {}
                    setTimeout(() => {
                      try {
                        const u = new URL(window.location.href);
                        u.searchParams.set("fresh", String(Date.now()));
                        window.location.replace(u.toString());
                      } catch {
                        window.location.reload();
                      }
                    }, 600);
                  }}
                  className="mc-button py-2 text-xs font-bold uppercase w-full"
                >
                  ♻️ Reset Cache & Reboot
                </button>
                <div className="text-gray-400">Unregisters service workers, wipes the Cache API, then reboots with a cache-busting URL so every file reloads fresh. Login + worlds are kept.</div>
              </div>
            </div>
          )}

          {/* TAB 3: WORLD & ENVIRONMENT */}
          {menuTab === "world" && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs font-bold">
                <span className="text-[#FFFFA0] uppercase tracking-wider">Day / Night Cycle</span>
                <span className="text-white mc-text-shadow">{timeFormatted} (Tick {Math.floor(worldTime)})</span>
              </div>

              {/* Time Presets */}
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  onClick={() => { setWorldTime(0); showToast("Time set to Sunrise"); }}
                  className="mc-button py-1.5 text-[11px] font-bold"
                >🌅 Sunrise</button>
                <button
                  onClick={() => { setWorldTime(6000); showToast("Time set to Day"); }}
                  className="mc-button py-1.5 text-[11px] font-bold"
                >☀️ Day</button>
                <button
                  onClick={() => { setWorldTime(12000); showToast("Time set to Sunset"); }}
                  className="mc-button py-1.5 text-[11px] font-bold"
                >🌇 Sunset</button>
                <button
                  onClick={() => { setWorldTime(18000); showToast("Time set to Night"); }}
                  className="mc-button py-1.5 text-[11px] font-bold"
                >🌙 Night</button>
              </div>

              {/* Time Manual Scrub */}
              <div>
                <input
                  type="range"
                  min="0"
                  max="23999"
                  step="100"
                  value={worldTime}
                  onChange={e => setWorldTime(Number(e.target.value))}
                  className="w-full mc-slider cursor-pointer"
                />
              </div>

              {/* Time Speed & Flow */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    const next = !timeFlow;
                    setTimeFlow(next);
                    showToast(next ? "Time Resumed" : "Time Paused");
                  }}
                  className="mc-button py-2 text-xs font-bold uppercase"
                >
                  Time Flow: {timeFlow ? "Running" : "Paused"}
                </button>

                <button
                  onClick={() => {
                    const next = timeSpeed === 1 ? 2 : (timeSpeed === 2 ? 5 : (timeSpeed === 5 ? 10 : 1));
                    setTimeSpeed(next);
                    showToast(`Time Speed: ${next}x`);
                  }}
                  className="mc-button py-2 text-xs font-bold uppercase"
                >
                  Speed: {timeSpeed}x ({Math.round(40 / timeSpeed)}m day)
                </button>
              </div>

              <div className="mc-tooltip p-2 text-[10px] text-white/80">
                💧 <span className="text-[#5decf5] font-bold">Fluid Dynamics Active</span>: Waterfalls cascade, spread across stone in 4 directions, and react with lava to generate obsidian & cobblestone.
              </div>
            </div>
          )}

          {/* TAB 4: WORLD GENERATOR */}
          {menuTab === "generator" && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-[#FFFFA0] uppercase tracking-wider mb-2">World Generator & Seed</div>

              <div className="p-2.5 bg-black/40 border border-[#555555] rounded space-y-2">
                <div className="text-xs font-bold text-white mc-text-shadow">Instant Village Regeneration</div>
                <p className="text-[11px] text-white/70">Regenerates the immediate surroundings with all modular house types, furnished interiors, doors, and stairs.</p>
                <button
                  onClick={() => {
                    onRegenerateVillage();
                    showToast("🏰 Immediate village area regenerated!");
                    onClose();
                  }}
                  className="w-full mc-button py-2 text-xs font-bold uppercase !bg-[#2b8a3e] !text-white"
                >
                  🏰 Regenerate Village Area Now
                </button>
              </div>
              
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] font-bold text-white mc-text-shadow block mb-1">World Seed (Java-Compatible):</label>
                  <input
                    type="text"
                    value={seedText}
                    onChange={e => setSeedText(e.target.value)}
                    placeholder="World seed"
                    className="w-full mc-input px-3 py-1.5 text-xs font-mono"
                  />
                </div>

                <button
                  onClick={onRebuildWorld}
                  className="w-full mc-button py-2.5 text-xs font-bold uppercase mt-2 !bg-[#73b84f] !text-black hover:!bg-[#8fcf6a]"
                >
                  Generate New World
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: ACCOUNT & SESSION */}
          {menuTab === "account" && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-[#FFFFA0] uppercase tracking-wider mb-2">User Account & Session</div>
              
              <div className="mc-tooltip p-3 space-y-1 text-xs">
                <div>Logged in as: <span className="text-[#FFFFA0] font-bold">{currentUser?.username || "Guest Player"}</span></div>
                <div>Active World: <span className="text-[#55FF55] font-bold">{activeWorld?.name || "Default World"}</span></div>
                <div className="text-[10px] text-[#5decf5]">✓ All block modifications are saved instantly to the database.</div>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  onClick={onOpenAuditLogs}
                  className="w-full mc-button py-2 text-xs font-bold uppercase"
                >
                  📋 View Block Audit Logs
                </button>

                <button
                  onClick={onWorldSelection}
                  className="w-full mc-button py-2 text-xs font-bold uppercase !bg-[#4a6b82]"
                >
                  🗺️ World Selection
                </button>

                <button
                  onClick={onLogout}
                  className="w-full mc-button py-2.5 text-xs font-bold uppercase !bg-[#8c3b3b] !text-white"
                >
                  🚪 Log Out
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Done / Back to Game Button */}
        <button
          onClick={onClose}
          className="w-full mc-button py-2.5 text-xs font-bold uppercase tracking-wider mt-2"
        >
          Done / Back to Game (Esc)
        </button>

        </div>
      </div>
    </div>
  );
};
