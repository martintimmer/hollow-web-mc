import React, { useState, useEffect } from "react";
import type { SpawnPortal } from "../../game/state/portalStorage";

interface PortalModalProps {
  isOpen: boolean;
  currentCoord: { x: number; y: number; z: number } | null;
  portals: SpawnPortal[];
  onSavePortal: (name: string, isHome: boolean) => void;
  onSetHome: (id: string) => void;
  onDeletePortal: (id: string) => void;
  onTeleportTo: (portal: SpawnPortal) => void;
  onClose: () => void;
}

export const PortalModal: React.FC<PortalModalProps> = ({
  isOpen,
  currentCoord,
  portals,
  onSavePortal,
  onSetHome,
  onDeletePortal,
  onTeleportTo,
  onClose
}) => {
  const [portalName, setPortalName] = useState<string>("");
  const [isHome, setIsHome] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      const existing = currentCoord
        ? portals.find(
            (p) =>
              Math.floor(p.x) === Math.floor(currentCoord.x) &&
              Math.floor(p.z) === Math.floor(currentCoord.z)
          )
        : null;

      if (existing) {
        setPortalName(existing.name);
        setIsHome(existing.isHome);
      } else {
        const defaultName = portals.length === 0 ? "Home" : `Portal #${portals.length + 1}`;
        setPortalName(defaultName);
        setIsHome(portals.length === 0);
      }
    }
  }, [isOpen, currentCoord, portals]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!portalName.trim()) return;
    onSavePortal(portalName.trim(), isHome);
  };

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 pointer-events-auto select-none">
      <div className="w-[460px] max-w-[94vw] bg-[#c6c6c6] border-4 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555] shadow-2xl p-4">
        {/* Header */}
        <div className="flex items-center justify-between bg-[#8b8b8b] px-3 py-2 border-b-2 border-[#555555] mb-3">
          <span className="text-sm font-bold text-white mc-text-shadow flex items-center gap-2">
            <span>🌀</span> Portal & Spawn Points
          </span>
          <button
            onClick={onClose}
            className="w-6 h-6 grid place-items-center bg-[#c6c6c6] border-2 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555] text-[#3f3f3f] font-bold hover:brightness-110"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Current Placement Configuration */}
        {currentCoord && (
          <form onSubmit={handleSubmit} className="bg-[#a8a8a8] border-2 border-t-[#373737] border-l-[#373737] border-b-[#ffffff] border-r-[#ffffff] p-3 mb-3">
            <div className="text-[11px] font-bold text-[#222] mb-1.5 flex justify-between items-center">
              <span>📍 Position: [{Math.floor(currentCoord.x)}, {Math.floor(currentCoord.y)}, {Math.floor(currentCoord.z)}]</span>
              <span className="text-[10px] text-[#444] font-normal">Active Placement</span>
            </div>

            <div className="mb-2">
              <label className="block text-[11px] font-bold text-[#222] mb-1">Portal Name:</label>
              <input
                type="text"
                id="portalNameInput"
                value={portalName}
                onChange={(e) => setPortalName(e.target.value)}
                placeholder="e.g. Home, Fortress, Mineshaft"
                maxLength={24}
                className="w-full bg-[#e0e0e0] border-2 border-t-[#373737] border-l-[#373737] border-b-[#ffffff] border-r-[#ffffff] px-2 py-1 text-xs text-[#111] font-semibold outline-none"
                autoFocus
              />
            </div>

            <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#888]">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-[#111]">
                <input
                  type="checkbox"
                  id="setAsHomeCheckbox"
                  checked={isHome}
                  onChange={(e) => setIsHome(e.target.checked)}
                  className="w-4 h-4 cursor-pointer accent-[#2e7d32]"
                />
                <span>Set as Home Spawn Point 🏠</span>
              </label>

              <button
                type="submit"
                id="btnSavePortal"
                className="mc-button px-3 py-1 text-xs font-bold uppercase text-white bg-[#2e7d32] hover:bg-[#388e3c]"
              >
                Save Spawn Point
              </button>
            </div>
          </form>
        )}

        {/* Saved Spawn Points List */}
        <div className="mb-3">
          <div className="text-[11px] font-bold text-[#333] mb-1 flex items-center justify-between">
            <span>Saved Spawn Points ({portals.length})</span>
            <span className="text-[10px] font-normal text-[#555]">Press R anytime in-game to recall</span>
          </div>

          <div className="max-h-[180px] overflow-y-auto bg-[#8b8b8b] border-2 border-t-[#373737] border-l-[#373737] border-b-[#ffffff] border-r-[#ffffff] p-1 space-y-1">
            {portals.length === 0 ? (
              <div className="text-center text-white/80 text-xs py-4 italic">
                No portals saved yet. Place a portal to set your Home spawn point!
              </div>
            ) : (
              portals.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-[#c6c6c6] border border-t-[#fff] border-l-[#fff] border-b-[#555] border-r-[#555] px-2 py-1 text-xs"
                >
                  <div className="flex items-center gap-1.5 truncate pr-2">
                    {p.isHome ? (
                      <span className="bg-[#2e7d32] text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                        HOME
                      </span>
                    ) : (
                      <span className="text-gray-600 text-[10px]">📍</span>
                    )}
                    <span className="font-bold text-[#111] truncate">{p.name}</span>
                    <span className="text-[10px] text-[#444] font-mono">
                      ({Math.floor(p.x)}, {Math.floor(p.y)}, {Math.floor(p.z)})
                    </span>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!p.isHome && (
                      <button
                        type="button"
                        onClick={() => onSetHome(p.id)}
                        className="mc-button px-2 py-0.5 text-[10px] font-bold uppercase text-[#222]"
                        title="Set as Primary Home"
                      >
                        Set Home
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onTeleportTo(p)}
                      className="mc-button px-2 py-0.5 text-[10px] font-bold uppercase text-white bg-[#1b4382] hover:bg-[#2358aa]"
                      title="Teleport to this portal"
                    >
                      Teleport
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePortal(p.id)}
                      className="w-5 h-5 grid place-items-center bg-[#a8a8a8] border border-t-[#fff] border-l-[#fff] border-b-[#444] border-r-[#444] text-[#8b0000] font-bold text-xs hover:bg-[#ba4a4a] hover:text-white"
                      title="Delete portal"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-[#888]">
          <span className="text-[10px] text-[#555]">
            Recall shortcut: Press <b>R</b> anywhere to recall Home
          </span>
          <button
            type="button"
            id="btnClosePortalModal"
            onClick={onClose}
            className="mc-button min-w-[80px] px-4 py-1.5 text-xs font-bold uppercase text-[#222]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
