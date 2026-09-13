// Hollowpine — Off-main-thread PNG snapshot encoder
// Web Worker does bitmap→OffscreenCanvas→convertToBlob so the encode never blocks the game loop.
// Falls back to main-thread OffscreenCanvas / toDataURL when workers are unavailable.

const WORKER_CODE = `
self.onmessage = async function (e) {
  var msg = e.data;
  if (msg.cmd !== "encode") return;
  var bitmap = msg.bitmap, w = msg.w, h = msg.h;
  try {
    var oc = new OffscreenCanvas(w, h);
    var ctx = oc.getContext("2d");
    ctx.drawImage(bitmap, 0, 0);
    var blob = await oc.convertToBlob({ type: "image/png" });
    self.postMessage({ ok: true, blob: blob }, [blob]);
  } catch (err) {
    self.postMessage({ ok: false, err: String(err) });
  }
};`;

let workerRes: Worker | null | undefined = undefined;
let workerFails = 0;

function getWorker(): Worker | null {
  if (workerRes !== undefined) return workerRes;
  try {
    workerRes = new Worker(URL.createObjectURL(new Blob([WORKER_CODE], { type: "application/javascript" })));
  } catch {
    workerRes = null;
  }
  return workerRes;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(blob);
  });
}

export async function encodeCanvasToPngBlob(source: CanvasImageSource, w: number, h: number): Promise<Blob | null> {
  if (typeof createImageBitmap !== "function" || !w || !h) return null;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(source);
  } catch {
    return null;
  }

  const wk = getWorker();
  if (wk && workerFails < 2) {
    const blob = await new Promise<Blob | null>((resolve) => {
      const to = setTimeout(() => { wk.onmessage = null; resolve(null); }, 2500);
      wk.onmessage = (ev: MessageEvent) => {
        clearTimeout(to);
        const d = ev.data as { ok?: boolean; blob?: Blob };
        if (d && d.ok && d.blob) {
          resolve(d.blob);
        } else {
          workerFails++;
          resolve(null);
        }
      };
      wk.postMessage({ cmd: "encode", bitmap, w, h }, [bitmap]);
    });
    if (blob) return blob;
  }

  // Main-thread fallbacks (bitmap survives worker-failure only if not transferred)
  try {
    if (typeof OffscreenCanvas !== "undefined") {
      const oc = new OffscreenCanvas(w, h);
      const ctx = oc.getContext("2d")!;
      ctx.drawImage(bitmap, 0, 0);
      const blob = await oc.convertToBlob({ type: "image/png" });
      return blob;
    }
  } catch { /* continue */ }
  try {
    const cv = document.createElement("canvas");
    cv.width = w; cv.height = h;
    const ctx = cv.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);
    const url = cv.toDataURL("image/png");
    const b64 = url.split(",")[1] || "";
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return new Blob([buf], { type: "image/png" });
  } catch {
    return null;
  }
}

export async function encodeCanvasToJpegBlob(source: CanvasImageSource, w: number, h: number): Promise<Blob | null> {
  // JPEG has no alpha — composite over white first (true 24-bit RGB), then encode off-thread.
  const bmp = await new Promise<ImageBitmap | null>(async (resolve) => {
    if (typeof createImageBitmap !== "function") return resolve(null);
    try { resolve(await createImageBitmap(source)); } catch { resolve(null); }
  });
  if (!bmp) return null;

  let result: Blob | null = null;
  const wk = getWorker();
  const sendJpeg = async () => {
    try {
      if (typeof OffscreenCanvas !== "undefined") {
        const oc = new OffscreenCanvas(w, h);
        const ctx = oc.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(bmp, 0, 0);
        result = await oc.convertToBlob({ type: "image/jpeg", quality: 0.95 });
      }
    } catch { /* fall through */ }
    try {
      if (!result) {
        const cv = document.createElement("canvas");
        cv.width = w; cv.height = h;
        const ctx = cv.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(bmp, 0, 0);
        const url = cv.toDataURL("image/jpeg", 0.95);
        const b64 = url.split(",")[1] || "";
        const bin = atob(b64);
        const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        result = new Blob([buf], { type: "image/jpeg" });
      }
    } catch { /* give up */ }
    try { bmp.close(); } catch { /* noop */ }
    return result;
  };
  if (wk && workerFails < 2) {
    const res = await new Promise<Blob | null>((resolve) => {
      const to = setTimeout(() => { wk.onmessage = null; resolve(null); }, 2500);
      wk.onmessage = async (ev: MessageEvent) => {
        const d = ev.data as { ok?: boolean; blob?: Blob };
        if (d && d.ok) {
          const png = d.blob!;
          // re-encode PNG stages via main-thread offscreen to JPEG (simplest reliable path)
          const img = await createImageBitmap(png);
          const oc = new OffscreenCanvas(w, h);
          const ctx = oc.getContext("2d")!;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0);
          const jpg = await oc.convertToBlob({ type: "image/jpeg", quality: 0.95 });
          clearTimeout(to);
          resolve(jpg);
        } else { workerFails++; resolve(null); }
      };
      wk.postMessage({ cmd: "encode", bitmap: bmp, w, h }, [bmp]);
    });
    if (res) return res;
  }
  return sendJpeg();
}

export async function encodeCanvasToPngDataUrl(source: CanvasImageSource, w: number, h: number): Promise<string | null> {
  const blob = await encodeCanvasToPngBlob(source, w, h);
  if (!blob) return null;
  return blobToDataUrl(blob);
}
