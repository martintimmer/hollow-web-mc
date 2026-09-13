import React from "react";
import type { User, WorldMeta } from "../../services/api";

export interface WorldSelectModalProps {
  isOpen: boolean;
  currentUser: User | null;
  availableWorlds: WorldMeta[];
  activeWorld: WorldMeta | null;
  setActiveWorld: (w: WorldMeta) => void;
  onPlayWorld: (w: WorldMeta) => void;
  onCreateWorldOpen: () => void;
  onDeleteWorld: (id: string) => void;
  onOpenAuditLogs: () => void;
  onLogout: () => void;
}

export const WorldSelectModal: React.FC<WorldSelectModalProps> = ({
  isOpen,
  currentUser,
  availableWorlds,
  activeWorld,
  setActiveWorld,
  onPlayWorld,
  onCreateWorldOpen,
  onDeleteWorld,
  onOpenAuditLogs,
  onLogout
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#10141a]/95 p-4 backdrop-blur-sm select-none">
      <div className="w-[min(560px,94vw)] max-h-[92vh] mc-window p-4 flex flex-col gap-3 shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center pb-2 border-b-2 border-[#555555]/30">
          <h1 className="text-lg font-bold text-[#373737] uppercase tracking-wider">Select World</h1>
          <div className="text-xs text-[#373737]">
            User: <span className="font-bold text-[#7B96D6]">{currentUser?.username}</span>
          </div>
        </div>

        {/* Worlds List Container */}
        <div className="flex-1 overflow-y-auto max-h-[46vh] mc-slot p-2 space-y-2 bg-[#222222]">
          {availableWorlds.map(w => (
            <div
              key={w.id}
              onClick={() => setActiveWorld(w)}
              className={`p-2.5 flex items-center justify-between cursor-pointer transition-all border-2 ${
                activeWorld?.id === w.id
                  ? "border-[#FFFFA0] bg-[#3a4454]"
                  : "border-[#444444] bg-[#2a2a2a] hover:bg-[#333333]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 mc-slot bg-[#373737] flex items-center justify-center text-lg">
                  🗺️
                </div>
                <div>
                  <div className="text-xs font-bold text-white mc-text-shadow flex items-center gap-2">
                    <span>{w.name}</span>
                    {w.isPublic && (
                      <span className="text-[9px] px-1.5 py-0.2 bg-[#336633] text-[#55FF55] uppercase font-bold">
                        Public
                      </span>
                    )}
                    {(w.onlinePlayers || 0) > 0 && (
                      <span className="text-[9px] px-1.5 py-0.2 bg-[#224466] text-[#5decf5] font-bold">
                        🟢 {w.onlinePlayers} Online
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#aaaaaa] mt-0.5">
                    Seed: <span className="font-mono text-[#FFFFA0]">{w.seedText}</span> · Type: <span className="capitalize">{w.worldType}</span>
                  </div>
                  <div className="text-[9px] text-[#777777]">
                    Last played: {new Date(w.lastPlayed).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {w.id !== "wld_default" && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteWorld(w.id); }}
                    className="px-2 py-1 text-[10px] font-bold mc-button !bg-[#732a2a] text-white"
                    title="Delete World"
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
          ))}

          {availableWorlds.length === 0 && (
            <div className="text-center py-6 text-xs text-white/50">
              No worlds found. Create one below!
            </div>
          )}
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => {
              const target = activeWorld || availableWorlds[0];
              if (target) onPlayWorld(target);
            }}
            className="mc-button py-2.5 text-xs font-bold uppercase !bg-[#73b84f] !text-black hover:!bg-[#8fcf6a]"
          >
            ▶ Play Selected World
          </button>

          <button
            onClick={onCreateWorldOpen}
            className="mc-button py-2.5 text-xs font-bold uppercase"
          >
            ➕ Create New World
          </button>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onOpenAuditLogs}
            className="flex-1 mc-button py-1.5 text-[11px] font-bold uppercase"
          >
            📋 Block Audit Logs
          </button>

          <button
            onClick={onLogout}
            className="flex-1 mc-button py-1.5 text-[11px] font-bold uppercase !bg-[#8c3b3b] text-white"
          >
            🚪 Logout
          </button>
        </div>
      </div>
    </div>
  );
};
