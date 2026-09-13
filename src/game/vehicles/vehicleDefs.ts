/**
 * @file src/game/vehicles/vehicleDefs.ts
 * Vehicle styles + physics tunables. Styles may ship a procedural model
 * (mockup) or an imported FBX model; registerVehicleStyle() lets the FBX
 * import path (V1) add new drivable styles at runtime.
 */

import type { VehicleTunables } from "./vehiclePhysics";
import type { VehicleModel } from "./vehicleModel";
import { createHardtopCar } from "./createHardtopCar";
import { createMockupCar } from "./createMockupCar";
import { createMuscleCar } from "./createMuscleCar";
import { createLowriderCar } from "./createLowriderCar";
import { createSportsCar } from "./createSportsCar";
import { createCompactCar } from "./createCompactCar";

export interface VehicleStyle {
  id: string;
  name: string;
  tunables: VehicleTunables;
  /** lazily builds the 3D model for this style (procedural or imported) */
  model?: () => VehicleModel;
}

const SEDAN: VehicleTunables = {
  mass: 1350,
  engineForce: 5400,
  brakeForce: 16500,
  handbrakeForce: 11000,
  reverseForce: 2800,
  topSpeed: 34,
  reverseMax: 6,
  steerMax: 0.32,
  wheelBase: 2.7,
  grip: 4.5,
  gripHand: 1.2,
  dragC: 0.014,
  rollingR: 0.025,
  wheelRadius: 0.36,
  halfWidth: 0.95,
  halfLength: 2.2,
  bodyHeight: 1.35
};

// Sabre (muscle): long hood, heavy, hits hard but slides more (lower grip)
const MUSCLE: VehicleTunables = {
  ...SEDAN,
  mass: 1550, engineForce: 7200, brakeForce: 15000, handbrakeForce: 10500,
  topSpeed: 36, steerMax: 0.30, grip: 3.8,
  halfWidth: 1.0, halfLength: 2.4, bodyHeight: 1.35
};

// Voodoo (lowrider): cruiser — stable and grippy, not fast
const LOWRIDER: VehicleTunables = {
  ...SEDAN,
  mass: 1400, engineForce: 4200, brakeForce: 15500, handbrakeForce: 10500,
  topSpeed: 26, wheelBase: 2.5, steerMax: 0.36, grip: 5.0,
  halfWidth: 0.95, halfLength: 2.2, bodyHeight: 1.2
};

// Cheetah (sports): light, fast, agile, high grip
const SPORTS: VehicleTunables = {
  ...SEDAN,
  mass: 1150, engineForce: 6600, brakeForce: 17500, handbrakeForce: 11500,
  topSpeed: 40, wheelBase: 2.5, steerMax: 0.38, grip: 5.5,
  halfWidth: 1.0, halfLength: 2.0, bodyHeight: 1.05
};

// Blista (compact): light, weak engine, short wheelbase
const COMPACT: VehicleTunables = {
  ...SEDAN,
  mass: 950, engineForce: 3600, brakeForce: 13500, handbrakeForce: 9000,
  topSpeed: 26, wheelBase: 2.3, steerMax: 0.34, grip: 4.2,
  halfWidth: 0.78, halfLength: 1.65, bodyHeight: 1.4
};

const REGISTRY: Record<string, VehicleStyle> = {
  sedan: { id: "sedan", name: "Bravura (Hardtop)", tunables: SEDAN, model: createHardtopCar },
  convertible: { id: "convertible", name: "Cabriolet (Convertible)", tunables: SEDAN, model: createMockupCar },
  muscle: { id: "muscle", name: "Sabre (Muscle)", tunables: MUSCLE, model: createMuscleCar },
  lowrider: { id: "lowrider", name: "Voodoo (Lowrider)", tunables: LOWRIDER, model: createLowriderCar },
  sports: { id: "sports", name: "Cheetah (Sports)", tunables: SPORTS, model: createSportsCar },
  compact: { id: "compact", name: "Blista (Compact)", tunables: COMPACT, model: createCompactCar }
};

export function registerVehicleStyle(style: VehicleStyle) {
  REGISTRY[style.id] = style;
}

export function vehicleStyle(id: string): VehicleStyle {
  return REGISTRY[id] || REGISTRY.sedan;
}

export function listVehicleStyles(): VehicleStyle[] {
  return Object.values(REGISTRY);
}
