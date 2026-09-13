# Pan-Biome Odyssey & Extreme Elevation Map Type Implementation Plan

> **SUPERSEDED (2026-09-06):** multiple world types were removed — Standard is now the
> only archetype and varies relief/climate/seas regionally inside one generator
> (`regionReliefAt`/`regionTempAt`/`regionSeaAt` in `terrainGenerator.ts`).
> Kept for historical reference.

**Date:** 2026-09-01 · **Status:** Proposed Architecture & Technical Plan  
**Target Map Type:** `odyssey` ("Pan-Biome Odyssey / Grand Tour")  
**Companion Documents:** [`docs/BLOCKS_CATALOG_PLAN.md`](./BLOCKS_CATALOG_PLAN.md), [`catalog/biome-registry.json`](https://github.com/martintimmer/hollow-web-mc/blob/main/catalog/biome-registry.json), [`kb/environments.md`](https://github.com/martintimmer/hollow-web-mc/blob/main/kb/environments.md)  
**Live Surfaces Impacted:** `src/game/terrain/`, `src/game/world.ts`, `/seed.html`, `/blocks.html`

---

## 1. Executive Summary & Problem Statement

### The User Vision
1. **Explore All Biomes in a Single Seed:** Create a new map type where **every biome** in the game's registry is guaranteed to generate within a coherent exploration perimeter. A player in creative flight should be able to circumnavigate spawn and smoothly experience every biome transition without searching across tens of thousands of random coordinates.
2. **Multi-Seed Superposition / Biome Convergence:** Merge the characteristics and feature density of specialized seeds into a unified composite world.
3. **Extreme Elevation Differences (Verticality Overhaul):** Drastically expand vertical relief complexity—transforming the terrain from gentle, low-frequency rolling hills into dramatic canyons, terraced stepped plateaus, plunging coastal fjords, natural rock arches, and alpine mountain spires reaching the world ceiling.

### Current Engine Constraints & Bottlenecks
An investigation of [`src/game/terrain/terrainGenerator.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/terrain/terrainGenerator.ts) and [`src/game/terrain/biomes.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/src/game/terrain/biomes.ts) reveals why standard seeds currently fail this vision:

| System | Current Implementation | Limitation / Root Cause |
|---|---|---|
| **Noise Scales** | `tempAt` $\lambda = 520 \times S$, `hum` $\lambda = 750 \times S$, `wNoise` $\lambda = 900 \times S$ | Macro-wavelengths (520–900 blocks) mean climate zones are colossal and uncoordinated. In a standard seed, cold and warm biomes are often separated by 3,000–6,000 blocks. |
| **Biome Selection** | Voronoi distance in arbitrary 2D $(T, H)$ space with hardcoded target coordinates | Certain climate targets dominate vast expanses. Rare biomes (e.g. Warped Forest $wNoise > 0.84$, Cherry Grove $h \ge 76 \land \text{specific } T/H$) are easily starved or completely absent within a 2,000-block radius. |
| **Elevation Relief** | Sea level `SEA = 62`, clamp `Math.max(3, Math.min(124, h))` | **Vertical compression:** 90% of land sits between $y = 58$ and $y = 76$ ($\approx 18$ blocks of real relief). Deep ocean is only $-22$ ($y \approx 40$). Mountains hit a flat clamp at $y = 124$ if amplified. |
| **River & Canyon Carving** | `riverAt < 0.065` carves shallow troughs down to `SEA - 3` | Rivers do not cut dramatic canyons through highlands; they simply flatten the terrain to water level. |
| **Steepness Dynamics** | Slope checks (`slope >= 1.8` gravel, `slope >= 2.5` stone) | Purely cosmetic block replacement on surface; does not generate overhangs, tiered plateaus, or 3D natural arches. |

---

## 2. Mathematical Architecture: The "Pan-Biome Odyssey" Wheel

To guarantee that a single seed contains every biome within an accessible exploration corridor, the `odyssey` map type replaces uncorrelated Cartesian climate noise with a **Polar-Harmonic Climate Continuum with Organic Domain Warping**.

```
                           [ Glacial & Polar ]
                          θ = 330° .. 360° (0°)
                      Snowy Taiga · Alpine Pines
                                ▲
                                │
       [ Boreal & Taiga ]       │       [ Autumnal Forests ]
      θ = 270° .. 330°          │       θ = 0° .. 60°
    Giant Redwood · Dark Oak    │     Crimson Maple · Aspen · Birch
                                │
◄─────────────────────────── Spawn Basin ───────────────────────────►
  [ Mystic & Deep Grottos ]   (r = 0..200)      [ Temperate Glades ]
     θ = 210° .. 270°           │               θ = 60° .. 120°
    Warped Forest · Mycelium    │            Classic Oak · Blossom Meadow
                                │            Cherry Blossom Highlands
                                │
                                ▼
                   [ Tropical, Wetlands & Arid ]
                       θ = 120° .. 210°
             Mangrove Swamp · Bamboo Jungle · Savanna · Oasis
```

### 1. The Domain-Warped Polar Angle $\theta(x, z)$
Instead of letting temperature and humidity drift randomly, the macro-climate coordinate is driven by angle relative to the world origin $(x_0, z_0)$, perturbed by multi-octave domain warping:

$$\theta_{\text{raw}}(x, z) = \text{atan2}(z - z_0, x - x_0)$$

$$\text{warp}(x, z) = 0.45 \cdot vnoise\left(\frac{x}{180}, \frac{z}{180}\right) + 0.18 \cdot vnoise\left(\frac{x}{45}, \frac{z}{45}\right)$$

$$\theta(x, z) = \left(\theta_{\text{raw}}(x, z) + \text{warp}(x, z) + 2\pi\right) \pmod{2\pi}$$

- **Continuity:** The domain warp ensures that sector boundaries are winding, natural, and fractal—preventing straight geometric wedges.
- **Spectrum:** $\theta$ smoothly cycles through the entire thermal and ecological spectrum:
  - $\theta \in [0^\circ, 60^\circ]$: **Autumn Woods** (Crimson Maple, Golden Aspen, Birch).
  - $\theta \in [60^\circ, 120^\circ]$: **Temperate Woodlands** (Classic Oak, Blossom Meadow, Cherry Groves).
  - $\theta \in [120^\circ, 180^\circ]$: **Tropical / Wetlands** (Mangrove Swamp, Bamboo Jungle, Warm Reefs).
  - $\theta \in [180^\circ, 230^\circ]$: **Arid / Savanna / Badlands** (Acacia Savanna, Desert Oasis, Terracotta Mesa).
  - $\theta \in [230^\circ, 280^\circ]$: **Mystical / Ancient** (Warped Forest, Sculpted Grotto, Mushroom Fields).
  - $\theta \in [280^\circ, 330^\circ]$: **Old-Growth Boreal** (Giant Redwood, Dark Roofed Forest).
  - $\theta \in [330^\circ, 360^\circ]$: **Glacial / Alpine** (Snowy Taiga, Frozen Rivers, Alpine Dwarf Pines).

### 2. Multi-Seed Superposition (Harmonic Seed Lattice)
Rather than relying on one monolithic seed state, the `odyssey` generator utilizes a **cellular seed harmonic lattice**:
- The world seed $S_0$ initializes the macro polar wheel, continental coastlines, and major geographic landmarks.
- Each biome sector $k \in [0, 7]$ receives a deterministic derived seed:
  $$S_k = \text{javaHash}\left(S_0 + \text{":sector:"} + k\right) \ggg 0$$
- Local features (tree morphology, village architecture, cave micro-grottos, flower clusters) query $S_k$, ensuring that every biome exhibits the maximum structural density and variety of a specialized dedicated seed.

---

## 3. Extreme Elevation & Verticality Architecture

To achieve massive, breathtaking elevation differences while staying within the high-performance voxel engine, we overhaul the vertical dynamic range from $\sim 18$ blocks to **over 105 blocks of active playable relief** ($y \in [16, 123]$).

```
y = 124 ────────────────────── World Ceiling Clamp
        /\      /\     Alpine Horn Spires & Jagged Peaks (y = 112 .. 123)
       /  \    /  \    Snow Caps, Packed Ice, Goat Crags
y = 95 ────\──/────\── Alpine Snowline
      │    \/      │   Tiered Stepped Plateaus / Mesas (y = 82 .. 98)
      │            │   Sheer Cliffs & Exposed Strata
y = 62 ────────────┴── Sea Level (Lush Lowlands & Coastal Plains)
      │ █  │   │  █ │
      │ █  │   │  █ │  Canyon Ravines & Deep Chasms (y = 18 .. 42)
y = 16 ─┴──┴───┴──┴─┴─ Subterranean Lava Grotto & Chasm Floor
y = 0  ─────────────── Bedrock
```

### 1. Radial Elevation Progression: The "Ring of Grandeur"
The distance $r = \sqrt{(x - x_0)^2 + (z - z_0)^2}$ governs macro topographic intensity:

1. **The Crossroads Basin ($r = 0 \dots 220$ blocks):**
   - Elevation: $y = 62 \dots 72$.
   - A central meeting lake or calm confluence where all biome borders converge.
   - Gentle rolling hills, safe spawning, and accessible navigation.
2. **The Exploration Ring ($r = 220 \dots 750$ blocks):**
   - Elevation: $y = 50 \dots 88$.
   - Core biome heartlands with mature forest canopies, winding navigable rivers, and pastoral villages.
3. **The Crown of Titans ($r = 750 \dots 1400$ blocks):**
   - Elevation: $y = 18 \dots 123$.
   - Extreme vertical amplification:
     - **Alpine Horn Spires:** Dual ridge noise amplified by distance $\text{ridge}^{1.6} \times 68 + \text{ridge}_2 \times 24$ soaring to $y = 122$.
     - **Canyon Chasms:** Inverted spline carving cutting shear 45-block ravines down to $y = 18$.
     - **Coastal Fjords:** Vertical stone cliffs dropping 50+ blocks directly into deep ocean water.

### 2. Stepped Terrace Splines (Buildable Plateaus)
Instead of continuous smooth curves that make building difficult on slopes, the elevation spline introduces **quantized terrace steps** in highland and savanna regions:

$$\text{terrace}(h) = h_{\text{base}} + \Delta \cdot \left(\lfloor h / \Delta \rfloor + \text{smoothstep}\left(\frac{h \pmod \Delta}{\text{blend}}\right)\right)$$

- Yields flat, buildable mesas at $y = 78, 92, 106$ separated by sheer vertical drops of $14$ blocks.

### 3. Overhangs, Natural Arches & Hollow Cliffs
We leverage 3D density noise in high-slope areas ($\text{slope} \ge 2.2$) to produce genuine voxel overhangs and cavern openings:
- A 3D density function evaluates:
  $$\text{density}(x, y, z) = (y_{\text{surface}} - y) + 18.0 \cdot \left(vnoise3D\left(\frac{x}{18}, \frac{y}{12}, \frac{z}{18}\right) - 0.48\right)$$
- If $\text{density} < 0$, the voxel is air, carving massive natural arches, hollow caverns in cliff faces, and floating promontories.

### 4. Smooth Asymptotic Clamping
To eliminate the immersion-breaking "flat top" where mountains hit the ceiling, the linear height is passed through a soft asymptotic compression curve approaching $y = 123$:

$$h_{\text{final}} = \begin{cases} 
h & h \le 108 \\
108 + 15 \cdot \tanh\left(\frac{h - 108}{15}\right) & h > 108
\end{cases}$$

- Mountains taper into natural, needle-sharp summits at $y = 120 \dots 123$ without clipping.

---

## 4. Expanding the Biome Census

To make the "Pan-Biome Odyssey" truly complete, we integrate the top planned biomes from [`catalog/biome-registry.json`](https://github.com/martintimmer/hollow-web-mc/blob/main/catalog/biome-registry.json) into the active generator:

| Biome ID | Name | Distinctive Surface & Features | Status |
|---|---|---|---|
| `badlands` | Terracotta Mesa | Stepped plateaus ($y = 85 \dots 105$), banded terracotta strata, red sand floor. | Planned $\to$ Active |
| `plains` | Lush Wild Plains | Expansive rolling grassland ($y = 64 \dots 72$), dense wild flower carpets, zero tree clutter. | Planned $\to$ Active |
| `swamp` | Weeping Willow Bayou | Stagnant shallow water ($y = 61 \dots 63$), mangrove mud, giant lily pads, hanging vines. | Planned $\to$ Active |
| `mushroom_fields` | Giant Fungus Island | Isolated oceanic island, mycelium surface, giant red & brown mushrooms, no hostiles. | Planned $\to$ Active |
| `jagged_peaks` | Glacial Horn Peaks | Towering stone horns ($y = 110 \dots 123$), packed ice sheets, snow blocks, howling winds. | Planned $\to$ Active |

---

## 5. Tooling & Visualization Updates on `/seed.html`

[`seed-page/seed.html`](https://github.com/martintimmer/hollow-web-mc/blob/main/seed-page/seed.html) and [`seed-page/main.ts`](https://github.com/martintimmer/hollow-web-mc/blob/main/seed-page/main.ts) will be expanded to serve as the visual testbed for the new map type:

1. **World Type Selector:**
   - Add `"odyssey"`: **"Pan-Biome Odyssey (All Biomes + Titans)"**.
2. **Flight Tour Overlay (`#biome` canvas):**
   - Render a glowing golden circular flight path ($r \approx 650$ blocks) showing the recommended circumnavigation route.
   - Show cross-hairs highlighting the locations where each biome is traversed.
3. **Elevation Profile Graph (New `#elevationProfile` canvas):**
   - Display an unfolded 360° circular cross-section showing elevation along the flight tour.
   - Shows peaks, canyons, sea level, and snowline at a glance.
4. **Coverage Audit Telemetry:**
   - Display a live census counter: `All Biomes Reached: 18 / 18 within 800m flight radius (100% PASS)`.

---

## 6. Implementation Phases & Verification Gates

```text
Phase 1: Mathematical Foundation (src/game/terrain/terrainGenerator.ts & biomes.ts)
  ├── Implement polar angle calculation with multi-octave domain warping
  ├── Build radial elevation spline (Basin -> Core -> Crown of Titans)
  └── Implement asymptotic soft-clamp curve (ceiling at y = 123)

Phase 2: Elevation & Geological Complexity (canyons, terraces, arches)
  ├── Implement terraced mesa quantization
  ├── Implement deep river canyon carving (down to y = 18)
  └── Integrate 3D density noise for cliff arches and hollow caves

Phase 3: Biome Census Expansion
  ├── Register badlands, plains, swamp, and jagged_peaks in biomes.ts
  └── Connect scatters (lily pads, red sand, terracotta banding)

Phase 4: Tooling, Presets & Verification
  ├── Add 'odyssey' preset to TYPES in src/game/world.ts and catalog/biome-registry.json
  ├── Update /seed.html with flight tour path overlay and elevation profile graph
  └── Create automated headless flight probe verifying all-biome traversal
```

### Verification Criteria & DoD (Definition of Done)
1. **Single-Seed Biome Completeness:** Flying a circular path of radius $r = 750$ blocks around spawn on seed `"hollowpine"` (or any arbitrary seed) encounters 100% of implemented biomes.
2. **Vertical Elevation Span:** Minimum sampled non-cavity land/chasm elevation $\le 22$; maximum mountain peak $\ge 120$ (total playable span $\ge 98$ blocks).
3. **No Ceiling Clipping:** Zero flat-chopped mountain plateaus at $y = 124$.
4. **Machine Gates:**
   - `npx tsc -b` passes cleanly.
   - `npm run build` succeeds across all 4 bundle targets (`index`, `seed`, `blocks`, `build`).
   - `npm run sim:test` passes 99/99 tests (with golden hash assertions updated for new presets).
   - `node catalog/textureCheck.mjs` green.
   - Automated CDP probe (`scripts/probe-odyssey-flight.mjs`) records and screenshots the complete 360° flight tour with 0 console errors.
