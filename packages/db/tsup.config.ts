import { defineConfig } from "tsup";

// Bundle the public entry; migrate/seed run from source via tsx.
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
});
