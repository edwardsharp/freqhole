import { songTitleOrPath, useSongs } from "./context";
import { Song } from "./db";
import "./Player.css";
import { formatTime } from "./usePlayer";
import play from "./assets/play.svg";
import pause from "./assets/pause.svg";
// import prev from "./assets/prev.svg";
// import next from "./assets/next.svg";

export function Player() {
  const { playerState, setPlayerState, audio } = useSongs();

  let seekbarRef: HTMLDivElement | undefined;

  const togglePlaying = () => {
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
    return Math.min((current_time / duration) * 100, 100);
  }

  function playPauseBtn() {
    switch (playerState().playing) {
      case "playing":
        return <img src={pause} alt="pause" title="pause" />;
      default:
        return <img src={play} alt="play" title="play" />;
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
      {!!playerState().current_url && (
        <div id="buttonz">
          {/* <img src={prev} alt="prev" title="prev" id="prev" /> */}
          <div onClick={() => togglePlaying()}>{playPauseBtn()}</div>

          {/* <img src={next} alt="next" title="next" id="next" /> */}
        </div>
      )}
      {!!playerState().current_url && (
        <div id="seekbar-container" class="grow">
          <div>{formatTime(playerState().current_time)}</div>
          <div class="seekbar" ref={seekbarRef} onClick={handleSeekClick}>
            <div class="progress" style={{ width: `${progress()}%` }}></div>
            <div class="handle" style={{ left: `${progress()}%` }}></div>
          </div>
          <div>{formatTime(playerState().song?.seconds)}</div>
        </div>
      )}
      <div
        id="song-title"
        title={songTitleOrPath(playerState().song)?.join("")}
      >
        {renderSongTitleOrPath(playerState().song)}
      </div>
    </div>
  );
}
