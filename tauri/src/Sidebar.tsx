import { useSongs } from "./context";
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
    playlist_id,
    setPlaylistId,
  } = useSongs();

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
            onClick={() => {
              setPlaylistId(null);
              setFilter("all");
            }}
            class={`sticky${filter() === "all" ? " active" : ""}`}
          >
            library
          </li>
          <li
            onClick={() => {
              setPlaylistId(null);
              setFilter("favorites");
            }}
            class={`sticky${filter() === "favorites" ? " active" : ""}`}
          >
            heartz <img src={nohole} alt="heart" />
          </li>
        </div>

        {/* playlists */}

        <For each={playlists}>
          {(playlist) => (
            <li
              onClick={() => {
                setFilter("playlist");
                setPlaylistId(`${playlist.id}`);
              }}
              class={playlist_id() === `${playlist.id}` ? "active" : ""}
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
