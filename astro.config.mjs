import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import { execSync } from "child_process";
import { readFileSync } from "fs";
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

function bundleN6kWorkers() {
  const workerEntries = {
    "_n6k/workers/fetch-worker": resolve("node_modules/@n6k.io/db/src/fetch-worker.js"),
    "_n6k/workers/n6k-duckdb-worker": resolve("node_modules/@n6k.io/db/src/n6k-duckdb-worker.js"),
  };

  return {
    name: "bundle-n6k-workers",
    hooks: {
      "astro:config:setup": ({ updateConfig }) => {
        updateConfig({
          vite: {
            build: {
              rollupOptions: {
                input: workerEntries,
              },
            },
            plugins: [
              {
                name: "n6k-workers-dev",
                configureServer(server) {
                  // In dev, serve the worker source files at their expected URLs
                  for (const [urlPath, filePath] of Object.entries(workerEntries)) {
                    server.middlewares.use("/" + urlPath + ".js", (_req, res) => {
                      res.setHeader("Content-Type", "application/javascript");
                      res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
                      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
                      res.end(readFileSync(filePath, "utf8"));
                    });
                  }
                },
              },
            ],
          },
        });
      },
    },
  };
}

export default defineConfig({
  srcDir: "./site",
  outDir: "./dist",
  integrations: [extractDocs(), copyWasmExtensions(), bundleN6kWorkers(), react()],
  vite: {
    plugins: [tailwindcss()],
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
