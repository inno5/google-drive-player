import { createPinia } from "pinia";
import { createApp } from "vue";
import { createGapiAuthClient, useAuthStore } from "@/features/auth";
import { recordBoot, updateLatestBoot } from "@/features/debug";
import App from "./App.vue";
import { readConfig } from "./config";
import { createAppRouter, setupAuthRedirect } from "./router";
import "./styles/base.css";

const BOOT_SETTLE_MS = 5000;

async function bootstrap(): Promise<void> {
  recordBoot();

  let config;
  try {
    config = readConfig();
  } catch (e) {
    const el = document.getElementById("app");
    if (el) el.textContent = e instanceof Error ? e.message : String(e);
    return;
  }

  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);

  const auth = useAuthStore();
  // ルーターより先に初期化を始める（ガードが whenReady() で待つ）
  const initDone = auth.init(
    createGapiAuthClient({
      clientId: config.googleClientId,
      apiKey: config.googleApiKey,
    }),
  );

  const router = createAppRouter(auth);
  setupAuthRedirect(router, auth);
  app.use(router);
  app.mount("#app");

  await initDone;
  updateLatestBoot({
    gapiSignedIn: auth.gapiSignedIn,
    restoredFromStorage: auth.restoredFromStorage,
    statusAfterInit: auth.status,
  });
  setTimeout(() => {
    updateLatestBoot({ statusAfter5s: auth.status });
  }, BOOT_SETTLE_MS);
}

void bootstrap();
