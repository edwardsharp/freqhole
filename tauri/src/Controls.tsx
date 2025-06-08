import { Show } from "solid-js";
import { useSongs } from "./context";
import "./Controls.css";

export function Controls() {
  const { setPage, page, pageSize, count, selected } = useSongs();

  return (
    <Show
      when={
        pageSize() > 1 || [...selected()].length > 1 || count() >= pageSize()
      }
    >
      <div id="controls">
        {/* <button onClick={() => setSortKey("artist")}>Sort by Artist</button>
        <button onClick={() => setSortKey("album")}>Sort by Album</button>
        */}

        <div>
          {[...selected()].length > 1 && `(${[...selected()].length} selected)`}
        </div>
        <div class="grow">&nbsp;</div>
        {page() !== 0 && (
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 0))}
            disabled={page() === 0}
          >
            Prev
          </button>
        )}
        {page() * pageSize() < count() && (
          <button onClick={() => setPage((p) => p + 1)}>Next</button>
        )}
      </div>
    </Show>
  );
}
