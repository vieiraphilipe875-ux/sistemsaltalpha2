export type ClientImageKind = "avatar" | "banner";

export const CLIENT_IMAGE_CROP_SPECS = {
  avatar: { width: 512, height: 512, aspectRatio: 1, ratioLabel: "1:1", label: "Foto do cliente" },
  banner: { width: 1920, height: 480, aspectRatio: 4, ratioLabel: "4:1", label: "Banner do cliente" },
} as const;

export const CLIENT_IMAGE_CROP_MAX_ZOOM = 3;

export function clampCropPosition(value: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5;
}

/** Source coordinates shared by the preview and the exported PNG. */
export function clientImageCropGeometry(
  imageWidth: number,
  imageHeight: number,
  kind: ClientImageKind,
  zoom = 1,
  positionX = 0.5,
  positionY = 0.5,
) {
  if (![imageWidth, imageHeight].every(value => Number.isFinite(value) && value > 0)) {
    throw new RangeError("A imagem precisa ter largura e altura válidas.");
  }
  const output = CLIENT_IMAGE_CROP_SPECS[kind];
  const safeZoom = Number.isFinite(zoom) ? Math.min(CLIENT_IMAGE_CROP_MAX_ZOOM, Math.max(1, zoom)) : 1;
  const scale = Math.max(output.width / imageWidth, output.height / imageHeight) * safeZoom;
  const width = Math.min(imageWidth, output.width / scale);
  const height = Math.min(imageHeight, output.height / scale);
  const overflowX = Math.max(0, imageWidth - width);
  const overflowY = Math.max(0, imageHeight - height);
  return {
    x: overflowX * clampCropPosition(positionX),
    y: overflowY * clampCropPosition(positionY),
    width,
    height,
    overflowX,
    overflowY,
    outputWidth: output.width,
    outputHeight: output.height,
  };
}

export function clientImageCropFilename(name: string): string {
  const stem = name.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "").replace(/-crop$/, "").trim();
  return `${(stem || "imagem").slice(0, 160)}-crop.png`;
}
