import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
  server: { proxy: { "/api": "http://127.0.0.1:8787" } },
  build: { outDir: "dist", sourcemap: false },
}));
