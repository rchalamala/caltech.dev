import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    react({
      jsxImportSource: "@emotion/react",
      babel: {
        plugins: ["@emotion/babel-plugin"],
      },
    }),
    svgr(),
    tsconfigPaths(),
  ],
  build: {
    sourcemap: true,
    outDir: "dist",
  },
  server: {
    port: 3000,
    open: true,
  },
});
