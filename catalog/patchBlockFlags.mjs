/**
 * @file catalog/patchBlockFlags.mjs
 * Idempotent flag corrections for sprite/texture semantics:
 *  - `trans: 1` for the light/decorative family that renders as thin 3D shapes
 *    (torches, lanterns, rods, portal, lichen, berries, brewing stand, amethyst cluster)
 *    so (a) their sparse/transparent textures use the cutout (alphaTest) material and
 *    (b) neighbor faces are NOT culled (they are visually non-opaque).
 * Collision (`solid`) is intentionally left untouched.
 */
import fs from "node:fs";

const F = "src/game/blocks.ts";
const TRANS_IDS = [43, 46, 80, 81, 82, 84, 92, 97, 100, 101, 103];

let src = fs.readFileSync(F, "utf8");
let changed = 0;
for (const id of TRANS_IDS) {
  const idLine = src.search(new RegExp(`"id": ${id},`));
  if (idLine < 0) { console.log(`id ${id}: NOT FOUND`); continue; }
  const objEnd = src.indexOf("},", idLine);
  const slice = src.slice(idLine, objEnd);
  if (/\"trans\":\s*1/.test(slice)) { console.log(`id ${id}: already trans`); continue; }
  if (/\"trans\":\s*\d+/.test(slice)) {
    src = src.slice(0, idLine) + slice.replace(/"trans":\s*\d+/, '"trans": 1') + src.slice(objEnd);
  } else {
    // insert trans right after the id line — always a valid position
    const afterId = src.indexOf("\n", idLine) + 1;
    src = src.slice(0, afterId) + `    "trans": 1,\n` + src.slice(afterId);
  }
  changed++;
  console.log(`id ${id} → trans: 1`);
}
fs.writeFileSync(F, src);
console.log(`patched ${TRANS_IDS.length} ids (${changed} changed)`);
