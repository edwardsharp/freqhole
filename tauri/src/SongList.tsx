import { createSignal, For, Show, type Component } from "solid-js";

import play from "./assets/play.svg";
import pause from "./assets/pause.svg";
import nohole from "./assets/nohole.svg";
import hole from "./assets/hole.svg";

import { songTitleOrPath, useSongs } from "./context";
import { loadSong, formatTime } from "./usePlayer";
import {
  toggleFavoriteSong,
  Song,
  addToNewPlaylist,
  addToPlaylist,
} from "./db";

import "./SongList.css";
import { useFlyoutMenu } from "./FlyoutMenuProvider";

const SongList: Component = () => {
  const {
    songs,
    setPlayerState,
    audio,
    playerState,
    favorites,
    selected,
    setSelected,
    playlists,
    page,
    pageSize,
  } = useSongs();

  const [lastSelectedIndex, setLastSelectedIndex] = createSignal<number | null>(
    null,
  );

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
    setSelected(new Set([...selected(), `${id}`]));
  }
  function del(id: string | number) {
    setSelected(new Set([...selected()].filter((i) => i !== id)));
  }
  function has(id: string | number) {
    return selected().has(`${id}`);
    //[...selected()].filter((i) => i !== id);
  }
  function clear() {
    setSelected(new Set<string>());
  }

  function togglePlaying(song: Song) {
    if (song.id && playerState()?.song?.id !== song.id) {
      playSong(song);
    }

    switch (playerState().playing) {
      case "playing":
        audio().pause();
        break;
      case "done":
        audio().fastSeek(0);
        audio().play();
        break;
      case "paused":
        audio().play();
        break;
    }
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
  function formatIdx(idx: number, page: number, pageSize: number) {
    return (idx + page * pageSize).toString().padStart(2, "0");
  }

  function renderSongTitleOrPath(song: Song) {
    const [title, ...rest] = songTitleOrPath(song) || [];
    return (
      <>
        <strong>{title}</strong> {rest}
      </>
    );
  }

  const menu = useFlyoutMenu();

  const contextMenu = (song: Song, x: number, y: number) => {
    console.log("zomg contextMenu!!", { x, y });
    add(song.id);

    menu.open(
      { x, y },
      [
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
      ],
      // playlists.map((p) => ({
      //   label: p.name,
      //   onClick: () => addToNewPlaylist([...selected()], p.name),
      // })),
    );

    // menu.open({ x, y }, [
    //   {
    //     label: "add to new playlist",
    //     onClick: () =>
    //       addToNewPlaylist([...selected()], `playlist-${Date.now()}`),
    //   },
    //   // { label: "delete", onClick: () => console.log("Delete", song.title) },
    // ]);
  };

  return (
    <>
      <Show when={!songs.loading} fallback={<p>Loading...</p>}>
        <div id="song-list">
          <For each={songs()}>
            {(song, idx) => (
              <div
                class={`song-row${has(song.id) ? " selected" : ""}${playerState()?.song?.id === song.id ? " sticky-row" : ""}`}
                onClick={(e) =>
                  rowClick(song, idx(), e.metaKey || e.ctrlKey, e.shiftKey)
                }
                onDblClick={() => playSong(song)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  contextMenu(song, e.clientX, e.clientY);
                }}
                tabindex="0"
              >
                <div
                  class="start"
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePlaying(song);
                  }}
                >
                  <span class="normal">
                    {playerState()?.song?.id === song.id ? (
                      playerState()?.playing === "paused" ? (
                        <img src={play} class="playing" alt="playing" />
                      ) : (
                        <img src={pause} class="playing" alt="pause" />
                      )
                    ) : (
                      formatIdx(idx(), page(), pageSize())
                    )}
                  </span>
                  <span class="hover">
                    {playerState()?.song?.id === song.id &&
                    playerState()?.playing === "playing" ? (
                      <img src={pause} class="playing" alt="pause" />
                    ) : (
                      <img src={play} class="playing" alt="playing" />
                    )}
                  </span>
                  <span></span>
                </div>
                <div class="grow">{renderSongTitleOrPath(song)}</div>
                <div
                  class="fav"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    heartSong(song);
                  }}
                  title="toggle fav song"
                  tabindex="0"
                >
                  {isHeart(song) ? (
                    <img src={nohole} alt="heart" />
                  ) : (
                    <img src={hole} alt="hole" />
                  )}
                </div>
                <div class="time">{formatTime(song.seconds)}</div>
                <div
                  class="menu"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    contextMenu(song, e.clientX, e.clientY);
                  }}
                  title="optionz menu"
                >
                  <span class="normal">&nbsp;</span>
                  <span class="hover">•••</span>
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
