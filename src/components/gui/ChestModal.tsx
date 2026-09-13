import React, { useState, useEffect, useRef } from "react";
import { BLOCK_MAP } from "../../game/blocks";
import { sortSlotArray, quickStack, restock, transferAll } from "../../game/inventory";
import type { InvSlotOrNull } from "../../game/inventory";

export interface ChestModalProps {
  isOpen: boolean;
  loading: boolean;
  creative?: boolean;
  chestPos: { x: number; y: number; z: number } | null;
  chestSlots: InvSlotOrNull[];
  setChestSlots: React.Dispatch<React.SetStateAction<InvSlotOrNull[]>>;
  invMain: InvSlotOrNull[];
  setInvMain: React.Dispatch<React.SetStateAction<InvSlotOrNull[]>>;
  hotbar: number[];
  hotbarCounts: number[];
  setHotbar: React.Dispatch<React.SetStateAction<number[]>>;
  setHotbarCounts: React.Dispatch<React.SetStateAction<number[]>>;
  activeSlot: number;
  setActiveSlot: (slot: number) => void;
  isoThumbnails: Map<number, string>;
  onSlotClick?: (index: number) => void;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export const ChestModal: React.FC<ChestModalProps> = ({
  isOpen,
  loading,
  creative = false,
  chestPos: _chestPos,
  chestSlots,
  setChestSlots,
  invMain,
  setInvMain,
  hotbar,
  hotbarCounts,
  setHotbar,
  setHotbarCounts,
  activeSlot,
  setActiveSlot,
  isoThumbnails,
  onClose,
  showToast
}) => {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Floating Cursor Item Stack (Minecraft Drag & Drop)
  const [cursorStack, setCursorStack] = useState<{ id: number; count: number } | null>(null);
  const cursorRef = useRef<HTMLDivElement>(null);

  // Track mouse coordinates directly via CSS transform on cursorRef
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
      }
    };
    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // When modal closes, return any held cursor items to player inventory
  useEffect(() => {
    if (!isOpen && cursorStack && cursorStack.id > 0 && cursorStack.count > 0) {
      // Find empty slot in invMain or hotbar
      const newInv = [...invMain];
      const emptyIdx = newInv.findIndex(s => !s || s.id === 0);
      if (emptyIdx !== -1) {
        newInv[emptyIdx] = { id: cursorStack.id, count: cursorStack.count };
        setInvMain(newInv);
      }
      setCursorStack(null);
    }
  }, [isOpen]);

  if (!isOpen || loading) return null;

  // =========================================================================
  // PURE ATOMIC TRANSFER HELPERS (Zero Item Loss)
  // =========================================================================

  // Transfer item stack from Chest to Player (modifies arrays in place, returns remaining count)
  const transferStackToPlayer = (
    item: { id: number; count: number },
    targetInv: InvSlotOrNull[],
    targetHotbar: number[],
    targetHotbarCounts: number[]
  ): number => {
    let remaining = item.count;
    if (remaining <= 0 || item.id <= 0) return 0;

    // 1. Stack into existing player storage
    for (let i = 0; i < 27 && remaining > 0; i++) {
      const s = targetInv[i];
      if (s && s.id === item.id && s.count < 64) {
        const add = Math.min(64 - s.count, remaining);
        s.count += add;
        remaining -= add;
      }
    }
    // 2. Stack into existing hotbar
    for (let i = 0; i < 9 && remaining > 0; i++) {
      if (targetHotbar[i] === item.id && targetHotbarCounts[i] < 64) {
        const add = Math.min(64 - targetHotbarCounts[i], remaining);
        targetHotbarCounts[i] += add;
        remaining -= add;
      }
    }
    // 3. Place into empty player storage
    for (let i = 0; i < 27 && remaining > 0; i++) {
      if (!targetInv[i] || targetInv[i]?.id === 0) {
        const add = Math.min(64, remaining);
        targetInv[i] = { id: item.id, count: add };
        remaining -= add;
      }
    }
    // 4. Place into empty hotbar
    for (let i = 0; i < 9 && remaining > 0; i++) {
      if (!targetHotbar[i] || targetHotbar[i] === 0) {
        const add = Math.min(64, remaining);
        targetHotbar[i] = item.id;
        targetHotbarCounts[i] = add;
        remaining -= add;
      }
    }

    return remaining;
  };

  // Transfer item stack from Player to Chest (modifies array in place, returns remaining count)
  const transferStackToChest = (
    item: { id: number; count: number },
    targetChest: InvSlotOrNull[]
  ): number => {
    let remaining = item.count;
    if (remaining <= 0 || item.id <= 0) return 0;

    // 1. Stack into existing chest slots
    for (let i = 0; i < targetChest.length && remaining > 0; i++) {
      const s = targetChest[i];
      if (s && s.id === item.id && s.count < 64) {
        const add = Math.min(64 - s.count, remaining);
        s.count += add;
        remaining -= add;
      }
    }
    // 2. Place into empty chest slots
    for (let i = 0; i < targetChest.length && remaining > 0; i++) {
      if (!targetChest[i] || targetChest[i]?.id === 0) {
        const add = Math.min(64, remaining);
        targetChest[i] = { id: item.id, count: add };
        remaining -= add;
      }
    }

    return remaining;
  };

  // =========================================================================
  // DRAG & DROP / CLICK HANDLERS
  // =========================================================================

  // Unified Slot Click Handler
  // e.button === 0: Left-Click (Single Item Pick / Drop)
  // e.button === 2: Right-Click (Full Stack 64 Pick / Drop)
  // e.ctrlKey: Mass Move All Items at once
  // e.shiftKey: Quick Move Stack between Chest and Inventory
  const handleSlotInteraction = (
    e: React.MouseEvent,
    container: "chest" | "inv" | "hotbar",
    index: number
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // ── 1. CTRL + CLICK: MASS MOVE ALL ITEMS AT ONCE (ATOMIC) ──
    if (e.ctrlKey) {
      const curChest = chestSlots.map(s => s ? { ...s } : null);
      const curInv = invMain.map(s => s ? { ...s } : null);
      const curHotbar = [...hotbar];
      const curHotbarCounts = [...hotbarCounts];

      if (container === "chest") {
        // Move ALL items from Chest to Player Inventory & Hotbar
        for (let i = 0; i < curChest.length; i++) {
          const slot = curChest[i];
          if (slot && slot.id > 0 && slot.count > 0) {
            const left = transferStackToPlayer(slot, curInv, curHotbar, curHotbarCounts);
            curChest[i] = left > 0 ? { id: slot.id, count: left } : null;
          }
        }
        setChestSlots(curChest);
        setInvMain(curInv);
        setHotbar(curHotbar);
        setHotbarCounts(curHotbarCounts);
        showToast("📦 Moved all chest items to inventory!");
      } else {
        // Move ALL items from Player Inventory & Hotbar to Chest
        for (let i = 0; i < 27; i++) {
          const slot = curInv[i];
          if (slot && slot.id > 0 && slot.count > 0) {
            const left = transferStackToChest(slot, curChest);
            curInv[i] = left > 0 ? { id: slot.id, count: left } : null;
          }
        }
        for (let i = 0; i < 9; i++) {
          const id = curHotbar[i];
          const count = curHotbarCounts[i] || 0;
          if (id > 0 && count > 0) {
            const left = transferStackToChest({ id, count }, curChest);
            if (left > 0) {
              curHotbarCounts[i] = left;
            } else {
              curHotbar[i] = 0;
              curHotbarCounts[i] = 0;
            }
          }
        }
        setChestSlots(curChest);
        setInvMain(curInv);
        setHotbar(curHotbar);
        setHotbarCounts(curHotbarCounts);
        showToast("📤 Moved all inventory items to chest!");
      }
      return;
    }

    // ── 2. SHIFT + CLICK: QUICK TRANSFER INDIVIDUAL STACK (ATOMIC) ──
    if (e.shiftKey) {
      const curChest = chestSlots.map(s => s ? { ...s } : null);
      const curInv = invMain.map(s => s ? { ...s } : null);
      const curHotbar = [...hotbar];
      const curHotbarCounts = [...hotbarCounts];

      if (container === "chest") {
        const slot = curChest[index];
        if (slot && slot.id > 0 && slot.count > 0) {
          const left = transferStackToPlayer(slot, curInv, curHotbar, curHotbarCounts);
          curChest[index] = left > 0 ? { id: slot.id, count: left } : null;
          setChestSlots(curChest);
          setInvMain(curInv);
          setHotbar(curHotbar);
          setHotbarCounts(curHotbarCounts);
        }
      } else if (container === "inv") {
        const slot = curInv[index];
        if (slot && slot.id > 0 && slot.count > 0) {
          const left = transferStackToChest(slot, curChest);
          curInv[index] = left > 0 ? { id: slot.id, count: left } : null;
          setChestSlots(curChest);
          setInvMain(curInv);
        }
      } else if (container === "hotbar") {
        const id = curHotbar[index];
        const count = curHotbarCounts[index] || 0;
        if (id > 0 && count > 0) {
          const left = transferStackToChest({ id, count }, curChest);
          if (left > 0) {
            curHotbarCounts[index] = left;
          } else {
            curHotbar[index] = 0;
            curHotbarCounts[index] = 0;
          }
          setChestSlots(curChest);
          setHotbar(curHotbar);
          setHotbarCounts(curHotbarCounts);
        }
      }
      return;
    }

    // Retrieve slot state
    let slotId = 0;
    let slotCount = 0;

    if (container === "chest") {
      const s = chestSlots[index];
      if (s) { slotId = s.id; slotCount = s.count; }
    } else if (container === "inv") {
      const s = invMain[index];
      if (s) { slotId = s.id; slotCount = s.count; }
    } else if (container === "hotbar") {
      slotId = hotbar[index] || 0;
      slotCount = hotbarCounts[index] || 0;
    }

    const setSlot = (id: number, count: number) => {
      if (container === "chest") {
        setChestSlots(prev => {
          const arr = [...prev];
          arr[index] = count > 0 && id > 0 ? { id, count } : null;
          return arr;
        });
      } else if (container === "inv") {
        setInvMain(prev => {
          const arr = [...prev];
          arr[index] = count > 0 && id > 0 ? { id, count } : null;
          return arr;
        });
      } else if (container === "hotbar") {
        setHotbar(prev => {
          const hb = [...prev];
          hb[index] = count > 0 && id > 0 ? id : 0;
          return hb;
        });
        setHotbarCounts(prev => {
          const hbc = [...prev];
          hbc[index] = count > 0 && id > 0 ? count : 0;
          return hbc;
        });
      }
    };

    // ── 3. LEFT-CLICK (button === 0): SINGLE ITEM PICK / DROP ──
    if (e.button === 0) {
      if (!cursorStack) {
        // Cursor is empty: Grab exactly 1 single item from the slot
        if (slotId > 0 && slotCount > 0) {
          setCursorStack({ id: slotId, count: 1 });
          setSlot(slotId, slotCount - 1);
        }
      } else {
        // Cursor has item: Place exactly 1 single item into the slot
        if (slotCount === 0 || slotId === 0) {
          setSlot(cursorStack.id, 1);
          if (cursorStack.count > 1) {
            setCursorStack({ id: cursorStack.id, count: cursorStack.count - 1 });
          } else {
            setCursorStack(null);
          }
        } else if (slotId === cursorStack.id && slotCount < 64) {
          setSlot(slotId, slotCount + 1);
          if (cursorStack.count > 1) {
            setCursorStack({ id: cursorStack.id, count: cursorStack.count - 1 });
          } else {
            setCursorStack(null);
          }
        } else if (slotId !== cursorStack.id && cursorStack.count === 1) {
          // Swap single held item with slot item
          const temp = { id: slotId, count: slotCount };
          setSlot(cursorStack.id, 1);
          setCursorStack(temp);
        }
      }
      return;
    }

    // ── 4. RIGHT-CLICK (button === 2): FULL STACK 64 PICK / DROP ──
    if (e.button === 2) {
      if (!cursorStack) {
        // Cursor is empty: Pick up ENTIRE stack (all items, e.g. 64) from slot
        if (slotId > 0 && slotCount > 0) {
          setCursorStack({ id: slotId, count: slotCount });
          setSlot(0, 0);
        }
      } else {
        // Cursor has stack: Drop ENTIRE stack into target slot
        if (slotCount === 0 || slotId === 0) {
          setSlot(cursorStack.id, cursorStack.count);
          setCursorStack(null);
        } else if (slotId === cursorStack.id) {
          const space = 64 - slotCount;
          const transfer = Math.min(space, cursorStack.count);
          setSlot(slotId, slotCount + transfer);
          if (cursorStack.count > transfer) {
            setCursorStack({ id: cursorStack.id, count: cursorStack.count - transfer });
          } else {
            setCursorStack(null);
          }
        } else {
          // Swap stacks
          const temp = { id: slotId, count: slotCount };
          setSlot(cursorStack.id, cursorStack.count);
          setCursorStack(temp);
        }
      }
    }
  };

  // =========================================================================
  // UTILITY BUTTON ACTIONS
  // =========================================================================

  const handleSortChest = () => {
    setChestSlots(prev => sortSlotArray([...prev]));
    showToast("Chest sorted! 📦");
  };

  const handleRestockFromChest = () => {
    const newChest = [...chestSlots];
    const newInv = [...invMain];
    restock(newChest, newInv);
    setChestSlots(newChest);
    setInvMain(newInv);
    showToast("Restocked matching stacks from chest! 🔄");
  };

  const handleCompressChest = () => {
    const newChest = [...chestSlots];
    quickStack(newChest, newChest);
    setChestSlots(newChest);
    showToast("Compressed chest stacks! ⇅");
  };

  const handleSortInventory = () => {
    setInvMain(prev => sortSlotArray([...prev]));
    showToast("Inventory sorted! 🎒");
  };

  const handleDepositToChest = () => {
    const newChest = [...chestSlots];
    const newInv = [...invMain];
    quickStack(newInv, newChest);
    setChestSlots(newChest);
    setInvMain(newInv);
    showToast("Deposited matching items into chest! 🔄");
  };

  const handleQuickStackAll = () => {
    const newChest = [...chestSlots];
    const newInv = [...invMain];
    transferAll(newInv, newChest);
    setChestSlots(newChest);
    setInvMain(newInv);
    showToast("Quick-stacked all inventory into chest! ⇅");
  };

  const handleButtonMouseEnter = (e: React.MouseEvent, text: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.right + 8, y: rect.top + rect.height / 2 });
    setHoveredButton(text);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-2 select-none animate-fade pointer-events-auto"
      onContextMenu={e => e.preventDefault()}
    >
      {/* Container Box: Exact Replica of chest-inventory-management.png */}
      <div className="relative w-[380px] sm:w-[420px] bg-[#c6c6c6] p-3 flex flex-col gap-2.5 shadow-2xl border-4 border-[#000000] border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555]">
        {/* X Close button (touch-friendly — iPads have no Esc key) */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close chest"
          title="Close"
          className="absolute top-1.5 right-1.5 z-20 w-7 h-7 bg-[#c6c6c6] border-2 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555] flex items-center justify-center text-[12px] font-bold text-[#3f3f3f] shadow hover:bg-[#d8d8d8] active:border-t-[#555555] active:border-l-[#555555] cursor-pointer"
        >✕</button>
        
        {/* ========================================================================= */}
        {/* TOP SECTION: Chest Storage (3 or 6 rows × 9 columns = 27/54 Slots) */}
        {/* ========================================================================= */}
        <div className="relative flex items-center gap-1.5">
          <div className="flex-1">
            <div className="text-xs font-bold text-[#3f3f3f] tracking-wide mb-1 px-0.5">
              {chestSlots.length > 27 ? "Large Chest" : "Chest"}
            </div>
            
            {/* 3 Rows × 9 Columns = 27 Chest Slots (6 rows for a large chest) */}
            <div className="grid grid-cols-9 gap-1 bg-[#8b8b8b] p-1 border-2 border-t-[#373737] border-l-[#373737] border-b-[#ffffff] border-r-[#ffffff]">
              {chestSlots.slice(0, 54).map((slot, i) => {
                const thumb = slot && slot.id > 0 ? isoThumbnails.get(slot.id) : null;
                const bName = slot && slot.id > 0 ? BLOCK_MAP.get(slot.id)?.name || "Item" : "Empty";
                return (
                  <button
                    key={i}
                    onMouseDown={e => handleSlotInteraction(e, "chest", i)}
                    onContextMenu={e => e.preventDefault()}
                    title={slot && slot.id > 0 ? `${bName} ${!creative && slot.count > 1 ? `×${slot.count}` : ""}` : ""}
                    className="relative aspect-square w-full bg-[#8b8b8b] border border-t-[#373737] border-l-[#373737] border-b-[#ffffff] border-r-[#ffffff] flex items-center justify-center p-0.5 hover:bg-white/15 cursor-pointer"
                  >
                    {thumb ? (
                      <img src={thumb} alt="" className="w-full h-full object-contain pointer-events-none drop-shadow p-0.5" />
                    ) : null}
                    {!creative && slot && slot.count > 1 && (
                      <span className="absolute right-0.5 bottom-0.5 text-[9px] font-bold text-white mc-text-shadow pointer-events-none">
                        {slot.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right-Docked Chest Management Buttons (chest-inventory-management.png) */}
          <div className="flex flex-col gap-1 self-center mt-4">
            {/* 1. Sort Chest */}
            <button
              onClick={handleSortChest}
              onMouseEnter={e => handleButtonMouseEnter(e, "Sort chest")}
              onMouseLeave={() => setHoveredButton(null)}
              className="w-6 h-6 bg-[#c6c6c6] border-2 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555] flex items-center justify-center text-xs font-bold shadow hover:bg-[#d8d8d8] active:border-t-[#555555] active:border-l-[#555555] cursor-pointer"
            >
              <span className="text-[11px] leading-none text-[#373737]">🔀</span>
            </button>

            {/* 2. Restock matching */}
            <button
              onClick={handleRestockFromChest}
              onMouseEnter={e => handleButtonMouseEnter(e, "Restock from chest")}
              onMouseLeave={() => setHoveredButton(null)}
              className="w-6 h-6 bg-[#c6c6c6] border-2 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555] flex items-center justify-center text-xs font-bold shadow hover:bg-[#d8d8d8] active:border-t-[#555555] active:border-l-[#555555] cursor-pointer"
            >
              <span className="text-[11px] leading-none text-[#373737]">🔄</span>
            </button>

            {/* 3. Compress / Stack */}
            <button
              onClick={handleCompressChest}
              onMouseEnter={e => handleButtonMouseEnter(e, "Compress chest items")}
              onMouseLeave={() => setHoveredButton(null)}
              className="w-6 h-6 bg-[#c6c6c6] border-2 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555] flex items-center justify-center text-xs font-bold shadow hover:bg-[#d8d8d8] active:border-t-[#555555] active:border-l-[#555555] cursor-pointer"
            >
              <span className="text-[11px] leading-none text-[#373737]">⇅</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BOTTOM SECTION: Player Inventory (3×9 storage + 1×9 hotbar) + Side Buttons */}
        {/* ========================================================================= */}
        <div className="relative flex items-center gap-1.5">
          <div className="flex-1">
            <div className="text-xs font-bold text-[#3f3f3f] tracking-wide mb-1 px-0.5">
              Inventory
            </div>
            
            {/* 3 Rows × 9 Columns = 27 Main Storage Slots */}
            <div className="grid grid-cols-9 gap-1 bg-[#8b8b8b] p-1 border-2 border-t-[#373737] border-l-[#373737] border-b-[#ffffff] border-r-[#ffffff] mb-1.5">
              {invMain.slice(0, 27).map((slot, i) => {
                const thumb = slot && slot.id > 0 ? isoThumbnails.get(slot.id) : null;
                const bName = slot && slot.id > 0 ? BLOCK_MAP.get(slot.id)?.name || "Item" : "Empty";
                return (
                  <button
                    key={i}
                    onMouseDown={e => handleSlotInteraction(e, "inv", i)}
                    onContextMenu={e => e.preventDefault()}
                    title={slot && slot.id > 0 ? `${bName} ${!creative && slot.count > 1 ? `×${slot.count}` : ""}` : ""}
                    className="relative aspect-square w-full bg-[#8b8b8b] border border-t-[#373737] border-l-[#373737] border-b-[#ffffff] border-r-[#ffffff] flex items-center justify-center p-0.5 hover:bg-white/15 cursor-pointer"
                  >
                    {thumb ? (
                      <img src={thumb} alt="" className="w-full h-full object-contain pointer-events-none drop-shadow p-0.5" />
                    ) : null}
                    {!creative && slot && slot.count > 1 && (
                      <span className="absolute right-0.5 bottom-0.5 text-[9px] font-bold text-white mc-text-shadow pointer-events-none">
                        {slot.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* 1 Row × 9 Columns Hotbar (Separated by 4px gap) */}
            <div className="grid grid-cols-9 gap-1 bg-[#8b8b8b] p-1 border-2 border-t-[#373737] border-l-[#373737] border-b-[#ffffff] border-r-[#ffffff]">
              {hotbar.slice(0, 9).map((blockId, idx) => {
                const isSelected = idx === activeSlot;
                const thumb = blockId > 0 ? isoThumbnails.get(blockId) : null;
                const count = hotbarCounts[idx] || 0;
                const bName = blockId > 0 ? BLOCK_MAP.get(blockId)?.name || "Block" : "Empty";
                return (
                  <button
                    key={idx}
                    onMouseDown={e => {
                      setActiveSlot(idx);
                      handleSlotInteraction(e, "hotbar", idx);
                    }}
                    onContextMenu={e => e.preventDefault()}
                    title={blockId > 0 ? `${bName} ${!creative && count > 1 ? `×${count}` : ""}` : ""}
                    className={`relative aspect-square w-full bg-[#8b8b8b] border border-t-[#373737] border-l-[#373737] border-b-[#ffffff] border-r-[#ffffff] flex items-center justify-center p-0.5 hover:bg-white/15 cursor-pointer ${
                      isSelected ? "border-2 !border-[#55FF55]" : ""
                    }`}
                  >
                    {thumb && blockId > 0 ? (
                      <img src={thumb} alt="" className="w-full h-full object-contain pointer-events-none drop-shadow p-0.5" />
                    ) : null}
                    {!creative && count > 1 && (
                      <span className="absolute right-0.5 bottom-0.5 text-[9px] font-bold text-white mc-text-shadow pointer-events-none">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right-Docked Inventory Management Buttons (chest-inventory-management.png) */}
          <div className="flex flex-col gap-1 self-center mt-4">
            {/* 1. Sort Inventory */}
            <button
              onClick={handleSortInventory}
              onMouseEnter={e => handleButtonMouseEnter(e, "Sort inventory")}
              onMouseLeave={() => setHoveredButton(null)}
              className="w-6 h-6 bg-[#c6c6c6] border-2 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555] flex items-center justify-center text-xs font-bold shadow hover:bg-[#d8d8d8] active:border-t-[#555555] active:border-l-[#555555] cursor-pointer"
            >
              <span className="text-[11px] leading-none text-[#373737]">🔀</span>
            </button>

            {/* 2. Deposit to Chest */}
            <button
              onClick={handleDepositToChest}
              onMouseEnter={e => handleButtonMouseEnter(e, "Deposit to chest")}
              onMouseLeave={() => setHoveredButton(null)}
              className="w-6 h-6 bg-[#c6c6c6] border-2 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555] flex items-center justify-center text-xs font-bold shadow hover:bg-[#d8d8d8] active:border-t-[#555555] active:border-l-[#555555] cursor-pointer"
            >
              <span className="text-[11px] leading-none text-[#373737]">🔄</span>
            </button>

            {/* 3. Quick Stack into Chest */}
            <button
              onClick={handleQuickStackAll}
              onMouseEnter={e => handleButtonMouseEnter(e, "Quick stack into chest")}
              onMouseLeave={() => setHoveredButton(null)}
              className="w-6 h-6 bg-[#c6c6c6] border-2 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555] flex items-center justify-center text-xs font-bold shadow hover:bg-[#d8d8d8] active:border-t-[#555555] active:border-l-[#555555] cursor-pointer"
            >
              <span className="text-[11px] leading-none text-[#373737]">⇅</span>
            </button>
          </div>
        </div>

        {/* Footer Hint */}
        <div className="text-center text-[10px] text-[#555555] mt-0.5">
          Left-Click: 1 item • Right-Click: all 64 items • Ctrl+Click: move all • Shift+Click: quick move
        </div>
      </div>

      {/* Floating Held Item on Cursor (Minecraft Drag & Drop) */}
      {cursorStack && cursorStack.id > 0 && cursorStack.count > 0 && (
        <div
          ref={cursorRef}
          className="fixed pointer-events-none z-50 w-9 h-9 flex items-center justify-center drop-shadow-2xl"
          style={{ top: 0, left: 0 }}
        >
          {isoThumbnails.get(cursorStack.id) ? (
            <img
              src={isoThumbnails.get(cursorStack.id)}
              alt=""
              className="w-full h-full object-contain drop-shadow"
            />
          ) : null}
          {!creative && cursorStack.count > 1 && (
            <span className="absolute right-0 bottom-0 text-[10px] font-bold text-white mc-text-shadow">
              {cursorStack.count}
            </span>
          )}
        </div>
      )}

      {/* Minecraft Purple Bordered Floating Tooltip (chest-inventory-management.png) */}
      {hoveredButton && (
        <div
          className="fixed pointer-events-none z-50 px-2.5 py-1 text-[11px] font-bold text-white bg-[#100010] border-2 border-[#5000ff] rounded shadow-[0_0_8px_rgba(80,0,255,0.6)] mc-text-shadow whitespace-nowrap animate-fade"
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: "translateY(-50%)"
          }}
        >
          {hoveredButton}
        </div>
      )}
    </div>
  );
};
