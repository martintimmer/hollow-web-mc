import React, { useEffect, useState } from "react";
import type { SpawnPortal } from "../../game/state/portalStorage";

interface RecallModalProps {
  isOpen: boolean;
  homePortal: SpawnPortal | null;
  allPortals: SpawnPortal[];
  onConfirm: (target?: SpawnPortal | null) => void;
  onCancel: () => void;
}

export const RecallModal: React.FC<RecallModalProps> = ({
  isOpen,
  homePortal,
  allPortals,
  onConfirm,
  onCancel
}) => {
  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setSelectedId(homePortal?.id || (allPortals[0]?.id ?? ""));
    }
  }, [isOpen, homePortal, allPortals]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Enter" || e.code === "NumpadEnter") {
        e.preventDefault();
        const target = allPortals.find((p) => p.id === selectedId) || homePortal || allPortals[0] || null;
        onConfirm(target);
      } else if (e.code === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedId, allPortals, homePortal, onConfirm, onCancel]);

  if (!isOpen) return null;

  const targetPortal = allPortals.find((p) => p.id === selectedId) || homePortal || allPortals[0] || null;

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 pointer-events-auto select-none">
      <div className="w-[440px] max-w-[92vw] bg-[#c6c6c6] border-4 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555] shadow-2xl p-4">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#8b8b8b] px-3 py-2 border-b-2 border-[#555555] mb-3">
          <span className="text-sm font-bold text-white mc-text-shadow flex items-center gap-2">
            <span>🌀</span> Spawn Home?
          </span>
          <button
            onClick={onCancel}
            className="w-6 h-6 grid place-items-center bg-[#c6c6c6] border-2 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555] text-[#3f3f3f] font-bold hover:brightness-110"
            title="Cancel"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="bg-[#a8a8a8] border-2 border-t-[#373737] border-l-[#373737] border-b-[#ffffff] border-r-[#ffffff] p-3 text-xs text-[#222222] mb-4 space-y-2">
          {targetPortal ? (
            <div>
              <p className="font-bold text-sm text-[#111] mb-1">
                Teleport to <span className="text-[#1b4382]">"{targetPortal.name}"</span>?
              </p>
              <div className="text-[11px] text-[#333] space-y-0.5 font-mono">
                <div>Coords: X: <b>{Math.floor(targetPortal.x)}</b>, Y: <b>{Math.floor(targetPortal.y)}</b>, Z: <b>{Math.floor(targetPortal.z)}</b></div>
                <div>Status: {targetPortal.isHome ? <span className="text-[#207227] font-bold">🏠 Primary Home</span> : "Saved Waypoint"}</div>
              </div>

              {allPortals.length > 1 && (
                <div className="mt-3 pt-2 border-t border-[#888]">
                  <label className="block text-[11px] font-bold mb-1 text-[#333]">Destination Portal:</label>
                  <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="w-full bg-[#e0e0e0] border-2 border-t-[#373737] border-l-[#373737] border-b-[#ffffff] border-r-[#ffffff] px-2 py-1 text-xs text-[#111] font-semibold outline-none"
                  >
                    {allPortals.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.isHome ? "🏠 " : "📍 "} {p.name} ({Math.floor(p.x)}, {Math.floor(p.y)}, {Math.floor(p.z)})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="font-bold text-sm text-[#111] mb-1">
                No Home Portal Set Yet!
              </p>
              <p className="text-[11px] text-[#444] leading-relaxed">
                Would you like to recall to the <b>World Spawn point</b>?
              </p>
              <p className="text-[10px] text-[#666] mt-2 italic">
                Tip: Place a <b>Portal</b> block in the world to set a custom Home spawn location.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons: OK and Cancel */}
        <div className="flex items-center justify-center gap-4 pt-2">
          <button
            id="btnRecallConfirm"
            onClick={() => onConfirm(targetPortal)}
            className="mc-button min-w-[120px] px-5 py-2 text-sm font-bold uppercase text-white bg-[#2e7d32] hover:bg-[#388e3c] border-[#1b5e20] shadow-md"
          >
            OK
          </button>
          <button
            id="btnRecallCancel"
            onClick={onCancel}
            className="mc-button min-w-[120px] px-5 py-2 text-sm font-bold uppercase text-[#333] hover:brightness-110 shadow-md"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
