import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import svgr from "vite-plugin-svgr";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), svgr(), tsconfigPaths(), tailwindcss()],
  build: {
    sourcemap: true,
    outDir: "dist",
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return;
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id))
            return "react";
          if (id.includes("node_modules/@mui/")) return "mui";
          if (id.includes("node_modules/@schedule-x/")) return "schedulex";
          if (
            /node_modules\/(motion|framer-motion|motion-dom|motion-utils)\//.test(
              id,
            )
          )
            return "motion";
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
