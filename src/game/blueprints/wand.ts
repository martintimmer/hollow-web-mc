// Hollowpine — Holographic Blueprint Wand & Ghost Preview System
import * as THREE from "three";
import { rotateBlueprint } from "../../sim/blueprintScanner";
import type { BlueprintDoc, BlueprintBlock } from "../../sim/blueprintScanner";
import { stampCustomBlueprint } from "../terrain/structures";

export interface WandState {
  activeDoc: BlueprintDoc | null;
  rotation: number; // 0, 1, 2, 3 (each = 90 deg)
  ghostMesh: THREE.LineSegments | null;
  targetPos: { x: number; y: number; z: number } | null;
}

export function createWandManager(scene: THREE.Scene) {
  const state: WandState = {
    activeDoc: null,
    rotation: 0,
    ghostMesh: null,
    targetPos: null
  };

  function selectBlueprint(doc: BlueprintDoc | null) {
    state.activeDoc = doc;
    state.rotation = 0;
    rebuildGhostMesh();
  }

  function rotate() {
    state.rotation = (state.rotation + 1) % 4;
    rebuildGhostMesh();
  }

  function rebuildGhostMesh() {
    if (state.ghostMesh) {
      scene.remove(state.ghostMesh);
      state.ghostMesh.geometry.dispose();
      (state.ghostMesh.material as THREE.Material).dispose();
      state.ghostMesh = null;
    }

    if (!state.activeDoc) return;

    const { width, height, depth } = state.activeDoc.dimensions;
    const geom = new THREE.BoxGeometry(
      state.rotation % 2 === 0 ? width : depth,
      height,
      state.rotation % 2 === 0 ? depth : width
    );
    const edges = new THREE.EdgesGeometry(geom);
    const mat = new THREE.LineBasicMaterial({
      color: 0x3ab3a0,
      linewidth: 2,
      transparent: true,
      opacity: 0.85
    });

    const mesh = new THREE.LineSegments(edges, mat);
    mesh.visible = false;
    scene.add(mesh);
    state.ghostMesh = mesh;
  }

  function updateGhostPosition(
    hit: { x: number; y: number; z: number; ny: number } | null
  ) {
    if (!state.ghostMesh || !state.activeDoc || !hit) {
      if (state.ghostMesh) state.ghostMesh.visible = false;
      state.targetPos = null;
      return;
    }

    const { height } = state.activeDoc.dimensions;
    const placeY = hit.y + (hit.ny > 0 ? 1 : 0);

    state.targetPos = { x: hit.x, y: placeY, z: hit.z };
    state.ghostMesh.position.set(hit.x + 0.5, placeY + height / 2, hit.z + 0.5);
    state.ghostMesh.visible = true;
  }

  function stampAtTarget(
    wWriter: (x: number, y: number, z: number, id: number) => void,
    clearUp?: (x: number, z: number, from: number) => void,
    heightLookup?: (x: number, z: number) => number
  ): boolean {
    if (!state.activeDoc || !state.targetPos) return false;

    const rotatedBlocks: BlueprintBlock[] = rotateBlueprint(state.activeDoc, state.rotation);
    stampCustomBlueprint(
      rotatedBlocks,
      state.targetPos.x,
      state.targetPos.y,
      state.targetPos.z,
      wWriter,
      clearUp,
      heightLookup
    );

    return true;
  }

  function dispose() {
    if (state.ghostMesh) {
      scene.remove(state.ghostMesh);
      state.ghostMesh.geometry.dispose();
      (state.ghostMesh.material as THREE.Material).dispose();
      state.ghostMesh = null;
    }
    state.activeDoc = null;
  }

  return {
    state,
    selectBlueprint,
    rotate,
    updateGhostPosition,
    stampAtTarget,
    dispose
  };
}
