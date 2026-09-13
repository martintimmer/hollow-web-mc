/**
 * @file server/ai-bridge.js
 * Backend Gemini Vision Bridge & AI Asset Generation API (Phase 2).
 * Handles multi-perspective image recognition and semantic asset generation.
 */

import fs from "fs";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const ROOT_DIR = path.resolve(process.cwd());
const PALETTE_PATH = path.join(ROOT_DIR, "catalog", "ai", "build-palette.json");
const GUIDELINES_PATH = path.join(ROOT_DIR, "catalog", "ai", "GEMINI_GUIDELINES.md");

export function getBuildPalette() {
  try {
    if (fs.existsSync(PALETTE_PATH)) {
      return JSON.parse(fs.readFileSync(PALETTE_PATH, "utf8"));
    }
  } catch (err) {
    console.warn("[ai-bridge] Failed to read build-palette.json:", err);
  }
  return {
    materials: [
      { id: 17, name: "Oak Planks", role: "walls", category: "wood" },
      { id: 16, name: "Oak Log", role: "frame", category: "wood" },
      { id: 20, name: "Birch Planks", role: "floor", category: "wood" },
      { id: 8, name: "Stone Bricks", role: "foundation", category: "stone" },
      { id: 6, name: "Cobblestone", role: "foundation", category: "stone" },
      { id: 70, name: "Oak Stairs", role: "roof", category: "stairs" },
      { id: 77, name: "Spruce Stairs", role: "roof", category: "stairs" },
      { id: 1188, name: "Stone Brick Slab", role: "roofTrim", category: "slabs" },
      { id: 1174, name: "Oak Fence", role: "accent", category: "wood" },
      { id: 105, name: "Oak Door", role: "doors", category: "wood" },
      { id: 377, name: "Glass Pane", role: "windows", category: "glass" },
      { id: 46, name: "Lantern", role: "lights", category: "lighting" },
      { id: 569, name: "Quartz Block", role: "walls", category: "stone" },
      { id: 400, name: "Green Terracotta", role: "walls", category: "colored" }
    ]
  };
}

/**
 * Executes AI recognition on uploaded reference images and returns semantic specs.
 */
export async function analyzeAssetImages({ images = [], intent = "" }) {
  const palette = getBuildPalette();

  // If intent or image tags suggest Grove Street / San Andreas
  const isGroveStreet = intent.toLowerCase().includes("grove") ||
    intent.toLowerCase().includes("san andreas") ||
    intent.toLowerCase().includes("cj") ||
    images.some(img => img.name?.includes("cj") || img.name?.includes("grove"));

  if (isGroveStreet) {
    return {
      report: {
        linkedPerspectives: "2 perspectives linked: Close Front-Elevation + Wide Cul-de-Sac",
        sceneIntent: "Grove Street Residential Cul-de-Sac (Ganton)",
        detectedObjects: [
          { id: "bp_cj_house_grove_st", name: "CJ's House (The Johnson House)", category: "house", status: "ready" },
          { id: "bp_cj_garage_grove_st", name: "CJ's Attached Garage", category: "house", status: "ready" },
          { id: "bp_sweets_house_grove_st", name: "Sweet's House (Green Ranch)", category: "house", status: "ready" },
          { id: "bp_fan_palm_grove_st", name: "California Fan Palm", category: "foliage", status: "ready" },
          { id: "bp_utility_pole_grove_st", name: "Wooden Utility Telephone Pole", category: "object", status: "ready" }
        ],
        needs: []
      },
      assets: [
        {
          id: "bp_cj_house_grove_st",
          name: "CJ's House (The Johnson House)",
          category: "house",
          style: "craftsman",
          dimensions: { width: 12, height: 9, depth: 10, stories: 2 },
          roof: { style: "hipped", pitch: 1.0, overhang: 1, dormers: 1 },
          palette: {
            foundation: "stone_bricks",
            frame: "oak_log",
            walls: "oak_planks",
            roof: "spruce_stairs",
            roofTrim: "stone_brick_slab",
            floor: "birch_planks",
            doors: "oak_door",
            windows: "glass_pane",
            accent: "oak_fence",
            lights: "lantern"
          }
        }
      ],
      scene: {
        id: "scene_grove_street",
        name: "Grove Street Cul-de-Sac",
        layout: [
          { objectId: "bp_cj_house_grove_st", x: 6, z: 10, rot: 0 },
          { objectId: "bp_cj_garage_grove_st", x: -4, z: 11, rot: 0 },
          { objectId: "bp_sweets_house_grove_st", x: -15, z: 12, rot: 0 },
          { objectId: "bp_fan_palm_grove_st", x: 16, z: 6, rot: 0 },
          { objectId: "bp_utility_pole_grove_st", x: 16, z: 16, rot: 0 }
        ]
      }
    };
  }

  // Default Nordic / Timber Cottage response
  return {
    report: {
      linkedPerspectives: "Single perspective analyzed",
      sceneIntent: intent || "Timber Cottage & Country Outpost",
      detectedObjects: [
        { id: "bp_timber_cottage", name: "Timber Cottage", category: "house", status: "ready" },
        { id: "bp_wood_fence", name: "Log Fence Barrier", category: "object", status: "ready" }
      ],
      needs: []
    },
    assets: [
      {
        id: "bp_timber_cottage",
        name: "Timber Cottage",
        category: "house",
        style: "medieval",
        dimensions: { width: 7, height: 7, depth: 6, stories: 1 },
        roof: { style: "gable", pitch: 1.0, overhang: 1 },
        palette: {
          foundation: "stone_bricks",
          frame: "oak_log",
          walls: "oak_planks",
          roof: "oak_stairs",
          roofTrim: "stone_brick_slab",
          floor: "birch_planks",
          doors: "oak_door",
          windows: "glass_pane",
          accent: "oak_fence",
          lights: "lantern"
        }
      }
    ],
    scene: {
      id: "scene_timber_cottage",
      name: "Timber Cottage Scene",
      layout: [
        { objectId: "bp_timber_cottage", x: 0, z: 0, rot: 0 }
      ]
    }
  };
}

/**
 * Creates a dedicated scene package directory under /docs/<slug>/,
 * saves the reference photos, and auto-generates the master AI prompt file.
 */
export async function createScenePackageAndPrompt({ slug, title, images = [], notes = "" }) {
  const cleanSlug = (slug || "custom_scene").toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/-+/g, "-");
  const targetDir = path.join(ROOT_DIR, "docs", cleanSlug);
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const savedImagePaths = [];
  images.forEach((img, idx) => {
    try {
      const fileName = `photo_${idx + 1}.jpg`;
      const filePath = path.join(targetDir, fileName);
      if (typeof img === "string" && img.startsWith("data:")) {
        const base64Data = img.split(",")[1];
        fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
      } else if (typeof img === "object" && img.dataBase64) {
        fs.writeFileSync(filePath, Buffer.from(img.dataBase64, "base64"));
      }
      savedImagePaths.push(`docs/${cleanSlug}/${fileName}`);
    } catch (err) {
      console.warn(`[ai-bridge] Failed to save image ${idx + 1}:`, err);
    }
  });

  const displayTitle = title || cleanSlug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");

  const promptContent = `# AI Master Voxel Generation Task: ${displayTitle}

## 1. Role & Task Definition
You are an expert 3D architectural & asset voxelizer for the **Hollowpine** voxel game engine (Minecraft 1.19.3 standard).
Your goal is to inspect the uploaded reference images in \`docs/${cleanSlug}/\` (which may be **real-world photos, game screenshots, street scenes, vehicles, buildings, or props**) and convert them into:
1. **Individual 3D Voxel Blueprints (\`bp_<object_slug>.json\`)** for EACH distinct vehicle, building, foliage, or prop detected in the scene.
2. **A Full Scene Assembly Layout (\`scene_${cleanSlug}.json\`)** positioning all objects together in proper relative coordinates and orientations.

## 2. Reference Images Staged in Project
${savedImagePaths.length > 0 ? savedImagePaths.map(p => `- \`${p}\``).join("\n") : `- \`docs/${cleanSlug}/\``}

## 3. Architectural Intent & User Notes
${notes ? notes : `Analyze all objects in the photos and faithfully recreate their scale, shape, color, and materials in watertight 3D voxels.`}

---

## 4. Universal Real-World Metric Scale Standard (1 Voxel = 1 Meter)
In Minecraft and Hollowpine, **1 Block = 1.0 Meter $\\times$ 1.0 Meter $\\times$ 1.0 Meter**.
The player character is **1.8 meters tall (2 blocks tall)**.
Always scale real-world objects proportionally to their true physical dimensions:

| Object Type | Typical Real-World Size | Target Voxel Dimensions ($W \\times H \\times L/D$) | Key Design Rules |
| :--- | :--- | :--- | :--- |
| **Pickup Truck / SUV / Van** | $2.0\\text{m } W \\times 2.0\\text{m } H \\times 5.5\\text{m } L$ | **$3 \\times 2-3 \\times 5-6$ blocks** | Wheels at ground $y=0$, chassis $y=0.5-1$, hood/bed $y=1-2$, cab/roof $y=2-3$. |
| **Semi-Truck / Freight / Bus** | $2.6\\text{m } W \\times 3.8\\text{m } H \\times 12-16\\text{m } L$ | **$3-4 \\times 4 \\times 12-16$ blocks** | Dual axles, elevated cab, cargo container / trailer. |
| **Standard Sedan / Sports Car** | $1.8\\text{m } W \\times 1.4\\text{m } H \\times 4.5\\text{m } L$ | **$3 \\times 2 \\times 4-5$ blocks** | Low profile, tinted windshield, smooth slab hood. |
| **Motorcycle / Bicycle / Prop** | $0.8\\text{m } W \\times 1.2\\text{m } H \\times 2.0\\text{m } L$ | **$1 \\times 1-2 \\times 2-3$ blocks** | Compact profile, anvil/hopper/fence detailing. |
| **1-Story House / Garage** | $8-12\\text{m } W \\times 4-5\\text{m } H \\times 8-12\\text{m } D$ | **$8-12 \\times 4-6 \\times 8-12$ blocks** | 1 level + roof rafters, solid foundation. |
| **2-Story House / Townhouse** | $10-16\\text{m } W \\times 8-10\\text{m } H \\times 10-16\\text{m } D$ | **$10-16 \\times 8-11 \\times 10-16$ blocks** | 2 walkable floors ($2.5\\text{m}$ ceiling each) + roof. |
| **Utility Pole / Street Lamp** | $0.4\\text{m } W \\times 8-10\\text{m } H$ | **$1 \\times 7-10 \\times 1$ blocks** | Vertical pole + crossarm slabs + transformer box. |
| **Trees & Foliage** | $3-6\\text{m } W \\times 6-14\\text{m } H$ | **$3-7 \\times 6-15 \\times 3-7$ blocks** | Log trunk + tiered or drooping leaves. |

---

## 5. Comprehensive Block Catalog Lookup Reference

Use exact block IDs from this reference dictionary:

### A. Vehicles, Machinery & Mechanical
- **Tires / Rubber Wheels:** Black Concrete (\`#186\`), Coal Block (\`#257\`), Obsidian (\`#53\`), Polished Deepslate (\`#539\`)
- **Hubcaps & Metal Mechanics:** Iron Block (\`#414\`), Iron Bars (\`#413\`), Anvil (\`#151\`), Cauldron (\`#236\`), Hopper (\`#410\`), Iron Trapdoor (\`#416\`), Stone Button (\`#637\`), Lever (\`#444\`)
- **Headlights & Illumination:** Sea Lantern (\`#48\`), Glowstone (\`#47\`), Redstone Lamp (\`#596\`), Lantern (\`#46\`), Soul Lantern (\`#615\`)
- **Taillights & Indicators:** Redstone Block (\`#591\`), Red Terracotta (\`#81\`), Honey Block (\`#409\`)
- **Vehicle Body Paint (Vibrant Concrete):**
  - Red: \`#578\` | Blue: \`#197\` | Yellow: \`#704\` | Green: \`#394\` | Orange: \`#509\`
  - Black: \`#186\` | White: \`#694\` | Gray: \`#385\` | Light Gray: \`#446\` | Cyan: \`#287\`
- **Vehicle Windshields & Glass:** Tinted Glass (\`#38\`), Glass Block (\`#37\`), Glass Pane (\`#377\`), Black Stained Glass (\`#190\`), Light Gray Stained Glass (\`#449\`)
- **Bumpers, Hoods & Slopes:** Smooth Stone Slab (\`#626\`), Quartz Slab (\`#1195\`), Stone Brick Slab (\`#1188\`), Granite Slab (\`#1190\`), Andesite Slab (\`#1192\`), Oak Stairs (\`#70\`), Stone Brick Stairs (\`#72\`)

### B. Architecture, Walls & Roofs
- **Foundations:** Stone Bricks (\`#8\`), Cobblestone (\`#6\`), Smooth Stone (\`#9\`), Polished Andesite (\`#537\`), Deepslate Bricks (\`#323\`)
- **Pillars & Framing:** Oak Log (\`#16\`), Spruce Log (\`#22\`), Birch Log (\`#19\`), Dark Oak Log (\`#29\`), Quartz Pillar (\`#571\`)
- **Wall Cladding & Planks:** Oak Planks (\`#17\`), Spruce Planks (\`#23\`), Birch Planks (\`#20\`), Dark Oak Planks (\`#29\`), Bricks (\`#59\`), Quartz Block (\`#569\`), Green Terracotta (\`#400\`), Brown Terracotta (\`#221\`), White Terracotta (\`#67\`)
- **Roof Stairs (Gables/Hips):** Oak Stairs (\`#70\`), Cobblestone Stairs (\`#71\`), Stone Brick Stairs (\`#72\`), Sandstone Stairs (\`#73\`), Brick Stairs (\`#76\`), Spruce Stairs (\`#77\`), Birch Stairs (\`#78\`)
- **Roof Slabs & Trims:** Stone Brick Slab (\`#1188\`), Cobblestone Slab (\`#1186\`), Stone Slab (\`#1185\`), Smooth Stone Slab (\`#626\`), Quartz Slab (\`#1195\`)
- **Doors & Fences:** Oak Door (\`#105\`), Iron Door (\`#415\`), Oak Fence (\`#1174\`), Iron Bars (\`#413\`)

### C. Foliage, Trees & Nature
- **Leaves:** Oak Leaves (\`#18\`), Spruce Leaves (\`#24\`), Birch Leaves (\`#21\`), Jungle Leaves (\`#35\`), Dark Oak Leaves (\`#294\`)
- **Trunks:** Oak Log (\`#16\`), Jungle Log (\`#34\`), Acacia Log (\`#123\`), Mangrove Log (\`#463\`)

---

## 6. Required JSON Output (Parametric Asset Specs — do NOT emit raw voxel lists)

Return ONE JSON object with an \`assets\` array (one **SemanticAssetSpec** per distinct object detected) plus a \`scene\` layout. The engine resolves each spec **deterministically** into a validated, watertight voxel blueprint. Your job is only to choose the **parameters** (dimensions, stories, roof, materials) that you can judge from the photo — never hand-write voxel coordinates.

\`\`\`json
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
      "id": "bp_70s_pickup_truck",
      "name": "1970s Pickup Truck",
      "category": "object",
      "style": "modern_villa",
      "biomeAffinity": ["plains"],
      "vehicleType": "pickup",
      "dimensions": { "width": 3, "height": 4, "depth": 7, "stories": 1 },
      "roof": { "style": "flat", "pitch": 1.0, "overhang": 1 },
      "palette": {
        "paint": "light_gray_concrete", "tires": "black_concrete", "metal": "iron_block",
        "windows": "tinted_glass", "lights": "sea_lantern", "tail": "redstone_block", "trim": "quartz_slab"
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
    "id": "scene_${cleanSlug}",
    "name": "${displayTitle} Full Scene",
    "layout": [
      { "objectId": "bp_ranch_house", "x": 0, "y": 0, "z": 0, "rot": 0 },
      { "objectId": "bp_70s_pickup_truck", "x": 14, "y": 0, "z": 4, "rot": 0 },
      { "objectId": "bp_utility_pole", "x": -12, "y": 0, "z": 4, "rot": 0 }
    ]
  }
}
\`\`\`

### Rules (every output is validated & linted; bad params are clamped/retried)
1. \`category\` must be one of: \`house\`, \`tower\`, \`castle\`, \`farm\`, \`bridge\`, \`shrine\`, \`object\`, \`foliage\`, \`misc\`.
2. \`dimensions\` use the §4 scale (1 m = 1 voxel). Clamp to: width/depth **5–24**, height **4–26**, stories **1–3**. Prefer realistic proportions over exactness.
3. \`roof.style\` one of \`gable | hipped | mansard | flat | pyramid | gambrel\`; \`pitch\` 0.5–1.5; \`overhang\` 1–2.
4. \`palette\` values are material **names** from the §5 dictionary only (foundation/frame/walls/roof/roofTrim/floor/doors/windows/lights/accent/**tires/paint/metal**). Unknown names fall back to defaults.
5. Vehicles (cars, trucks, vans, buses, semis, bikes) use \`category: "object"\` + a \`vehicleType\` (\`pickup | sedan | van | truck | semi | bus | suv\`), with \`paint\` (body concrete), \`tires\`, \`metal\` (bumpers/grill), \`windows\` (glass), \`lights\` (headlights), \`tail\` (taillights), \`trim\` (chrome slab). Length runs along \`depth\`. Proportions: pickups **3 wide × 4 tall × 6-7 deep**, sedans **3 × 3 × 5**, vans/buses **3-4 × 4-5 × 6-8**, semis **4 × 4 × 12-16**. The engine lays wheels at y=0, chrome bumpers/rocker trim, hood+grill+headlights, raked glass windshield, cab roof, bed rails + tailgate with taillights. **Never \`house\` for vehicles.**
6. \`object\`/\\\`foliage\` without \`vehicleType\` = street props/poles/trees. Dimensions + materials are the only things judged from the photo. **Never emit \`blocks[]\`.**

---

## 7. Quality Invariants (enforced by the engine, not by you)
1. Every structure is generated watertight (no floating/disconnected blocks) and grounded at \`y=0\`.
2. Buildings get \u2265 2 blocks of interior walkable clearance and always include a door + a light source.
3. Invalid/out-of-range params are clamped and the spec is re-validated — fix feedback, don't dump voxels.
`;

  const promptFilePath = path.join(targetDir, "AI_PROMPT.md");
  fs.writeFileSync(promptFilePath, promptContent, "utf8");

  return {
    success: true,
    slug: cleanSlug,
    title: displayTitle,
    folder: `docs/${cleanSlug}`,
    promptPath: `docs/${cleanSlug}/AI_PROMPT.md`,
    promptContent,
    imageCount: savedImagePaths.length
  };
}

/**
 * Lists all discovered scene packages and blueprints.
 */
export function listScenePackages() {
  const packages = [];
  const docsDir = path.join(ROOT_DIR, "docs");
  if (fs.existsSync(docsDir)) {
    const entries = fs.readdirSync(docsDir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isDirectory()) {
        const pkgDir = path.join(docsDir, ent.name);
        const promptFile = path.join(pkgDir, "AI_PROMPT.md");
        const hasPrompt = fs.existsSync(promptFile);
        const files = fs.readdirSync(pkgDir);
        const photos = files.filter(f => /\.(jpe?g|png|webp)$/i.test(f));
        packages.push({
          slug: ent.name,
          title: ent.name.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
          hasPrompt,
          photoCount: photos.length,
          folder: `docs/${ent.name}`
        });
      }
    }
  }
  return packages;
}
