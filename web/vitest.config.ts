import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // .mjs para probar los scripts Node de la comunidad (scripts/grupos/*),
    // que son JS puro fuera del typecheck de la app.
    include: ["tests/**/*.test.ts", "tests/**/*.test.mjs"],
  },
});
