import { voxelizeBuffer } from '../catalog/voxelize.mjs';
// Build a synthetic GLB: left half red body, right half black wheel, top white roof.
// Two abutting boxes with different material colors -> tests boundary supersampling.
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
const red = new THREE.MeshLambertMaterial({ color: 0xcc2222 });
const blk = new THREE.MeshLambertMaterial({ color: 0x111111 });
const wht = new THREE.MeshLambertMaterial({ color: 0xeeeeee });
const m1 = new THREE.Mesh(geo, red); m1.position.x = -0.25; m1.position.y = 0.25;
const m2 = new THREE.Mesh(geo, blk); m2.position.x = 0.25; m2.position.y = 0.25;
const m3 = new THREE.Mesh(new THREE.BoxGeometry(1, 0.2, 0.5), wht); m3.position.y = 0.85;
const scene = new THREE.Scene();
scene.add(m1, m2, m3);
const exp = new GLTFExporter();
const glb = await new Promise((res, rej) => exp.parse(scene, (r) => res(r), rej, { binary: true }));

const { payload, stats } = await voxelizeBuffer(glb, { res: 48, w: 1, h: 1, scale: 100 });
console.log('kind:', payload.kind, 'grid:', stats.gx, 'x', stats.gy, 'x', stats.gz);
// decode grid + palette, then print a Y=mid horizontal slice color map (ASCII)
const data = new Uint8Array(Buffer.from(payload.grid.data, 'base64'));
const { gx, gy, gz } = payload.grid;
const pal = payload.palette.map(h => parseInt(h.slice(1), 16));
const j = Math.floor(gy / 2); // mid height row (through the two cubes)
let lines = [];
for (let k = 0; k < gz; k++) {
  let line = '';
  for (let i = 0; i < gx; i++) {
    const idx = data[i + j * gx + k * gx * gy];
    if (!idx) { line += '.'; continue; }
    const c = pal[idx - 1];
    const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
    if (r > 150 && g < 90 && b < 90) line += 'R';
    else if (r < 60 && g < 60 && b < 60) line += 'B';
    else if (r > 200 && g > 200 && b > 200) line += 'W';
    else line += '?';
  }
  lines.push(line);
}
console.log('mid-Y slice (R=red body, B=black wheel, W=white roof, .=empty):');
console.log(lines.join('\n'));
// Count wrong-color voxels at the red/black boundary column(s)
let wrong = 0;
for (let k = 0; k < gz; k++) for (let i = 0; i < gx; i++) {
  const idx = data[i + j * gx + k * gx * gy];
  if (!idx) continue;
  const c = pal[idx - 1];
  const r = (c >> 16) & 255, g = (c >> 8) & 255, b = c & 255;
  // left half should be red, right half black (within a 1-voxel transition band)
  const isRed = r > 150 && g < 90 && b < 90;
  const isBlk = r < 60 && g < 60 && b < 60;
  const half = Math.floor(gx / 2);
  if (i < half - 1 && !isRed) wrong++;
  if (i > half + 1 && !isBlk) wrong++;
}
console.log('wrong-region voxels outside transition band:', wrong);
