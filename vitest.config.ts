import { configDefaults, defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "happy-dom",
      include: ["src/**/*.spec.ts"],
      exclude: [...configDefaults.exclude, "tests/e2e/**"],
    },
  }),
);
