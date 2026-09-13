import React from "react";

interface LoadingOverlayProps {
  pct: number;
  message: string;
}

/** Hand-written original flavor tips (shown while terrain generates). */
const TIP_POOL = [
  "Blocky skies ahead — terrain folding in progress.",
  "Waterfall engineers are on lunch break.",
  "Caves are being deflated to save pixels.",
  "The village elder read the spawn coordinates backwards.",
  "Torch budget committee approved all 2,400 candles.",
  "Mining fatigue is a state of mind.",
  "The moon is currently beta-testing its orbit.",
  "Cooked porkchops heal both mood and hunger.",
  "Seeds are honorary villagers for the duration of generation.",
  "This service uses 0% real bedrock."
];

function randomTip(): string {
  const i = Math.floor(Math.random() * TIP_POOL.length);
  return TIP_POOL[i];
}

/** In-world load overlay: blurred world behind, dialog w/ header, dither body, tip + green marching progress. */
export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ pct, message }) => {
  const tip = React.useMemo(() => randomTip(), []);
  const safePct = Math.max(0, Math.min(100, Math.round(pct)));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center select-none pointer-events-none bg-black/60 backdrop-blur-sm">
      <div className="w-[min(560px,92vw)] mc-window flex flex-col overflow-hidden shadow-2xl">
        <div className="bg-[#d9d9d9] text-[#373737] text-center py-1.5 text-sm font-bold uppercase tracking-widest border-b-2 border-[#9b9b9b]">
          Generating World
        </div>
        <div className="relative h-[130px] bg-[#0d0d0d] overflow-hidden">
          {/* dither texture */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "repeating-conic-gradient(#161616 0% 25%, #0d0d0d 0% 50%)",
              backgroundSize: "7px 7px",
              animation: "bedrock-dither 1.2s linear infinite"
            }}
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
            <div className="text-white text-[13px] font-semibold leading-snug text-center mb-3" style={{ textShadow: "1px 1px 0 #000" }}>
              {message || tip}
            </div>
            <div className="w-[90%] h-[12px] bg-black border-2 border-[#4a4a4a] rounded-sm overflow-hidden p-[1px]">
              <div
                className="h-full bg-gradient-to-r from-[#2ea043] to-[#56d364] bedrock-march rounded-[1px] transition-all duration-300 ease-out"
                style={{ width: `${safePct}%` }}
              />
            </div>
            <div
              className="mt-2 text-[#4cbd4c] text-xs font-mono font-bold tracking-widest"
              style={{ textShadow: "1px 1px 0 #000" }}
            >
              {safePct}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
