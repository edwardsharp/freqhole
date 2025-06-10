import { onCleanup } from "solid-js";

function uint8ToImageUrl(data: Uint8Array, mime = "image/png"): string {
  const blob = new Blob([data], { type: mime });
  return URL.createObjectURL(blob);
}

export function BlobImage(props: { data?: Uint8Array | null }) {
  if (!props.data) return;
  const url = uint8ToImageUrl(props.data);

  onCleanup(() => {
    URL.revokeObjectURL(url);
  });

  return <img src={url} alt="some image blob" />;
}
