import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";

export default defineConfig({
  srcDir: "./site",
  outDir: "./dist",
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
