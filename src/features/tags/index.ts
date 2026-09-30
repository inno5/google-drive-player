/** tags feature の公開 API */
export { useTagStore } from "./tag-store";
export type { TrackMetadata } from "./tag-store";
export {
  DISPLAY_MODE_LABELS,
  buildDisplayName,
  type DisplayMode,
} from "./display-name";
export { TAGS_STORAGE_KEY } from "./tag-storage";
export type { RawTags, ReadOutcome, TagTarget, TrackTags } from "./tag-types";
export type { TagReaderFn } from "./tag-store";
