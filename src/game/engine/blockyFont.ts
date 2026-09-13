// Hollowpine — procedural "blocky pixel" font & isometric extruded wordmark renderer.
// Zero-asset policy: every glyph is an original 5x7 bitmap designed here; the wordmark
// draws the game's own brand name with a 3D slab extrusion (light face + dark depth).

export interface GlyphSet {
  draw: (ctx: CanvasRenderingContext2D, ch: string, x: number, y: number, px: number, color: string) => number;
  measure: (text: string, px: number) => number;
}

const GLYPHS: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11110", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  ".": ["00000", "00000", "00000", "00000", "00000", "00100", "00100"],
  ",": ["00000", "00000", "00000", "00000", "00100", "00100", "01000"],
  ":": ["00000", "00100", "00100", "00000", "00100", "00100", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  "*": ["00000", "10101", "01110", "11111", "01110", "10101", "00000"],
  "✓": ["00000", "00000", "00111", "01000", "10100", "01010", "00100"]
};

const SPACING = 2; // px between glyphs (at px=1 scale)

export const blockyFont: GlyphSet = {
  draw(ctx: CanvasRenderingContext2D, ch: string, x: number, y: number, px: number, color: string): number {
    const g = GLYPHS[ch.toUpperCase()] ?? GLYPHS["?"] ?? GLYPHS["!"] ?? GLYPHS[" "];
    if (g && ch !== " ") {
      ctx.fillStyle = color;
      for (let r = 0; r < 7; r++) {
        const row = g[r];
        for (let c = 0; c < 5; c++) {
          if (row[c] === "1") ctx.fillRect(x + c * px, y + r * px, px, px);
        }
      }
    }
    return 7 * px + (ch !== " " ? SPACING * px : 3 * px);
  },
  measure(text: string, px: number): number {
    let w = 0;
    for (let i = 0; i < text.length; i++) w += 7 * px + SPACING * px;
    return w - SPACING * px;
  }
};

export interface WordmarkOptions {
  face?: string;
  top?: string;
  shade?: string;
  depth?: number; // extrusion px (at unit scale) — a value of 1 = 1 grid cell
  skewX?: number; // shear factor (0.0-0.35)
}

/** Renders "text" as isometric-ish extruded blocky wordmark into a data-URL PNG. */
export function renderWordmark(text: string, px: number, opts: WordmarkOptions = {}): string {
  const { face = "#cfcac4", top = "#e8e5e0", shade = "#232220", depth = 0.9, skewX = 0.18 } = opts;
  const gw = blockyFont.measure(text, px);
  const pad = Math.ceil(px * 3);
  const w = gw + pad * 2 + Math.ceil(px * depth * 2);
  const h = 7 * px + pad * 2 + Math.ceil(px * depth * 3);
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const ctx = cv.getContext("2d")!;
  const ox = pad, oy = pad;

  ctx.save();
  ctx.transform(1, 0, skewX, 1, 0, 0);
  const letters = text.toUpperCase();
  const startX = ox + pad * 0.5, topY = oy;

  // depth (backwards shadow copies)
  for (let d = 2; d >= 1; d--) {
    const dy = Math.round(px * depth * 0.9 * d);
    const dx = Math.round(px * depth * 0.55 * d);
    ctx.save();
    ctx.globalAlpha = 1;
    let cx = startX + dx;
    const cy = topY + dy;
    for (const ch of letters) cx += blockyFont.draw(ctx, ch, cx, cy, px, shade);
    ctx.restore();
  }
  // letter faces with top highlight strip
  let cx = startX;
  const cy = topY;
  for (const ch of letters) cx += blockyFont.draw(ctx, ch, cx, cy, px, face);
  // top plane highlight (offset up-left a hair)
  ctx.globalAlpha = 0.9;
  let cx2 = startX - Math.round(px * 0.3);
  const cy2 = topY - Math.round(px * 0.55);
  for (const ch of letters) cx2 += blockyFont.draw(ctx, ch, cx2, cy2, px, top);
  ctx.globalAlpha = 1;
  ctx.restore();
  return cv.toDataURL("image/png");
}

/** 5-frame classic "boot arc" spinner frame data-URLs (original shape). */
export function renderSpinnerFrames(px: number, color = "#ffffff"): string[] {
  const frames: string[] = [];
  for (let f = 0; f < 5; f++) {
    const cv = document.createElement("canvas");
    cv.width = 9 * px; cv.height = 9 * px;
    const ctx = cv.getContext("2d")!;
    ctx.fillStyle = color;
    // an arc of 5 thick dots; phase offset around the ring
    for (let i = 0; i < 5; i++) {
      const a = ((i - f * 1.2) / 5) * Math.PI * 2 - Math.PI / 2;
      const rad = 3.2 * px;
      const cx = 4.5 * px + Math.cos(a) * rad;
      const cy = 4.5 * px + Math.sin(a) * rad;
      const s = px * (1 - i * 0.08);
      ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
    }
    frames.push(cv.toDataURL("image/png"));
  }
  return frames;
}
