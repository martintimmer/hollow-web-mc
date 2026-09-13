import { defineConfig } from "vite";
import path from "path";

// Builds the standalone seed/biome visualizer into dist/seed.html alongside the
// main React app (emptyOutDir: false so the main build is preserved).
export default defineConfig({
  root: "seed-page",
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
      input: path.resolve(__dirname, "seed-page/seed.html"),
    },
    assetsDir: "assets/seed",
  },
});