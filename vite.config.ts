import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// GitHub Pages project site: https://<user>.github.io/react-orchestrate/
const base = process.env.GITHUB_PAGES === "true" ? "/react-orchestrate/" : "/";

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: "demo-dist",
  },
});
