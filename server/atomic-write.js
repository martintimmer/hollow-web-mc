import fs from "fs";

// Crash-safe file write for SQLite database files: write to a temp sibling,
// then atomically rename over the target. A crash or power loss mid-write can
// therefore never leave a half-written (corrupt) database behind — readers see
// either the previous complete file or the new complete file. On failure the
// previous file is left untouched and the temp file is removed.
export function atomicWriteFileSync(targetPath, data) {
  const tmpPath = `${targetPath}.tmp`;
  fs.writeFileSync(tmpPath, data);
  try {
    fs.renameSync(tmpPath, targetPath);
  } catch (e) {
    try { fs.unlinkSync(tmpPath); } catch {}
    throw e;
  }
}
