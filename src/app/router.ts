import { watch } from "vue";
import {
  createRouter,
  createWebHistory,
  type Router,
  type RouterHistory,
} from "vue-router";
import { SignInPage, type useAuthStore } from "@/features/auth";
import { DebugPage } from "@/features/debug";
import { LibraryPage } from "@/features/library";

declare module "vue-router" {
  interface RouteMeta {
    /** true のルートは未サインインでも開ける */
    public?: boolean;
  }
}

type AuthStore = ReturnType<typeof useAuthStore>;

export function createAppRouter(
  auth: AuthStore,
  history: RouterHistory = createWebHistory(),
): Router {
  const router = createRouter({
    history,
    routes: [
      { path: "/", name: "home", component: LibraryPage },
      { path: "/folders/:id", name: "folder", component: LibraryPage },
      { path: "/search/:q", name: "search", component: LibraryPage },
      {
        path: "/signin",
        name: "signin",
        component: SignInPage,
        meta: { public: true },
      },
      {
        path: "/debug",
        name: "debug",
        component: DebugPage,
        meta: { public: true },
      },
      {
        path: "/practice",
        name: "practice",
        // Worker と SoundTouch は、開いたときに読み込む
        component: () => import("./PracticeRoute.vue"),
      },
      { path: "/:pathMatch(.*)*", redirect: { name: "home" } },
    ],
  });

  router.beforeEach(async (to) => {
    await auth.whenReady();
    if (!to.meta.public && auth.status !== "signedIn") {
      return { name: "signin" };
    }
    if (to.name === "signin" && auth.status === "signedIn") {
      return { name: "home" };
    }
    return true;
  });

  return router;
}

/** 認証状態が変わったとき（サインイン・サインアウト）に画面を切り替える。 */
export function setupAuthRedirect(router: Router, auth: AuthStore): void {
  watch(
    () => auth.status,
    (status) => {
      const current = router.currentRoute.value;
      if (status === "signedIn" && current.name === "signin") {
        void router.replace({ name: "home" });
      } else if (status === "signedOut" && !current.meta.public) {
        void router.replace({ name: "signin" });
      }
    },
  );
}
