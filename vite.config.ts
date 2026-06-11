import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import svgr from "vite-plugin-svgr";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), svgr(), tsconfigPaths(), tailwindcss()],
  css: {
    lightningcss: {
      // flatpickr's CSS contains legacy IE `@media (min-width:0\0)` hacks
      errorRecovery: true,
    },
  },
  build: {
    sourcemap: true,
    outDir: "dist",
  },
  server: {
    port: 3000,
    open: true,
  },
});
