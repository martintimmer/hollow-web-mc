#!/usr/bin/env node
// Generates a unique build tag + auto-bumps the patch version so the HUD always
// shows a fresh version after every edit/build (see AGENTS.md "Version").
import fs from "fs";
import crypto from "node:crypto";

const day = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const ts = `${day}-${crypto.randomBytes(2).toString("hex")}`;

// auto-increment the patch version in package.json (0.1.N → 0.1.N+1)
let version = "0.1.0";
try {
  const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(pkg.version || "0.1.0"));
  if (m) {
    version = `${m[1]}.${m[2]}.${Number(m[3]) + 1}`;
    pkg.version = version;
    fs.writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
  }
} catch (e) {
  console.warn("[buildtag] package.json version bump skipped:", String(e));
}

fs.writeFileSync(
  "src/buildTag.ts",
  `// Hollowpine — visible build tag + version (regenerated on each build; one glance tells us which bundle a browser is really running).\nexport const BUILD_TAG = "${ts}";\nexport const VERSION = "v${version}";\n`
);
console.log(`[buildtag] ${ts} (${version})`);
