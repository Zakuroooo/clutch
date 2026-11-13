import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
  test: {
    include: ["{app,components,lib,scripts,evals}/**/*.test.{ts,tsx}"],
    environment: "node",
    env: { LLM_PROVIDER: "none" },
  },
});
