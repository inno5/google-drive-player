import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { SortableListStub } from "@/shared/ui/sortable-list-stub";
import PlaylistPanel from "./PlaylistPanel.vue";
import type { PlaylistItem } from "./playlist-storage";

const items: PlaylistItem[] = [
  {
    id: "1",
    name: "a.mp3",
    mimeType: "audio/mpeg",
    size: 1000,
    modifiedTime: "",
    parents: [],
  },
  {
    id: "2",
    name: "b.mp3",
    mimeType: "audio/mpeg",
    size: null,
    modifiedTime: "",
    parents: [],
  },
];

function factory(props: Record<string, unknown> = {}) {
  return mount(PlaylistPanel, {
    props: { items, ...props },
    global: { stubs: { SortableList: SortableListStub } },
  });
}

describe("PlaylistPanel", () => {
  it("曲を 1 始まりの番号で表示する", () => {
    const rows = factory().findAll(".track-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]?.get(".cell-no").text()).toBe("1");
    expect(rows[1]?.get(".name").text()).toBe("b.mp3");
  });

  it("空のときは No data を表示する", () => {
    const wrapper = factory({ items: [] });
    expect(wrapper.get(".empty").text()).toBe("No data :)");
    expect(factory().find(".empty").exists()).toBe(false);
  });

  it("再生中の曲を強調する", () => {
    const wrapper = factory({ playingId: "2" });
    expect(wrapper.findAll(".track-row")[1]?.classes()).toContain("playing");
  });

  it("行のダブルクリックで activate、削除ボタンで remove を emit する", async () => {
    const wrapper = factory();
    const row = wrapper.findAll(".track-row")[0];
    await row?.trigger("click");
    await row?.trigger("click");
    expect(wrapper.emitted("activate")).toEqual([[items[0]]]);

    await wrapper.findAll(".cell-ctrl")[1]?.trigger("click");
    expect(wrapper.emitted("remove")).toEqual([[items[1]]]);
  });

  it("Remove All は確認なしで clear を emit する", async () => {
    const wrapper = factory();
    await wrapper.get(".clear").trigger("click");
    expect(wrapper.emitted("clear")).toHaveLength(1);
  });

  it("追加中は曲数とキャンセルボタンを表示する", async () => {
    const wrapper = factory({ adding: { count: 12 } });
    expect(wrapper.get(".adding").text()).toContain("12 曲");
    await wrapper.get(".cancel").trigger("click");
    expect(wrapper.emitted("cancelAdd")).toHaveLength(1);
    expect(factory().find(".adding").exists()).toBe(false);
  });
});
