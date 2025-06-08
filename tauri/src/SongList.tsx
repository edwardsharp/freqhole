import { For, Show, type Component } from "solid-js";

import logo from "./assets/logo.svg";
import { songTitleOrPath, useSongs } from "./context";

import "./SongList.css";
import { toggleFavoriteSong, Song } from "./db";

import { loadSong, formatTime } from "./usePlayer";

const SongList: Component = () => {
  const { songs, setPlayerState, audio, playerState, favorites } = useSongs();

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
  function rowClick(song: Song) {
    !isPlaying(song) && loadSong(song, setPlayerState, audio);
  }
  function formatIdx(idx: number) {
    return idx.toString().padStart(2, "0");
  }

  const renderSongTitleOrPath = (song: Song) => {
    const [title, ...rest] = songTitleOrPath(song) || [];
    return (
      <>
        <strong>{title}</strong>
        {rest}
      </>
    );
  };

  return (
    <>
      <Show when={!songs.loading} fallback={<p>Loading...</p>}>
        <div>
          <For each={songs()}>
            {(song, idx) => (
              <div class="song-row" onClick={() => rowClick(song)}>
                <div class="start">
                  {playerState()?.song?.id === song.id ? (
                    <img src={logo} class="playing" alt="playing" />
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
                >
                  <div>{isHeart(song) ? "♥" : "♡"}</div>
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
