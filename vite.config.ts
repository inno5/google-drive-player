import { readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url), "utf-8"),
) as { version: string };

// 開発サーバーのポートは、Google Cloud の OAuth クライアントに登録済みの
// 承認済み JavaScript 生成元（http://localhost:8081）に合わせて固定する。
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  envDir: "./env",
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: { port: 8081, strictPort: true },
  preview: { port: 8081, strictPort: true },
});
