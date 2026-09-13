/**
 * Reserved atlas slots for per-face custom textures of non-cube models whose
 * faces would otherwise share a single tile (e.g. torch: side/top/bottom all map
 * to tile 81). The editor writes the face override into these slots, the atlas
 * bakes them (with the vanilla tile as default), and the mesher samples the slot
 * for that specific face — so an editor "top"/"bottom" edit actually shows up
 * in-game instead of being lost to the shared side tile.
 *
 * Slots live in the free 879+ region of the 512x512 atlas (877 = chest, 878 = bed).
 */
export const CUSTOM_FACE_TILES: Record<string, number> = {
  "80:top": 879, // Torch
  "80:bottom": 880,
  "81:top": 881, // Soul torch
  "81:bottom": 882,
  "84:top": 883, // Redstone torch
  "84:bottom": 884,
  "1205:side": 890,   // Porch stair (left rail) - side / risers
  "1205:top": 891,    // Porch stair (left rail) - top treads / rail top
  "1205:bottom": 892, // Porch stair (left rail) - bottom
  "1206:side": 893,   // Porch stair (right rail) - side / risers
  "1206:top": 894,    // Porch stair (right rail) - top treads / rail top
  "1206:bottom": 895, // Porch stair (right rail) - bottom
};

export function customFaceTile(blockId: number, face: string): number | null {
  return CUSTOM_FACE_TILES[`${blockId}:${face}`] ?? null;
}