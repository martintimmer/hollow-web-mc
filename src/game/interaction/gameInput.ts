import * as THREE from "three";
import type { GameState } from "../state/gameState";
import { isSim } from "../../services/simMode";
import { BLOCK_MAP } from "../blocks";
import { isBoatItem } from "../entities/boat";
import { orbitRotate, orbitZoom, orbitPan } from "../engine/orbitControls";
import { adjustCineSpeed } from "../engine/cinematic";
import { setupCreativeInteractionListener } from "./playerInteraction";

export interface GameInputParams {
  cv: HTMLCanvasElement;
  s: GameState;
  blueprintModalOpen: boolean;
  setActive: (active: boolean) => void;
  setMenuOpen: (open: boolean) => void;
  setInventoryOpen: (open: boolean) => void;
  setPauseOpen: (open: boolean) => void;
  setMapOpen: (open: boolean) => void;
  setHotbar: React.Dispatch<React.SetStateAction<number[]>>;
  setActiveSlot: React.Dispatch<React.SetStateAction<number>>;
  setCreative: (c: boolean) => void;
  setBlueprintModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setTradingVillager: (villager: any) => void;
  setSeatName: (name: string) => void;
  wandManager: any;
  simStampRun: (tag: string, fn: (w: any) => void) => any;
  showToast: (msg: string) => void;
  raycast: (dist: number) => any;
  updateAreaBoxMesh: () => void;
  tryBreakBoat: () => boolean;
  tryMeleeAttack: () => boolean;
  tryBreakPainting: () => boolean;
  startMining: () => void;
  breakBlock: () => void;
  pickBlock: () => void;
  placeBlock: () => void;
  canTradeWith: (villager: any) => boolean;
  tryBoatPlace: (heldId: number) => boolean;
  tryBoatEnter: () => boolean;
  tryAnimalInteraction: (heldId: number) => boolean;
  enterVehicle: (veh: any) => void;
  exitVehicle: () => void;
  openChat: (initial: string) => void;
  closeChat: (send: boolean) => void;
  look: (dx: number, dy: number) => void;
  simUndo: () => number;
  dropHeldItem: () => void;
  openRecallModal: () => void;
  closeCraftTable: () => void;
  closeFurnace: () => void;
  closeChest: () => void;
}

export function canToggleFly(creative: boolean, sim = isSim()): boolean {
  return creative || sim;
}

export function setupGameInputListeners(params: GameInputParams): () => void {
  const {
    cv,
    s,
    blueprintModalOpen,
    setActive,
    setMenuOpen,
    setInventoryOpen,
    setPauseOpen,
    setMapOpen,
    setHotbar,
    setActiveSlot,
    setCreative,
    setBlueprintModalOpen,
    setTradingVillager,
    setSeatName,
    wandManager,
    simStampRun,
    showToast,
    raycast,
    updateAreaBoxMesh,
    tryBreakBoat,
    tryMeleeAttack,
    tryBreakPainting,
    startMining,
    breakBlock,
    pickBlock,
    placeBlock,
    canTradeWith,
    tryBoatPlace,
    tryBoatEnter,
    tryAnimalInteraction,
    enterVehicle,
    exitVehicle,
    openChat,
    closeChat,
    look,
    simUndo,
    dropHeldItem,
    openRecallModal,
    closeCraftTable,
    closeFurnace,
    closeChest
  } = params;

  const onMouseDown = (e: MouseEvent) => {
    e.preventDefault();
    if (!s.pointerLocked) {
      try {
        (cv as unknown as { requestPointerLock: (o?: { unadjustedMovement?: boolean }) => void }).requestPointerLock({ unadjustedMovement: true });
      } catch { try { cv.requestPointerLock?.(); } catch {} }
    }
    if (s.cinematic) return;
    if (!s.active || !s.steering) {
      s.active = true; s.steering = true; setActive(true); setMenuOpen(false); setInventoryOpen(false); setPauseOpen(false);
    }

    // Blueprint Wand Holographic Tool handling
    if (wandManager.state.activeDoc) {
      if (e.button === 0) {
        const activeDoc = wandManager.state.activeDoc;
        const rot = wandManager.state.rotation;
        const res = simStampRun(`blueprint:${activeDoc.name}`, (w: any) => {
          wandManager.stampAtTarget(w);
        });
        if (res && res.voxels > 0) {
          showToast(`🏗️ Placed "${activeDoc.name}" (${rot * 90}°) — ${res.voxels} voxels`);
          wandManager.selectBlueprint(null);
        }
        return;
      } else if (e.button === 2) {
        wandManager.rotate();
        const deg = wandManager.state.rotation * 90;
        showToast(`🔄 Blueprint rotated: ${deg}°`);
        return;
      }
    }

    // 3D Area Selection tool handling
    if (s.areaSelectMode) {
      const hit = raycast(24);
      const targetX = hit ? hit.x : Math.floor(s.player.x);
      const targetY = hit ? hit.y : Math.floor(s.player.y);
      const targetZ = hit ? hit.z : Math.floor(s.player.z);

      if (e.button === 0) {
        s.areaPos1 = { x: targetX, y: targetY, z: targetZ };
        updateAreaBoxMesh();
        if (s.areaPos2) {
          const w = Math.abs(s.areaPos2.x - targetX) + 1;
          const h = Math.abs(s.areaPos2.y - targetY) + 1;
          const d = Math.abs(s.areaPos2.z - targetZ) + 1;
          showToast(`📐 Point 1: (${targetX}, ${targetY}, ${targetZ}) — Yellow Box: ${w}×${h}×${d}`);
        } else {
          showToast(`📐 Point 1 set (${targetX}, ${targetY}, ${targetZ}) — Right-Click to set Point 2`);
        }
        return;
      } else if (e.button === 2) {
        s.areaPos2 = { x: targetX, y: targetY, z: targetZ };
        updateAreaBoxMesh();
        if (s.areaPos1) {
          const w = Math.abs(targetX - s.areaPos1.x) + 1;
          const h = Math.abs(targetY - s.areaPos1.y) + 1;
          const d = Math.abs(targetZ - s.areaPos1.z) + 1;
          showToast(`📐 Point 2: (${targetX}, ${targetY}, ${targetZ}) — Yellow Box: ${w}×${h}×${d}`);
        } else {
          showToast(`📐 Point 2 set (${targetX}, ${targetY}, ${targetZ}) — Left-Click to set Point 1`);
        }
        return;
      }
    }

    if (e.button === 0) {
      s.mouseLeftDown = true;
      if (tryBreakBoat()) { s.mouseLeftDown = false; s.brokeBoatAt = performance.now(); return; }
      if (tryMeleeAttack()) { s.mouseLeftDown = false; return; }
      if (tryBreakPainting()) { s.mouseLeftDown = false; return; }
      if (!s.creative) {
        startMining();
      }
    } else if (e.button === 1) {
      e.preventDefault();
      pickBlock();
    } else if (e.button === 2) {
      const tradeTarget = s.nearVillager && canTradeWith(s.nearVillager) ? s.nearVillager : null;
      if (tradeTarget) {
        setTradingVillager(tradeTarget);
        document.exitPointerLock?.();
        return;
      }
      const heldId = s.hotbar[s.slot] || 0;
      if (isBoatItem(heldId, (id) => BLOCK_MAP.get(id))) { if (tryBoatPlace(heldId)) return; }
      else if (tryBoatEnter()) return;
      if (tryAnimalInteraction(heldId)) return;
      placeBlock();
    }
  };

  const onMouseUp = (e: MouseEvent) => {
    if (e.button === 0) {
      s.mouseLeftDown = false;
      if (s.mining) {
        s.mining = null;
        if (s.fx) s.fx.hideCrack();
      }
    }
  };

  const onCanvasClick = (e: MouseEvent) => {
    if (!s.creative) return;
    if (e.button !== 0) return;
    if (!s.active || s.menuOpen || s.pauseOpen || s.inventoryOpen || s.chatOpen || s.cinematic) return;
    if (wandManager.state.activeDoc || s.areaSelectMode) return;
    if (performance.now() - (s.brokeBoatAt || 0) < 500) return;
    if (tryMeleeAttack()) return;
    breakBlock();
  };

  let touchStart: { x: number; y: number; time: number } | null = null;
  let lastTouch: { x: number; y: number } | null = null;

  const onTouchStart = (e: TouchEvent) => {
    if (!s.active) {
      s.active = true; s.steering = true; setActive(true); setMenuOpen(false); setInventoryOpen(false);
      return;
    }
    if (e.touches.length === 1) {
      const t = e.touches[0];
      touchStart = { x: t.clientX, y: t.clientY, time: performance.now() };
      lastTouch = { x: t.clientX, y: t.clientY };
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    if (!s.active || s.mapOpen || s.inventoryOpen || e.touches.length === 0) return;
    e.preventDefault();
    const t = e.touches[0];
    if (lastTouch) {
      const dx = t.clientX - lastTouch.x;
      const dy = t.clientY - lastTouch.y;
      look(dx * 1.5, dy * 1.5);
      lastTouch = { x: t.clientX, y: t.clientY };
    }
  };

  const onTouchEnd = (e: TouchEvent) => {
    if (touchStart && e.changedTouches.length > 0) {
      const t = e.changedTouches[0];
      const dist = Math.hypot(t.clientX - touchStart.x, t.clientY - touchStart.y);
      const dt = performance.now() - touchStart.time;
      if (dist < 12 && dt < 280 && s.active && !s.mapOpen && !s.inventoryOpen && !s.cinematic) {
        placeBlock();
      }
    }
    touchStart = null;
    lastTouch = null;
  };

  const onMouseMove = (e: MouseEvent) => {
    if (s.active && (s.steering || s.pointerLocked || e.buttons !== 0) && !s.mapOpen && !s.inventoryOpen && !s.chatOpen && !s.menuOpen && !s.pauseOpen && !blueprintModalOpen) {
      look(e.movementX || 0, e.movementY || 0);
    }
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    const activeEl = document.activeElement as HTMLElement | null;
    const isTyping =
      s.chatOpen ||
      target?.tagName === "INPUT" ||
      target?.tagName === "TEXTAREA" ||
      target?.isContentEditable ||
      activeEl?.tagName === "INPUT" ||
      activeEl?.tagName === "TEXTAREA" ||
      activeEl?.isContentEditable;

    if (isTyping) {
      if (e.code === "Escape") {
        if (s.chatOpen) {
          e.preventDefault();
          closeChat(false);
        } else if (activeEl && typeof activeEl.blur === "function") {
          activeEl.blur();
          if (s.inventoryOpen) {
            s.inventoryOpen = false;
            setInventoryOpen(false);
          }
        }
      }
      return;
    }

    s.keys[e.code] = true;
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") s.sneak = true;
    if (e.code === "KeyW" && !e.repeat) {
      const now = performance.now();
      if (now - (s.lastWPressAt || 0) < 260) s.sprintHold = true;
      s.lastWPressAt = now;
    }
    if (s.uiPaused && !s.pauseOpen && !s.menuOpen && !s.inventoryOpen && !s.titleScreenOpen && !s.worldSelectOpen) {
      s.uiPaused = false;
      s.active = true;
      s.steering = true;
      setActive(true);
    }
    if (e.code === "Escape") {
      if (s.cinematic) {
        (window as unknown as { __exitCinematic?: (toPause: boolean) => void }).__exitCinematic?.(false);
        return;
      }
      if (wandManager.state.activeDoc) {
        wandManager.selectBlueprint(null);
        showToast("Wand cancelled");
        return;
      }
      if (s.craftTableOpen) { closeCraftTable(); return; }
      if (s.furnaceOpen) { closeFurnace(); return; }
      if (s.chestOpen) { closeChest(); return; }
      if (s.inventoryOpen) {
        s.inventoryOpen = false;
        setInventoryOpen(false);
        if (!s.dead) {
          s.active = true;
          s.steering = true;
          setActive(true);
        }
        return;
      }
      if (s.mapOpen) {
        s.mapOpen = false;
        setMapOpen(false);
        if (!s.dead) {
          s.active = true;
          s.steering = true;
          setActive(true);
        }
        return;
      }
      if (s.menuOpen) {
        setMenuOpen(false);
        setPauseOpen(true);
        s.active = false;
        return;
      }

      if (s.pauseOpen) {
        s.pauseOpen = false;
        setPauseOpen(false);
        setMenuOpen(false);
        if (!s.dead) {
          s.active = true;
          s.steering = true;
          setActive(true);
        }
        return;
      }

      if (s.pointerLocked) document.exitPointerLock?.();
      s.active = false;
      s.steering = false;
      setActive(false);
      s.pauseOpen = true;
      setPauseOpen(true);
      setMenuOpen(false);
      s.keys = {};
      return;
    }
    if (s.cinematic) {
      if (e.code === "KeyQ" && !e.repeat) {
        (window as unknown as { __cineMark?: () => void }).__cineMark?.();
        return;
      }
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].indexOf(e.code) >= 0) e.preventDefault();
      return;
    }
    if (e.code === "KeyZ" && !e.ctrlKey && !e.metaKey && !e.repeat &&
        s.active && !s.chatOpen && !s.inventoryOpen && !s.craftTableOpen && !s.furnaceOpen && !s.chestOpen && !s.mapOpen && !s.menuOpen && !s.pauseOpen && !s.titleScreenOpen) {
      e.preventDefault();
      s.zoomActive = true;
      return;
    }
    if (e.code === "KeyZ" && (e.ctrlKey || e.metaKey) && !e.repeat) {
      e.preventDefault();
      const undone = simUndo();
      if (undone > 0) {
        showToast(`↩️ Undone last action (${undone} voxels)`);
      } else {
        showToast("Nothing to undo");
      }
      return;
    }
    if (e.code === "KeyF" && !e.repeat && s.active) {
      e.preventDefault();
      const mainId = s.hotbar[s.slot] || 0;
      const offId = s.offhandItem || 0;
      s.hotbar[s.slot] = offId;
      setHotbar([...s.hotbar]);
      s.offhandItem = mainId;
      if (s.updateOffhandItem) s.updateOffhandItem(mainId);
      showToast(mainId === 80 || offId === 80 ? "🔥 Torch swapped to left hand" : "🔄 Left hand item swapped");
      return;
    }
    if ((e.code === "KeyT" || e.code === "KeyC" || e.code === "Enter" || e.code === "Slash") && !e.repeat) {
      e.preventDefault();
      openChat(e.code === "Slash" ? "/" : "");
      s.active = false;
      s.steering = false;
      s.keys = {};
      setActive(false);
      document.exitPointerLock?.();
      return;
    }
    if (e.code === "F2" && !e.repeat) {
      e.preventDefault();
      const api = (window as unknown as { __sim?: { api?: { snapCurrentView?: () => Promise<{ ok: boolean }> } } }).__sim?.api;
      if (api?.snapCurrentView) {
        api.snapCurrentView().then((r) => { if (r?.ok) showToast("📸 Snapshot saved (snapshots/live-snap.jpg)"); });
      }
      return;
    }
    if (e.code === "KeyX" && !e.repeat && s.active) {
      s.sneak = !s.sneak;
      showToast(s.sneak ? "🤫 Sneaking…" : "🦶 Standing tall");
      return;
    }
    if (e.code === "KeyY" && !e.repeat && s.active) {
      if (s.spinT <= 0) { s.spinFrom = s.player.yaw; s.spinTo = s.player.yaw + Math.PI; s.spinT = 0.22; }
      return;
    }
    if (e.code === "KeyI") {
      const nextInv = !s.inventoryOpen;
      s.inventoryOpen = nextInv;
      setInventoryOpen(nextInv);
      if (nextInv) {
        s.active = false; s.steering = false; s.keys = {};
        setActive(false);
        document.exitPointerLock?.();
      } else {
        s.active = true; s.steering = true;
        setActive(true);
      }
      return;
    }
    if (e.code === "KeyM" && !isSim() && !s.simMode && !e.repeat) {
      const next = !s.mapOpen;
      s.mapOpen = next;
      if (next) s.mapPanOn = false;
      setMapOpen(next);
      if (next) document.exitPointerLock?.();
      return;
    }

    if (!s.active) return;
    if (["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyQ","KeyE","KeyI","KeyM"].indexOf(e.code) >= 0) e.preventDefault();

    if (e.code === "KeyQ" && !e.repeat) {
      if (tryMeleeAttack()) return;
      if (!s.creative) startMining();
      else breakBlock();
      return;
    }

    if (s.activeVehicle && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.code) && !e.repeat) {
      e.preventDefault();
      const dir = e.code === "ArrowUp" ? "up" : e.code === "ArrowDown" ? "down" : e.code === "ArrowLeft" ? "left" : "right";
      if (s.activeVehicle.moveSeat(dir as any)) {
        setSeatName(s.activeVehicle.seats[s.activeVehicle.seatIndex].name);
        showToast(`💺 ${s.activeVehicle.seats[s.activeVehicle.seatIndex].name}`);
      }
      return;
    }

    if (e.code === "KeyE") {
      if (s.activeVehicle) { exitVehicle(); return; }
      if (s.camera) {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), s.camera);
        for (const veh of s.vehicles.values()) {
          const hitPanel = (node: THREE.Object3D | undefined) => node ? raycaster.intersectObject(node, true)[0] : undefined;
          const trunkHit = hitPanel(veh.articulations.trunk?.node);
          if (trunkHit && trunkHit.distance < 6) {
            veh.togglePanel("trunk");
            showToast(veh.trunkOpen ? "🧳 Trunk opened" : "🧳 Trunk closed");
            return;
          }
          const hatchHit = hitPanel(veh.articulations.hatch?.node);
          if (hatchHit && hatchHit.distance < 6) {
            veh.togglePanel("hatch");
            showToast(veh.hatchOpen ? "🚪 Liftgate opened" : "🚪 Liftgate closed");
            return;
          }
          const hoodHit = hitPanel(veh.articulations.hood?.node);
          if (hoodHit && hoodHit.distance < 6) {
            veh.togglePanel("hood");
            showToast(veh.hoodOpen ? "🔧 Hood opened" : "🔧 Hood closed");
            return;
          }
          const leftDoorHit = hitPanel(veh.articulations.doors?.left?.node);
          if (leftDoorHit && leftDoorHit.distance < 6) {
            veh.toggleDoor("left");
            showToast(veh.doorsOpenLeft ? "🚪 Left door opened" : "🚪 Left door closed");
            return;
          }
          const rightDoorHit = hitPanel(veh.articulations.doors?.right?.node);
          if (rightDoorHit && rightDoorHit.distance < 6) {
            veh.toggleDoor("right");
            showToast(veh.doorsOpenRight ? "🚪 Right door opened" : "🚪 Right door closed");
            return;
          }
        }
      }
      for (const veh of s.vehicles.values()) {
        if (!veh.root || !s.camera) continue;
        const bodyRay = new THREE.Raycaster();
        bodyRay.setFromCamera(new THREE.Vector2(0, 0), s.camera);
        const bodyHit = bodyRay.intersectObject(veh.root, true)[0];
        if (bodyHit && bodyHit.distance < 6) { enterVehicle(veh); return; }
      }
      const heldId = s.hotbar[s.slot] || 0;
      if (isBoatItem(heldId, (id) => BLOCK_MAP.get(id))) { if (tryBoatPlace(heldId)) return; }
      else if (tryBoatEnter()) return;
      if (tryAnimalInteraction(heldId)) return;
      const tradeTarget = s.nearVillager && canTradeWith(s.nearVillager) ? s.nearVillager : null;
      if (tradeTarget) {
        setTradingVillager(tradeTarget);
        document.exitPointerLock?.();
        return;
      }
      placeBlock();
      return;
    }

    if (e.code === "Space" && !e.repeat) {
      const now = performance.now();
      if (canToggleFly(s.creative) && now - s.lastSpaceRelease < 300) {
        s.player.fly = !s.player.fly;
        if (!s.player.fly) {
          s.player.vy = -2;
          showToast("Falling / Walk mode");
        } else {
          s.player.vy = 0;
          showToast("Flight enabled");
        }
        s.lastSpaceRelease = 0;
      }
    }

    if (e.code === "KeyB" && !e.repeat) {
      dropHeldItem();
      return;
    }

    if (e.code === "KeyN" && !e.repeat) {
      setBlueprintModalOpen(prev => !prev);
      return;
    }

    if (e.code === "KeyG") {
      const nextCreative = !s.creative;
      setCreative(nextCreative);
      s.creative = nextCreative;
      if (!nextCreative) {
        s.player.fly = false;
        s.player.vy = -2;
      }
      showToast(nextCreative ? "Creative Mode (Flying enabled)" : "Survival Mode (Gravity active)");
    }
    if (e.code === "KeyR" && !e.repeat) {
      if (wandManager.state.activeDoc) {
        wandManager.rotate();
        const deg = wandManager.state.rotation * 90;
        showToast(`🔄 Blueprint rotated: ${deg}°`);
        return;
      }
      openRecallModal();
      return;
    }
    if (/^Digit[0-9]$/.test(e.code)) {
      const num = (+e.code.slice(5) + 9) % 10;
      setActiveSlot(num);
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    s.keys[e.code] = false;
    if (e.code === "ShiftLeft" || e.code === "ShiftRight") s.sneak = false;
    if (e.code === "KeyW") s.sprintHold = false;
    if (e.code === "KeyZ") s.zoomActive = false;
    if (e.code === "Space") {
      s.lastSpaceRelease = performance.now();
    }
  };

  const onWheel = (e: WheelEvent) => {
    if (s.cinematic) {
      if (s.cine) adjustCineSpeed(s, e.deltaY);
      return;
    }
    if (s.mapOpen) {
      s.bigScale = Math.max(0.5, Math.min(8, s.bigScale * (e.deltaY > 0 ? 0.88 : 1.14)));
      return;
    }
    if (s.active && !s.inventoryOpen) {
      setActiveSlot(prev => (prev + (e.deltaY > 0 ? 1 : -1) + 10) % 10);
    }
  };

  const onResize = () => {
    if (!s.camera || !s.renderer) return;
    s.camera.aspect = window.innerWidth / window.innerHeight;
    s.camera.updateProjectionMatrix();
    s.renderer.setSize(window.innerWidth, window.innerHeight);
  };

  const onRideKeyDown = (e: KeyboardEvent) => {
    if (e.code === "KeyW") s.rideKeys.w = true;
    else if (e.code === "KeyS") s.rideKeys.s = true;
    else if (e.code === "KeyA") s.rideKeys.a = true;
    else if (e.code === "KeyD") s.rideKeys.d = true;
  };
  const onRideKeyUp = (e: KeyboardEvent) => {
    if (e.code === "KeyW") s.rideKeys.w = false;
    else if (e.code === "KeyS") s.rideKeys.s = false;
    else if (e.code === "KeyA") s.rideKeys.a = false;
    else if (e.code === "KeyD") s.rideKeys.d = false;
  };

  const orbitDrag = { active: false, pan: false, lastX: 0, lastY: 0 };
  const onOrbitWheel = (e: WheelEvent) => {
    if (!isSim() || !s.orbit?.enabled) return;
    e.preventDefault();
    e.stopPropagation();
    orbitZoom(s.orbit, e.deltaY);
  };
  const onOrbitDown = (e: MouseEvent) => {
    if (!isSim() || !s.orbit?.enabled) return;
    const pan = e.shiftKey || e.button === 1;
    const gesture = e.altKey || e.button === 1 || e.shiftKey;
    if (!gesture) return;
    orbitDrag.active = true;
    orbitDrag.pan = pan;
    orbitDrag.lastX = e.clientX;
    orbitDrag.lastY = e.clientY;
    e.preventDefault();
    e.stopPropagation();
  };
  const onOrbitMove = (e: MouseEvent) => {
    if (!isSim() || !s.orbit?.enabled || !orbitDrag.active) return;
    const dx = e.clientX - orbitDrag.lastX, dy = e.clientY - orbitDrag.lastY;
    orbitDrag.lastX = e.clientX;
    orbitDrag.lastY = e.clientY;
    if (orbitDrag.pan) orbitPan(s.orbit, dx, dy);
    else orbitRotate(s.orbit, dx, dy);
    e.preventDefault();
    e.stopPropagation();
  };
  const onOrbitUp = () => { orbitDrag.active = false; };
  const onContextMenu = (e: MouseEvent) => e.preventDefault();

  // Attach listeners
  cv.addEventListener("mousedown", onMouseDown);
  cv.addEventListener("mouseup", onMouseUp);
  const cleanupCreativeClick = setupCreativeInteractionListener(cv, onCanvasClick);
  cv.addEventListener("touchstart", onTouchStart, { passive: false });
  cv.addEventListener("touchmove", onTouchMove, { passive: false });
  cv.addEventListener("touchend", onTouchEnd, { passive: false });
  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  document.addEventListener("keydown", onRideKeyDown, { capture: true });
  document.addEventListener("keyup", onRideKeyUp, { capture: true });
  window.addEventListener("wheel", onWheel, { passive: true });
  window.addEventListener("resize", onResize);
  window.addEventListener("contextmenu", onContextMenu);

  cv.addEventListener("wheel", onOrbitWheel, { capture: true, passive: false });
  cv.addEventListener("mousedown", onOrbitDown, { capture: true });
  window.addEventListener("mousemove", onOrbitMove, { capture: true });
  window.addEventListener("mouseup", onOrbitUp, { capture: true });

  return () => {
    cleanupCreativeClick();
    cv.removeEventListener("mousedown", onMouseDown);
    cv.removeEventListener("mouseup", onMouseUp);
    cv.removeEventListener("touchstart", onTouchStart);
    cv.removeEventListener("touchmove", onTouchMove);
    cv.removeEventListener("touchend", onTouchEnd);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    document.removeEventListener("keydown", onRideKeyDown, { capture: true });
    document.removeEventListener("keyup", onRideKeyUp, { capture: true });
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("resize", onResize);
    window.removeEventListener("contextmenu", onContextMenu);

    cv.removeEventListener("wheel", onOrbitWheel, { capture: true } as unknown as EventListenerOptions);
    cv.removeEventListener("mousedown", onOrbitDown, { capture: true } as unknown as EventListenerOptions);
    window.removeEventListener("mousemove", onOrbitMove, { capture: true } as unknown as EventListenerOptions);
    window.removeEventListener("mouseup", onOrbitUp, { capture: true } as unknown as EventListenerOptions);
  };
}
