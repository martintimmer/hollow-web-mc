/**
 * Nether Dimension Procedural Terrain Generator
 * Generates an authentic 3D cavernous Nether dimension bounded by bedrock ceilings
 * and floors, vast lava oceans at Y <= 31, and 5 distinct Nether biomes:
 * 1. Nether Wastes
 * 2. Crimson Forest (Giant Crimson Fungi, Shroomlight, Crimson Nylium)
 * 3. Warped Forest (Giant Warped Fungi, Shroomlight, Warped Nylium)
 * 4. Soul Sand Valley (Soul Sand, Soul Soil, Basalt Pillars, Soul Fire)
 * 5. Basalt Deltas (Basalt, Smooth Basalt, Blackstone, Magma blocks)
 */

import { CH, CHH, type Chunk } from "../world/index.ts";
import { makeNoise, javaHash } from "../noise";

export const NETHER_LAVA_LEVEL = 31;
export const BEDROCK_ID = 14;
export const NETHERRACK_ID = 56;
export const LAVA_ID = 40;
export const SOUL_SAND_ID = 57;
export const SOUL_SOIL_ID = 632;
export const SOUL_FIRE_ID = 630;
export const BASALT_ID = 173;
export const SMOOTH_BASALT_ID = 625;
export const BLACKSTONE_ID = 193;
export const MAGMA_ID = 99;
export const GLOWSTONE_ID = 47;
export const CRIMSON_NYLIUM_ID = 277;
export const CRIMSON_STEM_ID = 120;
export const CRIMSON_ROOTS_ID = 279;
export const CRIMSON_FUNGUS_ID = 276;
export const NETHER_WART_BLOCK_ID = 499;
export const SHROOMLIGHT_ID = 88;
export const WARPED_NYLIUM_ID = 677;
export const WARPED_STEM_ID = 121;
export const WARPED_ROOTS_ID = 679;
export const WARPED_FUNGUS_ID = 676;
export const WARPED_WART_BLOCK_ID = 684;
export const NETHER_QUARTZ_ORE_ID = 497;
export const NETHER_GOLD_ORE_ID = 496;
export const ANCIENT_DEBRIS_ID = 149;

import { getStructuresForChunk } from "./netherFortress";

export type NetherBiome =
  | "nether_wastes"
  | "crimson_forest"
  | "warped_forest"
  | "soul_sand_valley"
  | "basalt_deltas";

export interface NetherGenerator {
  generateChunk: (
    cx: number,
    cz: number,
    edits?: Map<string, number>,
    chestSink?: (k: string, items: Array<{ id: number; count: number } | null>) => void
  ) => Chunk;
  getBiomeAt: (x: number, z: number) => NetherBiome;
  safeSpawnCoord: (targetX?: number, targetZ?: number) => { x: number; y: number; z: number };
}

export function createNetherGenerator(seedInput: string | number): NetherGenerator {
  const seedNum = typeof seedInput === "number" ? seedInput : javaHash(String(seedInput));
  // Independent Nether seed mixing so terrain is unique from Overworld
  const netherSeed = (Math.imul(seedNum ^ 0x5e3d7a8b, 2246822519) | 0) ^ 0x1a2b3c4d;
  const seedMix = () => netherSeed;
  const noise = makeNoise(seedMix);

  function getBiomeAt(x: number, z: number): NetherBiome {
    const t = noise.vnoise(x * 0.006, z * 0.006);
    const h = noise.vnoise((x + 1000) * 0.007, (z + 1000) * 0.007);

    if (t > 0.68 && h > 0.52) return "crimson_forest";
    if (t < 0.38 && h > 0.55) return "warped_forest";
    if (t < 0.36 && h < 0.40) return "soul_sand_valley";
    if (t > 0.72 && h < 0.38) return "basalt_deltas";
    return "nether_wastes";
  }

  function densityAt(x: number, y: number, z: number): number {
    // Bedrock floor (0..4) and ceiling (124..127) are unconditionally solid
    if (y <= 1 || y >= 126) return 10.0;
    if (y < 4) return (4 - y) * 2.0;
    if (y > 123) return (y - 123) * 2.0;

    // Height gradient: high at top/bottom, hollow chamber in the middle
    let baseBias = 0.0;
    if (y < 32) {
      baseBias = (32 - y) / 32 * 0.65;
    } else if (y > 100) {
      baseBias = (y - 100) / 28 * 0.75;
    } else {
      // Middle cavern space (32..100): negative bias creates spacious open caverns
      baseBias = -0.22 - Math.sin((y - 32) / 68 * Math.PI) * 0.16;
    }

    // Multi-octave 3D continuous noise
    const n1 = noise.vnoise3D(x * 0.038, y * 0.048, z * 0.038);
    const n2 = noise.vnoise3D(x * 0.082, y * 0.082, z * 0.082) * 0.35;
    const n3 = noise.vnoise3D(x * 0.16, y * 0.16, z * 0.16) * 0.12;

    return baseBias + (n1 + n2 + n3 - 0.72);
  }

  function generateChunk(
    cx: number,
    cz: number,
    edits?: Map<string, number>,
    chestSink?: (k: string, items: Array<{ id: number; count: number } | null>) => void
  ): Chunk {
    const chunk: Chunk = {
      data: new Uint16Array(CH * CHH * CH),
      cx,
      cz,
      maxY: 127,
      meshes: null
    };
    const data = chunk.data;
    const x0 = cx * CH;
    const z0 = cz * CH;

    const getVoxel = (lx: number, y: number, lz: number): number => {
      if (y < 0 || y >= CHH) return 0;
      return data[y * 256 + lz * 16 + lx];
    };

    const setVoxel = (lx: number, y: number, lz: number, id: number) => {
      if (y < 0 || y >= CHH || lx < 0 || lx >= 16 || lz < 0 || lz >= 16) return;
      data[y * 256 + lz * 16 + lx] = id;
    };

    // 1. Precompute 3D density lattice at 4x4x4 intervals (5x33x5 = 825 samples)
    const STEP_XZ = 4;
    const STEP_Y = 4;
    const GRID_XZ = 5; // 0, 4, 8, 12, 16
    const GRID_Y = 33; // 0, 4, ..., 128
    const lattice = new Float32Array(GRID_XZ * GRID_Y * GRID_XZ);

    for (let gz = 0; gz < GRID_XZ; gz++) {
      const z = z0 + gz * STEP_XZ;
      for (let gx = 0; gx < GRID_XZ; gx++) {
        const x = x0 + gx * STEP_XZ;
        for (let gy = 0; gy < GRID_Y; gy++) {
          const y = gy * STEP_Y;
          lattice[(gy * GRID_XZ + gz) * GRID_XZ + gx] = densityAt(x, y, z);
        }
      }
    }

    // 2. Interpolate density across all voxels and fill initial blocks
    for (let cellZ = 0; cellZ < 4; cellZ++) {
      for (let cellX = 0; cellX < 4; cellX++) {
        for (let cellY = 0; cellY < 32; cellY++) {
          const d000 = lattice[(cellY * GRID_XZ + cellZ) * GRID_XZ + cellX];
          const d100 = lattice[(cellY * GRID_XZ + cellZ) * GRID_XZ + (cellX + 1)];
          const d001 = lattice[(cellY * GRID_XZ + (cellZ + 1)) * GRID_XZ + cellX];
          const d101 = lattice[(cellY * GRID_XZ + (cellZ + 1)) * GRID_XZ + (cellX + 1)];

          const d010 = lattice[((cellY + 1) * GRID_XZ + cellZ) * GRID_XZ + cellX];
          const d110 = lattice[((cellY + 1) * GRID_XZ + cellZ) * GRID_XZ + (cellX + 1)];
          const d011 = lattice[((cellY + 1) * GRID_XZ + (cellZ + 1)) * GRID_XZ + cellX];
          const d111 = lattice[((cellY + 1) * GRID_XZ + (cellZ + 1)) * GRID_XZ + (cellX + 1)];

          for (let dy = 0; dy < 4; dy++) {
            const y = cellY * 4 + dy;
            const ty = dy * 0.25;

            const y00 = d000 + (d010 - d000) * ty;
            const y10 = d100 + (d110 - d100) * ty;
            const y01 = d001 + (d011 - d001) * ty;
            const y11 = d101 + (d111 - d101) * ty;

            for (let dz = 0; dz < 4; dz++) {
              const lz = cellZ * 4 + dz;
              const tz = dz * 0.25;

              const z0 = y00 + (y01 - y00) * tz;
              const z1 = y10 + (y11 - y10) * tz;

              for (let dx = 0; dx < 4; dx++) {
                const lx = cellX * 4 + dx;
                const tx = dx * 0.25;
                const d = z0 + (z1 - z0) * tx;

                // Bedrock Floor (0..4)
                if (y === 0) {
                  setVoxel(lx, 0, lz, BEDROCK_ID);
                  continue;
                } else if (y <= 3) {
                  const x = x0 + lx, z = z0 + lz;
                  if (noise.hash3(x * 17 + 5, y * 31, z * 23 + 11) < (3 - y) * 0.35) {
                    setVoxel(lx, y, lz, BEDROCK_ID);
                    continue;
                  }
                }

                // Bedrock Ceiling (124..127)
                if (y === 127) {
                  setVoxel(lx, 127, lz, BEDROCK_ID);
                  continue;
                } else if (y >= 124) {
                  const x = x0 + lx, z = z0 + lz;
                  if (noise.hash3(x * 19 + 7, y * 29, z * 37 + 13) < (y - 123) * 0.35) {
                    setVoxel(lx, y, lz, BEDROCK_ID);
                    continue;
                  }
                }

                if (d > 0) {
                  setVoxel(lx, y, lz, NETHERRACK_ID);
                } else {
                  setVoxel(lx, y, lz, y <= NETHER_LAVA_LEVEL ? LAVA_ID : 0);
                }
              }
            }
          }
        }
      }
    }

    // 2. Biome Surface Coating & Ore Distribution
    for (let lz = 0; lz < 16; lz++) {
      const z = z0 + lz;
      for (let lx = 0; lx < 16; lx++) {
        const x = x0 + lx;
        const biome = getBiomeAt(x, z);

        for (let y = 4; y < 124; y++) {
          const block = getVoxel(lx, y, lz);
          if (block !== NETHERRACK_ID) continue;

          const above = getVoxel(lx, y + 1, lz);
          const below = getVoxel(lx, y - 1, lz);
          const isFloor = (above === 0 || above === LAVA_ID);
          const isCeiling = (below === 0);

          // Ore Veins in Netherrack
          const oreR = noise.hash3(x * 43 + 3, y * 27 + 11, z * 53 + 7);
          if (oreR < 0.018 && y > 10 && y < 118) {
            setVoxel(lx, y, lz, NETHER_QUARTZ_ORE_ID);
            continue;
          } else if (oreR < 0.032 && y > 12 && y < 112) {
            setVoxel(lx, y, lz, NETHER_GOLD_ORE_ID);
            continue;
          } else if (oreR < 0.033 && y >= 8 && y <= 22) {
            setVoxel(lx, y, lz, ANCIENT_DEBRIS_ID);
            continue;
          }

          // Biome Floor Modifications
          if (isFloor && y >= NETHER_LAVA_LEVEL) {
            if (biome === "crimson_forest") {
              setVoxel(lx, y, lz, CRIMSON_NYLIUM_ID);
            } else if (biome === "warped_forest") {
              setVoxel(lx, y, lz, WARPED_NYLIUM_ID);
            } else if (biome === "soul_sand_valley") {
              const rSoil = noise.hash2(x * 19, z * 31);
              setVoxel(lx, y, lz, rSoil > 0.4 ? SOUL_SAND_ID : SOUL_SOIL_ID);
              // Occasional blue Soul Fire on Soul Sand/Soil
              if (above === 0 && rSoil < 0.05) {
                setVoxel(lx, y + 1, lz, SOUL_FIRE_ID);
              }
            } else if (biome === "basalt_deltas") {
              const rDelta = noise.hash2(x * 23, z * 29);
              if (rDelta < 0.45) setVoxel(lx, y, lz, BASALT_ID);
              else if (rDelta < 0.75) setVoxel(lx, y, lz, BLACKSTONE_ID);
              else setVoxel(lx, y, lz, SMOOTH_BASALT_ID);
            } else if (biome === "nether_wastes" && y <= NETHER_LAVA_LEVEL + 2) {
              // Magma blocks along nether wastes lava banks
              if (noise.hash2(x * 13, z * 17) < 0.35) {
                setVoxel(lx, y, lz, MAGMA_ID);
              }
            }
          }

          // Ceiling Glowstone Stalactites (y = 85..115)
          if (isCeiling && y >= 85 && y <= 115) {
            const glowR = noise.hash3(x * 37 + 1, y * 19 + 5, z * 41 + 13);
            if (glowR < 0.045) {
              const len = 2 + Math.floor(noise.hash2(x * 7, z * 11) * 3);
              for (let dy = 0; dy < len; dy++) {
                if (y - dy > NETHER_LAVA_LEVEL + 5 && getVoxel(lx, y - dy, lz) === 0) {
                  setVoxel(lx, y - dy, lz, GLOWSTONE_ID);
                }
              }
            }
          }
        }
      }
    }

    // 3. Giant Fungi Vegetation & Basalt Columns Scatter
    for (let lz = 2; lz < 14; lz++) {
      const z = z0 + lz;
      for (let lx = 2; lx < 14; lx++) {
        const x = x0 + lx;
        const biome = getBiomeAt(x, z);

        for (let y = NETHER_LAVA_LEVEL + 2; y < 90; y++) {
          const cur = getVoxel(lx, y, lz);
          const above = getVoxel(lx, y + 1, lz);

          // Giant Crimson Fungi Tree
          if (biome === "crimson_forest" && cur === CRIMSON_NYLIUM_ID && above === 0) {
            const treeR = noise.hash2(x * 53 + 7, z * 59 + 11);
            if (treeR < 0.04) {
              growGiantFungi(setVoxel, lx, y + 1, lz, "crimson", noise.hash3(x, y, z));
            } else if (treeR < 0.20 && above === 0) {
              setVoxel(lx, y + 1, lz, treeR < 0.12 ? CRIMSON_ROOTS_ID : CRIMSON_FUNGUS_ID);
            }
          }

          // Giant Warped Fungi Tree
          else if (biome === "warped_forest" && cur === WARPED_NYLIUM_ID && above === 0) {
            const treeR = noise.hash2(x * 61 + 3, z * 67 + 5);
            if (treeR < 0.04) {
              growGiantFungi(setVoxel, lx, y + 1, lz, "warped", noise.hash3(x, y, z));
            } else if (treeR < 0.20 && above === 0) {
              setVoxel(lx, y + 1, lz, treeR < 0.12 ? WARPED_ROOTS_ID : WARPED_FUNGUS_ID);
            }
          }

          // Basalt Pillar in Soul Sand Valley
          else if (biome === "soul_sand_valley" && (cur === SOUL_SAND_ID || cur === SOUL_SOIL_ID) && above === 0) {
            const pillarR = noise.hash2(x * 71 + 9, z * 73 + 17);
            if (pillarR < 0.025) {
              growBasaltPillar(setVoxel, getVoxel, lx, y + 1, lz);
            }
          }
        }
      }
    }

    // 3b. Nether Structures: Nether Fortress & Ruined Portals
    const structures = getStructuresForChunk(seedNum, cx, cz);
    for (const v of structures.voxels) {
      const lx = ((v.x % CH) + CH) % CH;
      const lz = ((v.z % CH) + CH) % CH;
      if (v.y >= 0 && v.y < CHH) {
        setVoxel(lx, v.y, lz, v.id);
      }
    }
    if (chestSink && structures.chests.size > 0) {
      for (const [k, items] of structures.chests.entries()) {
        chestSink(k, items);
      }
    }

    // 4. Replay player edits if provided
    if (edits) {
      for (const [coord, blockId] of edits.entries()) {
        const [bx, by, bz] = coord.split(",").map(Number);
        if (Math.floor(bx / CH) === cx && Math.floor(bz / CH) === cz) {
          const lx = ((bx % CH) + CH) % CH;
          const lz = ((bz % CH) + CH) % CH;
          setVoxel(lx, by, lz, blockId);
        }
      }
    }

    return chunk;
  }

  function growGiantFungi(
    setVoxel: (lx: number, y: number, lz: number, id: number) => void,
    lx: number,
    baseY: number,
    lz: number,
    type: "crimson" | "warped",
    seedR: number
  ) {
    const stemId = type === "crimson" ? CRIMSON_STEM_ID : WARPED_STEM_ID;
    const wartId = type === "crimson" ? NETHER_WART_BLOCK_ID : WARPED_WART_BLOCK_ID;
    const height = 5 + Math.floor(seedR * 5); // 5..9 blocks high

    // Trunk
    for (let dy = 0; dy < height; dy++) {
      setVoxel(lx, baseY + dy, lz, stemId);
    }

    // Bulbous Canopy (3x3 to 5x5)
    const capY = baseY + height;
    for (let dx = -2; dx <= 2; dx++) {
      for (let dz = -2; dz <= 2; dz++) {
        const dist = Math.abs(dx) + Math.abs(dz);
        if (dist <= 3) {
          setVoxel(lx + dx, capY, lz + dz, wartId);
          setVoxel(lx + dx, capY + 1, lz + dz, wartId);
          if (dist <= 2) {
            setVoxel(lx + dx, capY + 2, lz + dz, wartId);
          }
        }
      }
    }

    // Shroomlight inside canopy
    setVoxel(lx, capY, lz, SHROOMLIGHT_ID);
    setVoxel(lx, capY + 1, lz, SHROOMLIGHT_ID);
  }

  function growBasaltPillar(
    setVoxel: (lx: number, y: number, lz: number, id: number) => void,
    getVoxel: (lx: number, y: number, lz: number) => number,
    lx: number,
    baseY: number,
    lz: number
  ) {
    for (let dy = 0; dy < 30; dy++) {
      const y = baseY + dy;
      if (y >= 120 || getVoxel(lx, y, lz) === NETHERRACK_ID) break;
      setVoxel(lx, y, lz, BASALT_ID);
      if (dy < 12) {
        setVoxel(lx + 1, y, lz, BASALT_ID);
        setVoxel(lx, y, lz + 1, BASALT_ID);
      }
    }
  }

  function safeSpawnCoord(targetX = 0, targetZ = 0): { x: number; y: number; z: number } {
    // Finds a safe landing position (solid floor, 2 blocks air, above lava)
    const cx = Math.floor(targetX / CH);
    const cz = Math.floor(targetZ / CH);
    const chunk = generateChunk(cx, cz);
    const lx = ((Math.floor(targetX) % CH) + CH) % CH;
    const lz = ((Math.floor(targetZ) % CH) + CH) % CH;

    for (let y = NETHER_LAVA_LEVEL + 2; y < 100; y++) {
      const b = chunk.data[y * 256 + lz * 16 + lx];
      const above1 = chunk.data[(y + 1) * 256 + lz * 16 + lx];
      const above2 = chunk.data[(y + 2) * 256 + lz * 16 + lx];
      if (b !== 0 && b !== LAVA_ID && above1 === 0 && above2 === 0) {
        return { x: targetX, y: y + 1.1, z: targetZ };
      }
    }

    // Fallback safe platform altitude
    return { x: targetX, y: 64.1, z: targetZ };
  }

  return { generateChunk, getBiomeAt, safeSpawnCoord };
}
