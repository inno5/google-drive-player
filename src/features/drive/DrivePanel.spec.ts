import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import DrivePanel from "./DrivePanel.vue";
import type { DriveItem } from "./drive-types";
import { SortableListStub } from "@/shared/ui/sortable-list-stub";

const song: DriveItem = {
  id: "s1",
  name: "song.mp3",
  mimeType: "audio/mpeg",
  size: 2000,
  modifiedTime: "",
  parents: [],
};
const folder: DriveItem = {
  id: "f1",
  name: "Album",
  mimeType: "application/vnd.google-apps.folder",
  size: null,
  modifiedTime: "",
  parents: [],
};

function factory(props: Record<string, unknown> = {}) {
  return mount(DrivePanel, {
    props: {
      items: [folder, song],
      status: "idle",
      hasMore: false,
      hasLoaded: true,
      ...props,
    },
    global: { stubs: { SortableList: SortableListStub } },
  });
}

describe("DrivePanel", () => {
  it("項目を行として表示する（フォルダと音声）", () => {
    const wrapper = factory();
    const rows = wrapper.findAll(".track-row");
    expect(rows).toHaveLength(2);
    expect(rows[0]?.get(".icon").text()).toBe("folder");
    expect(rows[1]?.get(".icon").text()).toBe("audiotrack");
    expect(rows[1]?.get(".cell-no").text()).toBe("2");
  });

  it("再生中の項目を強調する", () => {
    const wrapper = factory({ playingId: "s1" });
    expect(wrapper.findAll(".track-row")[1]?.classes()).toContain("playing");
  });

  it("行のダブルクリックで activate を emit する", async () => {
    const wrapper = factory();
    const row = wrapper.findAll(".track-row")[0];
    await row?.trigger("click");
    await row?.trigger("click");
    expect(wrapper.emitted("activate")).toEqual([[folder]]);
  });

  it("追加ボタンは canAdd のときだけ有効で、add を emit する", async () => {
    const disabled = factory();
    expect(disabled.get(".cell-ctrl").attributes("disabled")).toBeDefined();

    const enabled = factory({ canAdd: true });
    await enabled.get(".cell-ctrl").trigger("click");
    expect(enabled.emitted("add")).toEqual([[folder]]);
  });

  it("Enter で検索を emit する（前後の空白は除く）", async () => {
    const wrapper = factory();
    const input = wrapper.get("input");
    await input.setValue("  foo ");
    await input.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("search")).toEqual([["foo"]]);
  });

  it("空で Enter すると空文字を emit する（検索の解除）", async () => {
    const wrapper = factory({ query: "foo" });
    const input = wrapper.get("input");
    await input.setValue("");
    await input.trigger("keydown", { key: "Enter" });
    expect(wrapper.emitted("search")).toEqual([[""]]);
  });

  it("IME 変換中の Enter は無視する", async () => {
    const wrapper = factory();
    const input = wrapper.get("input");
    await input.setValue("あ");
    await input.trigger("keydown", { key: "Enter", isComposing: true });
    expect(wrapper.emitted("search")).toBeUndefined();
  });

  it("query が変わったら検索欄に反映する", async () => {
    const wrapper = factory({ query: "" });
    await wrapper.setProps({ query: "bar" });
    expect(wrapper.get("input").element.value).toBe("bar");
  });

  it("読み込み中の表示", () => {
    const wrapper = factory({ status: "loading" });
    expect(wrapper.get(".list-footer").text()).toContain("Loading");
  });

  it("エラーの表示と再試行", async () => {
    const wrapper = factory({ status: "error", error: "boom" });
    expect(wrapper.get("[role=alert]").text()).toBe("boom");
    await wrapper.get(".retry").trigger("click");
    expect(wrapper.emitted("retry")).toHaveLength(1);
  });

  it("読み込み後に 0 件なら No data、読み込み前は何も出さない", () => {
    expect(
      factory({ items: [], hasLoaded: true }).get(".list-footer").text(),
    ).toContain("No data");
    expect(
      factory({ items: [], hasLoaded: false }).get(".list-footer").text(),
    ).toBe("");
  });

  it("scrollToken が変わったら、再生中の行までスクロールする", async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const wrapper = factory({ playingId: "s1", scrollToken: 0 });
    expect(scrollIntoView).not.toHaveBeenCalled();
    await wrapper.setProps({ scrollToken: 1 });
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "auto",
      block: "center",
    });
  });
});
