import tileMap from "../catalog/textureTileMap.json";

export const TILE_TO_FILE: Record<number, string> = {};
for (const [file, tile] of Object.entries(tileMap as Record<string, number>)) {
  TILE_TO_FILE[Number(tile)] = file;
}
