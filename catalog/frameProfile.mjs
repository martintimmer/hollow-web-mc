import fs from "node:fs";
import { PNG } from "pngjs";
const [a,b] = process.argv.slice(2);
const pa = PNG.sync.read(fs.readFileSync(a));
const pb = PNG.sync.read(fs.readFileSync(b));
const h=pa.height,w=pa.width;
const rows=[];
for(let y=0;y<h;y+=8){let s=0,n=0;for(let x=0;x<w;x++){const i=(y*w+x)*4;const d=Math.abs(pa.data[i]-pb.data[i])+Math.abs(pa.data[i+1]-pb.data[i+1])+Math.abs(pa.data[i+2]-pb.data[i+2]);s+=d;n+=3;}rows.push([y,(s/n).toFixed(0)]);}
console.log("ROW MAE:", rows.map(r=>r.join(":")).join(" "));
const cols=[];
for(let x=0;x<w;x+=16){let s=0,n=0;for(let y=0;y<h;y++){const i=(y*w+x)*4;const d=Math.abs(pa.data[i]-pb.data[i])+Math.abs(pa.data[i+1]-pb.data[i+1])+Math.abs(pa.data[i+2]-pb.data[i+2]);s+=d;n+=3;}cols.push([x,(s/n).toFixed(0)]);}
console.log("COL MAE:", cols.map(c=>c.join(":")).join(" "));
