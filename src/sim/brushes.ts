/**
 * @file src/sim/brushes.ts
 * Voxel sculpting brush shapes (U21). Pure predicates + bounding helpers used by
 * the sim bridge to paint/erase block volumes. All shapes are centered on an
 * integer block cell (cx, cy, cz) with a radius expressed in blocks (1-8).
 */
export type BrushShape = "sphere" | "cylinder" | "cuboid" | "plane";

export interface BrushSpec {
  shape: BrushShape;
  radius: number; // blocks (clamped 1..8)
}

const clampR = (r: number) => Math.max(1, Math.min(8, Math.round(r)));

export function brushBounds(spec: BrushSpec, cx: number, cy: number, cz: number) {
  const r = clampR(spec.radius);
  // plane: flat disc (1 tall); cylinder: full-height disc; sphere/cuboid: r in all axes
  const ry = spec.shape === "cylinder" ? Math.max(16, Math.abs(Math.floor(cy))) : (spec.shape === "plane" ? 0 : r);
  return {
    x0: Math.floor(cx) - r, x1: Math.floor(cx) + r,
    y0: Math.floor(cy) - ry, y1: Math.floor(cy) + ry,
    z0: Math.floor(cz) - r, z1: Math.floor(cz) + r
  };
}

export function brushContains(spec: BrushSpec, cx: number, cy: number, cz: number, x: number, y: number, z: number): boolean {
  const r = clampR(spec.radius);
  const dx = x - cx, dy = y - cy, dz = z - cz;
  const r2 = r * r;
  switch (spec.shape) {
    case "sphere":
      return dx * dx + dy * dy + dz * dz <= r2;
    case "cylinder": // vertical disc extruded the full column height
      return dx * dx + dz * dz <= r2;
    case "cuboid":
      return Math.abs(dx) <= r && Math.abs(dy) <= r && Math.abs(dz) <= r;
    case "plane": // flat XZ ellipse, one block tall
      return dx * dx + dz * dz <= r2 && dy === 0;
    default:
      return false;
  }
}
