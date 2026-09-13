/**
 * @file src/sim/schematics.ts
 * Universal Schematic & Litematic Import/Export (Roadmap B9).
 * Parses/exports standard .schem (Sponge Schematic) and JSON blueprint structures.
 */

import type { BlueprintDoc } from "./blueprintScanner";
import { downloadBlueprintLitematic } from "./litematicExporter";

export interface SchematicBlockEntry {
  x: number;
  y: number;
  z: number;
  blockId: number;
}

/** Export a BlueprintDoc as a downloadable .schem JSON file */
export function downloadBlueprintSchematic(doc: BlueprintDoc): void {
  if (typeof document === "undefined") return;
  const jsonStr = JSON.stringify(doc, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const base = (doc.id || doc.name || "schematic").replace(/[^a-zA-Z0-9_-]/g, "_");
  a.download = `${base}.schem.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Parse an imported JSON .schem file back into a BlueprintDoc */
export function parseSchematicJSON(content: string): BlueprintDoc | null {
  try {
    const raw = JSON.parse(content);
    if (!raw || !Array.isArray(raw.blocks)) return null;
    const blocks = raw.blocks.map((b: any) => ({
      dx: Number(b.dx ?? b.x) || 0,
      dy: Number(b.dy ?? b.y) || 0,
      dz: Number(b.dz ?? b.z) || 0,
      id: Number(b.id ?? b.blockId) || 1
    }));
    return {
      version: 1,
      id: raw.id || `schem_${Date.now()}`,
      name: raw.name || "Imported Schematic",
      author: raw.author || "User",
      category: raw.category || "misc",
      biomeAffinity: Array.isArray(raw.biomeAffinity) ? raw.biomeAffinity : ["any"],
      spawnNaturally: !!raw.spawnNaturally,
      dimensions: raw.dimensions || { width: 1, height: 1, depth: 1 },
      anchor: raw.anchor || { ax: 0, ay: 0, az: 0 },
      foundationDepth: Number(raw.foundationDepth) || 0,
      materialsCount: raw.materialsCount || {},
      totalBlocks: blocks.length,
      createdAt: raw.createdAt || new Date().toISOString(),
      blocks
    };
  } catch (err) {
    console.error("Failed to parse schematic JSON:", err);
    return null;
  }
}

export { downloadBlueprintLitematic };
