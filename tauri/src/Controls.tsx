import { useSongs } from "./context";
import "./Controls.css";

export function Controls() {
  const { setPage, page, pageSize, count } = useSongs();

  return (
    <div id="controls">
      {/* <button onClick={() => setSortKey("artist")}>Sort by Artist</button>
      <button onClick={() => setSortKey("album")}>Sort by Album</button>
      */}

      {page() !== 0 && (
        <button
          onClick={() => setPage((p) => Math.max(p - 1, 0))}
          disabled={page() === 0}
        >
          Prev
        </button>
      )}
      {page() * pageSize() < count && (
        <button onClick={() => setPage((p) => p + 1)}>Next</button>
      )}
      <div class="grow">&nbsp;</div>
    </div>
  );
}
