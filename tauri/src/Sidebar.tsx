import { useSongs } from "./context";
import { Player } from "./Player";
import nohole from "./assets/nohole.svg";
import "./Sidebar.css";

export function SideBar() {
  const { filter, setFilter, setSearch } = useSongs();

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
        <li
          onClick={() => setFilter("all")}
          class={filter() === "all" ? "active" : ""}
        >
          everything
        </li>
        <li
          onClick={() => setFilter("favorites")}
          class={filter() === "favorites" ? "active" : ""}
        >
          heartz <img src={nohole} alt="heart" />
        </li>
      </ul>

      <div class="grow">&nbsp;</div>
      <Player />
    </div>
  );
}
