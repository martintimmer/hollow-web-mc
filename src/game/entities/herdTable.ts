export type HerdAnimal = "cow" | "sheep" | "pig" | "chicken" | "horse" | "dog" | "cat";

export interface HerdSpec {
  type: HerdAnimal;
  count: number;
}

const band = (r: number, acc: number, w: number) => r < acc + w;

export function herdForBiome(biomeId: string | undefined, r: () => number): HerdSpec | null {
  const t = r();
  const n = (base: number, span: number) => base + Math.floor(r() * span);
  switch (biomeId) {
    case "plains":
      if (band(t, 0, 0.45)) return { type: "cow", count: n(4, 4) };
      if (band(t, 0.45, 0.25)) return { type: "sheep", count: n(4, 4) };
      if (band(t, 0.70, 0.15)) return { type: "horse", count: n(3, 3) };
      if (band(t, 0.85, 0.10)) return { type: "dog", count: n(1, 2) };
      return { type: "chicken", count: n(3, 3) };
    case "meadow":
      if (band(t, 0, 0.35)) return { type: "sheep", count: n(4, 3) };
      if (band(t, 0.35, 0.25)) return { type: "cow", count: n(3, 3) };
      if (band(t, 0.60, 0.20)) return { type: "chicken", count: n(3, 4) };
      if (band(t, 0.80, 0.10)) return { type: "horse", count: n(2, 3) };
      return { type: "dog", count: n(1, 2) };
    case "savanna":
      if (band(t, 0, 0.35)) return { type: "horse", count: n(3, 3) };
      if (band(t, 0.35, 0.30)) return { type: "cow", count: n(3, 3) };
      if (band(t, 0.65, 0.20)) return { type: "sheep", count: n(2, 3) };
      return { type: "dog", count: n(1, 2) };
    case "oak_forest":
    case "birch":
      if (band(t, 0, 0.30)) return { type: "pig", count: n(2, 3) };
      if (band(t, 0.30, 0.25)) return { type: "chicken", count: n(2, 4) };
      if (band(t, 0.55, 0.20)) return { type: "sheep", count: n(2, 3) };
      if (band(t, 0.75, 0.15)) return { type: "dog", count: n(1, 2) };
      return { type: "cow", count: n(2, 2) };
    case "dark_oak":
      if (band(t, 0, 0.40)) return { type: "pig", count: n(2, 2) };
      if (band(t, 0.40, 0.30)) return { type: "chicken", count: n(2, 3) };
      if (band(t, 0.70, 0.20)) return { type: "sheep", count: n(2, 2) };
      return { type: "dog", count: 1 };
    case "crimson_maple":
    case "golden_aspen":
      if (band(t, 0, 0.35)) return { type: "pig", count: n(2, 3) };
      if (band(t, 0.35, 0.30)) return { type: "chicken", count: n(2, 3) };
      if (band(t, 0.65, 0.20)) return { type: "sheep", count: n(2, 2) };
      return { type: "dog", count: n(1, 2) };
    case "cherry":
      if (band(t, 0, 0.45)) return { type: "sheep", count: n(3, 3) };
      if (band(t, 0.45, 0.30)) return { type: "chicken", count: n(2, 3) };
      if (band(t, 0.75, 0.15)) return { type: "pig", count: n(2, 2) };
      return { type: "dog", count: n(1, 2) };
    case "spruce":
    case "redwood":
      if (band(t, 0, 0.40)) return { type: "sheep", count: n(2, 3) };
      if (band(t, 0.40, 0.30)) return { type: "chicken", count: n(2, 2) };
      if (band(t, 0.70, 0.20)) return { type: "pig", count: n(2, 2) };
      return { type: "dog", count: 1 };
    case "bamboo":
      if (band(t, 0, 0.45)) return { type: "chicken", count: n(2, 3) };
      if (band(t, 0.45, 0.35)) return { type: "pig", count: n(2, 2) };
      return { type: "sheep", count: n(2, 2) };
    case "jungle":
      if (band(t, 0, 0.40)) return { type: "chicken", count: n(2, 4) };
      if (band(t, 0.40, 0.35)) return { type: "pig", count: n(2, 3) };
      return { type: "sheep", count: n(2, 2) };
    case "mangrove":
    case "swamp":
      if (band(t, 0, 0.50)) return { type: "pig", count: n(2, 2) };
      if (band(t, 0.50, 0.30)) return { type: "chicken", count: n(2, 2) };
      return { type: "sheep", count: n(1, 2) };
    default:
      return null;
  }
}
