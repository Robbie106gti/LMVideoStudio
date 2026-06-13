import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const hostPort = env.LMVS_HOST_PORT || "17170";
  const defaultHost = `http://127.0.0.1:${hostPort}`;

  return {
    plugins: [react()],
    // Relative asset URLs are required for Tauri's bundled webview (absolute /assets/… fails to load).
    base: "./",
    root: ".",
    build: {
      outDir: "dist",
      emptyOutDir: true,
    },
    define: {
      "import.meta.env.VITE_LMVS_HOST": JSON.stringify(
        env.VITE_LMVS_HOST || defaultHost
      ),
    },
    server: {
      port: 1420,
      strictPort: true,
    },
  };
});