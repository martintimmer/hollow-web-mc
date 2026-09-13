import * as THREE from "three";

export interface ChunkGeometryPayload {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
}

export interface ChunkResultPayload {
  cx: number;
  cz: number;
  data: Uint8Array;
  maxY: number;
  opaque: ChunkGeometryPayload | null;
  foliage: ChunkGeometryPayload | null;
  glow: ChunkGeometryPayload | null;
  trans: ChunkGeometryPayload | null;
}

export function payloadToGeometry(p: ChunkGeometryPayload | null): THREE.BufferGeometry | null {
  if (!p || p.indices.length === 0) return null;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute("position", new THREE.BufferAttribute(p.positions, 3));
  geom.setAttribute("normal", new THREE.BufferAttribute(p.normals, 3));
  geom.setAttribute("uv", new THREE.BufferAttribute(p.uvs, 2));
  geom.setAttribute("color", new THREE.BufferAttribute(p.colors, 3));
  geom.setIndex(new THREE.BufferAttribute(p.indices, 1));
  geom.computeBoundingSphere();
  return geom;
}
