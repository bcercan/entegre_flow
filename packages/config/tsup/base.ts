import { defineConfig, type Options } from "tsup";

/**
 * Shared tsup preset. Shared packages emit BOTH ESM and CJS so they can be
 * consumed by the ESM web app and the CommonJS NestJS backend alike, plus .d.ts
 * for types. esbuild handles extensionless relative imports (no .js tax).
 */
export function tsupPreset(overrides: Options = {}): Options {
  return {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    sourcemap: true,
    treeshake: true,
    outDir: "dist",
    ...overrides,
  };
}

export default defineConfig(tsupPreset());
