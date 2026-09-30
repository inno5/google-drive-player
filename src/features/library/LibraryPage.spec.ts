import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h } from "vue";
import { RouterView, createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDriveStore, type DriveApi } from "@/features/drive";
import LibraryPage from "./LibraryPage.vue";

const SortableListStub = defineComponent({
  props: { modelValue: { type: Array, default: () => [] } },
  setup(props, { slots }) {
    return () =>
      h(
        "div",
        (props.modelValue as { id: string }[]).flatMap(
          (item, index) => slots.default?.({ item, index }) ?? [],
        ),
      );
  },
});

const folderItem = {
  id: "f1",
  name: "Album",
  mimeType: "application/vnd.google-apps.folder",
  size: null,
  modifiedTime: "",
  parents: [],
};

async function setup(initialPath = "/") {
  localStorage.clear();
  setActivePinia(createPinia());
  const api = {
    listFolder: vi.fn<DriveApi["listFolder"]>(() =>
      Promise.resolve({ items: [folderItem], nextPageToken: null }),
    ),
    search: vi.fn<DriveApi["search"]>(() =>
      Promise.resolve({ items: [], nextPageToken: null }),
    ),
    listChildren: vi.fn<DriveApi["listChildren"]>(() =>
      Promise.resolve({ items: [], nextPageToken: null }),
    ),
  } satisfies DriveApi;
  useDriveStore().setApi(api);

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", name: "home", component: LibraryPage },
      { path: "/folders/:id", name: "folder", component: LibraryPage },
      { path: "/search/:q", name: "search", component: LibraryPage },
      {
        path: "/signin",
        name: "signin",
        component: { render: () => h("p") },
      },
    ],
  });
  await router.push(initialPath);
  const wrapper = mount(defineComponent({ render: () => h(RouterView) }), {
    global: {
      plugins: [router],
      stubs: { SortableList: SortableListStub },
    },
  });
  await flushPromises();
  return { api, router, wrapper };
}

describe("LibraryPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("/ ではルートフォルダを読む", async () => {
    const { api } = await setup("/");
    expect(api.listFolder).toHaveBeenCalledWith("root", expect.anything());
  });

  it("/folders/:id ではそのフォルダを読む", async () => {
    const { api } = await setup("/folders/abc");
    expect(api.listFolder).toHaveBeenCalledWith("abc", expect.anything());
  });

  it("/search/:q では検索する。日本語も復号される", async () => {
    const { api } = await setup(`/search/${encodeURIComponent("夏 祭り")}`);
    expect(api.search).toHaveBeenCalledWith("夏 祭り", expect.anything());
  });

  it("ルートが変わると読み直す（戻る操作を含む）", async () => {
    const { api, router } = await setup("/");
    await router.push("/folders/x");
    await flushPromises();
    expect(api.listFolder).toHaveBeenLastCalledWith("x", expect.anything());
    router.back();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await flushPromises();
    expect(api.listFolder).toHaveBeenLastCalledWith("root", expect.anything());
  });

  it("フォルダのダブルクリックで /folders/:id へ移動する", async () => {
    const { router, wrapper } = await setup("/");
    const row = wrapper.get(".track-row");
    await row.trigger("click");
    await row.trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe("/folders/f1");
  });

  it("検索欄の Enter で /search/:q へ、空なら / へ移動する", async () => {
    const { router, wrapper } = await setup("/");
    const input = wrapper.get("input");
    await input.setValue("foo");
    await input.trigger("keydown", { key: "Enter" });
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe("/search/foo");

    await input.setValue("");
    await input.trigger("keydown", { key: "Enter" });
    await flushPromises();
    expect(router.currentRoute.value.fullPath).toBe("/");
  });

  it("サインイン画面へ移るときは読み込まない", async () => {
    const { api, router } = await setup("/");
    const calls = api.listFolder.mock.calls.length;
    await router.push("/signin");
    await flushPromises();
    expect(api.listFolder.mock.calls).toHaveLength(calls);
  });

  it("タブで表示を切り替えられる（隠すだけで一覧は残る）", async () => {
    const { wrapper } = await setup("/");
    const drive = wrapper.get(".pane-drive");
    const playlist = wrapper.get(".pane-playlist");
    expect(wrapper.get(".panes").classes()).toContain("two-column");

    await wrapper.get(".tab-playlist").trigger("click");
    expect(drive.attributes("style")).toContain("display: none");
    expect(wrapper.get(".panes").classes()).not.toContain("two-column");
    expect(wrapper.findAll(".track-row")).toHaveLength(1);

    await wrapper.get(".tab-playlist").trigger("click");
    expect(playlist.attributes("style") ?? "").not.toContain("display: none");
    expect(wrapper.get(".panes").classes()).toContain("two-column");
  });
});
