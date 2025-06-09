import { createMemo, onCleanup } from "solid-js";

export function useImageBlobUrl(
  data: () => Uint8Array | null,
  mime = "image/png",
) {
  const url = createMemo(() => {
    const blobData = data();
    if (!blobData) return null;
    const blob = new Blob([blobData], { type: mime });
    const objectUrl = URL.createObjectURL(blob);

    onCleanup(() => {
      URL.revokeObjectURL(objectUrl);
    });

    return objectUrl;
  });

  return url;
}
