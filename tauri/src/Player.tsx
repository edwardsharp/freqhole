import { songTitleOrPath, useSongs } from "./context";
import { Song } from "./db";
import "./Player.css";
import { formatTime } from "./usePlayer";

export function Player() {
  const { playerState, setPlayerState, audio } = useSongs();

  let seekbarRef: HTMLDivElement | undefined;

  const togglePlaying = () => {
    const setPaused = () => {
      setPlayerState((prev) => ({
        ...prev,
        playing: "paused",
      }));
      audio().pause();
    };
    const setPlaying = () => {
      setPlayerState((prev) => ({
        ...prev,
        playing: "playing",
      }));
      audio().play();
    };
    switch (playerState().playing) {
      case "playing":
        setPaused();
        break;
      case "paused":
        setPlaying();
        break;
    }
  };

  function handleSeekClick(e: MouseEvent) {
    const duration = playerState().song?.seconds;
    if (!seekbarRef || duration == undefined) return;
    const rect = seekbarRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    const time = pct * duration;
    audio().fastSeek(time);
  }

  function progress() {
    const duration = playerState().song?.seconds;
    const current_time = playerState().current_time;
    if (duration === undefined) return;
    return (current_time / duration) * 100;
  }

  function hoverTextForPlaying() {
    switch (playerState().playing) {
      case "playing":
        return "pause";
      case "paused":
        return "play";
      default:
        return "";
    }
  }

  const renderSongTitleOrPath = (song: Song | null | undefined) => {
    if (!song) return;
    const [title, ...rest] = songTitleOrPath(song) || [];
    return (
      <>
        <strong>{title}</strong>
        {rest}
      </>
    );
  };

  return (
    <div id="player">
      <div id="playpause" onClick={() => togglePlaying()}>
        {hoverTextForPlaying()}
      </div>
      {!!playerState().current_time && (
        <div id="seekbar-container" class="grow">
          <div>{formatTime(playerState().current_time)}</div>
          <div class="seekbar" ref={seekbarRef} onClick={handleSeekClick}>
            <div class="progress" style={{ width: `${progress()}%` }}></div>
            <div class="handle" style={{ left: `${progress()}%` }}></div>
          </div>
          <div>{formatTime(playerState().song?.seconds)}</div>
        </div>
      )}
      <div id="song-title" title={songTitleOrPath(playerState().song)?.join()}>
        {renderSongTitleOrPath(playerState().song)}
      </div>
    </div>
  );
}
