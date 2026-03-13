import { copyWasmExtensions } from "@n6k.io/db/copy-wasm-extensions";
import { join } from "path";

copyWasmExtensions(join(process.cwd(), "public"));
