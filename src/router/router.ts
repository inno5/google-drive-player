import Vue from "vue";
import VueRouter, { RouteConfig } from "vue-router";
import SignInPage from "@/pages/SignInPage.vue";
import MainPage from "@/pages/MainPage.vue";
import { appState } from "@/state/app-state";
Vue.use(VueRouter);

const routes: Array<RouteConfig> = [
  {
    path: "/",
    name: "home",
    component: MainPage,
  },
  {
    path: "/d/:id",
    name: "home-directory",
    component: MainPage,
  },
  {
    path: "/search/:searchWord",
    name: "home-search",
    component: MainPage,
  },
  {
    path: "/signin",
    name: "signin",
    component: SignInPage,
    meta: {
      isPublic: true,
    },
  },
  {
    path: "*",
    redirect: { path: "/signin" },
  },
];

const router = new VueRouter({
  mode: "history",
  base: process.env.BASE_URL,
  routes,
});

export default router;

router.beforeEach((to, from, next) => {
  const isSignedIn = appState.isSignedIn;

  if (to.name?.indexOf("home") === 0) {
    if (isSignedIn) {
      next();
    } else {
      next({ path: "/signin" });
    }
  } else if (to.name == "signin") {
    if (isSignedIn) {
      next({ path: "/" });
    } else {
      next();
    }
  }
});
