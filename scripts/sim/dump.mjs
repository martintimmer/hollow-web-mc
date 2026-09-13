import CDP from "chrome-remote-interface";
const client = await CDP({ port: 9223 });
const { Runtime } = client;
const res = await Runtime.evaluate({
  expression: `(() => {
    const s = window.__sim?.s;
    if (!s) return "no-s";
    const c = s.chunks.get('0,0');
    if (!c) return "no-chunk0,0";
    const id = (x,y,z) => c.data[y*256 + (z&15)*16 + (x&15)];
    const out = [];
    for (let y = 62; y <= 68; y++) {
      out.push('y'+y+': ' + [6,7,8,9].map(x => [x, id(x,y,7), id(x,y,8), id(x,y,9)].join('/')).join('   '));
    }
    return out.join('\\n');
  })()`,
  returnByValue: true
});
console.log(res.result.value);
await client.close();
process.exit(0);
