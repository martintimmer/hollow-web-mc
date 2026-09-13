import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

const API_TARGET = process.env.WEBMC_API_URL || "http://127.0.0.1:5401"

const proxy = {
  "/api": { target: API_TARGET, changeOrigin: true },
  "/ws": { target: API_TARGET, changeOrigin: true, ws: true },
}

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  server: {
    host: "127.0.0.1",
    port: 3000,
    proxy,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    proxy,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
