import type { Deliverable } from "./workspace-types";

export function taskCoverImages(item: Deliverable) {
  return [
    ...item.attachments.map((file) => ({
      ...file,
      source: "attachment" as const,
    })),
    ...item.assets.map((file) => ({ ...file, source: "asset" as const })),
  ].filter((file) => /^image\/(jpeg|png|webp|gif|avif)$/.test(file.mimeType));
}

export function taskCover(item: Deliverable) {
  if (item.coverMode === "none") return null;
  const images = taskCoverImages(item);
  const file =
    !item.coverMode || item.coverMode === "auto"
      ? images[0]
      : images.find(
          (image) =>
            image.id === item.coverFileId &&
            image.source === item.coverFileKind,
        );
  return file ? { ...file, full: item.coverMode === "full" } : null;
}
