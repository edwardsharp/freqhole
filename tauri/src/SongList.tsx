import { createSignal, For, Show, type Component } from "solid-js";

import play from "./assets/play.svg";
import nohole from "./assets/nohole.svg";
import hole from "./assets/hole.svg";

import { songTitleOrPath, useSongs } from "./context";
import { loadSong, formatTime } from "./usePlayer";
import { toggleFavoriteSong, Song } from "./db";

import "./SongList.css";

const SongList: Component = () => {
  const { songs, setPlayerState, audio, playerState, favorites } = useSongs();

  const [lastSelectedIndex, setLastSelectedIndex] = createSignal<number | null>(
    null,
  );
  // const selected = new Set();
  const [selected, setSelected] = createSignal(new Set());

  function isHeart(song: Song) {
    return favorites?.some((s) => s.id === song.id);
  }
  function heartSong(song: Song) {
    console.log("gonna toggleFavoriteSong", `${song.id}`);
    toggleFavoriteSong(`${song.id}`);
  }
  function isPlaying(song: Song) {
    return playerState()?.song?.id === song.id;
  }
  function playSong(song: Song) {
    // this probably should be in a better place, because
    // this probably will also handle, like, queuing, or like
    // this probably could handle restarting from the beginning
    // #todo: the deep depthz of media player logic 🧟
    if (!isPlaying(song)) {
      loadSong(song, setPlayerState, audio);
    } else {
      audio().paused && audio().play;
    }
  }
  function add(id: string | number) {
    setSelected(new Set([...selected(), id]));
  }
  function del(id: string | number) {
    setSelected(new Set([...selected()].filter((i) => i !== id)));
  }
  function has(id: string | number) {
    return selected().has(id);
    //[...selected()].filter((i) => i !== id);
  }
  function clear() {
    setSelected(new Set());
  }

  function rowClick(song: Song, index: number, range: boolean, multi: boolean) {
    const lsi = lastSelectedIndex();
    if (range && lsi !== null) {
      const start = Math.min(index, lsi);
      const end = Math.max(index, lsi);
      for (let i = start; i <= end; i++) {
        add(song.id);
      }
    } else if (multi) {
      if (has(song.id)) del(song.id);
      else add(song.id);
      setLastSelectedIndex(index);
    } else {
      clear();
      add(song.id);
      setLastSelectedIndex(index);
    }
    console.log("hmm now selected:", selected());
    // document.getElementById("add-to-playlist").style.display =
    //   selected.size > 0 ? "inline-block" : "none";
  }
  function formatIdx(idx: number) {
    return idx.toString().padStart(2, "0");
  }

  function renderSongTitleOrPath(song: Song) {
    const [title, ...rest] = songTitleOrPath(song) || [];
    return (
      <>
        <strong>{title}</strong>
        {rest}
      </>
    );
  }

  return (
    <>
      <Show when={!songs.loading} fallback={<p>Loading...</p>}>
        <div id="song-list">
          <For each={songs()}>
            {(song, idx) => (
              <div
                class={`song-row${has(song.id) ? " selected" : ""}`}
                onClick={(e) =>
                  rowClick(song, idx(), e.metaKey || e.ctrlKey, e.shiftKey)
                }
                onDblClick={() => playSong(song)}
                tabindex="0"
              >
                <div class="start">
                  {playerState()?.song?.id === song.id ? (
                    <img src={play} class="playing" alt="playing" />
                  ) : (
                    formatIdx(idx())
                  )}
                </div>
                <div class="grow">{renderSongTitleOrPath(song)}</div>
                <div
                  class="end"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    heartSong(song);
                  }}
                  title="add to yr favz!"
                  tabindex="0"
                >
                  <div>
                    {isHeart(song) ? (
                      <img src={nohole} alt="heart" />
                    ) : (
                      <img src={hole} alt="hole" />
                    )}
                  </div>
                  <div>{formatTime(song.seconds)}</div>
                </div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </>
  );
};

export default SongList;
