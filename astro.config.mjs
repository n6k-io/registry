import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  srcDir: "./site",
  outDir: "./dist",
  vite: {
    plugins: [tailwindcss()],
  },
});
