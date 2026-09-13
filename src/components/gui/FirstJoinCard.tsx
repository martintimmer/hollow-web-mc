import { useState } from "react";

const DISMISS_KEY = "mc_onboarding_dismissed";

/** First-join onboarding card (Phase D): 60-second controls + goal primer.
 * Shows until dismissed; dismissal persists in localStorage. Self-contained —
 * parent only gates visibility (hidden over title/loading screens). */
export function FirstJoinCard({ visible }: { visible: boolean }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return true; }
  });
  if (!visible || dismissed) return null;
  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch {}
    setDismissed(true);
  };
  return (
    <div className="absolute left-1/2 top-16 z-40 w-[min(92vw,430px)] -translate-x-1/2 rounded-lg border border-white/20 bg-black/75 p-4 text-sm text-white shadow-xl">
      <div className="mb-2 text-base font-bold">⛏️ New here? 60-second primer</div>
      <ul className="list-disc space-y-1 pl-5 text-white/90">
        <li><b>WASD</b> move · <b>mouse</b> look · <b>Space</b> jump · <b>Shift</b> sprint</li>
        <li><b>Left-click</b> break · <b>Right-click / E</b> place &amp; use</li>
        <li><b>I</b> materials · <b>E</b> inventory · <b>M</b> world map · <b>Esc</b> menu</li>
        <li>Goal: mine <b>coal</b> → smelt <b>iron</b> in a <b>furnace</b> → craft an <b>iron pickaxe</b> (table needs planks + sticks first)</li>
      </ul>
      <button
        onClick={dismiss}
        className="mt-3 w-full rounded bg-emerald-600 px-3 py-1.5 font-bold hover:bg-emerald-500"
      >
        Got it — start playing
      </button>
    </div>
  );
}
