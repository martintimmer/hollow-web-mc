import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { apiDeleteCustomAsset, apiGetCustomAssets, apiInsertCustomAsset, apiUpdateCustomAssetPlacement, type CustomAssetMeta, type CustomAssetPlacement, type CustomAssetSpan } from "../src/services/customAssets";
import { fetchTextureOverrides } from "../src/services/textureOverrides";

type AssetRecord = {
  id: string;
  name: string;
  filename: string;
  size: number;
  addedAt: number;
  buffer: ArrayBuffer;
  dimensions: [number, number, number];
  triangles: number;
  placement: CustomAssetPlacement;
  gameId?: number;
  status?: "draft" | "published";
  assetType?: "model" | "texture";
};

const databaseName = "hollow-pine-build-assets";
const storeName = "inventory";
const loader = new GLTFLoader();
const records = new Map<string, AssetRecord>();
const loadedModels = new Map<string, THREE.Group>();
const serverAssets = new Map<number, CustomAssetMeta>();
let nextGameId: number | null = null;
let serverReady = false;
let currentSourceMode: "model" | "texture" = "model";
const productionPublishEnabled = true;

const viewport = document.querySelector<HTMLDivElement>("#viewport")!;
const inventoryElement = document.querySelector<HTMLDivElement>("#inventory")!;
const inventoryCount = document.querySelector<HTMLSpanElement>("#inventoryCount")!;
const inventorySearch = document.querySelector<HTMLInputElement>("#inventorySearch")!;
const assetFile = document.querySelector<HTMLInputElement>("#assetFile")!;
const dropzone = document.querySelector<HTMLDivElement>("#dropzone")!;
const promptInput = document.querySelector<HTMLTextAreaElement>("#promptInput")!;
const promptLabel = document.querySelector<HTMLSpanElement>("#promptLabel")!;
const promptHelp = document.querySelector<HTMLElement>("#promptHelp")!;
const dropzoneTitle = document.querySelector<HTMLElement>("#dropzoneTitle")!;
const dropzoneSub = document.querySelector<HTMLElement>("#dropzoneSub")!;
const dropzoneHint = document.querySelector<HTMLElement>("#dropzoneHint")!;
const modeModelButton = document.querySelector<HTMLButtonElement>("#modeModel")!;
const modeTextureButton = document.querySelector<HTMLButtonElement>("#modeTexture")!;
const textureOptions = document.querySelector<HTMLDivElement>("#textureOptions")!;
const textureResolution = document.querySelector<HTMLSelectElement>("#textureResolution")!;
const textureMapping = document.querySelector<HTMLSelectElement>("#textureMapping")!;
const placementWidth = document.querySelector<HTMLSelectElement>("#placementWidth")!;
const placementHeight = document.querySelector<HTMLSelectElement>("#placementHeight")!;
const modelScale = document.querySelector<HTMLInputElement>("#modelScale")!;
const modelScaleValue = document.querySelector<HTMLOutputElement>("#modelScaleValue")!;
const placementSummary = document.querySelector<HTMLElement>("#placementSummary")!;
const previewPlacementButton = document.querySelector<HTMLButtonElement>("#previewPlacementButton")!;
const savePlacementButton = document.querySelector<HTMLButtonElement>("#savePlacementButton")!;
const rotatePreviewButton = document.querySelector<HTMLButtonElement>("#rotatePreviewButton")!;
const confirmId = document.querySelector<HTMLInputElement>("#confirmId")!;
const insertButton = document.querySelector<HTMLButtonElement>("#insertButton")!;
const nextGameIdElement = document.querySelector<HTMLElement>("#nextGameId")!;
const publishTarget = document.querySelector<HTMLParagraphElement>("#publishTarget")!;
const environmentBadge = document.querySelector<HTMLSpanElement>("#environmentBadge")!;
const emptyState = document.querySelector<HTMLDivElement>("#emptyState")!;
const statusElement = document.querySelector<HTMLSpanElement>("#assetStatus")!;
const errorElement = document.querySelector<HTMLParagraphElement>("#errorMessage")!;
const activityLog = document.querySelector<HTMLUListElement>("#activityLog")!;
const selectedName = document.querySelector<HTMLElement>("#selectedName")!;
const selectedSource = document.querySelector<HTMLElement>("#selectedSource")!;
const selectedSize = document.querySelector<HTMLElement>("#selectedSize")!;
const selectedDimensions = document.querySelector<HTMLElement>("#selectedDimensions")!;
const selectedTriangles = document.querySelector<HTMLElement>("#selectedTriangles")!;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
viewport.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14221d);
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 250);
camera.position.set(5.4, 3.6, 6.2);
camera.lookAt(0, 1, 0);

const previewRoot = new THREE.Group();
const footprintGuide = new THREE.Group();
scene.add(previewRoot, footprintGuide);

const hemisphere = new THREE.HemisphereLight(0xd7f4df, 0x18221d, 2.2);
scene.add(hemisphere);
const keyLight = new THREE.DirectionalLight(0xfff2d5, 3.2);
keyLight.position.set(4, 8, 5);
keyLight.castShadow = true;
scene.add(keyLight);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshStandardMaterial({ color: 0x25372d, roughness: 0.92, metalness: 0 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(30, 30, 0x5b8066, 0x30483a);
grid.position.y = 0.004;
scene.add(grid);

let selectedId: string | null = null;
let currentPreview: THREE.Group | null = null;
let previewRotation = 0;

function defaultPlacement(): CustomAssetPlacement {
  return { width: 1, height: 1, scale: 100 };
}

function normalizedPlacement(value: Partial<CustomAssetPlacement> | undefined): CustomAssetPlacement {
  const span = (candidate: unknown): CustomAssetSpan => {
    const numeric = Number(candidate);
    return (numeric >= 1 && numeric <= 6 && Number.isInteger(numeric) ? numeric : 1) as CustomAssetSpan;
  };
  return {
    width: span(value?.width),
    height: span(value?.height),
    scale: Math.max(25, Math.min(100, Number(value?.scale) || 100))
  };
}

function selectedPlacement(): CustomAssetPlacement {
  return normalizedPlacement({
    width: Number(placementWidth.value) as CustomAssetSpan,
    height: Number(placementHeight.value) as CustomAssetSpan,
    scale: Number(modelScale.value)
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 2);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(storeName)) {
        request.result.createObjectStore(storeName, { keyPath: "id" });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.close();
        const bumpReq = indexedDB.open(databaseName, db.version + 1);
        bumpReq.onupgradeneeded = () => {
          if (!bumpReq.result.objectStoreNames.contains(storeName)) {
            bumpReq.result.createObjectStore(storeName, { keyPath: "id" });
          }
        };
        bumpReq.onsuccess = () => resolve(bumpReq.result);
        bumpReq.onerror = () => reject(bumpReq.error ?? new Error("Could not create inventory store."));
      } else {
        resolve(db);
      }
    };
    request.onerror = () => reject(request.error ?? new Error("Could not open browser inventory."));
  });
}

async function getStoredRecords(): Promise<AssetRecord[]> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(storeName, "readonly").objectStore(storeName).getAll();
    request.onsuccess = () => resolve(request.result as AssetRecord[]);
    request.onerror = () => reject(request.error ?? new Error("Could not read browser inventory."));
  });
}

async function putStoredRecord(record: AssetRecord): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(storeName, "readwrite").objectStore(storeName).put(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Could not save inventory item."));
  });
}

async function deleteStoredRecord(id: string): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = database.transaction(storeName, "readwrite").objectStore(storeName).delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Could not delete inventory item."));
  });
}

function parseModel(data: ArrayBuffer | string): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    const input = typeof data === "string" ? data : data.slice(0);
    loader.parse(input, "", (result) => resolve(result.scene), undefined, reject);
  });
}

function parseRecord(record: AssetRecord): Promise<THREE.Group> {
  return parseModel(record.filename.toLowerCase().endsWith(".gltf") ? new TextDecoder().decode(record.buffer) : record.buffer);
}

function getModelStats(root: THREE.Object3D): { dimensions: [number, number, number]; triangles: number } {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  let triangles = 0;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const geometry = object.geometry;
    triangles += geometry.index ? geometry.index.count / 3 : (geometry.getAttribute("position")?.count ?? 0) / 3;
  });
  return { dimensions: [size.x, size.y, size.z], triangles: Math.round(triangles) };
}

function normalizeModel(root: THREE.Group, placement: CustomAssetPlacement): THREE.Group {
  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const scale = Math.min(
    size.x > 0.0001 ? (placement.width * 1.0) / size.x : Number.POSITIVE_INFINITY,
    size.y > 0.0001 ? (placement.height * 1.0) / size.y : Number.POSITIVE_INFINITY,
    size.z > 0.0001 ? (placement.width * 1.0) / size.z : Number.POSITIVE_INFINITY
  ) * (placement.scale / 100);
  root.scale.multiplyScalar(scale);
  root.updateMatrixWorld(true);
  const normalizedBounds = new THREE.Box3().setFromObject(root);
  const normalizedCenter = normalizedBounds.getCenter(new THREE.Vector3());
  root.position.x -= normalizedCenter.x;
  root.position.z -= normalizedCenter.z;
  root.position.y -= normalizedBounds.min.y;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      material.side = THREE.DoubleSide;
      material.depthTest = true;
      material.depthWrite = !material.transparent || material.alphaTest > 0;
      if (material.map) {
        material.map.magFilter = THREE.NearestFilter;
        material.map.minFilter = THREE.NearestFilter;
        material.map.generateMipmaps = false;
        material.map.needsUpdate = true;
      }
    });
  });
  return root;
}

function frameCameraForModel(placement: CustomAssetPlacement): void {
  const maxSpan = Math.max(placement.width, placement.height, 1);
  const dist = 1.8 + maxSpan * 0.95;
  camera.position.set(dist * 0.72, dist * 0.52, dist * 0.82);
  camera.lookAt(0, Math.min(placement.height * 0.45, 1.2), 0);
  camera.updateProjectionMatrix();
}

function updatePlacementControls(placement: CustomAssetPlacement): void {
  placementWidth.value = String(placement.width);
  placementHeight.value = String(placement.height);
  modelScale.value = String(placement.scale);
  modelScaleValue.value = `${placement.scale}%`;
  placementSummary.textContent = `${placement.width} × ${placement.height} block${placement.width === 1 && placement.height === 1 ? "" : "s"}`;
  previewPlacementButton.disabled = !selectedId;
  savePlacementButton.disabled = !selectedId;
  rotatePreviewButton.disabled = !selectedId;
}

function renderFootprintGuide(placement: CustomAssetPlacement): void {
  clearGroup(footprintGuide);
  const geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(placement.width, placement.height, placement.width));
  const material = new THREE.LineBasicMaterial({ color: 0xa6d5b0, transparent: true, opacity: 0.7 });
  const outline = new THREE.LineSegments(geometry, material);
  outline.position.y = placement.height / 2;
  outline.rotation.y = previewRotation;
  footprintGuide.add(outline);
}

function applyOverridesToPreview(root: THREE.Group, gameId?: number): void {
  if (!gameId) return;
  try {
    const overrides = JSON.parse(localStorage.getItem("mc_custom_atlas_overrides") || "{}");
    const customSide = overrides[`block_${gameId}_single_side`] || overrides[`block_${gameId}_side`];
    const customTop = overrides[`block_${gameId}_single_top`] || overrides[`block_${gameId}_top`];
    const customBottom = overrides[`block_${gameId}_single_bottom`] || overrides[`block_${gameId}_bottom`];

    if (customSide || customTop || customBottom) {
      const loadTex = (url: string) => {
        const t = new THREE.TextureLoader().load(url);
        t.colorSpace = THREE.SRGBColorSpace;
        t.magFilter = THREE.NearestFilter;
        t.minFilter = THREE.NearestFilter;
        t.generateMipmaps = false;
        return t;
      };

      root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          if (mats.length >= 6) {
            if (customSide) {
              const t = loadTex(customSide);
              if (mats[0]) mats[0].map = t;
              if (mats[1]) mats[1].map = t;
              if (mats[4]) mats[4].map = t;
              if (mats[5]) mats[5].map = t;
            }
            if (customTop && mats[2]) mats[2].map = loadTex(customTop);
            if (customBottom && mats[3]) mats[3].map = loadTex(customBottom);
          } else if (mats.length === 1 && (customTop || customBottom)) {
            const baseMat = mats[0];
            const sideTex = customSide ? loadTex(customSide) : baseMat.map;
            const topTex = customTop ? loadTex(customTop) : baseMat.map;
            const bottomTex = customBottom ? loadTex(customBottom) : baseMat.map;
            const makeFaceMat = (map: any) => {
              const m = baseMat.clone();
              m.map = map;
              return m;
            };
            obj.material = [
              makeFaceMat(sideTex),
              makeFaceMat(sideTex),
              makeFaceMat(topTex),
              makeFaceMat(bottomTex),
              makeFaceMat(sideTex),
              makeFaceMat(sideTex)
            ];
          } else if (mats[0] && customSide) {
            mats[0].map = loadTex(customSide);
          }
        }
      });
    }
  } catch {}
}

function renderSelectedPreview(record: AssetRecord, original: THREE.Group): void {
  const placement = normalizedPlacement(record.placement);
  updatePlacementControls(placement);
  clearGroup(previewRoot);
  currentPreview = normalizeModel(original.clone(true), placement);
  applyOverridesToPreview(currentPreview, record.gameId);
  currentPreview.rotation.y = previewRotation;
  previewRoot.add(currentPreview);
  renderFootprintGuide(placement);
  frameCameraForModel(placement);
  emptyState.style.display = "none";
}

function clearGroup(group: THREE.Group): void {
  while (group.children.length) group.remove(group.children[0]);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDimensions(dimensions: [number, number, number]): string {
  return dimensions.map((value) => `${value.toFixed(2)}m`).join(" × ");
}

function setError(message: string): void {
  errorElement.textContent = message;
  if (message) announce(message, "error");
}

function announce(message: string, tone: "info" | "success" | "error" = "info"): void {
  const entry = document.createElement("li");
  entry.className = `activity-message ${tone}`;
  entry.textContent = `${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · ${message}`;
  activityLog.prepend(entry);
  while (activityLog.children.length > 8) activityLog.lastElementChild?.remove();
}

function setStatus(message: string, tone: "info" | "success" | "error" = "info"): void {
  statusElement.textContent = message;
  announce(message, tone);
}

function promptName(value: string): string {
  return value.trim().replace(/\s+/g, " ").slice(0, 120);
}

function updatePublishControls(): void {
  nextGameIdElement.textContent = nextGameId === null ? "—" : String(nextGameId);
  confirmId.disabled = !productionPublishEnabled || !selectedId || !serverReady || nextGameId === null;
  insertButton.disabled = !productionPublishEnabled || !selectedId || !serverReady || nextGameId === null || !confirmId.checked;
}

async function refreshServerInventory(): Promise<void> {
  setStatus("Reading game inventory…");
  try {
    const catalog = await apiGetCustomAssets();
    serverAssets.clear();
    catalog.assets.forEach((asset) => serverAssets.set(asset.id, asset));
    nextGameId = catalog.nextId;
    serverReady = true;
    publishTarget.textContent = productionPublishEnabled
      ? "Production server selected. Inserted items become available in the production game."
      : "Development inventory is read-only here. Open /build.html on the production server to publish to production.";
    setStatus(`Inventory ready · next available game ID is ${nextGameId}`, "success");
  } catch {
    serverReady = false;
    nextGameId = null;
    publishTarget.textContent = "The game inventory could not be reached. Start the matching game server first.";
    setStatus("Game inventory unavailable; refresh this page to retry.", "error");
  }
  renderInventory();
  updatePublishControls();
}

function setupEnvironment(): void {
  if (window.location.port === "5400") {
    environmentBadge.textContent = "PRODUCTION";
  } else if (window.location.port === "5450") {
    environmentBadge.textContent = "DEVELOPMENT";
  } else {
    environmentBadge.textContent = "SERVER";
  }
}

function switchSourceMode(mode: "model" | "texture"): void {
  currentSourceMode = mode;
  if (mode === "texture") {
    modeModelButton.classList.remove("active");
    modeModelButton.setAttribute("aria-selected", "false");
    modeTextureButton.classList.add("active");
    modeTextureButton.setAttribute("aria-selected", "true");
    textureOptions.style.display = "flex";
    assetFile.accept = ".png,.jpg,.jpeg,image/png,image/jpeg";
    promptLabel.textContent = "Block name / prompt";
    promptInput.placeholder = "e.g. ancient mossy obsidian or carved runic brick";
    promptHelp.textContent = "The name for your new Minecraft block.";
    dropzoneTitle.textContent = "Upload block texture";
    dropzoneSub.textContent = "PNG, JPG, or JPEG image (auto-compressed into 3D block).";
    dropzoneHint.innerHTML = "Textures are center-cropped, crisp-filtered, and compressed into a dedicated Minecraft 3D block (1×1×1m, 12 triangles) and exported to binary GLB.";
  } else {
    modeModelButton.classList.add("active");
    modeModelButton.setAttribute("aria-selected", "true");
    modeTextureButton.classList.remove("active");
    modeTextureButton.setAttribute("aria-selected", "false");
    textureOptions.style.display = "none";
    assetFile.accept = ".glb,.gltf,model/gltf-binary,model/gltf+json";
    promptLabel.textContent = "User prompt / item name";
    promptInput.placeholder = "e.g. weathered oak fence with iron caps";
    promptHelp.textContent = "The prompt becomes the inventory name.";
    dropzoneTitle.textContent = "Upload Meshy model";
    dropzoneSub.textContent = "GLB recommended: geometry and textures stay together.";
    dropzoneHint.innerHTML = "One-file <code>.glb</code> assets work immediately. A <code>.gltf</code> that references separate textures cannot be reconstructed from a single upload.";
  }
}

function updateDetails(record: AssetRecord | null): void {
  if (!record) {
    selectedName.textContent = "Nothing selected";
    selectedSource.textContent = "—";
    selectedSize.textContent = "—";
    selectedDimensions.textContent = "—";
    selectedTriangles.textContent = "—";
    previewPlacementButton.disabled = true;
    savePlacementButton.disabled = true;
    rotatePreviewButton.disabled = true;
    setStatus("No asset selected");
    return;
  }
  selectedName.textContent = record.name;
  selectedSource.textContent = record.assetType === "texture" ? `Flat texture (${record.filename})` : record.filename;
  selectedSize.textContent = formatBytes(record.size);
  selectedDimensions.textContent = formatDimensions(record.dimensions);
  selectedTriangles.textContent = record.triangles.toLocaleString();
  setStatus(record.gameId ? `Inserted as game ID ${record.gameId}` : "Ready to place", record.gameId ? "success" : "info");
  updatePublishControls();
}

function renderInventory(): void {
  inventoryElement.replaceChildren();
  const query = inventorySearch.value.trim().toLowerCase();
  const matches = (name: string, id: number | string) => !query || name.toLowerCase().includes(query) || String(id).includes(query);
  inventoryCount.textContent = String(serverAssets.size + [...records.values()].filter((record) => !record.gameId).length);
  const publishedIds = new Set([...records.values()].map((record) => record.gameId).filter((id): id is number => typeof id === "number"));
  if (!serverAssets.size && !records.size) {
    const empty = document.createElement("div");
    empty.className = "empty-inventory";
    empty.textContent = "No uploaded items yet. Your 3D models or block textures will appear here.";
    inventoryElement.appendChild(empty);
    return;
  }
  [...serverAssets.values()].forEach((asset) => {
    if (publishedIds.has(asset.id)) return;
    if (!matches(asset.name, asset.id)) return;
    const item = document.createElement("div");
    item.className = "inventory-item server-item";
    const icon = document.createElement("span");
    icon.className = "inventory-icon";
    icon.textContent = "✓";
    const label = document.createElement("span");
    label.className = "inventory-label";
    const name = document.createElement("strong");
    name.textContent = asset.name;
    const metadata = document.createElement("small");
    metadata.textContent = `Game ID ${asset.id} · In game`;
    label.append(name, metadata);
    if (productionPublishEnabled) {
      const remove = document.createElement("button");
      remove.className = "delete-item";
      remove.type = "button";
      remove.title = `Remove ${asset.name} from production inventory`;
      remove.textContent = "×";
      remove.addEventListener("click", (event) => {
        event.stopPropagation();
        void removeServerAsset(asset.id);
      });
      item.append(icon, label, remove);
    } else {
      item.append(icon, label);
    }
    inventoryElement.appendChild(item);
  });
  [...records.values()].sort((a, b) => b.addedAt - a.addedAt).forEach((record) => {
    if (!matches(record.name, record.gameId ?? record.id)) return;
    const item = document.createElement("div");
    item.className = `inventory-item${record.id === selectedId ? " selected" : ""}`;
    item.setAttribute("role", "button");
    item.tabIndex = 0;
    item.addEventListener("click", () => void selectRecord(record.id));
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") void selectRecord(record.id);
    });

    const icon = document.createElement("span");
    icon.className = "inventory-icon";
    icon.textContent = record.assetType === "texture" ? "◫" : "◇";
    const label = document.createElement("span");
    label.className = "inventory-label";
    const name = document.createElement("strong");
    name.textContent = record.name;
    const metadata = document.createElement("small");
    const typeLabel = record.assetType === "texture" ? "Block" : "Model";
    metadata.textContent = record.gameId
      ? `Game ID ${record.gameId} · ${typeLabel} Published`
      : `${formatBytes(record.size)} · ${typeLabel} · ${record.triangles.toLocaleString()} tris`;
    label.append(name, metadata);
    const remove = document.createElement("button");
    remove.className = "delete-item";
    remove.type = "button";
    remove.title = `Delete ${record.name}`;
    remove.textContent = "×";
    remove.addEventListener("click", (event) => {
      event.stopPropagation();
      void removeRecord(record.id);
    });
    item.append(icon, label, remove);
    inventoryElement.appendChild(item);
  });
  if (!inventoryElement.children.length) {
    const empty = document.createElement("div");
    empty.className = "empty-inventory";
    empty.textContent = query ? `No inventory item matches “${inventorySearch.value.trim()}”.` : "No uploaded items yet. Your models or block textures will appear here.";
    inventoryElement.appendChild(empty);
  }
  updatePublishControls();
}

async function selectRecord(id: string): Promise<void> {
  const record = records.get(id);
  if (!record) return;
  record.placement = normalizedPlacement(record.placement);
  setError("");
  selectedId = id;
  previewRotation = 0;
  confirmId.checked = false;
  renderInventory();
  updateDetails(record);
  setStatus(`Loading ${record.name}…`);
  try {
    const original = loadedModels.get(id) ?? await parseRecord(record);
    loadedModels.set(id, original);
    renderSelectedPreview(record, original);
    setStatus(`${record.name} is ready in the preview.`, "success");
  } catch (error) {
    setError(error instanceof Error ? error.message : "This model could not be previewed.");
  }
}

async function addFile(file: File): Promise<void> {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "png" || extension === "jpg" || extension === "jpeg") {
    switchSourceMode("texture");
    return addTextureFile(file);
  } else if (extension === "glb" || extension === "gltf") {
    switchSourceMode("model");
    return addModelFile(file);
  } else {
    setError("Upload a supported file: .png / .jpg / .jpeg for flat textures, or .glb / .gltf for 3D models.");
  }
}

async function addTextureFile(file: File): Promise<void> {
  announce(`Selected texture file ${file.name}`);
  setError("");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension !== "png" && extension !== "jpg" && extension !== "jpeg") {
    setError("Upload a PNG, JPG, or JPEG texture file.");
    return;
  }
  if (file.size > 25 * 1024 * 1024) {
    setError("This image is larger than 25 MB. Upload a smaller image.");
    return;
  }
  const name = promptName(promptInput.value) || file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ");
  if (!name) {
    setError("Enter the block name or prompt first.");
    promptInput.focus();
    return;
  }
  setStatus(`Processing texture into Minecraft block…`);
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Could not read image file."));
      reader.readAsDataURL(file);
    });

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not decode image."));
      image.src = dataUrl;
    });

    const minDim = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = Math.floor((img.naturalWidth - minDim) / 2);
    const sy = Math.floor((img.naturalHeight - minDim) / 2);

    const targetRes = Number(textureResolution.value) || 0;
    const outSize = targetRes > 0 ? targetRes : Math.min(minDim, 512);

    const canvas = document.createElement("canvas");
    canvas.width = outSize;
    canvas.height = outSize;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = targetRes === 0;
    if (targetRes === 0) ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, outSize, outSize);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;

    // Canonical Minecraft dedicated block geometry:
    // BoxGeometry(1, 1, 1), translated by (0, 0.5, 0)
    // Sits flush from y=0 to y=1, with footprint [-0.5, 0.5] on X/Z
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    geometry.translate(0, 0.5, 0);

    const mapping = textureMapping.value;
    let mesh: THREE.Mesh;

    if (mapping === "pillar") {
      const capCanvas = document.createElement("canvas");
      capCanvas.width = outSize;
      capCanvas.height = outSize;
      const capCtx = capCanvas.getContext("2d")!;
      capCtx.drawImage(canvas, 0, 0);
      capCtx.fillStyle = "rgba(0, 0, 0, 0.35)";
      capCtx.fillRect(0, 0, outSize, outSize);
      capCtx.strokeStyle = "rgba(0, 0, 0, 0.5)";
      capCtx.lineWidth = Math.max(1, outSize / 16);
      capCtx.strokeRect(outSize / 4, outSize / 4, outSize / 2, outSize / 2);

      const capTexture = new THREE.CanvasTexture(capCanvas);
      capTexture.colorSpace = THREE.SRGBColorSpace;
      capTexture.magFilter = THREE.NearestFilter;
      capTexture.minFilter = THREE.NearestFilter;
      capTexture.generateMipmaps = false;

      const sideMat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.85, metalness: 0.05 });
      const capMat = new THREE.MeshStandardMaterial({ map: capTexture, roughness: 0.85, metalness: 0.05 });
      mesh = new THREE.Mesh(geometry, [sideMat, sideMat, capMat, capMat, sideMat, sideMat]);
    } else {
      const material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.85,
        metalness: 0.05,
        name: `${name}_material`
      });
      mesh = new THREE.Mesh(geometry, material);
    }

    mesh.name = `${name}_block`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const blockGroup = new THREE.Group();
    blockGroup.name = name;
    blockGroup.add(mesh);

    // Compress & package into binary GLB using GLTFExporter
    setStatus("Compressing 3D block into GLB container…");
    const exporter = new GLTFExporter();
    const buffer: ArrayBuffer = await new Promise((resolve, reject) => {
      exporter.parse(
        blockGroup,
        (result) => resolve(result as ArrayBuffer),
        (err) => reject(err),
        { binary: true, embedImages: true }
      );
    });

    const parsedModel = await parseModel(buffer);
    const stats = getModelStats(parsedModel);

    const record: AssetRecord = {
      id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "block"}-${Date.now()}`,
      name,
      filename: `${file.name.replace(/\.[^/.]+$/, "")}.glb`,
      size: buffer.byteLength,
      addedAt: Date.now(),
      buffer,
      dimensions: stats.dimensions,
      triangles: stats.triangles,
      placement: defaultPlacement(),
      status: "draft",
      assetType: "texture"
    };

    await putStoredRecord(record);
    records.set(record.id, record);
    loadedModels.set(record.id, parsedModel);
    renderInventory();
    await selectRecord(record.id);
    setStatus(`Created 3D block: ${record.name} (${outSize}×${outSize}, 12 tris, ${formatBytes(record.size)})`, "success");
  } catch (error) {
    setStatus("Texture processing failed", "error");
    setError(error instanceof Error ? error.message : "The texture could not be processed into a 3D block.");
  } finally {
    assetFile.value = "";
  }
}

async function addModelFile(file: File): Promise<void> {
  announce(`Selected file ${file.name}`);
  setError("");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension !== "glb" && extension !== "gltf") {
    setError("Upload a .glb or .gltf file. Meshy GLB exports are the supported one-file format.");
    return;
  }
  if (file.size > 200 * 1024 * 1024) {
    setError("This upload is larger than 200 MB. Export a lighter Meshy model first.");
    return;
  }
  const name = promptName(promptInput.value);
  if (!name) {
    setError("Enter the user prompt first. It becomes the inventory item name.");
    promptInput.focus();
    return;
  }
  setStatus(`Reading ${file.name}…`);
  try {
    const buffer = await file.arrayBuffer();
    const model = await parseModel(extension === "gltf" ? new TextDecoder().decode(buffer) : buffer);
    const stats = getModelStats(model);
    const record: AssetRecord = {
      id: `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "asset"}-${Date.now()}`,
      name,
      filename: file.name,
      size: file.size,
      addedAt: Date.now(),
      buffer,
      dimensions: stats.dimensions,
      triangles: stats.triangles,
      placement: defaultPlacement(),
      status: "draft",
      assetType: "model"
    };
    await putStoredRecord(record);
    records.set(record.id, record);
    loadedModels.set(record.id, model);
    renderInventory();
    await selectRecord(record.id);
    setStatus(`Upload complete: ${record.name}`, "success");
  } catch (error) {
    setStatus("Upload failed", "error");
    setError(error instanceof Error ? `${error.message} If this is a .gltf, export a .glb with textures embedded.` : "The model could not be imported.");
  } finally {
    assetFile.value = "";
  }
}

async function insertSelected(): Promise<void> {
  if (!selectedId || nextGameId === null || !confirmId.checked) {
    announce("Confirm the displayed next game ID before inserting.", "error");
    return;
  }
  const record = records.get(selectedId);
  if (!record) return;
  insertButton.disabled = true;
  setStatus(`Sending ${record.name} to the game…`);
  setError("");
  try {
    const result = await apiInsertCustomAsset({
      requestedId: nextGameId,
      name: record.name,
      prompt: record.name,
      filename: record.filename,
      mimeType: record.filename.toLowerCase().endsWith(".gltf") ? "model/gltf+json" : "model/gltf-binary",
      dimensions: record.dimensions,
      triangles: record.triangles,
      placement: normalizedPlacement(record.placement),
      assetType: record.assetType === "texture" ? "block" : undefined,
      data: record.buffer
    });
    record.gameId = result.asset.id;
    record.status = "published";
    await putStoredRecord(record);
    serverAssets.set(result.asset.id, result.asset);
    nextGameId = result.nextId;
    confirmId.checked = false;
    setStatus(`Inserted ${record.name} as game ID ${result.asset.id}`, "success");
    renderInventory();
    updateDetails(record);
  } catch (error) {
    const next = error as Error & { nextId?: number };
    if (typeof next.nextId === "number") {
      nextGameId = next.nextId;
      confirmId.checked = false;
      setError(`That ID was taken while you were confirming it. The next available ID is ${next.nextId}.`);
    } else {
      setError(next.message || "The asset could not be inserted into the game.");
    }
    setStatus("Insert failed", "error");
  } finally {
    updatePublishControls();
  }
}

async function removeRecord(id: string): Promise<void> {
  const record = records.get(id);
  if (!record) return;
  if (record.gameId && productionPublishEnabled) {
    await removeServerAsset(record.gameId);
    return;
  }
  if (!window.confirm(`Remove ${record.name} from this browser inventory?`)) return;
  await deleteStoredRecord(id);
  records.delete(id);
  loadedModels.delete(id);
  if (selectedId === id) {
    selectedId = null;
    currentPreview = null;
    clearGroup(previewRoot);
    clearGroup(footprintGuide);
    emptyState.style.display = "flex";
    updateDetails(null);
  }
  renderInventory();
}

async function removeServerAsset(id: number): Promise<void> {
  const asset = serverAssets.get(id);
  if (!asset || !productionPublishEnabled) return;
  if (!window.confirm(`Remove ${asset.name} (game ID ${id}) from production inventory?`)) return;
  try {
    await apiDeleteCustomAsset(id);
    serverAssets.delete(id);
    nextGameId = (await apiGetCustomAssets()).nextId;
    const localMatches = [...records.values()].filter((record) => record.gameId === id);
    for (const record of localMatches) {
      await deleteStoredRecord(record.id);
      records.delete(record.id);
      loadedModels.delete(record.id);
      if (selectedId === record.id) {
        selectedId = null;
        currentPreview = null;
        clearGroup(previewRoot);
        clearGroup(footprintGuide);
        emptyState.style.display = "flex";
        updateDetails(null);
      }
    }
    renderInventory();
    updatePublishControls();
    announce(`Removed ${asset.name} (game ID ${id}) from production inventory.`, "success");
  } catch (error) {
    setError(error instanceof Error ? error.message : "Could not remove the production asset.");
  }
}

function previewPlacement(): void {
  if (!selectedId) {
    announce("Select an uploaded item before placing it in preview.", "error");
    return;
  }
  const record = records.get(selectedId);
  const original = loadedModels.get(selectedId);
  if (!record || !original) {
    announce("The selected model is still loading.", "error");
    return;
  }
  record.placement = selectedPlacement();
  renderSelectedPreview(record, original);
  setStatus(`Preview placed across ${record.placement.width} × ${record.placement.height} blocks.`, "success");
}

async function savePlacement(): Promise<void> {
  if (!selectedId) {
    announce("Select an uploaded item before saving its placement.", "error");
    return;
  }
  const record = records.get(selectedId);
  if (!record) return;
  record.placement = selectedPlacement();
  try {
    if (record.gameId && productionPublishEnabled) {
      setStatus(`Saving ${record.name} placement to production…`);
      const updated = await apiUpdateCustomAssetPlacement(record.gameId, record.placement);
      serverAssets.set(updated.id, updated);
    }
    await putStoredRecord(record);
    previewPlacement();
    announce(`Saved ${record.name}: ${record.placement.width} × ${record.placement.height} blocks at ${record.placement.scale}% scale.`, "success");
  } catch (error) {
    setError(error instanceof Error ? error.message : "Could not save the placement.");
  }
}

function resize(): void {
  const width = viewport.clientWidth;
  const height = viewport.clientHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / Math.max(height, 1);
  camera.updateProjectionMatrix();
}

assetFile.addEventListener("change", () => {
  const file = assetFile.files?.[0];
  if (file) void addFile(file);
  else announce("No file selected.");
});

dropzone.addEventListener("click", () => assetFile.click());
dropzone.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    assetFile.click();
  }
});

dropzone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropzone.classList.add("is-dragging");
});
dropzone.addEventListener("dragleave", () => dropzone.classList.remove("is-dragging"));
dropzone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropzone.classList.remove("is-dragging");
  const file = event.dataTransfer?.files[0];
  if (file) void addFile(file);
});

const updatePreviewFromControls = () => {
  if (!selectedId) return;
  const record = records.get(selectedId);
  if (!record) return;
  record.placement = selectedPlacement();
  updatePlacementControls(record.placement);
  const original = loadedModels.get(selectedId);
  if (original) renderSelectedPreview(record, original);
};
placementWidth.addEventListener("change", updatePreviewFromControls);
placementHeight.addEventListener("change", updatePreviewFromControls);
modelScale.addEventListener("input", updatePreviewFromControls);
previewPlacementButton.addEventListener("click", previewPlacement);
savePlacementButton.addEventListener("click", () => void savePlacement());
rotatePreviewButton.addEventListener("click", () => {
  if (!currentPreview || !selectedId) return;
  previewRotation = (previewRotation + Math.PI / 2) % (Math.PI * 2);
  currentPreview.rotation.y = previewRotation;
  footprintGuide.rotation.y = previewRotation;
  announce("Preview rotated 90°.");
});
modeModelButton.addEventListener("click", () => switchSourceMode("model"));
modeTextureButton.addEventListener("click", () => switchSourceMode("texture"));
inventorySearch.addEventListener("input", renderInventory);
confirmId.addEventListener("change", () => {
  updatePublishControls();
  announce(confirmId.checked ? `Game ID ${nextGameId} confirmed.` : "Game ID confirmation cleared.");
});
insertButton.addEventListener("click", () => void insertSelected());
window.addEventListener("resize", resize);

window.addEventListener("storage", (e) => {
  if (e.key === "mc_custom_atlas_overrides" || e.key === "mc_custom_atlas_version") {
    if (selectedId) {
      const record = records.get(selectedId);
      const original = loadedModels.get(selectedId);
      if (record && original) {
        renderSelectedPreview(record, original);
      }
    }
  }
});

window.addEventListener("focus", () => {
  void fetchTextureOverrides().then(() => {
    if (selectedId) {
      const record = records.get(selectedId);
      const original = loadedModels.get(selectedId);
      if (record && original) {
        renderSelectedPreview(record, original);
      }
    }
  });
});

async function init(): Promise<void> {
  announce("Asset workshop opened.");
  setupEnvironment();
  await fetchTextureOverrides();
  await refreshServerInventory();
  try {
    const stored = await getStoredRecords();
    stored.forEach((record) => records.set(record.id, record));
    renderInventory();
    if (stored[0]) await selectRecord(stored.sort((a, b) => b.addedAt - a.addedAt)[0].id);
  } catch (error) {
    setError(error instanceof Error ? error.message : "Browser inventory is unavailable in this session.");
  }
  resize();
}

function animate(): void {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

void init();
animate();
