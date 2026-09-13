import React from "react";

export interface CreateWorldModalProps {
  isOpen: boolean;
  newWorldName: string;
  setNewWorldName: (val: string) => void;
  newWorldSeed: string;
  setNewWorldSeed: (val: string) => void;
  newWorldType: string;
  setNewWorldType: (val: string) => void;
  newWorldMode?: "survival" | "creative";
  setNewWorldMode?: (val: "survival" | "creative") => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const CreateWorldModal: React.FC<CreateWorldModalProps> = ({
  isOpen,
  newWorldName,
  setNewWorldName,
  newWorldSeed,
  setNewWorldSeed,
  newWorldMode = "survival",
  setNewWorldMode,
  onSubmit,
  onClose
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 select-none">
      <div className="w-[min(420px,94vw)] mc-window p-4 flex flex-col gap-3 shadow-2xl">
        <h2 className="text-base font-bold text-[#373737] uppercase tracking-wider text-center pb-1 border-b">
          Create New World
        </h2>

        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-[#373737] block mb-1">World Name:</label>
            <input
              type="text"
              value={newWorldName}
              onChange={e => setNewWorldName(e.target.value)}
              placeholder="e.g. My Survival Base"
              required
              className="w-full mc-input px-3 py-1.5 text-xs font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#373737] block mb-1">World Seed (optional):</label>
            <input
              type="text"
              value={newWorldSeed}
              onChange={e => setNewWorldSeed(e.target.value)}
              placeholder="hollowpine"
              className="w-full mc-input px-3 py-1.5 text-xs font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-[#373737] block mb-1">Game Mode:</label>
            <select
              value={newWorldMode}
              onChange={e => setNewWorldMode?.(e.target.value as "survival" | "creative")}
              className="w-full mc-input px-3 py-1.5 text-xs font-semibold text-gray-800"
            >
              <option value="survival">⚔️ Survival (durability, hold-to-mine, mini-block drops)</option>
              <option value="creative">🛠️ Creative (flight, instant block deletion)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="submit"
              className="mc-button py-2 text-xs font-bold uppercase !bg-[#73b84f] !text-black hover:!bg-[#8fcf6a]"
            >
              Create & Play
            </button>
            <button
              type="button"
              onClick={onClose}
              className="mc-button py-2 text-xs font-bold uppercase"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
