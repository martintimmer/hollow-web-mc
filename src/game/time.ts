export const DAY_TICKS = 24000;
export const NIGHT_START = 12500;
export const NIGHT_END = 23500;

export function isNightTime(time: number): boolean {
  return time >= NIGHT_START && time < NIGHT_END;
}

// Advance the 24000-tick sun cycle, counting a new day on wrap (dawn).
// Pure helper so day counting stays identical everywhere (render loop, tests).
export function advanceTime(time: number, dtTicks: number, dayCount: number): { time: number; dayCount: number } {
  const nt = (time + dtTicks) % DAY_TICKS;
  return { time: nt, dayCount: nt < time ? dayCount + 1 : dayCount };
}
