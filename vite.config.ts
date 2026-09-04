import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: "demo",
  plugins: [react(), tailwindcss()],
  define: {
    "process.env": {},
    process: { env: {} },
  },
  resolve: {
    alias: {
      "next/link": path.resolve(__dirname, "demo/next-link-shim.tsx"),
    },
  },
  server: {
    port: 5173,
  },
});
