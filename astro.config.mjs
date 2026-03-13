import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import { execSync } from "child_process";
import { resolve } from "path";
import { build as viteBuild } from "vite";

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

function copyWasmExtensions() {
  return {
    name: "copy-wasm-extensions",
    hooks: {
      "astro:config:setup": () => {
        execSync("bun scripts/copy-wasm-extensions.ts", { stdio: "inherit" });
      },
    },
  };
}

function n6kWorkerPlugin() {
  let isBuild = false;

  return {
    name: "n6k-worker-iife",
    enforce: "pre",
    configResolved(config) {
      isBuild = config.command === "build";
    },
    async load(id) {
      if (!id.includes("/workers/") || !id.endsWith("?url")) return;
      if (!id.includes("@n6k.io/db") && !id.includes("n6k")) return;

      const filePath = id.replace(/\?url$/, "");

      const result = await viteBuild({
        configFile: false,
        logLevel: "silent",
        build: {
          write: false,
          lib: {
            entry: filePath,
            name: "worker",
            formats: ["iife"],
          },
          rollupOptions: {
            output: { inlineDynamicImports: true },
          },
        },
      });

      const output = Array.isArray(result) ? result[0] : result;
      const code = output.output[0].code;

      if (isBuild) {
        const fileName = filePath.split("/").pop().replace(/\.ts$/, ".js");
        const refId = this.emitFile({
          type: "asset",
          name: fileName,
          source: code,
        });
        return `export default import.meta.ROLLUP_FILE_URL_${refId}`;
      }

      return `export default URL.createObjectURL(new Blob([${JSON.stringify(code)}], { type: "application/javascript" }))`;
    },
  };
}

export default defineConfig({
  srcDir: "./site",
  outDir: "./dist",
  integrations: [extractDocs(), copyWasmExtensions(), react()],
  vite: {
    plugins: [tailwindcss(), n6kWorkerPlugin()],
    resolve: {
      alias: {
        "@": resolve("src"),
      },
    },
    optimizeDeps: {
      exclude: ["@duckdb/duckdb-wasm"],
      include: ["handlebars"],
    },
  },
});
