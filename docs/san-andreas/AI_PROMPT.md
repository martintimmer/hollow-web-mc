# AI Master Voxel Generation Task: San Andreas Grove Street

## 1. Role & Task Definition
You are an expert 3D architectural & asset voxelizer for the **Hollowpine** voxel game engine (Minecraft 1.19.3 standard).
Your goal is to inspect the uploaded reference images in `docs/san-andreas/` (which may be **real-world photos, game screenshots, street scenes, vehicles, buildings, or props**) and convert them into:
1. **Individual 3D Voxel Blueprints (`bp_<object_slug>.json`)** for EACH distinct vehicle, building, foliage, or prop detected in the scene.
2. **A Full Scene Assembly Layout (`scene_san-andreas.json`)** positioning all objects together in proper relative coordinates and orientations.

## 2. Reference Images Staged in Project
- `docs/san-andreas/photo_1.jpg`

## 3. Architectural Intent & User Notes
a truck from the 70s, should be generated in mincraft style

---

## 4. Universal Real-World Metric Scale Standard (1 Voxel = 1 Meter)
In Minecraft and Hollowpine, **1 Block = 1.0 Meter $\times$ 1.0 Meter $\times$ 1.0 Meter**.
The player character is **1.8 meters tall (2 blocks tall)**.
Always scale real-world objects proportionally to their true physical dimensions:

| Object Type | Typical Real-World Size | Target Voxel Dimensions ($W \times H \times L/D$) | Key Design Rules |
| :--- | :--- | :--- | :--- |
| **Pickup Truck / SUV / Van** | $2.0\text{m } W \times 2.0\text{m } H \times 5.5\text{m } L$ | **$3 \times 2-3 \times 5-6$ blocks** | Wheels at ground $y=0$, chassis $y=0.5-1$, hood/bed $y=1-2$, cab/roof $y=2-3$. |
| **Semi-Truck / Freight / Bus** | $2.6\text{m } W \times 3.8\text{m } H \times 12-16\text{m } L$ | **$3-4 \times 4 \times 12-16$ blocks** | Dual axles, elevated cab, cargo container / trailer. |
| **Standard Sedan / Sports Car** | $1.8\text{m } W \times 1.4\text{m } H \times 4.5\text{m } L$ | **$3 \times 2 \times 4-5$ blocks** | Low profile, tinted windshield, smooth slab hood. |
| **Motorcycle / Bicycle / Prop** | $0.8\text{m } W \times 1.2\text{m } H \times 2.0\text{m } L$ | **$1 \times 1-2 \times 2-3$ blocks** | Compact profile, anvil/hopper/fence detailing. |
| **1-Story House / Garage** | $8-12\text{m } W \times 4-5\text{m } H \times 8-12\text{m } D$ | **$8-12 \times 4-6 \times 8-12$ blocks** | 1 level + roof rafters, solid foundation. |
| **2-Story House / Townhouse** | $10-16\text{m } W \times 8-10\text{m } H \times 10-16\text{m } D$ | **$10-16 \times 8-11 \times 10-16$ blocks** | 2 walkable floors ($2.5\text{m}$ ceiling each) + roof. |
| **Utility Pole / Street Lamp** | $0.4\text{m } W \times 8-10\text{m } H$ | **$1 \times 7-10 \times 1$ blocks** | Vertical pole + crossarm slabs + transformer box. |
| **Trees & Foliage** | $3-6\text{m } W \times 6-14\text{m } H$ | **$3-7 \times 6-15 \times 3-7$ blocks** | Log trunk + tiered or drooping leaves. |

---

## 5. Comprehensive Block Catalog Lookup Reference

Use exact block IDs from this reference dictionary:

### A. Vehicles, Machinery & Mechanical
- **Tires / Rubber Wheels:** Black Concrete (`#186`), Coal Block (`#257`), Obsidian (`#53`), Polished Deepslate (`#539`)
- **Hubcaps & Metal Mechanics:** Iron Block (`#414`), Iron Bars (`#413`), Anvil (`#151`), Cauldron (`#236`), Hopper (`#410`), Iron Trapdoor (`#416`), Stone Button (`#637`), Lever (`#444`)
- **Headlights & Illumination:** Sea Lantern (`#48`), Glowstone (`#47`), Redstone Lamp (`#596`), Lantern (`#46`), Soul Lantern (`#615`)
- **Taillights & Indicators:** Redstone Block (`#591`), Red Terracotta (`#81`), Honey Block (`#409`)
- **Vehicle Body Paint (Vibrant Concrete):**
  - Red: `#578` | Blue: `#197` | Yellow: `#704` | Green: `#394` | Orange: `#509`
  - Black: `#186` | White: `#694` | Gray: `#385` | Light Gray: `#446` | Cyan: `#287`
- **Vehicle Windshields & Glass:** Tinted Glass (`#38`), Glass Block (`#37`), Glass Pane (`#377`), Black Stained Glass (`#190`), Light Gray Stained Glass (`#449`)
- **Bumpers, Hoods & Slopes:** Smooth Stone Slab (`#626`), Quartz Slab (`#1195`), Stone Brick Slab (`#1188`), Granite Slab (`#1190`), Andesite Slab (`#1192`), Oak Stairs (`#70`), Stone Brick Stairs (`#72`)

### B. Architecture, Walls & Roofs
- **Foundations:** Stone Bricks (`#8`), Cobblestone (`#6`), Smooth Stone (`#9`), Polished Andesite (`#537`), Deepslate Bricks (`#323`)
- **Pillars & Framing:** Oak Log (`#16`), Spruce Log (`#22`), Birch Log (`#19`), Dark Oak Log (`#29`), Quartz Pillar (`#571`)
- **Wall Cladding & Planks:** Oak Planks (`#17`), Spruce Planks (`#23`), Birch Planks (`#20`), Dark Oak Planks (`#29`), Bricks (`#59`), Quartz Block (`#569`), Green Terracotta (`#400`), Brown Terracotta (`#221`), White Terracotta (`#67`)
- **Roof Stairs (Gables/Hips):** Oak Stairs (`#70`), Cobblestone Stairs (`#71`), Stone Brick Stairs (`#72`), Sandstone Stairs (`#73`), Brick Stairs (`#76`), Spruce Stairs (`#77`), Birch Stairs (`#78`)
- **Roof Slabs & Trims:** Stone Brick Slab (`#1188`), Cobblestone Slab (`#1186`), Stone Slab (`#1185`), Smooth Stone Slab (`#626`), Quartz Slab (`#1195`)
- **Doors & Fences:** Oak Door (`#105`), Iron Door (`#415`), Oak Fence (`#1174`), Iron Bars (`#413`)

### C. Foliage, Trees & Nature
- **Leaves:** Oak Leaves (`#18`), Spruce Leaves (`#24`), Birch Leaves (`#21`), Jungle Leaves (`#35`), Dark Oak Leaves (`#294`)
- **Trunks:** Oak Log (`#16`), Jungle Log (`#34`), Acacia Log (`#123`), Mangrove Log (`#463`)

---

## 6. Required JSON Output (Parametric Asset Specs — do NOT emit raw voxel lists)

Return ONE JSON object with an `assets` array (one **SemanticAssetSpec** per distinct object detected) plus a `scene` layout. The engine resolves each spec **deterministically** into a validated, watertight voxel blueprint. Your job is only to choose the **parameters** (dimensions, stories, roof, materials) that you can judge from the photo — never hand-write voxel coordinates.

```json
{
  "assets": [
    {
      "id": "bp_ranch_house",
      "name": "1-Story Ranch House",
      "category": "house",
      "style": "modern_villa",
      "biomeAffinity": ["plains"],
      "dimensions": { "width": 12, "height": 6, "depth": 9, "stories": 1 },
      "roof": { "style": "gable", "pitch": 1.0, "overhang": 1 },
      "palette": {
        "foundation": "stone_bricks", "frame": "oak_log", "walls": "oak_planks",
        "roof": "oak_stairs", "roofTrim": "stone_brick_slab", "floor": "birch_planks",
        "doors": "oak_door", "windows": "glass_pane", "lights": "lantern", "accent": "oak_fence"
      }
    },
    {
      "id": "bp_utility_pole",
      "name": "Wooden Utility Pole",
      "category": "object",
      "style": "modern_villa",
      "biomeAffinity": ["plains"],
      "dimensions": { "width": 1, "height": 8, "depth": 1, "stories": 1 },
      "roof": { "style": "flat", "pitch": 1.0, "overhang": 1 },
      "palette": { "frame": "spruce_log", "walls": "spruce_planks", "accent": "stone_brick_slab", "lights": "lantern" }
    }
  ],
  "scene": {
    "id": "scene_san-andreas",
    "name": "San Andreas Grove Street Full Scene",
    "layout": [
      { "objectId": "bp_ranch_house", "x": 0, "y": 0, "z": 0, "rot": 0 },
      { "objectId": "bp_utility_pole", "x": 12, "y": 0, "z": 4, "rot": 0 }
    ]
  }
}
```

### Rules (every output is validated & linted; bad params are clamped/retried)
1. `category` must be one of: `house`, `tower`, `castle`, `farm`, `bridge`, `shrine`, `object`, `foliage`, `misc`.
2. `dimensions` use the §4 scale (1 m = 1 voxel). Clamp to: width/depth **5–24**, height **4–26**, stories **1–3**. Prefer realistic proportions over exactness.
3. `roof.style` one of `gable | hipped | mansard | flat | pyramid | gambrel`; `pitch` 0.5–1.5; `overhang` 1–2.
4. `palette` values are material **names** from the §5 dictionary only (foundation/frame/walls/roof/roofTrim/floor/doors/windows/lights/accent). Unknown names fall back to defaults.
5. Use `object`/\`foliage` for vehicles, street props, poles, trees — NOT `house`.
6. Dimensions + materials are the only things judged from the photo. **Never emit `blocks[]`.**

---

## 7. Quality Invariants (enforced by the engine, not by you)
1. Every structure is generated watertight (no floating/disconnected blocks) and grounded at `y=0`.
2. Buildings get ≥ 2 blocks of interior walkable clearance and always include a door + a light source.
3. Invalid/out-of-range params are clamped and the spec is re-validated — fix feedback, don't dump voxels.
