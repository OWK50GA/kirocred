// tsup.config.ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  dts: true,
  format: ["cjs", "esm"],
  clean: true,
  sourcemap: true,
  minify: false,
  target: "es2020",
  esbuildOptions(options) {
    // mark heavy libs as external so consumer supplies them
    options.external = options.external || [];
    options.external.push("starknet");
  },
});
