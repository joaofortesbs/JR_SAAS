import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig, loadEnv } from "vite";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "");
  // VITE_* works on Netlify. Replit's existing public names remain compatible.
  // Only these public values are exposed; never inject the full environment.
  const url = env.VITE_SUPABASE_URL?.trim() || env.SUPABASE_URL || "";
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()
    || env.VITE_SUPABASE_ANON_KEY?.trim() || env.SUPABASE_PUBLISHABLE_KEY || "";
  return {
  envDir: import.meta.dirname,
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(url),
    "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(key),
  },
  plugins: [react(), tailwindcss()],
  resolve: { alias: {
    "@": path.resolve(import.meta.dirname, "client/src"),
    "@shared": path.resolve(import.meta.dirname, "shared"),
    "@assets": path.resolve(import.meta.dirname, "attached_assets"),
  } },
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client/public"),
  build: { outDir: path.resolve(import.meta.dirname, "dist/public"), emptyOutDir: true },
  server: { host: true, allowedHosts: true, fs: { strict: true, deny: ["**/.*"] } },
  };
});