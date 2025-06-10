import { Show } from "solid-js";
import { useSongs } from "./context";
import "./Controls.css";
import { addToNewPlaylist, addToPlaylist } from "./db";
import { useFlyoutMenu } from "./FlyoutMenuProvider";

export function Controls() {
  const { setPage, page, pageSize, count, selected, playlists } = useSongs();

  const menu = useFlyoutMenu();

  return (
    <Show
      when={[...selected()].length > 1 || count() >= pageSize() || page() > 0}
    >
      <div id="controls">
        {/* <button onClick={() => setSortKey("artist")}>Sort by Artist</button>
        <button onClick={() => setSortKey("album")}>Sort by Album</button>
        */}

        {[...selected()].length > 1 && (
          <>
            {/* <span class="selected">({[...selected()].length} selected)</span> */}
            <button
              onClick={(e) => {
                menu.open({ x: e.clientX, y: e.clientY }, [
                  {
                    label: "search",
                    onClick: (val?: string) => {
                      if (!val) return;
                      addToNewPlaylist([...selected()], val);
                    },
                  },
                  ...playlists.map((p) => ({
                    label: p.name,
                    onClick: () => addToPlaylist([...selected()], `${p.id}`),
                  })),
                ]);
              }}
            >
              ({[...selected()].length} selected) add to playlist
            </button>
          </>
        )}
        <div class="grow">&nbsp;</div>
        {page() !== 0 && (
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 0))}
            disabled={page() === 0}
          >
            Prev
          </button>
        )}
        {count() >= (page() + 1) * pageSize() && (
          <button onClick={() => setPage((p) => p + 1)}>Next</button>
        )}
      </div>
    </Show>
  );
}
