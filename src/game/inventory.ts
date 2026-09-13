/* Survival inventory logic (extracted from Game.tsx — R1.5).
 * All functions mutate the InventoryCore in place; the React layer mirrors
 * the resulting arrays back into state. Pure & testable — no React here. */

export interface InvSlot {
  id: number;
  count: number;
}

export type InvSlotOrNull = InvSlot | null;

export interface InventoryCore {
  hotbar: number[];                 // 10 block ids (0 = air/empty)
  hotbarCounts: number[];           // 10 stack counts (0 = empty)
  hotbarDamage?: number[];          // 10 damage values
  invMain: InvSlotOrNull[];         // 27 main-grid slots
  creative: boolean;                // creative = infinite (no-op ops)
}

export const STACK_MAX = 64;
export const INV_MAIN_SIZE = 27;
export const INV_HOTBAR_SIZE = 9; // must match rendered slots (HUD/modal slice(0, 9)) — see kb/mechanics/inventory.md

/** Add `count` of block `id` — stacks first (hotbar → main), then empty slots (hotbar → main).
 *  Returns the leftover amount that did NOT fit (0 when fully stored). */
export function pickUp(core: InventoryCore, id: number, count: number): number {
  if (core.creative || count <= 0) return 0;
  let remaining = count;

  // 1. Existing hotbar stacks (left to right)
  for (let i = 0; i < INV_HOTBAR_SIZE && remaining > 0; i++) {
    if (core.hotbar[i] === id && (core.hotbarCounts[i] || 0) < STACK_MAX) {
      const space = STACK_MAX - (core.hotbarCounts[i] || 0);
      const add = Math.min(space, remaining);
      core.hotbarCounts[i] = (core.hotbarCounts[i] || 0) + add;
      remaining -= add;
    }
  }

  // 2. Existing main-grid stacks
  for (let i = 0; i < INV_MAIN_SIZE && remaining > 0; i++) {
    const slot = core.invMain[i];
    if (slot && slot.id === id && slot.count < STACK_MAX) {
      const space = STACK_MAX - slot.count;
      const add = Math.min(space, remaining);
      slot.count += add;
      remaining -= add;
    }
  }

  // 3. Empty hotbar slots
  for (let i = 0; i < INV_HOTBAR_SIZE && remaining > 0; i++) {
    if (core.hotbar[i] === 0 || (core.hotbarCounts[i] || 0) === 0) {
      const add = Math.min(STACK_MAX, remaining);
      core.hotbar[i] = id;
      core.hotbarCounts[i] = add;
      remaining -= add;
    }
  }

  // 4. Empty main-grid slots
  for (let i = 0; i < INV_MAIN_SIZE && remaining > 0; i++) {
    if (core.invMain[i] === null) {
      const add = Math.min(STACK_MAX, remaining);
      core.invMain[i] = { id, count: add };
      remaining -= add;
    }
  }
  return remaining;
}

/** Consume `n` items from a hotbar slot (never below 0). Clears the slot ID when count reaches 0. */
export function consumeSlot(core: InventoryCore, slotIdx: number, n = 1): void {
  if (core.creative) return;
  const next = Math.max(0, (core.hotbarCounts[slotIdx] || 0) - n);
  core.hotbarCounts[slotIdx] = next;
  if (next <= 0) {
    core.hotbar[slotIdx] = 0;
    if (core.hotbarDamage) core.hotbarDamage[slotIdx] = 0;
  }
}

/** Total count of `id` across hotbar + main grid. */
export function countItems(core: InventoryCore, id: number): number {
  if (core.creative) return 64 * INV_HOTBAR_SIZE + INV_MAIN_SIZE * 64;
  let total = 0;
  for (let i = 0; i < INV_HOTBAR_SIZE; i++) {
    if (core.hotbar[i] === id) total += core.hotbarCounts[i] || 0;
  }
  for (let i = 0; i < INV_MAIN_SIZE; i++) {
    const slot = core.invMain[i];
    if (slot && slot.id === id) total += slot.count;
  }
  return total;
}

/** Remove `count` items of `id` (hotbar stacks first, then main). Returns success. */
export function removeItems(core: InventoryCore, id: number, count: number): boolean {
  if (core.creative) return true;
  if (countItems(core, id) < count) return false;
  let remaining = count;
  for (let i = 0; i < INV_HOTBAR_SIZE && remaining > 0; i++) {
    if (core.hotbar[i] === id && (core.hotbarCounts[i] || 0) > 0) {
      const take = Math.min(core.hotbarCounts[i], remaining);
      core.hotbarCounts[i] -= take;
      remaining -= take;
      if (core.hotbarCounts[i] <= 0) {
        core.hotbar[i] = 0;
        core.hotbarCounts[i] = 0;
        if (core.hotbarDamage) core.hotbarDamage[i] = 0;
      }
    }
  }
  for (let i = 0; i < INV_MAIN_SIZE && remaining > 0; i++) {
    const slot = core.invMain[i];
    if (slot && slot.id === id) {
      const take = Math.min(slot.count, remaining);
      slot.count -= take;
      remaining -= take;
      if (slot.count <= 0) core.invMain[i] = null;
    }
  }
  return true;
}

export interface SwapResult {
  swapped: InvSlotOrNull;   // stack that moved out of the main slot (null = slot was empty)
  cleared: boolean;         // hotbar slot became empty (no stack in either slot)
  hotbarId: number;
  hotbarCount: number;
}

/** Swap a main-grid stack with the active hotbar slot (Minecraft-style click). */
/** Sort an array of slots: merges identical item stacks to 64, then sorts by category/ID, placing empty slots at end. */
export function sortSlotArray(slots: InvSlotOrNull[]): InvSlotOrNull[] {
  const itemMap = new Map<number, number>();
  for (const slot of slots) {
    if (slot && slot.id > 0 && slot.count > 0) {
      itemMap.set(slot.id, (itemMap.get(slot.id) || 0) + slot.count);
    }
  }

  // Sort IDs numerically (or alphabetically by name if registered)
  const sortedIds = Array.from(itemMap.keys()).sort((a, b) => a - b);
  const result: InvSlotOrNull[] = new Array(slots.length).fill(null);
  let destIdx = 0;

  for (const id of sortedIds) {
    let totalCount = itemMap.get(id) || 0;
    while (totalCount > 0 && destIdx < result.length) {
      const count = Math.min(STACK_MAX, totalCount);
      result[destIdx++] = { id, count };
      totalCount -= count;
    }
  }

  return result;
}

/** Quick-stack from source into destination for all items that already exist in destination. */
export function quickStack(sourceSlots: InvSlotOrNull[], destSlots: InvSlotOrNull[]): void {
  // Set of all item IDs currently in destination
  const destIds = new Set<number>();
  for (const slot of destSlots) {
    if (slot && slot.id > 0 && slot.count > 0) {
      destIds.add(slot.id);
    }
  }

  // Transfer matching items from source into dest
  for (let s = 0; s < sourceSlots.length; s++) {
    const src = sourceSlots[s];
    if (!src || !destIds.has(src.id) || src.count <= 0) continue;

    // 1. Fill existing matching stacks in dest
    for (let d = 0; d < destSlots.length && src.count > 0; d++) {
      const dst = destSlots[d];
      if (dst && dst.id === src.id && dst.count < STACK_MAX) {
        const canAdd = Math.min(STACK_MAX - dst.count, src.count);
        dst.count += canAdd;
        src.count -= canAdd;
      }
    }

    // 2. Fill empty slots in dest
    for (let d = 0; d < destSlots.length && src.count > 0; d++) {
      if (!destSlots[d]) {
        const canAdd = Math.min(STACK_MAX, src.count);
        destSlots[d] = { id: src.id, count: canAdd };
        src.count -= canAdd;
      }
    }

    if (src.count <= 0) {
      sourceSlots[s] = null;
    }
  }
}

/** Restock destination slots with matching items from source. */
export function restock(sourceSlots: InvSlotOrNull[], destSlots: InvSlotOrNull[]): void {
  for (let d = 0; d < destSlots.length; d++) {
    const dst = destSlots[d];
    if (!dst || dst.id <= 0 || dst.count >= STACK_MAX) continue;

    for (let s = 0; s < sourceSlots.length && dst.count < STACK_MAX; s++) {
      const src = sourceSlots[s];
      if (src && src.id === dst.id && src.count > 0) {
        const canAdd = Math.min(STACK_MAX - dst.count, src.count);
        dst.count += canAdd;
        src.count -= canAdd;
        if (src.count <= 0) sourceSlots[s] = null;
      }
    }
  }
}

/** Transfer all items from source into destination. */
export function transferAll(sourceSlots: InvSlotOrNull[], destSlots: InvSlotOrNull[]): void {
  for (let s = 0; s < sourceSlots.length; s++) {
    const src = sourceSlots[s];
    if (!src || src.id <= 0 || src.count <= 0) continue;

    // 1. Merge into existing matching stacks
    for (let d = 0; d < destSlots.length && src.count > 0; d++) {
      const dst = destSlots[d];
      if (dst && dst.id === src.id && dst.count < STACK_MAX) {
        const canAdd = Math.min(STACK_MAX - dst.count, src.count);
        dst.count += canAdd;
        src.count -= canAdd;
      }
    }

    // 2. Place in empty slots
    for (let d = 0; d < destSlots.length && src.count > 0; d++) {
      if (!destSlots[d]) {
        const canAdd = Math.min(STACK_MAX, src.count);
        destSlots[d] = { id: src.id, count: canAdd };
        src.count -= canAdd;
      }
    }

    if (src.count <= 0) {
      sourceSlots[s] = null;
    }
  }
}

export function swapMainToHotbar(core: InventoryCore, mainIdx: number, slotIdx: number): SwapResult {
  const slot = core.invMain[mainIdx];
  const hotbarId = core.hotbar[slotIdx] as number;
  const hotbarCount = core.hotbarCounts[slotIdx] as number;

  core.invMain[mainIdx] = hotbarCount > 0 ? { id: hotbarId, count: hotbarCount } : null;

  if (slot) {
    core.hotbar[slotIdx] = slot.id;
    core.hotbarCounts[slotIdx] = slot.count;
  } else {
    core.hotbar[slotIdx] = 0; // air
    core.hotbarCounts[slotIdx] = 0;
  }
  return {
    swapped: slot,
    cleared: !slot && hotbarCount <= 0,
    hotbarId,
    hotbarCount
  };
}
