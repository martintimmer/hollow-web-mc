/* Deterministic noise toolkit (extracted from Game.tsx — R1.4).
 * javaHash is pure; hash2/hash3/vnoise/vnoise3D depend on the world's seedMix,
 * supplied via the seedMix getter so all call sites keep identical behavior. */

export function javaHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return h;
}

export interface NoiseFns {
  hash2: (x: number, z: number) => number;
  hash3: (x: number, y: number, z: number) => number;
  vnoise: (x: number, z: number) => number;
  vnoise3D: (x: number, y: number, z: number) => number;
  ridge: (x: number, z: number) => number;
}

export function makeNoise(seedMix: () => number): NoiseFns {
  const hash2 = (x: number, z: number) => {
    let n = (Math.imul(x, 374761393) ^ Math.imul(z, 668265263) ^ seedMix()) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };

  const hash3 = (x: number, y: number, z: number) => {
    let n = (Math.imul(x, 374761393) ^ Math.imul(y, 451984213) ^ Math.imul(z, 668265263) ^ seedMix()) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  };

  const vnoise = (x: number, z: number) => {
    const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
    const sm = (t: number) => t * t * (3 - 2 * t), u = sm(xf), v = sm(zf);
    const a = hash2(xi, zi), b = hash2(xi + 1, zi), c = hash2(xi, zi + 1), d = hash2(xi + 1, zi + 1);
    return (a * (1 - u) + b * u) * (1 - v) + (c * (1 - u) + d * u) * v;
  };

  const vnoise3D = (x: number, y: number, z: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = x - xi, yf = y - yi, zf = z - zi;
    const sm = (t: number) => t * t * (3 - 2 * t);
    const u = sm(xf), v = sm(yf), w = sm(zf);
    const a00 = hash3(xi, yi, zi),     b00 = hash3(xi+1, yi, zi);
    const a10 = hash3(xi, yi+1, zi),   b10 = hash3(xi+1, yi+1, zi);
    const a01 = hash3(xi, yi, zi+1),   b01 = hash3(xi+1, yi, zi+1);
    const a11 = hash3(xi, yi+1, zi+1), b11 = hash3(xi+1, yi+1, zi+1);
    const x00 = a00*(1-u)+b00*u, x10 = a10*(1-u)+b10*u;
    const x01 = a01*(1-u)+b01*u, x11 = a11*(1-u)+b11*u;
    const y0 = x00*(1-v)+x10*v, y1 = x01*(1-v)+x11*v;
    return y0*(1-w)+y1*w;
  };

  const ridge = (x: number, z: number) => 1 - Math.abs(2 * vnoise(x, z) - 1);

  return { hash2, hash3, vnoise, vnoise3D, ridge };
}
