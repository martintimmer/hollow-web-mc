import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  root: "build-page",
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
        build: path.resolve(__dirname, "build-page/build.html"),
      },
    },
    assetsDir: "assets/build",
  },
});
