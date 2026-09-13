import { useState, useCallback } from "react";
import * as THREE from "three";
import { attachNameplate, type AnimalEntity } from "../../game/entities/animals";
import { apiSaveAnimals } from "../../services/api";
import type { GameState } from "../../game/state/gameState";
import type { PetEntry } from "../gui/PetModal";

export interface UsePetStateParams {
  stateRef: React.MutableRefObject<GameState>;
  tryLockPointer: () => void;
  setActive: (active: boolean) => void;
  showToast: (msg: string) => void;
}

export function usePetState({
  stateRef,
  tryLockPointer,
  setActive,
  showToast
}: UsePetStateParams) {
  const [petsOpen, setPetsOpen] = useState(false);
  const [namingAnimal, setNamingAnimal] = useState<AnimalEntity | null>(null);
  const [namingInput, setNamingInput] = useState("");
  const [collarColor, setCollarColor] = useState<string | null>(null);
  const [petsList, setPetsList] = useState<PetEntry[]>([]);

  const refreshPets = useCallback(() => {
    const s = stateRef.current;
    const fn = s.getAnimalsFn;
    const uid = s.currentUserId;
    if (!fn) { setPetsList([]); return; }
    const animals = fn()
      .filter((a) => !!uid && a.ownerId === uid)
      .map((a) => ({ id: a.id, type: a.type, name: a.name || null, sex: a.sex || "female", x: a.x, y: a.y, z: a.z }));
    // Owned web spiders join the pets list (one-way: you travel to them).
    const spiders = ((s as unknown as { webSpiderMgr?: { ownedEntries: (uid: string) => Array<{ id: string; type: string; name: string | null; sex: string; x: number; y: number; z: number }> } }).webSpiderMgr?.ownedEntries(uid) ?? [])
      .map((p) => ({ id: p.id, type: p.type, name: p.name, sex: p.sex, x: p.x, y: p.y, z: p.z }));
    setPetsList([...animals, ...spiders]);
  }, [stateRef]);

  const closePetName = useCallback(() => {
    setNamingAnimal(null);
    setNamingInput("");
    const s = stateRef.current;
    if (!s.dead && !s.pauseOpen) {
      s.active = true;
      s.steering = true;
      setActive(true);
      tryLockPointer();
    }
  }, [stateRef, setActive, tryLockPointer]);

  const confirmPetName = useCallback(() => {
    const a = namingAnimal;
    if (!a) return;
    const name = namingInput.trim().slice(0, 24);
    if (name) {
      a.name = name;
      const plateH = a.type === "horse" ? 2.2 : (a.type === "dog" ? 1.25 : (a.type === "cat" ? 1.0 : ((a.type as string) === "spider" ? 0.7 : 1.5)));
      a.nameplate = attachNameplate(a.root, name, a.nameplate, plateH);
      if ((a.type as string) === "spider") {
        // Spider roots are scaled down: counter-scale the plate so the name
        // stays a constant world size instead of shrinking with the spider.
        const rs = a.root?.scale?.x || 1;
        if (a.nameplate) {
          a.nameplate.scale.set(1.1 / rs, 0.21 / rs, 1);
          a.nameplate.position.set(0, 0.9 / rs, 0);
        }
      }
      a.ownerId = stateRef.current.currentUserId;
      if (collarColor && a.collarMesh) {
        a.collarColor = collarColor;
        (a.collarMesh.material as THREE.MeshLambertMaterial).color.set(collarColor);
      }
      showToast(`${a.name} is now your pet! 🐾`);
      refreshPets();
      const animals = stateRef.current.getAnimalsFn?.();
      if (animals && animals.length > 0 && stateRef.current.currentWorldId) {
        const animalWorldId = stateRef.current.dimension === "nether"
          ? `${stateRef.current.currentWorldId}_nether`
          : stateRef.current.currentWorldId;
        apiSaveAnimals(animalWorldId, animals).catch(() => {});
      }
    }
    closePetName();
  }, [namingAnimal, namingInput, collarColor, closePetName, refreshPets, showToast, stateRef]);

  return {
    petsOpen,
    setPetsOpen,
    namingAnimal,
    setNamingAnimal,
    namingInput,
    setNamingInput,
    collarColor,
    setCollarColor,
    petsList,
    setPetsList,
    refreshPets,
    closePetName,
    confirmPetName
  };
}
