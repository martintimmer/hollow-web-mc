export type VoxelWriter = (x: number, y: number, z: number, id: number) => void;
export type RandomFunc = () => number;
export type HeightLookup = (x: number, z: number) => number;

export function stampTrunk(x: number, z: number, h: number, th: number, w: VoxelWriter, id: number, tw: number): void {
  for (let y = 1; y <= th; y++) {
    for (let dz = 0; dz < tw; dz++) for (let dx = 0; dx < tw; dx++) w(x + dx, h + y, z + dz, id);
  }
}

export function rollTrunk(r: RandomFunc, p2: number, p3: number): number {
  const v = r();
  if (v < p3) return 3;
  if (v < p3 + p2) return 2;
  return 1;
}

export type TrunkStyle = "straight" | "forked" | "leaning" | "twisted" | "buttress" | "multistem" | "pillar";
export type CanopyShape = "blob" | "spire" | "flatTop" | "layered" | "weeping" | "vase" | "windswept" | "pagoda";

export const TRUNK_STYLES: TrunkStyle[] = ["straight", "forked", "leaning", "twisted", "buttress", "multistem", "pillar"];
export const CANOPY_SHAPES: CanopyShape[] = ["blob", "spire", "flatTop", "layered", "weeping", "vase", "windswept", "pagoda"];

export interface TreeSpec {
  trunk: number; leaf: number;
  hMin: number; hMax: number;
  tw2?: number; tw3?: number; forceTw?: number;
  crown?: number;
  trunks?: TrunkStyle[]; canopies?: CanopyShape[];
  vines?: boolean; snowCap?: boolean;
  discs?: number;
}

const DIR4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export function generateCustomTree(x: number, z: number, h: number, r: RandomFunc, w: VoxelWriter, spec: TreeSpec): void {
  const tw = spec.forceTw ?? rollTrunk(r, spec.tw2 ?? 0, spec.tw3 ?? 0);
  const th = spec.hMin + Math.floor(r() * (spec.hMax - spec.hMin + 1)) + (tw - 1) * 2;
  const trunkCells = new Set<string>();
  const twr = (wx: number, wy: number, wz: number) => {
    trunkCells.add(wx + "," + wy + "," + wz);
    w(wx, wy, wz, spec.trunk);
  };
  let styles = spec.trunks ?? TRUNK_STYLES;
  if (tw > 1) styles = styles.filter(s => s === "straight" || s === "buttress" || s === "twisted" || s === "pillar");
  if (!styles.length) styles = ["straight"];
  const style = styles[Math.floor(r() * styles.length)];
  const [ddx, ddz] = DIR4[Math.floor(r() * 4)];
  const tips: Array<[number, number, number]> = [];
  const growBranch = (bx: number, by: number, bz: number, dx: number, dz: number, len: number) => {
    let cx = bx, cy = by, cz = bz;
    for (let i = 0; i < len; i++) {
      cy++;
      if (i > 0) { cx += dx; cz += dz; }
      twr(cx, cy, cz);
    }
    tips.push([cx, cy, cz]);
  };
  let topX = x, topZ = z;
  if (style === "multistem") {
    const offs = [[0, 0], [1, 0], [0, 1]];
    const n = 2 + (r() < 0.4 ? 1 : 0);
    let topY = h;
    for (let s = 0; s < n; s++) {
      const sh = th - (s > 0 ? Math.floor(r() * 3) : 0);
      for (let y = 1; y <= sh; y++) twr(x + offs[s][0], h + y, z + offs[s][1]);
      if (h + sh > topY) { topY = h + sh; topX = x + offs[s][0]; topZ = z + offs[s][1]; }
    }
  } else {
    const trunkCol = (wx: number, wz: number, y0: number, y1: number) => {
      for (let y = y0; y <= y1; y++) {
        for (let dz = 0; dz < tw; dz++) for (let dx = 0; dx < tw; dx++) twr(wx + dx, h + y, wz + dz);
      }
    };
    if (style === "forked") {
      trunkCol(x, z, 1, th - 2);
      growBranch(x, h + th - 2, z, ddx, ddz, 2 + (r() < 0.5 ? 1 : 0));
      growBranch(x, h + th - 2, z, -ddz, -ddx, 2 + (r() < 0.5 ? 1 : 0));
    } else if (style === "leaning") {
      const lean = 1 + (r() < 0.35 ? 1 : 0);
      for (let y = 1; y <= th; y++) {
        const off = Math.min(lean, Math.floor(y / 4));
        trunkCol(x + ddx * off, z + ddz * off, y, y);
      }
      topX = x + ddx * Math.min(lean, Math.floor(th / 4));
      topZ = z + ddz * Math.min(lean, Math.floor(th / 4));
    } else if (style === "twisted") {
      for (let y = 1; y <= th; y++) {
        const off = Math.floor(y / 2) % 2;
        trunkCol(x + ddx * off, z + ddz * off, y, y);
      }
      const off = Math.floor(th / 2) % 2;
      topX = x + ddx * off;
      topZ = z + ddz * off;
    } else {
      trunkCol(x, z, 1, th);
      if (style === "buttress") {
        for (const [bx, bz] of DIR4) {
          twr(x + bx, h + 1, z + bz);
          if (r() < 0.5) twr(x + bx * 2, h + 1, z + bz * 2);
        }
      }
    }
    if (style === "straight" || style === "buttress" || style === "twisted") {
      const nb = 1 + (r() < 0.5 ? 1 : 0);
      for (let b = 0; b < nb; b++) {
        const [bdx, bdz] = DIR4[Math.floor(r() * 4)];
        growBranch(x + bdx, h + th - 2 - Math.floor(r() * Math.max(1, th / 2)), z + bdz, bdx, bdz, 2);
      }
    }
  }
  if (tw > 1 && style !== "multistem" && style !== "buttress") {
    const nFlare = 2 + Math.floor(r() * 3);
    for (let f = 0; f < nFlare; f++) {
      const [bx, bz] = DIR4[Math.floor(r() * 4)];
      twr(x + bx, h + 1, z + bz);
    }
  }
  const ty = h + th;
  const R = Math.min(4, (spec.crown ?? 2) + (tw - 1) + (r() < 0.5 ? 1 : 0));
  let shapes = spec.canopies ?? CANOPY_SHAPES;
  let shape = shapes[Math.floor(r() * shapes.length)];
  if (shape === "windswept" && style === "leaning") {
    shape = "blob";
    for (let t = 0; t < 2 && shape === "blob"; t++) {
      const alt = shapes[Math.floor(r() * shapes.length)];
      if (alt !== "windswept") shape = alt;
    }
  }
  const jx = shape === "spire" ? topX : topX + Math.floor(r() * 3) - 1;
  const jz = shape === "spire" ? topZ : topZ + Math.floor(r() * 3) - 1;
  const inTrunk = (wx: number, wy: number, wz: number) => wy < ty && trunkCells.has(wx + "," + wy + "," + wz);
  const cutCorner = (dx: number, dz: number, rad: number) => Math.abs(dx) === rad && Math.abs(dz) === rad && r() < 0.5;
  const disc = (cx: number, cy: number, cz: number, rad: number, sparse: number) => {
    for (let dz = -rad; dz <= rad; dz++) for (let dx = -rad; dx <= rad; dx++) {
      if (cutCorner(dx, dz, rad)) continue;
      if (sparse > 0 && r() < sparse) continue;
      if (inTrunk(cx + dx, cy, cz + dz)) continue;
      w(cx + dx, cy, cz + dz, spec.leaf);
    }
  };
  if (shape === "spire") {
    for (let yy = ty - 2 * R; yy <= ty + 1; yy++) {
      const d = ty - yy;
      disc(topX, yy, topZ, d < 0 ? 1 : Math.max(1, R - Math.floor(d / 2)), 0);
    }
  } else if (shape === "flatTop") {
    disc(jx, ty, jz, R, 0);
    disc(jx, ty + 1, jz, R, 0.15);
    disc(jx, ty - 1, jz, Math.max(1, R - 1), 0.6);
  } else if (shape === "layered") {
    const discs = spec.discs ?? (2 + (r() < 0.4 ? 1 : 0));
    for (let i = 0; i < discs; i++) {
      const y = ty - i * 3;
      if (y <= h + 2) break;
      disc(jx, y, jz, Math.max(1, R - (i > 0 ? 1 : 0)), 0);
      if (r() < 0.5) disc(jx, y - 1, jz, Math.max(1, R - (i > 0 ? 1 : 0)), 0.4);
    }
  } else if (shape === "pagoda") {
    const tiers = 2 + (r() < 0.5 ? 1 : 0);
    for (let i = 0; i < tiers; i++) {
      const y = ty - i * 3;
      if (y <= h + 2) break;
      disc(jx, y, jz, Math.max(1, R - i), 0);
      if (r() < 0.5) disc(jx, y - 1, jz, Math.max(1, R - i), 0.35);
    }
    disc(jx, ty + 1, jz, 1, 0);
  } else if (shape === "weeping") {
    disc(jx, ty, jz, Math.max(1, R - 1), 0);
    disc(jx, ty + 1, jz, Math.max(1, R - 2), 0.2);
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
      const d = Math.hypot(dx, dz);
      if (d < R - 0.5 || d > R + 0.5 || r() < 0.55) continue;
      const len = 1 + Math.floor(r() * 3);
      for (let k = 1; k <= len; k++) {
        if (inTrunk(jx + dx, ty - k, jz + dz)) break;
        w(jx + dx, ty - k, jz + dz, spec.leaf);
      }
    }
  } else if (shape === "vase") {
    for (let dy = -1; dy <= 0; dy++) {
      for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
        if (Math.hypot(dx, dz) < R - 1) continue;
        if (cutCorner(dx, dz, R)) continue;
        if (inTrunk(jx + dx, ty + dy, jz + dz)) continue;
        w(jx + dx, ty + dy, jz + dz, spec.leaf);
      }
    }
    disc(jx, ty + 1, jz, Math.max(1, R - 2), 0.2);
  } else if (shape === "windswept") {
    const cx = jx + ddx * 2, cz = jz + ddz * 2;
    const rr = Math.max(1, R - 1);
    for (let dy = -2; dy <= 1; dy++) {
      disc(cx, ty + dy, cz, dy <= 0 ? rr : Math.max(1, rr - 1), dy === -2 ? 0.3 : 0);
    }
    disc(cx - ddx * 3, ty - 1, cz - ddz * 3, Math.max(1, rr - 1), 0.6);
  } else {
    for (let dy = -2; dy <= 1; dy++) {
      disc(jx, ty + dy, jz, dy <= 0 ? R : R - 1, dy === -2 ? 0.1 : 0.05);
    }
    disc(jx, ty + 1, jz, 1, 0.1);
  }
  for (const [tx2, ty2, tz2] of tips) {
    disc(tx2, ty2, tz2, 1, 0.25);
  }
  if (shape !== "spire") {
    twr(topX, ty + 1, topZ);
    if (r() < 0.5) twr(topX, ty + 2, topZ);
  }
  if (spec.snowCap) w(topX, ty + 2, topZ, 51);
  if (spec.vines) {
    const n = 4 + (r() < 0.5 ? 2 : 0);
    for (let i = 0; i < n; i++) {
      const ang = r() * Math.PI * 2;
      const vx = topX + Math.round(Math.cos(ang) * 3);
      const vz = topZ + Math.round(Math.sin(ang) * 3);
      const len = 2 + Math.floor(r() * 3);
      for (let k = 1; k <= len; k++) {
        const vy = ty - k;
        if (vy <= h + 1) break;
        w(vx, vy, vz, 674);
      }
    }
  }
}

export function generateCherryTree(x: number, z: number, h: number, r: RandomFunc, w: VoxelWriter) {
  generateCustomTree(x, z, h, r, w, {
    trunk: 119, leaf: 109, hMin: 4, hMax: 9, crown: 2,
    trunks: ["straight", "forked", "leaning", "twisted"],
    canopies: ["blob", "vase", "windswept", "layered", "pagoda"]
  });
  // Pink petal carpet drift on floor
  if (r() < 0.6) w(x + 1, h + 1, z, 123);
  if (r() < 0.6) w(x - 1, h + 1, z + 1, 123);
  for (let i = 0; i < 5; i++) {
    if (r() >= 0.55) continue;
    const ang = i * 2.4 + r() * 0.6;
    const rad = 1 + Math.floor(r() * 3);
    w(x + Math.round(Math.cos(ang) * rad), h + 1, z + Math.round(Math.sin(ang) * rad), 123);
  }
}

export function generateCrimsonMapleTree(x: number, z: number, h: number, r: RandomFunc, w: VoxelWriter) {
  generateCustomTree(x, z, h, r, w, {
    trunk: 120, leaf: 110, hMin: 4, hMax: 11, crown: 2,
    trunks: TRUNK_STYLES,
    canopies: ["blob", "layered", "vase", "windswept", "pagoda"]
  });
  // Fallen crimson foliage on floor
  if (r() < 0.7) w(x + 1, h + 1, z, 123);
  if (r() < 0.7) w(x - 1, h + 1, z + 1, 123);
}

export function generateGoldenAspenTree(x: number, z: number, h: number, r: RandomFunc, w: VoxelWriter) {
  generateCustomTree(x, z, h, r, w, {
    trunk: 23, leaf: 111, hMin: 5, hMax: 13, crown: 2,
    trunks: ["straight", "pillar", "leaning", "twisted"],
    canopies: ["spire", "blob", "layered"]
  });
}

export function generateWarpedTree(x: number, z: number, h: number, r: RandomFunc, w: VoxelWriter) {
  const th = 5 + Math.floor(r() * 7);
  for (let y = 1; y <= th; y++) w(x, h + y, z, 121); // Cyan stem
  for (let dy = -1; dy <= 3; dy++) {
    const rad = dy >= 2 ? 1 : 2;
    for (let dz = -rad; dz <= rad; dz++) {
      for (let dx = -rad; dx <= rad; dx++) {
        w(x + dx, h + th + dy, z + dz, (dx === 0 && dz === 0 && dy === 0) ? 88 : 112); // Shroomlight core + violet leaves
      }
    }
  }
}

export function generateBambooGroves(x: number, z: number, _h: number, r: RandomFunc, w: VoxelWriter, terrainHeight: HeightLookup) {
  const count = 3 + Math.floor(r() * 6);
  for (let i = 0; i < count; i++) {
    const bx = x + Math.floor((r() - 0.5) * 5);
    const bz = z + Math.floor((r() - 0.5) * 5);
    const bh = terrainHeight(bx, bz);
    const stalkH = 6 + Math.floor(r() * 10);
    for (let y = 1; y <= stalkH; y++) w(bx, bh + y, bz, 113); // Bamboo stalk
    w(bx, bh + stalkH + 1, bz, 114); // Palm leaf tuft
  }
}

export function generateRedwoodTree(x: number, z: number, h: number, r: RandomFunc, w: VoxelWriter) {
  generateCustomTree(x, z, h, r, w, {
    trunk: 122, leaf: 24, hMin: 16, hMax: 36, tw2: 0.85, tw3: 0.15, crown: 3,
    trunks: ["straight", "pillar", "buttress"],
    canopies: ["spire", "layered", "pagoda"]
  });
  for (let dz = -3; dz <= 4; dz++) {
    for (let dx = -3; dx <= 4; dx++) {
      const onTrunk = (dx === 0 || dx === 1) && (dz === 0 || dz === 1);
      if (!onTrunk && Math.hypot(dx - 0.5, dz - 0.5) <= 3.2 && r() < 0.6) w(x + dx, h, z + dz, 4);
    }
  }
}

export function generateDarkOakTree(x: number, z: number, h: number, r: RandomFunc, w: VoxelWriter) {
  generateCustomTree(x, z, h, r, w, {
    trunk: 297, leaf: 115, hMin: 5, hMax: 12, forceTw: 2, crown: 3,
    trunks: ["straight", "buttress", "twisted"],
    canopies: ["blob", "layered", "flatTop", "pagoda"]
  });
  // Podzol base patch
  for (let dz = -2; dz <= 3; dz++) {
    for (let dx = -2; dx <= 3; dx++) {
      if (r() < 0.65) w(x + dx, h, z + dz, 4);
    }
  }
}

export function generateHugeMushroom(x: number, z: number, h: number, r: RandomFunc, w: VoxelWriter, isRed = true) {
  const mh = 4 + Math.floor(r() * 6);
  for (let y = 1; y <= mh; y++) w(x, h + y, z, 23); // Mushroom Stem
  const capId = isRed ? 582 : 217; // Red / Brown Mushroom Block Cap
  for (let dz = -2; dz <= 2; dz++) {
    for (let dx = -2; dx <= 2; dx++) {
      w(x + dx, h + mh + 1, z + dz, capId);
    }
  }
  for (let dz = -2; dz <= 2; dz++) {
    w(x - 2, h + mh, z + dz, capId);
    w(x + 2, h + mh, z + dz, capId);
  }
  for (let dx = -2; dx <= 2; dx++) {
    w(x + dx, h + mh, z - 2, capId);
    w(x + dx, h + mh, z + 2, capId);
  }
}

export function generateMangroveTree(x: number, z: number, h: number, r: RandomFunc, w: VoxelWriter) {
  const rootHeight = 2 + Math.floor(r() * 3);
  const directions = [
    [-1, 0], [1, 0], [0, -1], [0, 1],
    [-2, 0], [2, 0], [0, -2], [0, 2],
    [-1, -1], [1, 1], [-1, 1], [1, -1]
  ];
  for (const [dx, dz] of directions) {
    const dist = Math.hypot(dx, dz);
    const topRootY = Math.max(1, Math.floor(rootHeight - dist * 0.8));
    for (let dy = 0; dy <= topRootY; dy++) {
      w(x + dx, h + dy, z + dz, 481);
    }
  }

  const trunkTop = h + rootHeight + 4 + Math.floor(r() * 6);
  const secondStory = r() < 0.45;
  const trunkEnd = secondStory ? trunkTop + 3 : trunkTop;
  for (let y = h + rootHeight; y <= trunkEnd; y++) {
    w(x, y, z, 481);
  }

  for (let dy = -2; dy <= 2; dy++) {
    const rad = dy === 2 ? 2 : (dy === -2 ? 4 : 3);
    for (let dz = -rad; dz <= rad; dz++) {
      for (let dx = -rad; dx <= rad; dx++) {
        if (Math.hypot(dx, dz) > rad + 0.4 && r() < 0.45) continue;
        w(x + dx, trunkTop + dy, z + dz, 117);
        if (dy === -2 && r() < 0.4) {
          w(x + dx, trunkTop + dy - 1, z + dz, 117);
          if (r() < 0.3) w(x + dx, trunkTop + dy - 2, z + dz, 117);
        }
      }
    }
  }
  if (secondStory) {
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        if (Math.hypot(dx, dz) > 2.4 && r() < 0.5) continue;
        if (dx === 0 && dz === 0) continue;
        w(x + dx, trunkTop + 3, z + dz, 117);
      }
    }
    w(x, trunkTop + 4, z, 117);
  }
}

export interface JungleOptions {
  tier?: "under" | "canopy" | "emergent"; // rainforest story (default worldgen-rolled)
}

export function generateJungleTree(x: number, z: number, h: number, r: RandomFunc, w: VoxelWriter, opts: JungleOptions = {}) {
  let tier = opts.tier;
  if (!tier) {
    const v = r();
    tier = v < 0.08 ? "emergent" : (v < 0.38 ? "canopy" : "under");
  }
  if (tier === "emergent") {
    generateCustomTree(x, z, h, r, w, {
      trunk: 25, leaf: 114, hMin: 18, hMax: 26, forceTw: 2, crown: 3,
      trunks: ["straight", "pillar", "buttress"],
      canopies: ["blob", "layered", "flatTop", "pagoda"], vines: true
    });
  } else if (tier === "canopy") {
    generateCustomTree(x, z, h, r, w, {
      trunk: 25, leaf: 114, hMin: 10, hMax: 15, crown: 3,
      trunks: TRUNK_STYLES,
      canopies: ["blob", "layered", "weeping", "vase", "windswept"], vines: true
    });
  } else {
    generateCustomTree(x, z, h, r, w, {
      trunk: 25, leaf: 114, hMin: 5, hMax: 9, crown: 2,
      trunks: TRUNK_STYLES,
      canopies: ["blob", "layered", "weeping", "vase", "windswept"], vines: true
    });
  }
  const fr = r();
  if (fr < 0.5) w(x + 1, h + 1, z + 1, 1202);
  else if (fr < 0.8) w(x - 1, h + 1, z, 361);
}

export function generateAcaciaTree(x: number, z: number, h: number, r: RandomFunc, w: VoxelWriter) {
  generateCustomTree(x, z, h, r, w, {
    trunk: 143, leaf: 118, hMin: 5, hMax: 9, crown: 3,
    trunks: ["straight", "leaning", "forked"],
    canopies: ["flatTop", "blob", "windswept"]
  });
  for (let dz = -2; dz <= 2; dz++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (dx === 0 && dz === 0) continue;
      if (Math.hypot(dx, dz) <= 2.2 && r() < 0.5) w(x + dx, h, z + dz, 3);
    }
  }
}

export function generatePalmTree(x: number, z: number, h: number, r: RandomFunc, w: VoxelWriter) {
  const th = 6 + Math.floor(r() * 7);
  const [pdx, pdz] = DIR4[Math.floor(r() * 4)];
  for (let y = 1; y <= th; y++) {
    const lean = Math.floor(y / 3);
    w(x + pdx * lean, h + y, z + pdz * lean, 25);
  }
  const topX = x + pdx * Math.floor(th / 3),
    topY = h + th, topZ = z + pdz * Math.floor(th / 3);
  for (let dz = -3; dz <= 3; dz++) {
    for (let dx = -3; dx <= 3; dx++) {
      if (Math.abs(dx) === Math.abs(dz) || dx === 0 || dz === 0) {
        w(topX + dx, topY + (Math.abs(dx) + Math.abs(dz) > 2 ? -1 : 1), topZ + dz, 114);
      }
    }
  }
}

export function generateMeadowTree(x: number, z: number, h: number, r: RandomFunc, w: VoxelWriter) {
  generateCustomTree(x, z, h, r, w, {
    trunk: 19, leaf: 109, hMin: 3, hMax: 5, crown: 1,
    trunks: ["straight"],
    canopies: ["blob", "vase"]
  });
}

export function generateBirchTree(x: number, z: number, h: number, r: RandomFunc, w: VoxelWriter) {
  generateCustomTree(x, z, h, r, w, {
    trunk: 23, leaf: 116, hMin: 5, hMax: 11, tw2: 0.15, crown: 2,
    trunks: ["straight", "leaning", "twisted", "buttress", "pillar", "forked", "multistem"],
    canopies: ["blob", "layered", "vase", "windswept", "weeping", "pagoda"]
  });
}

export function generateAlpinePine(x: number, z: number, h: number, r: RandomFunc, w: VoxelWriter) {
  generateCustomTree(x, z, h, r, w, {
    trunk: 22, leaf: 24, hMin: 3, hMax: 6, crown: 1,
    trunks: ["straight"],
    canopies: ["blob", "spire"]
  });
}

export function generateIceSpike(x: number, z: number, h: number, r: RandomFunc, w: VoxelWriter) {
  if (r() < 0.45) {
    const height = 20 + Math.floor(r() * 21);
    for (let y = 1; y <= 3; y++) {
      for (let dz = -2; dz <= 2; dz++) {
        for (let dx = -2; dx <= 2; dx++) {
          if (Math.hypot(dx, dz) <= 2.2) w(x + dx, h + y, z + dz, 53);
        }
      }
    }
    for (let y = 4; y <= height - 4; y++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          w(x + dx, h + y, z + dz, 53);
        }
      }
    }
    for (let y = Math.max(4, height - 3); y <= height; y++) w(x, h + y, z, 53);
  } else {
    const height = 10 + Math.floor(r() * 7);
    for (let y = 1; y <= height; y++) {
      const rad = Math.max(0, Math.ceil(3 * (1 - y / (height + 1))));
      for (let dz = -rad; dz <= rad; dz++) {
        for (let dx = -rad; dx <= rad; dx++) {
          if (Math.hypot(dx, dz) <= rad + 0.4) w(x + dx, h + y, z + dz, 53);
        }
      }
    }
  }
}

export function generateCactus(x: number, z: number, h: number, r: RandomFunc, w: VoxelWriter) {
  const height = 1 + Math.floor(r() * 3);
  for (let y = 1; y <= height; y++) w(x, h + y, z, 227);
}

export function generateSwampOak(x: number, z: number, h: number, r: RandomFunc, w: VoxelWriter) {
  generateCustomTree(x, z, h, r, w, {
    trunk: 16, leaf: 18, hMin: 4, hMax: 6, crown: 2,
    trunks: ["straight", "leaning", "twisted"],
    canopies: ["blob", "weeping", "layered"], vines: true
  });
  for (let dz = -2; dz <= 2; dz++) {
    for (let dx = -2; dx <= 2; dx++) {
      if (dx === 0 && dz === 0) continue;
      if (r() < 0.5) w(x + dx, h, z + dz, 490);
    }
  }
  if (r() < 0.35) w(x + 1, h + 1, z, 201);
}

export interface OakOptions {
  height?: number;  // trunk length (default worldgen-random by size class)
  layers?: number;  // canopy rows (default 4 = worldgen behavior)
  leaf?: number;    // leaf block id (default 18)
  trunkWidth?: number; // 1..3 trunk footprint (default worldgen-rolled)
}

/** Big green oak — trunk style × canopy shape composer (see TreeSpec). Opts pin the roll for builders/tests. */
export function generateOakTree(x: number, z: number, h: number, r: RandomFunc, w: VoxelWriter, opts: OakOptions = {}) {
  const spec: TreeSpec = {
    trunk: 16, leaf: opts.leaf ?? 18, hMin: 4, hMax: 8, tw2: 0.25, tw3: 0.05, crown: 2,
    trunks: TRUNK_STYLES,
    canopies: ["blob", "flatTop", "layered", "weeping", "vase", "windswept", "pagoda"]
  };
  if (opts.trunkWidth) spec.forceTw = opts.trunkWidth;
  if (opts.height !== undefined) { spec.hMin = opts.height; spec.hMax = opts.height; }
  if (opts.layers !== undefined) spec.discs = opts.layers;
  generateCustomTree(x, z, h, r, w, spec);
}
