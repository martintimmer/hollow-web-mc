/**
 * @file src/game/engine/orbitControls.ts
 * Blender-style orbit camera for the Sim studio (U18). Pure controller — no DOM
 * listeners — so the Game frame loop owns input. Positions a perspective camera
 * on a sphere around a target; presets snap to axis-aligned views.
 *
 * (Orthographic toggling is left as a follow-up: camera.type swaps are unsafe
 * while `s.camera` is the raycast source; perspective presets give the same
 * top/side/front framing without a projection-matrix hazard.)
 */
import * as THREE from "three";

export type OrbitView = "perspective" | "top" | "side" | "front";

export interface OrbitState {
  enabled: boolean;
  target: THREE.Vector3;
  distance: number;
  theta: number; // azimuth (radians)
  phi: number;   // polar angle, 0 = zenith
  view: OrbitView;
}

const DEFAULT_DISTANCE = 14;
const RA = 0.003;      // radians per pointer px
const ZOOM_STEP = 0.9; // per wheel notch

export function createOrbitState(target?: THREE.Vector3): OrbitState {
  return {
    enabled: false,
    target: (target ?? new THREE.Vector3()).clone(),
    distance: DEFAULT_DISTANCE,
    theta: Math.PI / 4,
    phi: Math.PI / 3.4,
    view: "perspective"
  };
}

/** Snap to a named axis view. */
export function orbitView(state: OrbitState, view: OrbitView): void {
  state.view = view;
  if (view === "top") {
    state.theta = state.theta; // keep azimuth
    state.phi = 0.04;
  } else if (view === "side") {
    state.theta = Math.PI / 2;
    state.phi = Math.PI / 2;
  } else if (view === "front") {
    state.theta = 0;
    state.phi = Math.PI / 2;
  } else {
    state.theta = Math.PI / 4;
    state.phi = Math.PI / 3.4;
  }
}

/** Orbit from pointer deltas (px) — used for alt-drag. */
export function orbitRotate(state: OrbitState, dx: number, dy: number): void {
  state.view = "perspective";
  state.theta -= dx * RA;
  state.phi = THREE.MathUtils.clamp(state.phi - dy * RA, 0.04, Math.PI - 0.04);
}

/** Zoom from a wheel delta (+ = out). */
export function orbitZoom(state: OrbitState, wheelDelta: number): void {
  state.distance = THREE.MathUtils.clamp(state.distance * (wheelDelta > 0 ? ZOOM_STEP : 1 / ZOOM_STEP), 2, 96);
}

/** Pan the target in camera-plane space (px deltas, distance-scaled). */
export function orbitPan(state: OrbitState, dx: number, dy: number): void {
  const scale = state.distance * 0.0016;
  const cosT = Math.cos(state.theta), sinT = Math.sin(state.theta);
  // camera-right in the horizontal plane = (cosT, 0, -sinT)
  state.target.x -= cosT * dx * scale;
  state.target.z += sinT * dx * scale;
  state.target.y += dy * scale * 0.6;
}

/** Position the camera on the orbit sphere around the target. */
export function applyOrbitCamera(camera: THREE.PerspectiveCamera, state: OrbitState): void {
  const sinPhi = Math.sin(state.phi);
  const px = state.target.x + state.distance * sinPhi * Math.sin(state.theta);
  const py = state.target.y + state.distance * Math.cos(state.phi);
  const pz = state.target.z + state.distance * sinPhi * Math.cos(state.theta);
  camera.position.set(px, py, pz);
  camera.lookAt(state.target);
}
