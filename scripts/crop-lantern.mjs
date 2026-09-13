import fs from "node:fs";
import { PNG } from "pngjs";
const png = PNG.sync.read(fs.readFileSync("catalog/textures/block/lantern.png"));
console.log("lantern.png", png.width, png.height);
// crop first 16x16 frame, scale 4x
const o = new PNG({ width: 64, height: 64 });
for (let y=0;y<16;y++) for (let x=0;x<16;x++){
  const si=(y*png.width+x)*4;
  const col=[png.data[si],png.data[si+1],png.data[si+2],png.data[si+3]];
  for (let yy=0;yy<4;yy++) for (let xx=0;xx<4;xx++){
    const di=((y*4+yy)*64+(x*4+xx))*4;
    o.data[di]=col[0];o.data[di+1]=col[1];o.data[di+2]=col[2];o.data[di+3]=255;
  }
}
fs.writeFileSync("snapshots/lantern-frame0.png", PNG.sync.write(o));
// stats
let maxA=0, lit=0, tot=0; 
for (let y=0;y<16;y++) for (let x=0;x<16;x++){
  const si=(y*png.width+x)*4; const a=png.data[si+3];
  if (a>maxA) maxA=a; tot+=a>0; if (a>128) lit++;
}
console.log("frame0: alphaMax", maxA, "opaque", tot, "/256, solid-lit", lit);
