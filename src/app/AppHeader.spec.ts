import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it } from "vitest";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { useAuthStore } from "@/features/auth";
import AppHeader from "./AppHeader.vue";

const Blank = { template: "<div />" };

async function setup(signedIn = true) {
  setActivePinia(createPinia());
  const auth = useAuthStore();
  auth.status = signedIn ? "signedIn" : "signedOut";
  const router: Router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "home", component: Blank },
      { path: "/folders/:id", name: "folder", component: Blank },
      { path: "/search/:q", name: "search", component: Blank },
      { path: "/practice", name: "practice", component: Blank },
      { path: "/debug", name: "debug", component: Blank },
    ],
  });
  await router.push("/folders/abc");
  const wrapper = mount(AppHeader, { global: { plugins: [router] } });
  return { router, wrapper };
}

describe("AppHeader のナビゲーションボタン", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function labels(wrapper: Awaited<ReturnType<typeof setup>>["wrapper"]) {
    return wrapper
      .findAll("button.icon-link")
      .map((b) => b.attributes("aria-label"));
  }

  it("リスト・耳コピ・設定の順に並び、リストと耳コピはサインイン時だけ出る", async () => {
    const { wrapper } = await setup(true);
    expect(labels(wrapper)).toEqual(["リスト", "耳コピ", "設定・デバッグ情報"]);
    expect(wrapper.text()).toContain("queue_music");
    expect(wrapper.text()).toContain("hearing");
    expect(wrapper.text()).toContain("settings");
    // サインアウトは、ヘッダーではなくデバッグ画面にある
    expect(wrapper.text()).not.toContain("サインアウト");
    const signedOut = await setup(false);
    expect(labels(signedOut.wrapper)).toEqual(["設定・デバッグ情報"]);
  });

  it("押すとその画面へ移る。同じボタンをもう一度押しても切り替わらない", async () => {
    const { wrapper, router } = await setup();
    await wrapper.get("[aria-label=耳コピ]").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("practice");
    await wrapper.get("[aria-label=耳コピ]").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("practice");
    await wrapper.get("[aria-label=設定・デバッグ情報]").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("debug");
  });

  it("リストは、直前のメインビュー（フォルダや検索語を含む）を開く", async () => {
    const { wrapper, router } = await setup();
    await wrapper.get("[aria-label=耳コピ]").trigger("click");
    await flushPromises();
    await wrapper.get("[aria-label=リスト]").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe("/folders/abc");
    await wrapper.get("[aria-label=設定・デバッグ情報]").trigger("click");
    await flushPromises();
    await wrapper.get("[aria-label=リスト]").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe("/folders/abc");
  });

  it("今開いている画面のボタンを強調する", async () => {
    const { wrapper, router } = await setup();
    expect(wrapper.get("[aria-label=リスト]").classes()).toContain("active");
    await router.push("/practice");
    await flushPromises();
    expect(wrapper.get("[aria-label=耳コピ]").classes()).toContain("active");
    expect(wrapper.get("[aria-label=リスト]").classes()).not.toContain(
      "active",
    );
  });
});
