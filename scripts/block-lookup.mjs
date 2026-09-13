#!/usr/bin/env node
// Usage: node scripts/block-lookup.mjs <id|name> — compact block-def lookup, no file reads.
import { readFileSync } from "fs";

const q = (process.argv[2] ?? "").toLowerCase();
if (!q) { console.error("Usage: node scripts/block-lookup.mjs <id|name>"); process.exit(1); }
const reg = JSON.parse(readFileSync("catalog/completeRegistry.json", "utf8"));
const hits = /^\d+$/.test(q)
  ? reg.filter((b) => b.id === Number(q))
  : reg.filter((b) => String(b.name).toLowerCase().includes(q));
console.log(JSON.stringify(hits.slice(0, 10), null, 1));
if (hits.length > 10) console.log(`… +${hits.length - 10} more; refine the query`);
