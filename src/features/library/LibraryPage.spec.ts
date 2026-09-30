import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { defineComponent, h } from "vue";
import { RouterView, createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDriveStore, type DriveApi, type DriveItem } from "@/features/drive";
import { usePlayerStore, type AudioPlayer } from "@/features/player";
import { usePlaylistStore } from "@/features/playlist";
import { useTagStore, type ReadOutcome } from "@/features/tags";
import LibraryPage from "./LibraryPage.vue";
import { SortableListStub } from "@/shared/ui/sortable-list-stub";

const folderItem = {
  id: "f1",
  name: "Album",
  mimeType: "application/vnd.google-apps.folder",
  size: null,
  modifiedTime: "",
  parents: [],
};

const songItem: DriveItem = {
  id: "s1",
  name: "song.mp3",
  mimeType: "audio/mpeg",
  size: 1,
  modifiedTime: "",
  parents: ["root"],
};

const TAGS = { artist: "Artist", title: "Song", album: "Album", track: "3" };

async function setup(
  initialPath = "/",
  options: {
    items?: DriveItem[];
    beforeMount?: () => void;
    /** タグの読み取り。省略すると「タグなし」を返す */
    readTags?: (id: string) => Promise<ReadOutcome>;
  } = {},
) {
  localStorage.clear();
  setActivePinia(createPinia());
  const api = {
    downloadFile: vi.fn<DriveApi["downloadFile"]>(),
    listFolder: vi.fn<DriveApi["listFolder"]>(() =>
      Promise.resolve({
        items: options.items ?? [folderItem],
        nextPageToken: null,
      }),
    ),
    search: vi.fn<DriveApi["search"]>(() =>
      Promise.resolve({ items: [], nextPageToken: null }),
    ),
    listChildren: vi.fn<DriveApi["listChildren"]>(() =>
      Promise.resolve({ items: [], nextPageToken: null }),
    ),
  } satisfies DriveApi;
  useDriveStore().setApi(api);
  usePlaylistStore().setApi(api);
  useTagStore().setReader(
    options.readTags ?? (() => Promise.resolve({ status: "none" })),
  );
  options.beforeMount?.();

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
    const input = wrapper.get(".pane-drive .search-input");
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

  it("フォルダの追加ボタンで、中身の曲がプレイリストに入る", async () => {
    const { api, wrapper } = await setup("/");
    api.listChildren.mockResolvedValueOnce({
      items: [
        {
          id: "s1",
          name: "song.mp3",
          mimeType: "audio/mpeg",
          size: 1,
          modifiedTime: "",
          parents: ["f1"],
        },
      ],
      nextPageToken: null,
    });
    await wrapper.get(".pane-drive .cell-ctrl").trigger("click");
    await flushPromises();
    const rows = wrapper.findAll(".pane-playlist .track-row");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.get(".name").text()).toBe("song.mp3");
  });

  it("プレイリストの Remove All で空になる", async () => {
    const { wrapper } = await setup("/");
    usePlaylistStore().items = [
      {
        id: "s1",
        name: "song.mp3",
        mimeType: "audio/mpeg",
        size: 1,
        modifiedTime: "",
        parents: [],
      },
    ];
    await flushPromises();
    expect(wrapper.findAll(".pane-playlist .track-row")).toHaveLength(1);
    await wrapper.get(".pane-playlist .clear").trigger("click");
    expect(wrapper.findAll(".pane-playlist .track-row")).toHaveLength(0);
    expect(wrapper.get(".pane-playlist .empty").text()).toBe("No data :)");
  });

  it("プレイリストの曲はタグで表示し、表示モードのボタンで切り替える。ドライブ内一覧はファイル名のまま", async () => {
    const readTags = vi.fn((_id: string) =>
      Promise.resolve<ReadOutcome>({ status: "ok", tags: TAGS }),
    );
    const { wrapper } = await setup("/", {
      items: [songItem],
      readTags,
      beforeMount: () => {
        usePlaylistStore().items = [songItem];
      },
    });
    await flushPromises();
    expect(readTags).toHaveBeenCalledWith("s1");

    const playlistName = () =>
      wrapper.get(".pane-playlist .track-row .name").text();
    const driveName = () => wrapper.get(".pane-drive .track-row .name").text();
    expect(playlistName()).toBe("Song - Artist");

    await wrapper.get(".display-mode").trigger("click");
    expect(playlistName()).toBe("Artist / Album [3] - Song");
    await wrapper.get(".display-mode").trigger("click");
    expect(playlistName()).toBe("song.mp3");
    await wrapper.get(".display-mode").trigger("click");
    expect(playlistName()).toBe("Song - Artist");
    expect(driveName()).toBe("song.mp3");
  });

  describe("再生", () => {
    function fakeAudio() {
      return {
        setSource: vi.fn(),
        clearSource: vi.fn(),
        play: vi.fn(() => Promise.resolve()),
        pause: vi.fn(),
        seek: vi.fn(),
        subscribe: vi.fn(),
      } satisfies AudioPlayer;
    }

    function configurePlayer(audio: AudioPlayer) {
      return () => {
        usePlayerStore().configure({
          audio,
          loadMedia: (item) =>
            Promise.resolve({ url: `blob:${item.id}`, revoke: vi.fn() }),
        });
      };
    }

    it("ドライブ内一覧の曲をダブルクリックすると再生し、行を強調する", async () => {
      const audio = fakeAudio();
      const { wrapper } = await setup("/", {
        items: [songItem],
        beforeMount: configurePlayer(audio),
      });
      const row = wrapper.get(".pane-drive .track-row");
      await row.trigger("click");
      await row.trigger("click");
      await flushPromises();

      expect(audio.setSource).toHaveBeenCalledWith("blob:s1");
      expect(usePlayerStore().source).toBe("drive");
      expect(wrapper.get(".pane-drive .track-row").classes()).toContain(
        "playing",
      );
      expect(wrapper.find(".player-bar .pause").exists()).toBe(true);
    });

    it("プレイリストの曲をダブルクリックすると、プレイリストを再生元にして再生する", async () => {
      const audio = fakeAudio();
      const { wrapper } = await setup("/", {
        beforeMount: () => {
          configurePlayer(audio)();
          usePlaylistStore().items = [songItem];
        },
      });
      const row = wrapper.get(".pane-playlist .track-row");
      await row.trigger("click");
      await row.trigger("click");
      await flushPromises();

      expect(audio.setSource).toHaveBeenCalledWith("blob:s1");
      expect(usePlayerStore().source).toBe("playlist");
    });

    it("再生中の曲の表示名をページのタイトルにする", async () => {
      const audio = fakeAudio();
      const { wrapper } = await setup("/", {
        readTags: () => Promise.resolve({ status: "ok", tags: TAGS }),
        beforeMount: () => {
          configurePlayer(audio)();
          usePlaylistStore().items = [songItem];
        },
      });
      await flushPromises();
      expect(document.title).toBe("Google Drive Player");

      await usePlayerStore().play(songItem, "playlist");
      await flushPromises();
      expect(document.title).toBe("Song - Artist");

      await wrapper.get(".display-mode").trigger("click");
      await wrapper.get(".display-mode").trigger("click");
      expect(document.title).toBe("song.mp3");

      wrapper.unmount();
      expect(document.title).toBe("Google Drive Player");
    });

    it("別のフォルダを開いても再生は止まらない", async () => {
      const audio = fakeAudio();
      const { router } = await setup("/", {
        items: [songItem],
        beforeMount: configurePlayer(audio),
      });
      await usePlayerStore().play(songItem, "drive");
      await router.push("/folders/other");
      await flushPromises();
      expect(usePlayerStore().current?.id).toBe("s1");
      expect(usePlayerStore().status).toBe("playing");
      expect(audio.pause).not.toHaveBeenCalled();
    });

    it("フォルダのダブルクリックは再生せず、開く", async () => {
      const audio = fakeAudio();
      const { router, wrapper } = await setup("/", {
        beforeMount: configurePlayer(audio),
      });
      const row = wrapper.get(".pane-drive .track-row");
      await row.trigger("click");
      await row.trigger("click");
      await flushPromises();
      expect(router.currentRoute.value.fullPath).toBe("/folders/f1");
      expect(audio.setSource).not.toHaveBeenCalled();
    });
  });
});
