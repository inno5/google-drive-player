import { createPinia, setActivePinia } from "pinia";
import { createMemoryHistory } from "vue-router";
import { beforeEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import {
  useAuthStore,
  type AuthClient,
  type AuthSnapshot,
} from "@/features/auth";
import { createAppRouter, setupAuthRedirect } from "./router";

const HOUR = 60 * 60 * 1000;

interface FakeClient extends AuthClient {
  state: AuthSnapshot;
  fire(): void;
}

function fakeClient(initial?: Partial<AuthSnapshot>): FakeClient {
  let listener: () => void = () => undefined;
  const client: FakeClient = {
    state: { signedIn: false, accessToken: "", expiresAt: 0, ...initial },
    fire: () => {
      listener();
    },
    init: () => Promise.resolve(),
    snapshot: () => client.state,
    onChange: (l) => {
      listener = l;
    },
    signIn: () => Promise.resolve(),
    signOut: () => {
      client.state = { signedIn: false, accessToken: "", expiresAt: 0 };
      return Promise.resolve();
    },
    reloadToken: () => Promise.resolve(),
    setToken: () => undefined,
    renderSignInButton: () => undefined,
  };
  return client;
}

describe("router", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("初期化が終わるまでガードは待つ", async () => {
    const auth = useAuthStore();
    let resolveInit: () => void = () => undefined;
    const client = fakeClient({
      signedIn: true,
      accessToken: "t",
      expiresAt: Date.now() + HOUR,
    });
    client.init = () =>
      new Promise<void>((resolve) => {
        resolveInit = resolve;
      });
    const initDone = auth.init(client);
    const router = createAppRouter(auth, createMemoryHistory());

    let navigated = false;
    const navigation = router.push("/").then(() => {
      navigated = true;
    });
    await nextTick();
    expect(navigated).toBe(false);

    resolveInit();
    await initDone;
    await navigation;
    expect(router.currentRoute.value.name).toBe("home");
  });

  it("未サインインなら /signin へ", async () => {
    const auth = useAuthStore();
    await auth.init(fakeClient());
    const router = createAppRouter(auth, createMemoryHistory());
    await router.push("/");
    expect(router.currentRoute.value.name).toBe("signin");
  });

  it("public ルート（/debug）は未サインインでも開ける", async () => {
    const auth = useAuthStore();
    await auth.init(fakeClient());
    const router = createAppRouter(auth, createMemoryHistory());
    await router.push("/debug");
    expect(router.currentRoute.value.name).toBe("debug");
  });

  it("サインイン済みで /signin を開くと / へ", async () => {
    const auth = useAuthStore();
    await auth.init(
      fakeClient({
        signedIn: true,
        accessToken: "t",
        expiresAt: Date.now() + HOUR,
      }),
    );
    const router = createAppRouter(auth, createMemoryHistory());
    await router.push("/signin");
    expect(router.currentRoute.value.name).toBe("home");
  });

  it("未知の URL は home へ（未サインインなら signin）", async () => {
    const auth = useAuthStore();
    await auth.init(fakeClient());
    const router = createAppRouter(auth, createMemoryHistory());
    await router.push("/no/such/page");
    expect(router.currentRoute.value.name).toBe("signin");
  });

  it("setupAuthRedirect: サインインで home、サインアウトで signin に切り替わる", async () => {
    const auth = useAuthStore();
    const client = fakeClient();
    await auth.init(client);
    const router = createAppRouter(auth, createMemoryHistory());
    setupAuthRedirect(router, auth);
    await router.push("/");
    expect(router.currentRoute.value.name).toBe("signin");

    client.state = {
      signedIn: true,
      accessToken: "t",
      expiresAt: Date.now() + HOUR,
    };
    client.fire();
    await nextTick();
    await router.isReady();
    await new Promise((r) => setTimeout(r, 0));
    expect(router.currentRoute.value.name).toBe("home");

    await auth.signOut();
    await nextTick();
    await new Promise((r) => setTimeout(r, 0));
    expect(router.currentRoute.value.name).toBe("signin");
  });
});
