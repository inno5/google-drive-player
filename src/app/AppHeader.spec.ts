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

describe("AppHeader のトグルボタン", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("練習ボタンは「?」の隣にあり、サインイン時だけ出る", async () => {
    const { wrapper } = await setup(true);
    const labels = wrapper
      .findAll("button.icon-link")
      .map((b) => b.attributes("aria-label"));
    expect(labels).toEqual(["練習ビュー", "デバッグ情報"]);
    const signedOut = await setup(false);
    const outLabels = signedOut.wrapper
      .findAll("button.icon-link")
      .map((b) => b.attributes("aria-label"));
    expect(outLabels).toEqual(["デバッグ情報"]);
  });

  it("練習ビューへ移り、もう一度押すと直前のメインビューへ戻る", async () => {
    const { wrapper, router } = await setup();
    await wrapper.get("[aria-label=練習ビュー]").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("practice");
    await wrapper.get("[aria-label=練習ビュー]").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe("/folders/abc");
  });

  it("デバッグも同じようにトグルする", async () => {
    const { wrapper, router } = await setup();
    await wrapper.get("[aria-label=デバッグ情報]").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("debug");
    await wrapper.get("[aria-label=デバッグ情報]").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe("/folders/abc");
  });

  it("練習ビューからデバッグへ移っても、戻り先はメインビューのまま", async () => {
    const { wrapper, router } = await setup();
    await wrapper.get("[aria-label=練習ビュー]").trigger("click");
    await flushPromises();
    await wrapper.get("[aria-label=デバッグ情報]").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("debug");
    await wrapper.get("[aria-label=デバッグ情報]").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe("/folders/abc");
  });
});
