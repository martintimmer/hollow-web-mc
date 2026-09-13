/**
 * @file src/sim/imageCompressor.ts
 * Image Pre-Compressor & Downscaler (D15).
 * Downscales multi-megabyte reference photos to 768px for sub-3-second Gemini vision turnaround.
 */

/**
 * Resizes an image File or Blob in the browser to max dimensions (default: 768x768)
 * and returns a lightweight compressed JPEG base64 or Blob.
 */
export async function downscaleImage(
  file: File | Blob,
  maxDimension = 768,
  quality = 0.85
): Promise<{ dataUrl: string; blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Failed to create 2D canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve({ dataUrl, blob, width, height });
            } else {
              reject(new Error("Failed to convert canvas to blob"));
            }
          },
          "image/jpeg",
          quality
        );
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
