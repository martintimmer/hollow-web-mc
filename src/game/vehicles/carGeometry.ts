import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export function softenBox(geometry: THREE.BufferGeometry, bevel = 0.045): THREE.BufferGeometry {
  const p = (geometry as any).parameters;
  if (!p || geometry.type !== "BoxGeometry") return geometry;
  const limit = Math.min(p.width, p.height, p.depth) * 0.45;
  return new RoundedBoxGeometry(p.width, p.height, p.depth, 2, Math.min(bevel, limit));
}
