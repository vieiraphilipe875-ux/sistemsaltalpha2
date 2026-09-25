// Shared by the browser and API so the hint and enforced limit stay aligned.
export const CLIENT_IMAGE_MAX_MB = 20;
export const CLIENT_IMAGE_MAX_BYTES = CLIENT_IMAGE_MAX_MB * 1024 * 1024;
export const CLIENT_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
export const CLIENT_IMAGE_ACCEPT = CLIENT_IMAGE_MIME_TYPES.join(",");
export const CLIENT_IMAGE_HINT = `JPG, PNG, WEBP ou GIF, até ${CLIENT_IMAGE_MAX_MB} MB por imagem.`;

export function clientImageError(file: { type: string; size: number }, label = "Imagem"): string | null {
  if (!CLIENT_IMAGE_MIME_TYPES.some(type => type === file.type)) {
    return `${label}: use JPG, PNG, WEBP ou GIF.`;
  }
  if (!Number.isSafeInteger(file.size) || file.size <= 0) return `${label}: selecione um arquivo que não esteja vazio.`;
  if (file.size > CLIENT_IMAGE_MAX_BYTES) return `${label}: o limite é ${CLIENT_IMAGE_MAX_MB} MB por imagem. Escolha um arquivo menor.`;
  return null;
}
