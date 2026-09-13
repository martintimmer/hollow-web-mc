// Hollowpine — ambient block-particle emitter table (pure, no engine imports).
// Vanilla reference: Particle-emitting blocks (Java). Each entry maps a block id
// to the mote it passively emits around players. Conditions keep it plausible
// (drips need fluid above, bubbles need submersion) and cheap (1-2 getBlock).

export type MoteKind = "flutter" | "rise" | "fall" | "spark";

export interface MoteSpec {
  kind: MoteKind;
  /** sRGB hex particle color */
  color: number;
  /** emission probability per sample hit */
  chance: number;
  /** spawn height offset within the block */
  dy?: number;
  /** required neighbor: fluid above, or submersion */
  needsAbove?: "water" | "lava" | "fluid";
  needsSubmerged?: boolean;
}

const F = (kind: MoteKind, color: number, chance: number, extra?: Partial<MoteSpec>): MoteSpec => ({
  kind,
  color,
  chance,
  ...extra,
});

const EMITTERS: Record<number, MoteSpec[]> = {
  // Falling leaves (all leaf types drift their tinted color)
  18: [F("flutter", 0x5ea632, 0.30)],
  114: [F("flutter", 0x309b21, 0.30)],
  115: [F("flutter", 0x3f6126, 0.30)],
  118: [F("flutter", 0xaea42a, 0.25)],
  480: [F("flutter", 0x8db127, 0.30)],
  116: [F("flutter", 0x80a755, 0.25)],
  24: [F("flutter", 0x619961, 0.20)],
  109: [F("flutter", 0xf2a7c3, 0.35)],
  110: [F("flutter", 0xd43a2a, 0.25)],
  111: [F("flutter", 0xf2c230, 0.25)],
  // Fire & heat: embers rise, smoke drifts
  80: [F("rise", 0xff8c00, 0.50), F("rise", 0x3a3635, 0.20, { dy: 0.4 })],
  81: [F("rise", 0x3d9df2, 0.50)],
  84: [F("rise", 0xd43a2a, 0.30)],
  46: [F("rise", 0xffd489, 0.25)],
  82: [F("rise", 0x3d9df2, 0.25)],
  85: [F("rise", 0xff8c00, 0.40), F("rise", 0x8a8a8a, 0.25, { dy: 0.6 })],
  86: [F("rise", 0x3d9df2, 0.40), F("rise", 0x8a8a8a, 0.25, { dy: 0.6 })],
  96: [F("rise", 0xff8c00, 0.30), F("rise", 0x5a5a5a, 0.20, { dy: 0.4 })],
  99: [F("rise", 0xff6a00, 0.25)],
  40: [F("rise", 0xff6a00, 0.35)],
  102: [F("rise", 0xff8c00, 0.45)],
  630: [F("rise", 0x3d9df2, 0.45)],
  631: [F("rise", 0x3d9df2, 0.45)],
  87: [F("rise", 0xff8c00, 0.30)],
  // Magic shimmer
  47: [F("spark", 0xffe9a3, 0.20)],
  48: [F("spark", 0x9fe8ff, 0.20)],
  92: [F("spark", 0xfff2c0, 0.35)],
  100: [F("spark", 0xbfe8a3, 0.15)],
  98: [F("rise", 0x7b2ff2, 0.30)],
  596: [F("spark", 0xff4d4d, 0.20)],
  93: [F("fall", 0x7b2ff2, 0.25)],
  132: [F("spark", 0x9fe8ff, 0.15)],
  // Drips need fluid pooled above the block
  1051: [
    F("fall", 0x3d9df2, 0.40, { needsAbove: "water" }),
    F("fall", 0xff6a00, 0.40, { needsAbove: "lava" }),
  ],
  // Bubble columns breathe only while submerged
  57: [F("rise", 0x9fd4ff, 0.35, { needsSubmerged: true })],
};

export function moteForBlock(id: number): MoteSpec[] | null {
  return EMITTERS[id] ?? null;
}

export function emitterBlockCount(): number {
  return Object.keys(EMITTERS).length;
}
