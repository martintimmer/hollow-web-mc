import { defineConfig } from "vite";
import path from "path";

// Builds the standalone blocks/entities catalog into dist/blocks.html alongside the
// main React app and /seed.html (emptyOutDir: false preserves the other builds).
export default defineConfig({
  root: "block-page",
  base: "./",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "../dist",
    emptyOutDir: false,
    rollupOptions: {
      input: {
        blocks: path.resolve(__dirname, "block-page/blocks.html"),
        editor: path.resolve(__dirname, "block-page/editor.html"),
      },
    },
    assetsDir: "assets/blocks",
  },
});