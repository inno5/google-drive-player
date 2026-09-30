import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthClient } from "./auth-client";
import { useAuthStore } from "./auth-store";
import SignInPage from "./SignInPage.vue";

function fakeClient(): AuthClient {
  return {
    init: () => Promise.resolve(),
    snapshot: () => ({ signedIn: false, accessToken: "", expiresAt: 0 }),
    onChange: () => undefined,
    signIn: () => Promise.reject(new Error("popup blocked")),
    signOut: () => Promise.resolve(),
    reloadToken: () => Promise.resolve(),
    setToken: () => undefined,
    renderSignInButton: vi.fn(),
  };
}

describe("SignInPage", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("マウント時に Google のサインインボタンを描画させる", async () => {
    const client = fakeClient();
    await useAuthStore().init(client);
    const wrapper = mount(SignInPage);
    expect(client.renderSignInButton).toHaveBeenCalledTimes(1);
    const element = vi.mocked(client.renderSignInButton).mock.calls[0]?.[0];
    expect(element).toBe(wrapper.get(".signin-button").element);
  });

  it("エラーがあれば表示する", async () => {
    const auth = useAuthStore();
    await auth.init(fakeClient());
    await auth.signIn();
    const wrapper = mount(SignInPage);
    expect(wrapper.get("[role=alert]").text()).toBe("popup blocked");
  });

  it("エラーがなければ表示しない", async () => {
    await useAuthStore().init(fakeClient());
    const wrapper = mount(SignInPage);
    expect(wrapper.find("[role=alert]").exists()).toBe(false);
  });
});
