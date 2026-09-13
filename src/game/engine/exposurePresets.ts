import type { ExposureModel, MeteringMode } from "./lightMeter";

export interface ExposurePreset {
  id: ExposureModel;
  label: string;
  blurb: string;
  exposureModel: ExposureModel;
  ev: number;
  metering: MeteringMode;
  evComp: number;
  brightness: number;
  contrast: number;
  vibrance: number;
  shadows: boolean;
  shadowTier: "basic" | "detailed" | "advanced";
  specular: boolean;
  specularStrength: number;
  weather: "clear" | "cloudy" | "overcast";
}

export const LEGACY_SIM_PRESET: ExposurePreset = {
  id: "legacy-sim",
  label: "Legacy Sim",
  blurb: "Today's look: dark-cinematic grade, 6x emitter emphasis.",
  exposureModel: "legacy-sim",
  ev: 12,
  metering: "matrix",
  evComp: 0,
  brightness: 105,
  contrast: 105,
  vibrance: 140,
  shadows: true,
  shadowTier: "detailed",
  specular: false,
  specularStrength: 60,
  weather: "cloudy",
};

export const ISO_ETTL_PRESET: ExposurePreset = {
  id: "iso-ettl",
  label: "ISO E-TTL (beta)",
  blurb: "Standards-anchored scaffold: C=250, neutral grade.",
  exposureModel: "iso-ettl",
  ev: 13,
  metering: "matrix",
  evComp: 0,
  brightness: 100,
  contrast: 100,
  vibrance: 100,
  shadows: true,
  shadowTier: "detailed",
  specular: false,
  specularStrength: 60,
  weather: "cloudy",
};

export const EXPOSURE_PRESETS: ExposurePreset[] = [LEGACY_SIM_PRESET, ISO_ETTL_PRESET];

export function getExposurePreset(model: ExposureModel): ExposurePreset {
  return model === "iso-ettl" ? ISO_ETTL_PRESET : LEGACY_SIM_PRESET;
}
