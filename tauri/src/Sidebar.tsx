import { Filter, useSongs } from "./context";
import { Player } from "./Player";
import nohole from "./assets/nohole.svg";
import "./Sidebar.css";
import { For } from "solid-js";

export function SideBar() {
  const {
    filter,
    setFilter,
    setSearch,
    playlists,
    playlistId,
    setPlaylistId,
    setSelected,
    setPage,
  } = useSongs();

  function itemClick(filter: Filter, playlistId: string | null) {
    setFilter(filter);
    setPlaylistId(playlistId);

    // reset other state
    setSelected(new Set<string>());
    setPage(0);
  }

  return (
    <div id="sidebar">
      <h1>freqhole</h1>

      <input
        id="search"
        type="text"
        placeholder="Search..."
        onInput={(e) => setSearch(e.currentTarget.value)}
      />

      <ul id="playlist-nav">
        <div class="sticky">
          <li
            onClick={() => itemClick("all", null)}
            class={`sticky${filter() === "all" ? " active" : ""}`}
          >
            everything
          </li>
          <li
            onClick={() => itemClick("favorites", null)}
            class={`sticky${filter() === "favorites" ? " active" : ""}`}
          >
            heartz <img src={nohole} alt="heart" />
          </li>
        </div>

        {/* playlists */}

        <For each={playlists}>
          {(playlist) => (
            <li
              onClick={() => itemClick("playlist", `${playlist.id}`)}
              class={
                playlistId && playlistId() === `${playlist.id}` ? "active" : ""
              }
              title={playlist.name}
            >
              {playlist.name}
            </li>
          )}
        </For>
      </ul>

      <div class="grow">&nbsp;</div>
      <Player />
    </div>
  );
}
