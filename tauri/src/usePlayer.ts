import { AudioState, SetPlayerState } from "./context";
import { Song } from "./db";

export function formatTime(secs?: number | null) {
  if (!secs) return;
  if (isNaN(secs)) return;
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  return `${h ? `${h}:` : ""}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export function loadSong(
  song: Song,
  setPlayerState: SetPlayerState,
  audio: AudioState,
) {
  // const { setPlayerState, audio } = usePlayer();

  console.log("zomg playSong:", song);
  const current_url = `http://localhost:3030/song/${song.id}`;
  setPlayerState((prev) => ({
    ...prev,
    playing: "loading",
    song,
    current_url,
  }));

  // setPlayerState((prev) => ({ ...prev, current_url }))

  /*
    audio: HTMLAudioElement,
    currentUrl: string,
    setCurrentUrl: (u: string) => void, */

  // const res = await fetch(currentUrl);
  // let blob = await res.blob();

  if (!audio().paused) {
    audio().pause();
  }
  const setPlaying = () => {
    console.log("setPlaying");
    setPlayerState((prev) => ({
      ...prev,
      playing: "playing",
    }));
  };
  const setPaused = () =>
    setPlayerState((prev) => ({
      ...prev,
      playing: "paused",
    }));
  const setIdle = (e: any) => {
    console.log("zomg setIdle e:", e);
    setPlayerState((prev) => ({
      ...prev,
      playing: "idle",
    }));
  };

  const setCurrentTime = () =>
    setPlayerState((prev) => ({
      ...prev,
      current_time: audio().currentTime,
    }));

  ["play", "playing"].forEach((t) => audio().addEventListener(t, setPlaying));
  audio().addEventListener("pause", setPaused);
  ["abort", "ended", "error"].forEach((t) =>
    audio().addEventListener(t, setIdle),
  );
  audio().addEventListener("timeupdate", setCurrentTime);

  // ["timeupdate"]
  // clean up previous object URL
  // if (currentUrl) {
  //   URL.revokeObjectURL(currentUrl);
  // }
  // set up new audio
  // setCurrentUrl(URL.createObjectURL(blob));
  audio().src = current_url;
  audio().play();

  console.log("zomg loadSong done!");
}
