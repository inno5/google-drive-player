import { globalIgnores } from "eslint/config";
import {
  defineConfigWithVueTs,
  vueTsConfigs,
} from "@vue/eslint-config-typescript";
import pluginVue from "eslint-plugin-vue";
import pluginVitest from "@vitest/eslint-plugin";
import skipFormatting from "@vue/eslint-config-prettier/skip-formatting";

// 依存の向き: app → features → shared（docs/02-rebuild-policy.md）
const deepFeatureImport = {
  group: ["@/features/*/*"],
  message:
    "他の feature の内部ファイルは import しない。@/features/<name>（index.ts）経由で使う。feature の内側では相対パスで import する。",
};

export default defineConfigWithVueTs(
  { name: "app/files-to-lint", files: ["**/*.{ts,mts,tsx,vue}"] },
  globalIgnores(["**/dist/**", "**/coverage/**", "**/node_modules/**"]),
  pluginVue.configs["flat/recommended"],
  vueTsConfigs.recommended,
  {
    name: "app/unused-vars",
    files: ["**/*.{ts,mts,tsx,vue}"],
    rules: {
      // 使わないが、型や役割を分かりやすくするために書く引数・変数は _ で始める
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    ...pluginVitest.configs.recommended,
    name: "app/vitest",
    files: ["src/**/*.spec.ts"],
  },
  {
    name: "app/import-boundaries",
    files: ["src/**/*.{ts,vue}"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [deepFeatureImport] }],
    },
  },
  {
    name: "app/features-do-not-import-app",
    files: ["src/features/**/*.{ts,vue}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            deepFeatureImport,
            {
              group: ["@/app", "@/app/*"],
              message: "feature は app 層を import しない。",
            },
          ],
        },
      ],
    },
  },
  {
    name: "app/shared-is-independent",
    files: ["src/shared/**/*.{ts,vue}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/features", "@/features/*", "@/app", "@/app/*"],
              message: "shared は features / app を import しない。",
            },
          ],
        },
      ],
    },
  },
  skipFormatting,
);
