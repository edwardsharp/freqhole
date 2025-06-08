import { useSongs } from "./context";
import { Player } from "./Player";
import "./Sidebar.css";

export function SideBar() {
  const { setFilter, setSearch } = useSongs();

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
        <li onClick={() => setFilter("all")}>everything</li>
        <li onClick={() => setFilter("favorites")}>♥ heartz</li>
      </ul>

      <div class="grow">&nbsp;</div>
      <Player />
    </div>
  );
}
