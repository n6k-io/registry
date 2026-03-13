import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import { execSync } from "child_process";
import { resolve } from "path";

function extractDocs() {
  return {
    name: "extract-docs",
    hooks: {
      "astro:config:setup": () => {
        execSync("bun scripts/extract-docs.ts", { stdio: "inherit" });
      },
    },
  };
}

export default defineConfig({
  srcDir: "./site",
  outDir: "./dist",
  integrations: [extractDocs(), react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": resolve("src"),
      },
    },
    optimizeDeps: {
      exclude: ["@duckdb/duckdb-wasm"],
    },
  },
});
