import { cpSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const root = process.cwd();
const src = join(root, "node_modules/@n6k.io/db/wasm/v1.4.4/wasm_mvp");
const targets = ["wasm_mvp", "wasm_eh"];

if (!existsSync(src)) {
  console.warn(`Skipping wasm copy: ${src} not found`);
  process.exit(0);
}

for (const variant of targets) {
  const dest = join(root, "public/v1.4.4", variant);
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true });
  console.log(`Copied wasm extensions to public/v1.4.4/${variant}`);
}
