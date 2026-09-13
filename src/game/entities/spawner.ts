import * as THREE from "three";
import { herdForBiome } from "./herdTable";
import type { AnimalEntity } from "./animals";
import {
  createCowMesh,
  createSheepMesh,
  createPigMesh,
  createChickenMesh,
  createHorseMesh,
  createDogMesh,
  createStriderMesh,
  createCatMesh,
  isSolitary,
  updateAnimalKinematics
} from "./animals";
import type { HostileMobEntity } from "./mobs";
import {
  createZombieMesh,
  createPigmanMesh,
  createGhastMesh,
  createCreeperMesh,
  createSkeletonMesh,
  createSpiderMesh,
  updateHostileMobKinematics
} from "./mobs";
import type { SquidEntity } from "./squid";
import { createSquidMesh, updateSquidKinematics } from "./squid";
import type { BoatEntity } from "./boat";
import { createBoatMesh, updateBoatKinematics } from "./boat";
import { GhastFireballManager } from "./ghastFireball";
import { BLOCK_MAP } from "../blocks";
import { disposeEntityRoot } from "../state/gameState";
import { playIgnite, playExplode } from "../sfx";

export class MobManager {
  animals: AnimalEntity[] = [];
  mobs: HostileMobEntity[] = [];
  squids: SquidEntity[] = [];
  boats: BoatEntity[] = [];
  fireballMgr: GhastFireballManager = new GhastFireballManager();
  scene: THREE.Scene | null = null;
  replenishTimer = 0;
  mobSpawnTimer = 0;
  dimension: "overworld" | "nether" = "overworld";
  getBiome?: (x: number, z: number) => any;

  init(scene: THREE.Scene) {
    this.scene = scene;
    this.fireballMgr.attach(scene);
  }

  clear() {
    if (!this.scene) return;
    for (const a of this.animals) { this.scene.remove(a.root); disposeEntityRoot(a.root); }
    for (const m of this.mobs) { this.scene.remove(m.root); disposeEntityRoot(m.root); }
    for (const s of this.squids) { this.scene.remove(s.root); disposeEntityRoot(s.root); }
    for (const b of this.boats) { this.scene.remove(b.root); disposeEntityRoot(b.root); }
    this.fireballMgr.clear();
    this.animals = [];
    this.mobs = [];
    this.squids = [];
    this.boats = [];
  }

  spawnSingleAnimal(
    x: number,
    y: number,
    z: number,
    type: "cow" | "sheep" | "pig" | "chicken" | "horse" | "dog" | "strider" | "cat",
    extra?: { name?: string; sex?: "male" | "female"; ownerId?: string; id?: string; collarColor?: string }
  ) {
    if (!this.scene || this.dimension === "nether") return;
    let meshData: any;
    if (type === "cow") meshData = createCowMesh();
    else if (type === "sheep") meshData = createSheepMesh();
    else if (type === "pig") meshData = createPigMesh();
    else if (type === "horse") meshData = createHorseMesh();
    else if (type === "dog") meshData = createDogMesh();
    else if (type === "strider") meshData = createStriderMesh();
    else if (type === "cat") meshData = createCatMesh();
    else meshData = createChickenMesh();

    let wanderTier: "calm" | "roamer" | "explorer" = "calm";
    let baseSpeed = 1.0;
    if (type === "cat") {
      wanderTier = "explorer"; // strays roam far and never settle near herds
      baseSpeed = 2.6;
    } else if (type === "dog") {
      wanderTier = "explorer";
      baseSpeed = 3.2; // very fast dog sprint!
    } else if (type === "strider") {
      wanderTier = "roamer";
      baseSpeed = 1.6;
    } else if (type === "horse") {
      wanderTier = Math.random() < 0.75 ? "explorer" : "roamer";
      baseSpeed = wanderTier === "explorer" ? 2.8 : 2.0;
    } else {
      const roll = Math.random();
      if (roll < 0.40) {
        wanderTier = "calm"; // 5-25 blocks/min
        baseSpeed = 0.95;
      } else if (roll < 0.75) {
        wanderTier = "roamer"; // 25-50 blocks/min
        baseSpeed = 1.45;
      } else {
        wanderTier = "explorer"; // 50-90 blocks/min
        baseSpeed = 2.15;
      }
    }
    const speed = baseSpeed * (0.90 + Math.random() * 0.25);

    const animal: AnimalEntity = {
      id: extra?.id || `animal_${type}_${Date.now()}_${Math.random()}`,
      type,
      x,
      y,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: Math.random() * Math.PI * 2,
      targetYaw: Math.random() * Math.PI * 2,
      pitch: 0,
      ground: true,
      health: (type === "horse" || type === "dog") ? 20 : 10,
      maxHealth: (type === "horse" || type === "dog") ? 20 : 10,
      wanderTier,
      speed,
      animTime: Math.random() * 10,
      isGrazing: false,
      grazingTimer: 0,
      panicTimer: 0,
      // random biological sex (pet UI differentiates ♂/♀)
      sex: extra?.sex || (Math.random() < 0.5 ? "male" : "female"),
      name: extra?.name,
      ownerId: extra?.ownerId,
      root: meshData.root,
      headGroup: meshData.headGroup,
      legs: meshData.legs,
      wings: meshData.wings,
      fleeceMesh: meshData.fleeceMesh,
      tailMesh: meshData.tailMesh
    };

    // Dog collar: grey by default; apply the owned dog's chosen collar color.
    if (type === "dog" && (meshData as any).collarMesh) {
      animal.collarMesh = (meshData as any).collarMesh;
      if (extra?.collarColor) {
        animal.collarColor = extra.collarColor;
        ((meshData as any).collarMesh.material as THREE.MeshLambertMaterial).color.set(extra.collarColor);
      }
    }

    meshData.root.position.set(x, y, z);
    this.scene.add(meshData.root);
    this.animals.push(animal);
    return animal;
  }

  spawnBoat(
    x: number,
    y: number,
    z: number,
    itemId: number,
    extra?: { id?: string; yaw?: number }
  ) {
    if (!this.scene || this.dimension === "nether") return null;
    const meshData = createBoatMesh();
    const boat: BoatEntity = {
      id: extra?.id || `boat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      itemId,
      x,
      y,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: extra?.yaw ?? Math.random() * Math.PI * 2,
      pitch: 0,
      roll: 0,
      isRidden: false,
      rowTime: Math.random() * 10,
      root: meshData.root,
      leftOar: meshData.leftOar,
      rightOar: meshData.rightOar
    };
    meshData.root.position.set(x, y, z);
    this.scene.add(meshData.root);
    this.boats.push(boat);
    return boat;
  }

  removeBoat(boat: BoatEntity) {
    const i = this.boats.indexOf(boat);
    if (i >= 0) this.boats.splice(i, 1);
    if (boat.root && this.scene) { this.scene.remove(boat.root); disposeEntityRoot(boat.root); }
  }

  spawnInitialWildlife(
    px: number,
    pz: number,
    surfaceAt: (x: number, z: number) => { h: number; top: number; sub: number; cold?: boolean },
    isSafe?: (x: number, y: number, z: number) => boolean
  ) {
    if (!this.scene || this.dimension === "nether") return;
    const types: ("cow" | "sheep" | "pig" | "chicken" | "horse" | "dog")[] = ["cow", "sheep", "pig", "chicken", "horse", "dog"];

    // 1. Land Animals in Grazing Herds (28+ Animals)
    for (let herd = 0; herd < 7; herd++) {
      const herdAngle = (herd / 7) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
      const herdDist = 12 + Math.random() * 32;
      const hx = Math.floor(px + Math.sin(herdAngle) * herdDist);
      const hz = Math.floor(pz + Math.cos(herdAngle) * herdDist);
      const herdType = types[herd % types.length];
      const herdCount = 3 + Math.floor(Math.random() * 3);

      for (let k = 0; k < herdCount; k++) {
        const x = hx + Math.floor((Math.random() - 0.5) * 6);
        const z = hz + Math.floor((Math.random() - 0.5) * 6);
        const surf = surfaceAt(x, z);
        // never spawn on/in buildings (houses, walls, roofs)
        if (surf.h > 62 && (!isSafe || isSafe(x, surf.h + 1, z))) {
          this.spawnSingleAnimal(x, surf.h + 1, z, herdType);
        }
      }
    }

    // 1b. Solitary Stray Cats: always alone, scattered far apart (never in herds)
    for (let stray = 0; stray < 3; stray++) {
      const strayAngle = Math.random() * Math.PI * 2;
      const strayDist = 18 + Math.random() * 30;
      const x = Math.floor(px + Math.sin(strayAngle) * strayDist);
      const z = Math.floor(pz + Math.cos(strayAngle) * strayDist);
      const surf = surfaceAt(x, z);
      if (surf.h > 62 && (!isSafe || isSafe(x, surf.h + 1, z))) {
        this.spawnSingleAnimal(x, surf.h + 1, z, "cat");
      }
    }

    // 2. Aquatic Wildlife (Squids)
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const dist = 10 + Math.random() * 25;
      const x = Math.floor(px + Math.sin(angle) * dist);
      const z = Math.floor(pz + Math.cos(angle) * dist);
      const surf = surfaceAt(x, z);

      const seaLevel = 62;
      if (surf.h <= seaLevel - 2) {
        const y = Math.min(seaLevel - 2, Math.max(surf.h + 1, seaLevel - 5));
        const meshData = createSquidMesh();
        const squid: SquidEntity = {
          id: `squid_${i}`,
          x,
          y,
          z,
          vx: (Math.random() - 0.5) * 0.5,
          vy: 0,
          vz: (Math.random() - 0.5) * 0.5,
          yaw: Math.random() * Math.PI * 2,
          pitch: 0,
          roll: 0,
          inWater: true,
          suffocateTimer: 0,
          health: 10,
          maxHealth: 10,
          animTime: Math.random() * 10,
          tentacleAngle: 0,
          root: meshData.root,
          bodyMesh: meshData.bodyMesh,
          tentacles: meshData.tentacles
        };

        meshData.root.position.set(x, y, z);
        this.scene.add(meshData.root);
        this.squids.push(squid);
      }
    }

    // 3. Floating Wooden Boats (Docked on water surfaces)
    for (let i = 0; i < 2; i++) {
      const angle = (i === 0 ? 0.8 : -1.2);
      const dist = 14 + i * 8;
      const x = Math.floor(px + Math.sin(angle) * dist);
      const z = Math.floor(pz + Math.cos(angle) * dist);
      const meshData = createBoatMesh();

      const boat: BoatEntity = {
        id: `boat_${i}`,
        itemId: 1041,
        x,
        y: 62.0,
        z,
        vx: 0,
        vy: 0,
        vz: 0,
        yaw: angle + Math.PI / 2,
        pitch: 0,
        roll: 0,
        isRidden: false,
        rowTime: 0,
        root: meshData.root,
        leftOar: meshData.leftOar,
        rightOar: meshData.rightOar
      };

      meshData.root.position.set(x, 62.0, z);
      this.scene.add(meshData.root);
      this.boats.push(boat);
    }
  }

  spawnHostileMob(
    px: number,
    pz: number,
    surfaceAt: (x: number, z: number) => { h: number; top: number; sub: number; cold?: boolean },
    isSafe?: (x: number, y: number, z: number) => boolean
  ) {
    if (!this.scene) return;
    const mobTypes: ("zombie" | "creeper" | "skeleton" | "spider" | "pigman" | "ghast")[] =
      this.dimension === "nether"
        ? ["pigman", "pigman", "skeleton", "ghast"]
        : ["zombie", "creeper", "skeleton", "spider"];
    const type = mobTypes[Math.floor(Math.random() * mobTypes.length)];
    this.spawnHostileMobOf(type, px, pz, surfaceAt, isSafe);
  }

  /** Spawn a specific mob kind at a location (catalogue/sim use; worldgen delegating above). */
  spawnHostileMobOf(
    type: "zombie" | "creeper" | "skeleton" | "spider" | "pigman" | "ghast",
    px: number,
    pz: number,
    surfaceAt: (x: number, z: number) => { h: number; top: number; sub: number; cold?: boolean },
    isSafe?: (x: number, y: number, z: number) => boolean
  ) {
    if (!this.scene) return null;
    // Spawn-search: avoid roofs/trees (canopies, houses) — retry up to 10 offsets.
    let x = 0, z = 0, y = 0, angle = Math.random() * Math.PI * 2;
    for (let attempt = 0; attempt < 10; attempt++) {
      const dist = 20 + Math.random() * 22;
      angle = Math.random() * Math.PI * 2;
      x = Math.floor(px + Math.sin(angle) * dist);
      z = Math.floor(pz + Math.cos(angle) * dist);
      if (type === "ghast") {
        y = Math.floor(48 + Math.random() * 26);
      } else {
        const surf = surfaceAt(x, z);
        y = surf.h + 1;
        if (this.dimension === "nether" && y > 110) {
          y = Math.floor(35 + Math.random() * 30);
        }
      }
      if (!isSafe || isSafe(x, y, z)) break;
    }
    if (isSafe && !isSafe(x, y, z)) return null;

    let meshData: any;
    if (type === "zombie") meshData = createZombieMesh();
    else if (type === "pigman") meshData = createPigmanMesh();
    else if (type === "ghast") meshData = createGhastMesh();
    else if (type === "creeper") meshData = createCreeperMesh();
    else if (type === "skeleton") meshData = createSkeletonMesh();
    else meshData = createSpiderMesh();

    const mob: HostileMobEntity = {
      id: `mob_${type}_${Date.now()}_${Math.random()}`,
      type,
      x,
      y,
      z,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: angle + Math.PI,
      targetYaw: angle + Math.PI,
      pitch: 0,
      ground: type !== "ghast",
      health: type === "ghast" ? 10 : (type === "pigman" ? 24 : (type === "spider" ? 16 : 20)),
      maxHealth: type === "ghast" ? 10 : (type === "pigman" ? 24 : 20),
      speed: type === "ghast" ? 0.8 : (type === "spider" ? 1.8 : (type === "pigman" ? 1.4 : 1.3)),
      animTime: 0,
      isAggro: false,
      attackCooldown: type === "ghast" ? 2.5 : 0,
      fuseTimer: 0,
      root: meshData.root,
      headGroup: meshData.headGroup,
      arms: meshData.arms,
      legs: meshData.legs,
      fireGroup: meshData.fireGroup,
      tentacles: meshData.tentacles,
      faceMesh: meshData.faceMesh
    };

    meshData.root.position.set(x, y, z);
    this.scene.add(meshData.root);
    this.mobs.push(mob);
    return mob;
  }

  /** Reduce a hostile mob's health (bow arrows); remove it on death. */
  damageMob(id: string, amt: number, onDeath?: (x: number, y: number, z: number) => void) {
    for (let i = 0; i < this.mobs.length; i++) {
      const m = this.mobs[i];
      if (m.id !== id) continue;
      m.health -= amt;
      if (m.health <= 0) {
        if (onDeath) onDeath(m.x, m.y, m.z);
        if (this.scene) { this.scene.remove(m.root); disposeEntityRoot(m.root); }
        this.mobs.splice(i, 1);
      }
      return;
    }
  }

  update(
    dt: number,
    player: { x: number; y: number; z: number },
    getBlock: (x: number, y: number, z: number) => number,
    damagePlayer: (amt: number) => void,
    isNight = false,
    gameplayMode: "peaceful" | "survival" | "hardcore" = "survival",
    surfaceAt?: (x: number, z: number) => { h: number; top: number; sub: number; cold?: boolean },
    isSafeSpawn?: (x: number, y: number, z: number) => boolean,
    ride?: { fx: number; fz: number; yaw: number; jump?: boolean } | null,
    onMobBurn?: (x: number, y: number, z: number) => void,
    onMobDeathFx?: (x: number, y: number, z: number) => void,
    creative = false
) {
    if (!this.scene) return;
    const px = player.x, pz = player.z;

    // Ensure no animals exist in the Nether
    if (this.dimension === "nether" && this.animals.length > 0) {
      for (const a of this.animals) { this.scene.remove(a.root); disposeEntityRoot(a.root); }
      this.animals = [];
    }

    // 0. Periodic Wildlife Replenishment (Overworld only - no animals in Nether)
    if (surfaceAt && this.dimension !== "nether") {
      this.replenishTimer += dt;
      if (this.replenishTimer >= 4.0) {
        this.replenishTimer = 0;
        // Count nearby animals in active chunk radius (< 48m)
        let nearbyCount = 0;
        for (let i = 0; i < this.animals.length; i++) {
          if (Math.hypot(this.animals[i].x - px, this.animals[i].z - pz) < 48) {
            nearbyCount++;
          }
        }
        // Replenish new herds in unpopulated areas up to world animal cap (110 animals)
        if (nearbyCount < 4 && this.animals.length < 48) {
          const types: ("cow" | "sheep" | "pig" | "chicken" | "horse" | "dog" | "cat")[] = ["cow", "sheep", "pig", "chicken", "horse", "dog", "cat"];
          const spawnAngle = Math.random() * Math.PI * 2;
          const spawnDist = 22 + Math.random() * 20;
          const sx = Math.floor(px + Math.sin(spawnAngle) * spawnDist);
          const sz = Math.floor(pz + Math.cos(spawnAngle) * spawnDist);
          const surf = surfaceAt(sx, sz);
          if (surf.h > 62 && (!isSafeSpawn || isSafeSpawn(sx, surf.h + 1, sz))) {
            const hType = types[Math.floor(Math.random() * types.length)];
            const litter = hType === "cat" ? 1 : 3;
            for (let k = 0; k < litter; k++) {
              if (!isSafeSpawn || isSafeSpawn(sx + k, surf.h + 1, sz)) {
                this.spawnSingleAnimal(sx + k, surf.h + 1, sz, hType);
              }
            }
          }
        }
        // Ambient wildlife: seed biome-budgeted herds in a wide ring so flown-over
        // terrain populates (plains/meadows dense, deserts/peaks empty).
        if (this.animals.length < 110) {
          for (let attempt = 0; attempt < 3; attempt++) {
            const ang = Math.random() * Math.PI * 2;
            const dist = 40 + Math.random() * 80;
            const sx = Math.floor(px + Math.sin(ang) * dist);
            const sz = Math.floor(pz + Math.cos(ang) * dist);
            const surf = surfaceAt(sx, sz);
            if (surf.h <= 62) continue;
            if (isSafeSpawn && !isSafeSpawn(sx, surf.h + 1, sz)) continue;
            let bId: string | undefined;
            if (this.getBiome) {
              try {
                const b = this.getBiome(sx, sz);
                bId = typeof b === "string" ? b : b?.id;
              } catch { bId = undefined; }
            }
            const herd = herdForBiome(bId, Math.random);
            if (!herd) continue;
            let local = 0;
            for (const a of this.animals) {
              if (Math.hypot(a.x - sx, a.z - sz) < 28 && ++local >= herd.count + 2) break;
            }
            if (local >= herd.count + 2) continue;
            for (let k = 0; k < herd.count; k++) {
              const ax = sx + Math.floor((Math.random() - 0.5) * 5);
              const az = sz + Math.floor((Math.random() - 0.5) * 5);
              const as = ax === sx && az === sz ? surf : surfaceAt(ax, az);
              if (as.h <= 62) continue;
              if (!isSafeSpawn || isSafeSpawn(ax, as.h + 1, az)) {
                this.spawnSingleAnimal(ax, as.h + 1, az, herd.type);
              }
            }
            break;
          }
        }
      }
    }

    // Peaceful mode: remove all hostile mobs whenever surface sampling is available.
    if (gameplayMode === "peaceful" && surfaceAt) {
      for (let i = this.mobs.length - 1; i >= 0; i--) {
        this.scene.remove(this.mobs[i].root); disposeEntityRoot(this.mobs[i].root);
        this.mobs.splice(i, 1);
      }
    } else if (surfaceAt && isNight) {
      // Hostile Mob Spawner — night only (mobs burn & despawn in daylight)
      const maxMobs = gameplayMode === "hardcore" ? 16 : 10;
      if (this.mobs.length < maxMobs) {
        this.spawnHostileMob(px, pz, surfaceAt, isSafeSpawn);
      }
    }

    // 1. Update Wildlife Animals (Persistent with Distance LOD)
    for (let i = 0; i < this.animals.length; i++) {
      const a = this.animals[i];
      const dist = Math.hypot(a.x - px, a.z - pz);

      // Distance LOD: If the animal is beyond visible range (> 128m),
      // keep its state persisted, hide its 3D root mesh, and pause kinematics to save CPU
      if (dist > 128 && !a.ridden) {
        if (a.root.visible) a.root.visible = false;
        continue;
      }
      if (!a.root.visible) a.root.visible = true;

      const footBlock = getBlock(Math.floor(a.x), Math.floor(a.y + 0.02), Math.floor(a.z));
      const groundBlock = getBlock(Math.floor(a.x), Math.floor(a.y - 0.05), Math.floor(a.z));
      
      const isStriderOnLava = a.type === "strider" && (footBlock === 40 || groundBlock === 40);
      if ((footBlock !== 0 && BLOCK_MAP.get(footBlock)?.solid) || (a.type === "strider" && footBlock === 40)) {
        a.y = Math.floor(a.y) + 1;
        a.vy = 0;
        a.ground = true;
      } else if (!isStriderOnLava && (groundBlock === 0 || !BLOCK_MAP.get(groundBlock)?.solid)) {
        a.vy = Math.max(-16, a.vy - 20 * dt);
        a.ground = false;
        a.y += a.vy * dt;
      } else if (!a.ground && a.vy > 0) {
        // rising from a jump: keep physics going until the hop peaks
        a.vy = Math.max(-16, a.vy - 20 * dt);
        a.y += a.vy * dt;
      } else {
        a.vy = 0;
        a.ground = true;
      }

      if (a.wanderTier === undefined) {
        a.wanderTier = (a.type === "horse" || a.type === "cat") ? "explorer" : (Math.random() < 0.4 ? "calm" : (Math.random() < 0.75 ? "roamer" : "explorer"));
      }
      if (a.walkTimer === undefined) a.walkTimer = 0;
      if (a.idleTimer === undefined) a.idleTimer = 0.5 + Math.random() * 1.5;
      // dead-state guard
      if (a.walkTimer <= 0 && a.idleTimer <= 0) {
        a.idleTimer = 0.5 + Math.random() * 1.0;
      }

      // Voxel collision (walls, water, lava & fence rules) — no wall-hopping, no
      // water wading. Passable non-solid blocks (flowers, tall grass, saplings, torches) don't block.
      const R = a.type === "horse" ? 0.35 : (a.type === "chicken" ? 0.20 : (a.type === "dog" ? 0.24 : (a.type === "cat" ? 0.22 : 0.30)));
      const H = a.type === "horse" ? 1.60 : (a.type === "chicken" ? 0.55 : (a.type === "dog" ? 0.65 : (a.type === "cat" ? 0.60 : 0.85)));

      const aSolid = (bx: number, by: number, bz: number) => {
        const id = getBlock(bx, by, bz);
        if (id === 0 || id === 39 || id === 40) return false; // air/liquids
        return !!BLOCK_MAP.get(id)?.solid;
      };

      const tryMoveTo = (nx: number, nz: number, targetY: number) => {
        const x0 = Math.floor(nx - R), x1 = Math.floor(nx + R);
        const z0 = Math.floor(nz - R), z1 = Math.floor(nz + R);
        const yFeet = Math.floor(targetY + 0.05);
        const yHead = Math.floor(targetY + H);
        for (let yy = yFeet; yy <= yHead; yy++) {
          for (let zz = z0; zz <= z1; zz++) {
            for (let xx = x0; xx <= x1; xx++) {
              if (aSolid(xx, yy, zz)) return false;
            }
          }
        }
        return true;
      };

      // Blocks that must NOT be auto-climbed (pens stay pens): fences (160+), doors, trapdoors
      const NO_CLIMB = new Set([160, 161, 105, 106, 107, 108]);

      const hasNoClimbBlock = (bx: number, bz: number, targetY: number) => {
        const x0 = Math.floor(bx - R), x1 = Math.floor(bx + R);
        const z0 = Math.floor(bz - R), z1 = Math.floor(bz + R);
        const y0 = Math.floor(targetY);
        for (let zz = z0; zz <= z1; zz++) {
          for (let xx = x0; xx <= x1; xx++) {
            const id = getBlock(xx, y0, zz);
            if (NO_CLIMB.has(id)) return true;
          }
        }
        return false;
      };

      // Cliff-edge sense: ground must exist within 4 blocks below (gravity carries safe descent)
      const groundSafeAt = (bx: number, bz: number, baseY: number) => {
        const x0 = Math.floor(bx - R), x1 = Math.floor(bx + R);
        const z0 = Math.floor(bz - R), z1 = Math.floor(bz + R);
        for (let zz = z0; zz <= z1; zz++) {
          for (let xx = x0; xx <= x1; xx++) {
            let supported = false;
            for (let dy = 0; dy <= 4; dy++) {
              const g = getBlock(xx, Math.floor(baseY - 0.05) - dy, zz);
              if (g === 39 || (g === 40 && a.type !== "strider")) return false; // water/lava underfoot
              if ((g !== 0 && BLOCK_MAP.get(g)?.solid) || (a.type === "strider" && g === 40)) { supported = true; break; }
            }
            if (!supported) return false; // chasm: nothing within 4 below
          }
        }
        return true;
      };

      // ── RIDDEN (pet mount): player steers; the animal turns with the camera ──
      if (a.ridden && ride) {
        // animal meshes face +Z while the camera faces -Z at yaw 0 → offset by π
        a.yaw = ride.yaw + Math.PI;
        a.targetYaw = ride.yaw + Math.PI;
        const sy = Math.sin(ride.yaw), cy = Math.cos(ride.yaw);
        const wx = ride.fx * cy + ride.fz * sy;
        const wz = -ride.fx * sy + ride.fz * cy;
        const RIDE_SPEED = a.type === "horse" ? 9.8 : (a.type === "strider" ? 8.5 : (a.type === "pig" ? 6.2 : (a.type === "sheep" ? 6.6 : 7.0)));
        const input = Math.hypot(ride.fx, ride.fz);
        if (input > 0.01) {
          a.vx = wx * RIDE_SPEED;
          a.vz = wz * RIDE_SPEED;
          // Head turns actively in the direction we are riding
          const moveAngle = Math.atan2(wx, wz);
          let relYaw = moveAngle - a.yaw;
          while (relYaw > Math.PI) relYaw -= 2 * Math.PI;
          while (relYaw < -Math.PI) relYaw += 2 * Math.PI;
          a.rideMoveYaw = THREE.MathUtils.clamp(relYaw, -0.75, 0.75);
        } else {
          a.vx *= 0.75;
          a.vz *= 0.75;
          a.rideMoveYaw = 0;
        }
        // SPACE while mounted: the animal hops ~1-2 blocks high
        if (a.jumpCooldown === undefined) a.jumpCooldown = 0;
        if (ride.jump && a.ground && a.jumpCooldown <= 0) {
          a.vy = a.type === "horse" ? 8.8 : 7.2; // Horse jump clears 2 blocks!
          a.ground = false;
          a.jumpCooldown = a.type === "horse" ? 0.75 : 1.1;
        }
        if (a.jumpCooldown > 0) a.jumpCooldown -= dt;
      } else {
        // Herd attraction: drift toward the nearest same-species neighbour (solitary strays skip this)
        if (!isSolitary(a.type) && (a.herdCheck === undefined || Math.random() < dt * 0.4)) {
          a.herdCheck = true;
          let nearest: AnimalEntity | null = null, nd = 15.0 * 15.0;
          for (const o of this.animals) {
            if (o === a || o.type !== a.type) continue;
            const dx = o.x - a.x, dz = o.z - a.z, d2 = dx * dx + dz * dz;
            if (d2 < nd) { nd = d2; nearest = o; }
          }
          a.herdTarget = nearest ? Math.atan2(nearest.x - a.x, nearest.z - a.z) : null;
          a.herdDist = nd;
        }
        const nearHerd = a.herdTarget !== null && (a.herdDist ?? 999) < 15.0 * 15.0;
        const veryClose = nearHerd && (a.herdDist ?? 999) < 0.75 * 0.75;

        if (a.walkTimer > 0) {
          a.walkTimer -= dt;
          const walkSpeed = a.speed;
          a.vx = Math.sin(a.yaw) * walkSpeed;
          a.vz = Math.cos(a.yaw) * walkSpeed;
          // Organic gentle path curvature without sharp direction reversals
          a.targetYaw += Math.sin(a.animTime * 0.35) * 0.12 * dt;

          // If currently approaching a friend, check if we reached them
          if (a.socialPhase === "approach" && a.socialTargetId) {
            const friend = this.animals.find(o => o.id === a.socialTargetId);
            if (friend) {
              const curDist = Math.hypot(friend.x - a.x, friend.z - a.z);
              if (curDist < 2.4) {
                // Reached companion: pause to interact, look at friend, then disperse next
                a.walkTimer = 0;
                a.idleTimer = 1.8 + Math.random() * 2.2;
                a.socialPhase = "disperse";
                a.socialTargetId = undefined;
                const angleToFriend = Math.atan2(friend.x - a.x, friend.z - a.z) - a.yaw;
                let normYaw = angleToFriend;
                while (normYaw > Math.PI) normYaw -= 2 * Math.PI;
                while (normYaw < -Math.PI) normYaw += 2 * Math.PI;
                a.lookTargetYaw = THREE.MathUtils.clamp(normYaw, -0.85, 0.85);
                a.lookTimer = a.idleTimer;
              }
            }
          }

          if (a.walkTimer <= 0) {
            a.vx = 0;
            a.vz = 0;
            if (a.type === "dog") {
              // Dog: pauses for a long time (4 to 8 seconds of standing/sitting & looking around)
              a.idleTimer = 4.0 + Math.random() * 4.0;
            } else if (a.wanderTier === "calm") {
              a.idleTimer = 2.0 + Math.random() * 3.5;
              if (Math.random() < 0.4) { a.isGrazing = true; a.grazingTimer = 0; }
            } else if (a.wanderTier === "roamer") {
              a.idleTimer = 1.2 + Math.random() * 2.2;
              if (Math.random() < 0.2) { a.isGrazing = true; a.grazingTimer = 0; }
            } else {
              // explorer: short pauses between long treks
              a.idleTimer = 0.8 + Math.random() * 1.5;
            }
          }
        } else if (a.idleTimer > 0) {
          a.idleTimer -= dt;
          a.vx *= 0.75;
          a.vz *= 0.75;
          if (a.idleTimer <= 0) {
            // Purposeful walk path durations
            if (a.type === "dog") {
              // Dog: moves very fast in quick sprint bursts (2 to 4.5 seconds)
              a.walkTimer = 2.0 + Math.random() * 2.5;
            } else if (a.wanderTier === "calm") {
              a.walkTimer = 3.5 + Math.random() * 4.5;
            } else if (a.wanderTier === "roamer") {
              a.walkTimer = 6.0 + Math.random() * 7.0;
            } else {
              a.walkTimer = 9.0 + Math.random() * 12.0;
            }

            // Social pattern: approach nearby animals then move away from them
            let nearestFriend: AnimalEntity | null = null;
            let friendDistSq = 18.0 * 18.0;
            for (const o of this.animals) {
              if (o === a) continue;
              const dx = o.x - a.x, dz = o.z - a.z, d2 = dx * dx + dz * dz;
              if (d2 < friendDistSq) {
                friendDistSq = d2;
                nearestFriend = o;
              }
            }

            const friendDist = Math.sqrt(friendDistSq);
            if (nearestFriend && friendDist < 18.0 && !isSolitary(a.type)) {
              if (!a.socialPhase || a.socialPhase === "approach") {
                if (friendDist > 2.6) {
                  // Approach phase: walk toward companion
                  const angleToFriend = Math.atan2(nearestFriend.x - a.x, nearestFriend.z - a.z);
                  a.targetYaw = angleToFriend + (Math.random() - 0.5) * 0.35;
                  a.socialTargetId = nearestFriend.id;
                } else {
                  // Already close: switch to disperse
                  a.socialPhase = "disperse";
                  const angleAway = Math.atan2(a.x - nearestFriend.x, a.z - nearestFriend.z);
                  a.targetYaw = angleAway + (Math.random() - 0.5) * 0.8;
                }
              } else {
                // Disperse phase: move away from companion into pasture
                const angleAway = Math.atan2(a.x - nearestFriend.x, a.z - nearestFriend.z);
                a.targetYaw = angleAway + (Math.random() - 0.5) * 0.8;
                a.socialPhase = "approach";
              }
            } else {
              // General exploration heading
              if (Math.random() < 0.75) {
                a.targetYaw = a.yaw + (Math.random() - 0.5) * 1.5;
              } else {
                a.targetYaw = a.yaw + (Math.random() - 0.5) * 3.0;
              }
            }
          }
        }

        // Herd steering: soft guide only if far away (>12m)
        if (nearHerd && !veryClose && a.walkTimer > 0 && (a.herdDist ?? 0) > 12.0 * 12.0) {
          const toHerd = a.herdTarget!;
          let diff = toHerd - a.yaw;
          while (diff > Math.PI) diff -= 2 * Math.PI;
          while (diff < -Math.PI) diff += 2 * Math.PI;
          a.targetYaw = a.targetYaw + diff * 0.12 * Math.min(1, dt);
        }
        if (veryClose && a.walkTimer > 0) {
          // Soft separation nudge
          const toHerd = a.herdTarget!;
          let diff = toHerd - a.yaw;
          while (diff > Math.PI) diff -= 2 * Math.PI;
          while (diff < -Math.PI) diff += 2 * Math.PI;
          a.targetYaw = a.yaw - diff * 0.6;
        }
      } // end ridden/AI branch

      a.yaw += (a.targetYaw - a.yaw) * Math.min(1, dt * 4.0);
      const stepX = a.vx * dt, stepZ = a.vz * dt;
      if (a.jumpCooldown === undefined) a.jumpCooldown = 0;
      if (a.jumpCooldown > 0) a.jumpCooldown -= dt;

      const tryJump = () => {
        if (!a.ground || a.jumpCooldown! > 0) return;
        a.vy = a.type === "horse" ? 6.5 : 4.8;
        a.ground = false;
        a.jumpCooldown = 1.6;
      };

      // Auto-climb step solver: walks seamlessly over 1-block differences, stops only at 2+ block obstacles
      const stepAxis = (dx: number, dz: number): boolean => {
        const targetX = a.x + dx;
        const targetZ = a.z + dz;

        // 1. Direct horizontal walk at current height
        if (tryMoveTo(targetX, targetZ, a.y) && groundSafeAt(targetX, targetZ, a.y)) {
          a.x = targetX;
          a.z = targetZ;
          return true;
        }

        // 2. Auto-Climb: 1-block height difference (walks right over it normally, no obstacle trigger)
        const step1Y = Math.floor(a.y) + 1.0;
        if (!hasNoClimbBlock(targetX, targetZ, a.y) && tryMoveTo(targetX, targetZ, step1Y) && groundSafeAt(targetX, targetZ, step1Y)) {
          a.y = step1Y;
          a.ground = true;
          a.vy = 0;
          a.x = targetX;
          a.z = targetZ;
          return true; // 1-block stepped up seamlessly!
        }

        // 3. 2-Block Step-Up for Horses / Ridden Mounts
        if (a.type === "horse" || a.ridden) {
          const step2Y = Math.floor(a.y) + 2.0;
          if (!hasNoClimbBlock(targetX, targetZ, a.y) && tryMoveTo(targetX, targetZ, step2Y) && groundSafeAt(targetX, targetZ, step2Y)) {
            a.y = step2Y;
            a.ground = true;
            a.vy = 0;
            a.x = targetX;
            a.z = targetZ;
            return true;
          }
        }

        // True obstacle (2+ block wall, fence, tree, or cliff)
        return false;
      };

      let hitObstacleX = false, hitObstacleZ = false;
      if (Math.abs(stepX) > 1e-5) {
        if (!stepAxis(stepX, 0)) hitObstacleX = true;
      }
      if (Math.abs(stepZ) > 1e-5) {
        if (!stepAxis(0, stepZ)) hitObstacleZ = true;
      }

      const blocked = (hitObstacleX && Math.abs(stepX) > 1e-4) || (hitObstacleZ && Math.abs(stepZ) > 1e-4);

      if (blocked) {
        // When bumping into a true obstacle (2+ blocks high, wall, fence):
        // Stay 1-2 seconds and then move to a different direction
        if (!a.ridden) {
          a.vx = 0;
          a.vz = 0;
          a.walkTimer = 0;
          a.idleTimer = 1.0 + Math.random() * 1.0; // 1 to 2 seconds pause
          // Look around at what was bumped into
          a.lookTargetYaw = (Math.random() - 0.5) * 0.7;
          a.lookTargetPitch = 0.12;
          a.lookTimer = a.idleTimer;
          // Pre-select an open heading away from the obstacle
          const turnAngle = (Math.random() < 0.5 ? 1 : -1) * (Math.PI * 0.45 + Math.random() * 0.35);
          a.targetYaw = a.yaw + turnAngle;
        }
        if (Math.random() < 0.15) tryJump();
      }

      // Stuck guard: if wandering produces no displacement for ~2.5s, hop and deflect cleanly
      if (!a.ridden) {
        const px0 = (a as any).__px ?? a.x, pz0 = (a as any).__pz ?? a.z;
        const disp = Math.hypot(a.x - px0, a.z - pz0);
        if (disp < 0.04 && a.walkTimer && a.walkTimer > 0) {
          a.stuckT = (a.stuckT || 0) + dt;
          if (a.stuckT > 2.5) {
            a.stuckT = 0;
            tryJump();
            a.targetYaw = a.yaw + (Math.random() < 0.5 ? 1 : -1) * 2.1;
            a.yaw = a.targetYaw;
          }
        } else {
          a.stuckT = 0;
        }
        (a as any).__px = a.x;
        (a as any).__pz = a.z;
      }

      updateAnimalKinematics(a, dt, player, this.animals);
    }

    // 2. Update Squids
    for (let i = this.squids.length - 1; i >= 0; i--) {
      const s = this.squids[i];
      updateSquidKinematics(s, dt, getBlock);
      if (s.health <= 0) {
        this.scene.remove(s.root); disposeEntityRoot(s.root);
        this.squids.splice(i, 1);
      }
    }

    // 3. Update Floating Boats
    for (let i = 0; i < this.boats.length; i++) {
      const b = this.boats[i];
      const wx = Math.floor(b.x), wz = Math.floor(b.z);
      let topWater = -1;
      for (let y = Math.floor(b.y) - 3; y <= Math.floor(b.y) + 3; y++) {
        if (getBlock(wx, y, wz) === 39) topWater = y;
      }
      if (topWater >= 0) {
        updateBoatKinematics(b, dt, topWater, 0.96);
      } else {
        let gy = Math.floor(b.y) + 1;
        while (gy > 1 && !BLOCK_MAP.get(getBlock(wx, gy - 1, wz))?.solid) gy--;
        updateBoatKinematics(b, dt, gy + 0.32, 0.90);
      }
    }

    // 4. Update Hostile Mobs with Difficulty Scaling
    for (let i = this.mobs.length - 1; i >= 0; i--) {
      const m = this.mobs[i];

      // Despawn far mobs (> 65m)
      if (Math.hypot(m.x - px, m.z - pz) > 65) {
        this.scene.remove(m.root); disposeEntityRoot(m.root);
        this.mobs.splice(i, 1);
        continue;
      }

      const footBlock = getBlock(Math.floor(m.x), Math.floor(m.y), Math.floor(m.z));
      const groundBlock = getBlock(Math.floor(m.x), Math.floor(m.y - 0.05), Math.floor(m.z));
      
      // Mobs WALK ON WATER (no swimming, no sinking) — treat liquids as ground.
      if (m.type === "ghast") {
        m.ground = false;
        m.vy = Math.sin(m.animTime * 1.6) * 0.45 + (58 - m.y) * 0.15;
        m.fallStartY = undefined;
        m.burnTimer = 0;
        if (m.tentacles) {
          for (let ti = 0; ti < m.tentacles.length; ti++) {
            m.tentacles[ti].rotation.x = Math.sin(m.animTime * 2.2 + ti * 0.7) * 0.35;
          }
        }
      } else if (footBlock !== 0 && footBlock !== 39 && footBlock !== 40) {
        m.y = Math.floor(m.y) + 1;
        m.vy = 0;
        m.ground = true;
      } else if (groundBlock === 0) {
        m.vy = Math.max(-18, m.vy - 20 * dt);
        m.ground = false;
      } else {
        m.vy = 0;
        m.ground = true;
      }

      // Fall damage: track the peak height; landing after a >5-block drop kills.
      if (!m.ground && m.fallStartY === undefined) {
        m.fallStartY = m.y;
      }
      if (m.ground) {
        if (m.fallStartY !== undefined) {
          const fallDist = m.fallStartY - m.y;
          if (fallDist > 5) {
            if (onMobDeathFx) onMobDeathFx(m.x, m.y, m.z);
            this.scene.remove(m.root); disposeEntityRoot(m.root);
            this.mobs.splice(i, 1);
            continue;
          }
        }
        m.fallStartY = undefined;
      }

      // Daytime burning: surface mobs in open sky ignite and die after 10s.
      if (!isNight) {
        let exposed = true;
        const top = Math.floor(m.y) + 8;
        for (let yy = Math.floor(m.y) + 1; yy <= top; yy++) {
          const bid = getBlock(Math.floor(m.x), yy, Math.floor(m.z));
          if (bid !== 0 && bid !== 39 && bid !== 40) { exposed = false; break; }
        }
        if (exposed) {
          m.burnTimer = (m.burnTimer || 0) + dt;
          if (onMobBurn && m.burnTimer > 0.05 && Math.random() < 0.65) {
            onMobBurn(m.x, m.y + (m.type === "spider" ? 0.35 : 0.8), m.z);
          }
          if (m.burnTimer >= 5) {
            if (onMobDeathFx) onMobDeathFx(m.x, m.y, m.z);
            this.scene.remove(m.root); disposeEntityRoot(m.root);
            this.mobs.splice(i, 1);
            continue;
          }
        } else {
          m.burnTimer = Math.max(0, (m.burnTimer || 0) - dt * 2);
        }
      }

      const dx = px - m.x;
      const dz = pz - m.z;
      const dist = Math.hypot(dx, dz);
      // Ghasts spot players from 42m away; other mobs within 10m
      const aggroRange = m.type === "ghast" ? 42.0 : 10.0;

      if (dist < aggroRange && gameplayMode !== "peaceful" && !creative) {
        m.isAggro = true;
        m.targetYaw = Math.atan2(dx, dz);
        const chaseSpeed = (gameplayMode === "hardcore" ? 1.55 : 1.3) * m.speed;

        if (m.type === "ghast") {
          // Floating standoff hovering distance (15 - 28 blocks)
          if (dist < 14.0) {
            m.vx = -Math.sin(m.targetYaw) * (chaseSpeed * 0.7);
            m.vz = -Math.cos(m.targetYaw) * (chaseSpeed * 0.7);
          } else if (dist > 28.0) {
            m.vx = Math.sin(m.targetYaw) * (chaseSpeed * 0.7);
            m.vz = Math.cos(m.targetYaw) * (chaseSpeed * 0.7);
          } else {
            m.vx *= 0.85;
            m.vz *= 0.85;
          }

          if (m.attackCooldown > 0) {
            m.attackCooldown -= dt;
            if (m.attackCooldown <= 1.0 && m.faceMesh) {
              (m.faceMesh.material as THREE.MeshBasicMaterial).color.setHex(0xd02020);
            }
          } else {
            if (m.faceMesh) {
              (m.faceMesh.material as THREE.MeshBasicMaterial).color.setHex(0x484848);
            }
            this.fireballMgr.spawnFireball(
              m.x, m.y - 0.4, m.z,
              px, player.y + 0.9, pz,
              18
            );
            m.attackCooldown = 3.2 + Math.random() * 2.0;
          }
        } else if (m.type === "skeleton" && dist < 7.0) {
          m.vx = -Math.sin(m.targetYaw) * (chaseSpeed * 0.8);
          m.vz = -Math.cos(m.targetYaw) * (chaseSpeed * 0.8);
        } else {
          m.vx = Math.sin(m.targetYaw) * chaseSpeed;
          m.vz = Math.cos(m.targetYaw) * chaseSpeed;
        }

        // Creeper: Sizzle fuse countdown when within 3m
        if (m.type === "creeper") {
          if (dist < 3.2) {
            if (!m.fuseTimer) playIgnite();
            m.fuseTimer = (m.fuseTimer || 0) + dt;
            if (m.fuseTimer >= 1.5) {
              // Detonate!
              playExplode();
              damagePlayer(gameplayMode === "hardcore" ? 20 : 12);
              if (onMobDeathFx) onMobDeathFx(m.x, m.y, m.z);
              this.scene.remove(m.root); disposeEntityRoot(m.root);
              this.mobs.splice(i, 1);
              continue;
            }
          } else {
            m.fuseTimer = Math.max(0, (m.fuseTimer || 0) - dt * 1.5);
          }
        }

        if (dist < 1.4 && m.attackCooldown <= 0 && m.type !== "creeper") {
          m.attackCooldown = gameplayMode === "hardcore" ? 0.9 : 1.2;
          // Scaled Mob Damage
          if (gameplayMode === "hardcore") {
            damagePlayer(m.type === "spider" ? 6 : 8);
          } else {
            // Survival (Minor / Standard damage)
            damagePlayer(m.type === "spider" ? 2 : 3);
          }
        }
      } else {
        m.isAggro = false;
        m.vx *= 0.92;
        m.vz *= 0.92;
        if (m.fuseTimer) m.fuseTimer = Math.max(0, m.fuseTimer - dt * 2.0);
      }

      if (m.attackCooldown > 0) m.attackCooldown -= dt;

      m.yaw += (m.targetYaw - m.yaw) * Math.min(1, dt * 4.0);
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.z += m.vz * dt;

      const isMoving = Math.hypot(m.vx, m.vz) > 0.15;
      if (isMoving && m.ground) {
        const frontX = Math.floor(m.x + Math.sin(m.yaw) * 0.5);
        const frontZ = Math.floor(m.z + Math.cos(m.yaw) * 0.5);
        const frontBlock = getBlock(frontX, Math.floor(m.y), frontZ);
        const aboveFrontBlock = getBlock(frontX, Math.floor(m.y + 1), frontZ);
        const above2Block = getBlock(frontX, Math.floor(m.y + 2), frontZ);
        // climb: 1-block hop always; 2-block hop only when chasing the player above
        if (frontBlock !== 0 && frontBlock !== 39 && frontBlock !== 40) {
          if (aboveFrontBlock === 0) {
            if (above2Block === 0 && player.y > m.y + 2.5 && !m.jumpCooldownM) {
              m.vy = 8.5; // 2-block climb (max)
              m.ground = false;
              m.jumpCooldownM = 1.2;
            } else {
              m.vy = 4.2; // 1-block hop
              m.ground = false;
            }
          }
        }
        if (m.jumpCooldownM !== undefined && m.jumpCooldownM > 0) m.jumpCooldownM -= dt;
      }

      updateHostileMobKinematics(m, dt, player);
    }

    this.fireballMgr.update(
      dt,
      player,
      damagePlayer,
      getBlock,
      (x, y, z) => {
        playExplode();
        if (onMobDeathFx) onMobDeathFx(x, y, z);
      },
      onMobBurn
    );
  }
}
