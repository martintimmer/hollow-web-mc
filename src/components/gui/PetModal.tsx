import React from "react";

export interface PetEntry {
  id: string;
  type: string;
  name: string | null;
  sex: string;
  x: number;
  y: number;
  z: number;
}

interface PetModalProps {
  open: boolean;
  onClose: () => void;
  pets: PetEntry[];
  onTeleport: (pet: PetEntry) => void;
  onSummon: (pet: PetEntry) => void;
}

const PET_ICON: Record<string, string> = {
  cow: "🐄",
  sheep: "🐑",
  pig: "🐖",
  chicken: "🐔",
  horse: "🐎",
  dog: "🐕",
  cat: "🐈",
  spider: "🕷️"
};

const PET_LABEL: Record<string, string> = {
  cow: "Cow",
  sheep: "Sheep",
  pig: "Pig",
  chicken: "Chicken",
  horse: "Horse",
  dog: "Dog",
  cat: "Cat",
  spider: "Spider"
};

export const PetModal: React.FC<PetModalProps> = ({ open, onClose, pets, onTeleport, onSummon }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 pointer-events-auto">
      <div className="w-[420px] max-w-[92vw] bg-[#c6c6c6] border-4 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555] shadow-2xl">
        <div className="flex items-center justify-between bg-[#8b8b8b] px-3 py-2 border-b-2 border-[#555555]">
          <span className="text-sm font-bold text-white mc-text-shadow">🐾 My Pets ({pets.length})</span>
          <button
            onClick={onClose}
            className="w-6 h-6 grid place-items-center bg-[#c6c6c6] border-2 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555] text-[#3f3f3f] font-bold hover:brightness-110"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div className="max-h-[420px] overflow-y-auto p-2 space-y-1">
          {pets.length === 0 && (
            <div className="text-center text-[#5a5a5a] text-xs py-6">
              No pets yet — hold a <b>Sign</b> and right-click an animal or a web spider to name it and make it yours.
            </div>
          )}
          {pets.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2 px-2 py-1.5 bg-[#8b8b8b] border-2 border-t-[#ffffff] border-l-[#ffffff] border-b-[#555555] border-r-[#555555]"
            >
              <span className="text-2xl leading-none drop-shadow">{PET_ICON[p.type] || "🐾"}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-[#2b2b2b] truncate">
                  {p.name || PET_LABEL[p.type] || p.type}
                  <span className="ml-1 text-[#3f3f3f] font-normal">{p.sex === "male" ? "♂" : "♀"}</span>
                </div>
                <div className="text-[10px] text-[#4a4a4a] font-mono">
                  {PET_LABEL[p.type] || p.type} · X {p.x.toFixed(0)} · Y {p.y.toFixed(0)} · Z {p.z.toFixed(0)}
                </div>
              </div>
              <button
                onClick={() => onTeleport(p)}
                className="mc-button px-2 py-1 text-[10px] font-bold uppercase shrink-0"
                title="Teleport to this pet"
              >
                ➜ Go
              </button>
              {p.type !== "spider" && (
                <button
                  onClick={() => onSummon(p)}
                  className="mc-button px-2 py-1 text-[10px] font-bold uppercase shrink-0"
                  title="Summon this pet to you"
                >
                  ⬇ Summon
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
