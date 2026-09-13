/* Villager professions & mesh factory (extracted from Game.tsx — R2) */
import * as THREE from "three";
import { BLOCK_MAP } from "./blocks";
import { apiSaveVillagerTrade } from "../services/api";

export const TRADES_PER_DAY = 8; // uses per trade before the next dawn restock

export const DAILY_OFFER_COUNT = 3;

function hashTradeSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rollDailyOffers(profName: string, vkey: string, day: number, count = DAILY_OFFER_COUNT): number[] {  const prof = PROFESSIONS.find((p) => p.name === profName);
  const n = prof?.trades.length ?? 0;
  if (!n) return [];
  let st = hashTradeSeed(`${profName}|${vkey}|${day}`) || 1;
  const rnd = () => {
    st = (Math.imul(st, 1664525) + 1013904223) >>> 0;
    return st / 4294967296;
  };
  const pool = Array.from({ length: n }, (_, i) => i);
  const out: number[] = [];
  while (pool.length && out.length < Math.min(count, n)) {
    out.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
  }
  return out.sort((a, b) => a - b);
}

export function villagerKey(v: any): string {
  return v.tkey || v.id;
}

export function saveVillagerLedger(s: { currentWorldId?: string; simMode?: boolean }, v: any): void {
  if (!s || s.simMode || !s.currentWorldId || !v) return;
  try {
    const n = v.prof?.trades.length ?? 0;
    const uses: number[] = Array.from({ length: n }, (_, ti) => Number(v.usesLeft?.[ti] ?? 0));
    void apiSaveVillagerTrade(s.currentWorldId, villagerKey(v), {
      tradeDay: v.tradeDay ?? 0,
      offers: Array.isArray(v.offerIdx) ? v.offerIdx : [],
      uses,
      purse: { ...((v.purse as Record<string, number>) || {}) },
    }).catch(() => {});
  } catch { /* ignore */ }
}

    const VILLAGER_SKIN_TONES = [
      { name: "Fair", hex: 0xd8a47f, noseHex: 0xc48c66 },
      { name: "Tan", hex: 0xb47953, noseHex: 0x9f623e },
      { name: "Bronze", hex: 0x875638, noseHex: 0x6e4026 },
      { name: "Ebony", hex: 0x56341f, noseHex: 0x3d200e }
    ];

    export const PROFESSIONS = [
      { name: "Farmer", badge: "🌾", robeCol: 0x8b5a2b, hatCol: 0xdbb758, hatType: "straw", trades: [
        { offerId: 893, offerCount: 1, costId: 2,  costCount: 20, label: "Dirt ×20 ➔ Emerald ×1" },
        { offerId: 87, offerCount: 2, costId: 893, costCount: 1,  label: "Emerald ×1 ➔ Jack o'Lantern ×2" },
        { offerId: 49, offerCount: 2, costId: 893, costCount: 1,  label: "Emerald ×1 ➔ Hay Bale ×2" }
      ]},
      { name: "Librarian", badge: "📚", robeCol: 0xd9cca9, hatCol: 0x9b1b1b, hatType: "scholar", trades: [
        { offerId: 893, offerCount: 1, costId: 17, costCount: 16, label: "Oak Planks ×16 ➔ Emerald ×1" },
        { offerId: 44, offerCount: 1, costId: 893, costCount: 1,  label: "Emerald ×1 ➔ Bookshelf ×1" },
        { offerId: 46, offerCount: 2, costId: 893, costCount: 1,  label: "Emerald ×1 ➔ Lantern ×2" }
      ]},
      { name: "Weaponsmith", badge: "⚒️", robeCol: 0x2e2926, hatCol: 0x4a4a4a, hatType: "apron", trades: [
        { offerId: 893, offerCount: 1, costId: 6,  costCount: 16, label: "Cobblestone ×16 ➔ Emerald ×1" },
        { offerId: 8,  offerCount: 8, costId: 893, costCount: 1,  label: "Emerald ×1 ➔ Stone Bricks ×8" },
        { offerId: 50, offerCount: 6, costId: 893, costCount: 2,  label: "Emerald ×2 ➔ Brick Block ×6" }
      ]},
      { name: "Cleric", badge: "🔮", robeCol: 0x6e2c8a, hatCol: 0x47165c, hatType: "hood", trades: [
        { offerId: 893, offerCount: 1, costId: 2,  costCount: 32, label: "Dirt ×32 ➔ Emerald ×1" },
        { offerId: 47, offerCount: 2, costId: 893, costCount: 1,  label: "Emerald ×1 ➔ Glowstone ×2" },
        { offerId: 48, offerCount: 1, costId: 893, costCount: 1,  label: "Emerald ×1 ➔ Sea Lantern ×1" }
      ]},
      { name: "Desert Nomad", badge: "🌴", robeCol: 0xdfd3b0, hatCol: 0xb59b58, hatType: "turban", trades: [
        { offerId: 893, offerCount: 1, costId: 10, costCount: 24, label: "Sand ×24 ➔ Emerald ×1" },
        { offerId: 11, offerCount: 8, costId: 893, costCount: 1,  label: "Emerald ×1 ➔ Sandstone ×8" },
        { offerId: 37, offerCount: 8, costId: 893, costCount: 2,  label: "Emerald ×2 ➔ Glass ×8" },
        { offerId: 10, offerCount: 6, costId: 893, costCount: 1,  label: "Emerald ×1 ➔ Sand ×6" }
      ]},
      { name: "Tundra Fur", badge: "❄️", robeCol: 0x4a627a, hatCol: 0xf0f5fa, hatType: "parka", trades: [
        { offerId: 893, offerCount: 1, costId: 51, costCount: 16, label: "Snow Block ×16 ➔ Emerald ×1" },
        { offerId: 53, offerCount: 4, costId: 893, costCount: 1,  label: "Emerald ×1 ➔ Packed Ice ×4" },
        { offerId: 52, offerCount: 2, costId: 893, costCount: 1,  label: "Emerald ×1 ➔ Ice ×2" }
      ]}
    ];

    export const TRADE_RANGE = 2.6;
    export const TRADE_AIM_DIST = 3.0;
    export const FARMER_PROFESSION = "Farmer";

    export interface TradeRangeDeps {
      x: number;
      y: number;
      z: number;
    }

    export function villagerInTradeRange(
      v: any,
      player: TradeRangeDeps,
      eyeY: number,
      getBlock: (x: number, y: number, z: number) => number,
      mobs: Array<TradeRangeDeps>,
      animals: Array<TradeRangeDeps>,
      villagers: Map<string, any> | Iterable<any>
    ): boolean {
      if (!v) return false;
      const dx = v.x - player.x, dy0 = (v.y + 1.45) - (player.y + eyeY), dz = v.z - player.z;
      const dist = Math.hypot(dx, dz);
      if (dist > TRADE_RANGE) return false;
      const steps = Math.max(1, Math.ceil(dist / 0.22));
      for (let i = 1; i < steps; i++) {
        const t = i / steps;
        const bx = Math.floor(player.x + dx * t);
        const by = Math.floor(player.y + eyeY + dy0 * t);
        const bz = Math.floor(player.z + dz * t);
        const id = getBlock(bx, by, bz);
        if (id === 40) continue;
        const bd = BLOCK_MAP.get(id);
        if (id !== 0 && bd?.solid) return false;
      }
      const seg = (px: number, pz: number) => {
        const t = Math.max(0, Math.min(1, ((px - player.x) * dx + (pz - player.z) * dz) / Math.max(1e-6, dist * dist)));
        const cx = player.x + dx * t, cz = player.z + dz * t;
        return Math.hypot(px - cx, pz - cz);
      };
      for (const m of mobs) if (m.x !== v.x && seg(m.x, m.z) < 0.5 && Math.abs(m.y - player.y) < 3) return false;
      for (const a of animals) if (seg(a.x, a.z) < 0.55 && Math.abs(a.y - player.y) < 3) return false;
      const others = villagers instanceof Map ? villagers.values() : villagers;
      for (const o of others) if (o !== v && seg(o.x, o.z) < 0.5 && Math.abs(o.y - v.y) < 2) return false;
      return true;
    }

    const _tradeRay = new THREE.Raycaster();
    const _tradeNdc = new THREE.Vector2(0, 0);

    export function isVillagerAimed(
      camera: THREE.PerspectiveCamera | null,
      blockDist: number | null,
      v: any,
      maxDist = TRADE_AIM_DIST
    ): boolean {
      if (!camera || !v || !v.mesh || !v.mesh.root) return false;
      _tradeRay.setFromCamera(_tradeNdc, camera);
      _tradeRay.far = maxDist;
      const hits = _tradeRay.intersectObject(v.mesh.root, true);
      if (!hits.length || hits[0].distance > maxDist) return false;
      if (blockDist !== null && blockDist < hits[0].distance - 0.05) return false;
      return true;
    }

    export function createVillagerMesh(prof: typeof PROFESSIONS[0], skinIdx = 0) {
      const root = new THREE.Group();
      const skinTone = VILLAGER_SKIN_TONES[skinIdx % VILLAGER_SKIN_TONES.length];

      const skinMat = new THREE.MeshLambertMaterial({ color: skinTone.hex });
      const noseMat = new THREE.MeshLambertMaterial({ color: skinTone.noseHex });
      const robeMat = new THREE.MeshLambertMaterial({ color: prof.robeCol });
      const greenEyeMat = new THREE.MeshLambertMaterial({ color: 0x2b8a3e });
      const whiteEyeMat = new THREE.MeshBasicMaterial({ color: 0xf5f5f5 });
      const unibrowMat = new THREE.MeshLambertMaterial({ color: 0x2e1a0d });

      // 1. Head Group (Pivots smoothly to look at player)
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 1.45, 0);

      // Main Head Cube (0.5 x 0.62 x 0.5)
      const headGeom = new THREE.BoxGeometry(0.5, 0.62, 0.5);
      const headMesh = new THREE.Mesh(headGeom, skinMat);
      headMesh.castShadow = true;
      headGroup.add(headMesh);

      // Distinct Minecraft Villager Protruding Nose (0.12 x 0.22 x 0.14)
      const noseGeom = new THREE.BoxGeometry(0.12, 0.22, 0.14);
      const noseMesh = new THREE.Mesh(noseGeom, noseMat);
      noseMesh.position.set(0, -0.06, 0.29);
      noseMesh.castShadow = true;
      headGroup.add(noseMesh);

      // Unibrow
      const browGeom = new THREE.BoxGeometry(0.38, 0.05, 0.02);
      const browMesh = new THREE.Mesh(browGeom, unibrowMat);
      browMesh.position.set(0, 0.14, 0.255);
      headGroup.add(browMesh);

      // Green Eyes with whites
      for (const side of [-1, 1]) {
        const eyeW = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.02), whiteEyeMat);
        eyeW.position.set(side * 0.13, 0.05, 0.255);
        const eyeG = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.03), greenEyeMat);
        eyeG.position.set(side * 0.11, 0.05, 0.257);
        headGroup.add(eyeW, eyeG);
      }

      // Profession Headwear
      if (prof.hatType === "straw") {
        const brimGeom = new THREE.BoxGeometry(0.78, 0.06, 0.78);
        const brimMat = new THREE.MeshLambertMaterial({ color: prof.hatCol });
        const brim = new THREE.Mesh(brimGeom, brimMat);
        brim.position.set(0, 0.32, 0);
        headGroup.add(brim);
      } else if (prof.hatType === "scholar") {
        const capGeom = new THREE.BoxGeometry(0.56, 0.12, 0.56);
        const capMat = new THREE.MeshLambertMaterial({ color: prof.hatCol });
        const cap = new THREE.Mesh(capGeom, capMat);
        cap.position.set(0, 0.33, 0);
        headGroup.add(cap);
      } else if (prof.hatType === "hood") {
        const hoodGeom = new THREE.BoxGeometry(0.54, 0.66, 0.54);
        const hoodMat = new THREE.MeshLambertMaterial({ color: prof.hatCol });
        const hood = new THREE.Mesh(hoodGeom, hoodMat);
        hood.position.set(0, 0.02, -0.02);
        headGroup.add(hood);
      } else if (prof.hatType === "turban") {
        const turbanGeom = new THREE.BoxGeometry(0.58, 0.24, 0.58);
        const turbanMat = new THREE.MeshLambertMaterial({ color: prof.hatCol });
        const turban = new THREE.Mesh(turbanGeom, turbanMat);
        turban.position.set(0, 0.34, 0);
        headGroup.add(turban);
      } else if (prof.hatType === "parka") {
        const parkaGeom = new THREE.BoxGeometry(0.60, 0.68, 0.60);
        const parkaMat = new THREE.MeshLambertMaterial({ color: prof.robeCol });
        const parka = new THREE.Mesh(parkaGeom, parkaMat);
        parka.position.set(0, 0.02, -0.02);
        headGroup.add(parka);
      }

      root.add(headGroup);

      // 2. Torso / Robe (0.54 x 0.75 x 0.38)
      const bodyGeom = new THREE.BoxGeometry(0.54, 0.75, 0.38);
      const bodyMesh = new THREE.Mesh(bodyGeom, robeMat);
      bodyMesh.position.set(0, 0.82, 0);
      bodyMesh.castShadow = true;
      root.add(bodyMesh);

      // 3. Beautiful Jointed Crossed Arms & Hands
      const armsGroup = new THREE.Group();
      armsGroup.position.set(0, 0.88, 0.18);

      // Cloth Sleeve Section (0.58 x 0.30 x 0.24)
      const sleeveGeom = new THREE.BoxGeometry(0.58, 0.30, 0.24);
      const sleeveMesh = new THREE.Mesh(sleeveGeom, robeMat);
      sleeveMesh.castShadow = true;
      armsGroup.add(sleeveMesh);

      // Exposed Clasping 3D Hands in the center (0.24 x 0.16 x 0.12)
      const handsGeom = new THREE.BoxGeometry(0.24, 0.16, 0.12);
      const handsMesh = new THREE.Mesh(handsGeom, skinMat);
      handsMesh.position.set(0, -0.02, 0.08);
      handsMesh.castShadow = true;
      armsGroup.add(handsMesh);

      root.add(armsGroup);

      // 4. Left and Right Legs (Pivot at hip Y = 0.52)
      const legGeom = new THREE.BoxGeometry(0.20, 0.52, 0.22);
      const legMat = new THREE.MeshLambertMaterial({ color: 0x3d2716 });

      const leftLeg = new THREE.Mesh(legGeom, legMat);
      leftLeg.position.set(-0.13, 0.26, 0);
      leftLeg.castShadow = true;
      root.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeom, legMat);
      rightLeg.position.set(0.13, 0.26, 0);
      rightLeg.castShadow = true;
      root.add(rightLeg);

      // 5. Floating Nameplate Sprite
      const canvas = document.createElement("canvas");
      canvas.width = 256; canvas.height = 64;
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
      ctx.roundRect(4, 4, 248, 56, 10);
      ctx.fill();
      ctx.fillStyle = "#55FF55";
      ctx.font = "bold 22px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${prof.badge} ${prof.name}`, 128, 30);
      ctx.fillStyle = "#FFFFA0";
      ctx.font = "14px monospace";
      ctx.fillText("Aim + E to Trade", 128, 50);

      const spriteTex = new THREE.CanvasTexture(canvas);
      const spriteMat = new THREE.SpriteMaterial({ map: spriteTex, depthTest: false });
      const nameplate = new THREE.Sprite(spriteMat);
      nameplate.position.set(0, 2.15, 0);
      nameplate.scale.set(1.4, 0.35, 1);
      nameplate.renderOrder = 999; // always on top of everything
      root.add(nameplate);

      return { root, headGroup, leftLeg, rightLeg, armsMesh: armsGroup, nameplate };
    }
