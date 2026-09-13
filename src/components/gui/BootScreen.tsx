import React, { useEffect, useMemo, useRef, useState } from "react";
import { renderWordmark, renderSpinnerFrames } from "../../game/engine/blockyFont";
import { playBootTone } from "../../game/sfx";

interface BootScreenProps {
  onDone: () => void;
}

/** Phase-0 dark boot screen: blocky wordmark, pixel spinner, single smooth green bar + % text + fade to login. */
export const BootScreen: React.FC<BootScreenProps> = ({ onDone }) => {
  const wordmark = useMemo(() => renderWordmark("HOLLOWPINE", 8, {}), []);
  const spinner = useMemo(() => renderSpinnerFrames(5), []);
  const [pct, setPct] = useState(0);
  const [frame, setFrame] = useState(0);
  const [isFading, setIsFading] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    let animId: number;
    let frameTimer: number;
    const startTime = performance.now();
    const duration = 1900; // 1.9s smooth, continuous ramp from 0 to 100%

    // Animate pixel spinner frames
    frameTimer = window.setInterval(() => {
      setFrame(f => (f + 1) % spinner.length);
    }, 110);

    playBootTone();

    function step(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Continuous smooth progress calculation
      const currentPct = Math.min(100, Math.round(progress * 100));
      setPct(currentPct);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        // Reached 100%: 300ms hold, then smooth fade-out transition into login screen
        setTimeout(() => {
          setIsFading(true);
          setTimeout(() => {
            onDoneRef.current();
          }, 320);
        }, 300);
      }
    }

    animId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animId);
      clearInterval(frameTimer);
    };
  }, [spinner.length]);

  return (
    <div
      className={`fixed inset-0 z-[60] bg-[#111111] flex flex-col items-center justify-center select-none overflow-hidden transition-opacity duration-300 ${
        isFading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <img
        src={wordmark}
        alt="Hollowpine"
        className="mb-[9vh] w-[min(52vw,460px)]"
        style={{ imageRendering: "pixelated" }}
      />
      <img
        src={spinner[frame]}
        alt="loading"
        className="w-10 h-10 mb-[7vh]"
        style={{ imageRendering: "pixelated" }}
      />

      {/* Single clean progress bar container */}
      <div className="w-[min(42vw,400px)]">
        <div className="w-full h-[16px] bg-[#141414] border-2 border-[#e8e5e0] p-[2px] rounded-sm overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#2ea043] to-[#4cbd4c] transition-all duration-75 ease-out rounded-[1px]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div
        className="mt-3 text-[#4cbd4c] text-sm font-mono font-bold tracking-widest"
        style={{ textShadow: "2px 2px 0 #0a0a0a" }}
      >
        {pct}%
      </div>
    </div>
  );
};
