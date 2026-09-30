import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ViewTabs from "./ViewTabs.vue";

function active(view: "both" | "drive" | "playlist") {
  const wrapper = mount(ViewTabs, { props: { view } });
  return {
    drive: wrapper.get(".tab-drive").classes().includes("active"),
    playlist: wrapper.get(".tab-playlist").classes().includes("active"),
  };
}

describe("ViewTabs", () => {
  it("表示に応じてアクティブなタブが変わる", () => {
    expect(active("both")).toEqual({ drive: true, playlist: true });
    expect(active("drive")).toEqual({ drive: true, playlist: false });
    expect(active("playlist")).toEqual({ drive: false, playlist: true });
  });

  it("タブを押すと select を emit する", async () => {
    const wrapper = mount(ViewTabs, { props: { view: "both" } });
    await wrapper.get(".tab-drive").trigger("click");
    await wrapper.get(".tab-playlist").trigger("click");
    expect(wrapper.emitted("select")).toEqual([["drive"], ["playlist"]]);
  });
});
