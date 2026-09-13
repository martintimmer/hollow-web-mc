import { strict as assert } from "node:assert";
import {
  faceDirectWeight,
  skyVisNy,
  emitterFalloff,
  windowBounds,
  ev100FromLux,
  latitudeStops,
  clampEv,
  countWindowClipUp,
} from "../src/game/engine/lightMeter.ts";
import { ttlZoneAbsLux } from "../src/game/engine/ttlMeter.ts";

const approx = (a: number, b: number, eps = 1e-9) => {
  assert.ok(Math.abs(a - b) <= eps, `expected ${a} ≈ ${b}`);
};

let n = 0;
const t = (name: string, fn: () => void) => {
  fn();
  n++;
  console.log(`  ✔ ${name}`);
};

console.log("lux unit tests (D3):");

t("face sun overhead on up-face = 1", () => approx(faceDirectWeight(0, 1, 0, 0, 1, 0), 1));
t("face sun overhead on side-face = 0", () => approx(faceDirectWeight(1, 0, 0, 0, 1, 0), 0));
t("face sun overhead on down-face = -1", () => approx(faceDirectWeight(0, -1, 0, 0, 1, 0), -1));
t("face 45-degree sun ≈ 0.707", () => {
  const l = Math.SQRT1_2;
  approx(faceDirectWeight(1, 0, 0, l, l, 0), l, 1e-6);
});
t("face opposite light is negative", () => {
  assert.ok(faceDirectWeight(0, 0, 1, 0, 0, -1) < 0);
});
t("skyVis up/down/side", () => {
  approx(skyVisNy(1), 1);
  approx(skyVisNy(-1), 0);
  approx(skyVisNy(0), 0.5);
});
t("skyVis clamps out-of-range normals", () => {
  approx(skyVisNy(3), 1);
  approx(skyVisNy(-3), 0);
});
t("emitter 100 lux@1m at d2=4", () => approx(emitterFalloff(100, 4), 100 / 4.5));
t("emitter at source softens by 0.5", () => approx(emitterFalloff(100, 0), 200));
t("emitter capped at 1200", () => approx(emitterFalloff(100000, 0), 1200));
t("torch 450@1m at 2m is tens of lux", () => {
  const v = emitterFalloff(450, 4);
  assert.ok(v > 10 && v < 200, `torch 2m = ${v}`);
});
t("windowBounds(1000, 8) = [62.5, 16000]", () => {
  const [lo, hi] = windowBounds(1000, 8);
  approx(lo, 62.5);
  approx(hi, 16000);
});
t("10→3000 lux spans 8.2 stops", () => {
  approx(Math.log2(3000 / 10), 8.23, 0.01);
});
t("1→100000 lux spans 16.6 stops", () => {
  approx(Math.log2(100000), 16.61, 0.01);
});
t("ev100FromLux(82000) ≈ 15 sunny-16", () => approx(ev100FromLux(82000), 15, 0.05));
t("ev100FromLux moonlit 0.4 ≈ -2.6", () => approx(ev100FromLux(0.4), Math.log2(0.16), 1e-9));
t("latitudeStops = EV over 8..17", () => {
  approx(latitudeStops(8), 8);
  approx(latitudeStops(14), 14);
  approx(latitudeStops(17), 17);
});
t("clampEv keeps 8..17, defaults 12", () => {
  approx(clampEv(3), 8);
  approx(clampEv(99), 17);
  approx(clampEv(NaN), 12);
});
t("clip counter: 500lx zones inside EV12 window of mid 1000", () => {
  const s = { ev: 12, meterExp: 1000, ttlHDROk: true, ttlAnchor: 1000, ttlHDR: new Array(63).fill(0.5) } as any;
  approx(countWindowClipUp(s), 0);
});
t("clip counter: one 100klx zone above hi clips", () => {
  const hdr = new Array(63).fill(0.5);
  hdr[0] = 100;
  const s = { ev: 12, meterExp: 1000, ttlHDROk: true, ttlAnchor: 1000, ttlHDR: hdr } as any;
  approx(countWindowClipUp(s), 1);
});
t("clip counter off without HDR tap", () => {
  approx(countWindowClipUp({} as any), 0);
});
t("absolute zone lux = imaged × anchor", () => {
  const hdr = new Array(63).fill(0);
  hdr[7] = 2.5;
  const s = { ttlHDROk: true, ttlAnchor: 40000, ttlHDR: hdr } as any;
  approx(ttlZoneAbsLux(s, 7), 100000);
  approx(ttlZoneAbsLux(s, 8), 0);
});

console.log(`lux: ${n} passed, 0 failed`);
