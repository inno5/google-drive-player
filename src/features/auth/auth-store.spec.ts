import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthClient, AuthSnapshot } from "./auth-client";
import { useAuthStore } from "./auth-store";
import { AuthExpiredError, AuthRequiredError } from "./errors";
import { AUTH_TOKEN_STORAGE_KEY, saveToken } from "./token-storage";

const HOUR = 60 * 60 * 1000;

interface FakeClient extends AuthClient {
  state: AuthSnapshot;
  fire(): void;
}

function fakeClient(initial?: Partial<AuthSnapshot>): FakeClient {
  let listener: () => void = () => undefined;
  const client: FakeClient = {
    state: {
      signedIn: false,
      accessToken: "",
      expiresAt: 0,
      ...initial,
    },
    init: vi.fn(() => Promise.resolve()),
    snapshot: () => client.state,
    onChange: (l) => {
      listener = l;
    },
    signIn: vi.fn(() => Promise.resolve()),
    signOut: vi.fn(() => {
      client.state = { signedIn: false, accessToken: "", expiresAt: 0 };
      return Promise.resolve();
    }),
    reloadToken: vi.fn(() => Promise.resolve()),
    setToken: vi.fn(),
    renderSignInButton: vi.fn(),
    fire: () => {
      listener();
    },
  };
  return client;
}

function storeWithData(): void {
  localStorage.setItem("gdp:playlist", "[1,2,3]");
  localStorage.setItem("gdp:settings", "{}");
}

function expectDataKept(): void {
  expect(localStorage.getItem("gdp:playlist")).toBe("[1,2,3]");
  expect(localStorage.getItem("gdp:settings")).toBe("{}");
}

describe("auth store", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("init 前は unknown", () => {
    expect(useAuthStore().status).toBe("unknown");
  });

  it("gapi がサインイン済みなら signedIn にしてトークンを保存する", async () => {
    const expiresAt = Date.now() + HOUR;
    const auth = useAuthStore();
    await auth.init(
      fakeClient({ signedIn: true, accessToken: "abc", expiresAt }),
    );
    expect(auth.status).toBe("signedIn");
    expect(auth.accessToken).toBe("abc");
    expect(auth.restoredFromStorage).toBe(false);
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toContain("abc");
  });

  it("gapi が未サインインでも、期限内の保存トークンで復元する", async () => {
    storeWithData();
    saveToken({ accessToken: "saved", expiresAt: Date.now() + HOUR });
    const client = fakeClient();
    const auth = useAuthStore();
    await auth.init(client);
    expect(auth.status).toBe("signedIn");
    expect(auth.restoredFromStorage).toBe(true);
    expect(auth.gapiSignedIn).toBe(false);
    expect(client.setToken).toHaveBeenCalledWith("saved");
    expectDataKept();
  });

  it("未サインインと判定されても保存データを消さない", async () => {
    storeWithData();
    const auth = useAuthStore();
    await auth.init(fakeClient());
    expect(auth.status).toBe("signedOut");
    expectDataKept();
  });

  it("期限切れの保存トークンでは復元しない（データは残る）", async () => {
    storeWithData();
    saveToken({ accessToken: "old", expiresAt: Date.now() + 1000 });
    const auth = useAuthStore();
    await auth.init(fakeClient());
    expect(auth.status).toBe("signedOut");
    expectDataKept();
  });

  it("初期化に失敗しても保存トークンがなければ signedOut、エラーを持つ", async () => {
    storeWithData();
    const client = fakeClient();
    client.init = vi.fn(() => Promise.reject(new Error("boom")));
    const auth = useAuthStore();
    await auth.init(client);
    expect(auth.status).toBe("signedOut");
    expect(auth.error).toBe("boom");
    expectDataKept();
  });

  it("初期化に失敗しても保存トークンが有効ならサインイン状態", async () => {
    saveToken({ accessToken: "saved", expiresAt: Date.now() + HOUR });
    const client = fakeClient();
    client.init = vi.fn(() => Promise.reject({ error: "idpiframe_failed" }));
    const auth = useAuthStore();
    await auth.init(client);
    expect(auth.status).toBe("signedIn");
    expect(auth.error).toBe("idpiframe_failed");
  });

  it("init は 2 回目以降、最初の結果を返す", async () => {
    const client = fakeClient();
    const auth = useAuthStore();
    await auth.init(client);
    await auth.init(fakeClient());
    expect(client.init).toHaveBeenCalledTimes(1);
  });

  it("whenReady は init の完了を待つ", async () => {
    const auth = useAuthStore();
    let resolveInit: () => void = () => undefined;
    const client = fakeClient();
    client.init = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveInit = resolve;
        }),
    );
    const initDone = auth.init(client);
    let ready = false;
    void auth.whenReady().then(() => {
      ready = true;
    });
    await Promise.resolve();
    expect(ready).toBe(false);
    resolveInit();
    await initDone;
    await auth.whenReady();
    expect(auth.status).not.toBe("unknown");
  });

  it("onChange でサインイン・サインアウトが反映される", async () => {
    const client = fakeClient();
    const auth = useAuthStore();
    await auth.init(client);
    expect(auth.status).toBe("signedOut");

    client.state = {
      signedIn: true,
      accessToken: "new",
      expiresAt: Date.now() + HOUR,
    };
    client.fire();
    expect(auth.status).toBe("signedIn");
    expect(auth.accessToken).toBe("new");
  });

  it("signOut は認証トークンだけを消し、他のデータは残す", async () => {
    storeWithData();
    const client = fakeClient({
      signedIn: true,
      accessToken: "abc",
      expiresAt: Date.now() + HOUR,
    });
    const auth = useAuthStore();
    await auth.init(client);
    await auth.signOut();
    expect(client.signOut).toHaveBeenCalled();
    expect(auth.status).toBe("signedOut");
    expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
    expectDataKept();
  });

  it("signIn の失敗は error に入る", async () => {
    const client = fakeClient();
    client.signIn = vi.fn(() => Promise.reject(new Error("denied")));
    const auth = useAuthStore();
    await auth.init(client);
    await auth.signIn();
    expect(auth.error).toBe("denied");
    expect(auth.status).toBe("signedOut");
  });

  describe("getValidToken", () => {
    it("有効なトークンはそのまま返す", async () => {
      const client = fakeClient({
        signedIn: true,
        accessToken: "abc",
        expiresAt: Date.now() + HOUR,
      });
      const auth = useAuthStore();
      await auth.init(client);
      await expect(auth.getValidToken()).resolves.toBe("abc");
      expect(client.reloadToken).not.toHaveBeenCalled();
    });

    it("未サインインなら AuthRequiredError", async () => {
      const auth = useAuthStore();
      await auth.init(fakeClient());
      await expect(auth.getValidToken()).rejects.toBeInstanceOf(
        AuthRequiredError,
      );
    });

    it("期限が近ければ reloadToken で更新する", async () => {
      const client = fakeClient({
        signedIn: true,
        accessToken: "old",
        expiresAt: Date.now() + 60 * 1000,
      });
      client.reloadToken = vi.fn(() => {
        client.state = {
          signedIn: true,
          accessToken: "fresh",
          expiresAt: Date.now() + HOUR,
        };
        return Promise.resolve();
      });
      const auth = useAuthStore();
      await auth.init(client);
      await expect(auth.getValidToken()).resolves.toBe("fresh");
    });

    it("更新できなければ signedOut にして AuthExpiredError", async () => {
      storeWithData();
      const client = fakeClient({
        signedIn: true,
        accessToken: "old",
        expiresAt: Date.now() + 60 * 1000,
      });
      client.reloadToken = vi.fn(() => Promise.reject(new Error("x")));
      const auth = useAuthStore();
      await auth.init(client);
      await expect(auth.getValidToken()).rejects.toBeInstanceOf(
        AuthExpiredError,
      );
      expect(auth.status).toBe("signedOut");
      expect(localStorage.getItem(AUTH_TOKEN_STORAGE_KEY)).toBeNull();
      expectDataKept();
    });

    it("保存トークンで復元した状態が期限切れ間近なら AuthExpiredError", async () => {
      saveToken({
        accessToken: "saved",
        expiresAt: Date.now() + 6 * 60 * 1000,
      });
      const client = fakeClient();
      const auth = useAuthStore();
      await auth.init(client);
      expect(auth.status).toBe("signedIn");
      vi.useFakeTimers();
      vi.setSystemTime(Date.now() + 2 * 60 * 1000);
      try {
        await expect(auth.getValidToken()).rejects.toBeInstanceOf(
          AuthExpiredError,
        );
      } finally {
        vi.useRealTimers();
      }
      expect(client.reloadToken).not.toHaveBeenCalled();
    });
  });
});
