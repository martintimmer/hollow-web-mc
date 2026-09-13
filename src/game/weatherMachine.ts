// Time-based global weather state machine.
// Cycles clear -> cloudy -> rain/thunder (or snow in cold biomes) -> clear,
// driven by elapsed time and influenced by the seed-derived biome temperature
// at the player's position (surfaceAt.cold / frozen).

export type WeatherState = "clear" | "cloudy" | "rain" | "snow" | "thunder";

const DURATIONS: Record<WeatherState, [number, number]> = {
  clear: [75, 200],
  cloudy: [45, 110],
  rain: [30, 75],
  snow: [30, 75],
  thunder: [12, 35]
};

export interface WeatherMachine {
  readonly state: WeatherState;
  /** Advance the machine by dt seconds; cold biome turns rain into snow. */
  step(dt: number, cold: boolean): WeatherState;
  /** Manual override (e.g. /weather command) — continues cycling from here. */
  force(state: WeatherState): void;
}

function randDuration(s: WeatherState): number {
  const [lo, hi] = DURATIONS[s];
  return lo + Math.random() * (hi - lo);
}

function transition(from: WeatherState, cold: boolean): WeatherState {
  const r = Math.random();
  switch (from) {
    case "clear":
      if (r < 0.6) return "cloudy";
      if (r < 0.82) return cold ? "snow" : "rain";
      return "clear";
    case "cloudy":
      if (r < 0.4) return "clear";
      if (r < 0.68) return cold ? "snow" : "rain";
      return "cloudy";
    case "rain":
      if (r < 0.16) return "thunder";
      if (r < 0.45) return "cloudy";
      return "clear";
    case "snow":
      if (r < 0.25) return "clear";
      if (r < 0.5) return "cloudy";
      return "snow";
    case "thunder":
      if (r < 0.55) return "rain";
      return "cloudy";
    default:
      return "clear";
  }
}

export interface WeatherLight {
  direct: number;
  amb: number;
  sun: number;
  cloud: number;
}

export type WeatherLightMode = "clear" | "cloudy" | "overcast";

export function weatherLightTarget(mode: WeatherLightMode): WeatherLight {
  if (mode === "clear") return { direct: 1.15, amb: 1.10, sun: 1.0, cloud: 0 };
  if (mode === "cloudy") return { direct: 0.90, amb: 0.85, sun: 0.95, cloud: 0.88 };
  return { direct: 0.12, amb: 0.22, sun: 0.08, cloud: 0.96 };
}

export const WEATHER_LIGHT_TAU = 4;

export function smoothWeatherLight(cur: WeatherLight, target: WeatherLight, dt: number, tau = WEATHER_LIGHT_TAU): WeatherLight {
  const k = dt <= 0 ? 0 : 1 - Math.exp(-dt / Math.max(0.01, tau));
  return {
    direct: cur.direct + (target.direct - cur.direct) * k,
    amb: cur.amb + (target.amb - cur.amb) * k,
    sun: cur.sun + (target.sun - cur.sun) * k,
    cloud: cur.cloud + (target.cloud - cur.cloud) * k
  };
}

export function createWeatherMachine(initial: WeatherState = "clear"): WeatherMachine {
  let state = initial;
  let timeInState = 0;
  let duration = randDuration(state);

  return {
    get state() {
      return state;
    },
    step(dt, cold) {
      timeInState += dt;
      if (timeInState >= duration) {
        state = transition(state, cold);
        timeInState = 0;
        duration = randDuration(state);
      }
      return state;
    },
    force(s) {
      state = s;
      timeInState = 0;
      duration = randDuration(s);
    }
  };
}

/** Map a machine state to the precipitation the renderer needs. */
export function precipitationOf(st: WeatherState): "clear" | "rain" | "snow" | "thunder" {
  if (st === "snow") return "snow";
  if (st === "rain" || st === "thunder") return st;
  return "clear";
}

/** Map a machine state to the sky/cloud + lighting state. */
export function skyOf(st: WeatherState): "clear" | "cloudy" | "overcast" {
  if (st === "clear") return "clear";
  if (st === "cloudy") return "cloudy";
  return "overcast";
}

/** Seed the initial state from a legacy cloud-weather preference. */
export function seedStateFrom(pref: "clear" | "cloudy" | "overcast"): WeatherState {
  if (pref === "clear") return "clear";
  if (pref === "cloudy") return "cloudy";
  return "rain";
}