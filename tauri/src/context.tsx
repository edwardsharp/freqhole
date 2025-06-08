import {
  createContext,
  createSignal,
  useContext,
  ParentComponent,
  createResource,
  Setter,
  Accessor,
} from "solid-js";
import { getFavoriteSongs, querySongs, Song } from "./db";
import { createArrayLiveQuery } from "./create-live-query";

export interface PlayerState {
  playing: "loading" | "playing" | "paused" | "done" | "idle";
  current_url: string | null;
  song: Song | null;
  current_time: number;
}

export type SetPlayerState = Setter<PlayerState>;
export type AudioState = Accessor<HTMLAudioElement>;

function useProviderValue() {
  const [page, setPage] = createSignal(0);
  const [pageSize, _setPageSize] = createSignal(50);
  const [search, setSearch] = createSignal("");
  const [filter, setFilter] = createSignal<"all" | "favorites">("all");
  const [sortKey, setSortKey] = createSignal<keyof Song>("title");
  const [playerState, setPlayerState] = createSignal<PlayerState>({
    playing: "idle",
    current_url: null,
    song: null,
    current_time: 0,
  });
  const [audio] = createSignal(new Audio());

  const [songs] = createResource(
    () => ({
      filter: filter(),
      search: search(),
      sortKey: sortKey(),
      offset: page() * pageSize(),
      limit: pageSize(),
    }),
    querySongs,
  );

  const favorites = createArrayLiveQuery(getFavoriteSongs);
  return {
    page,
    setPage,
    pageSize,
    search,
    setSearch,
    filter,
    setFilter,
    sortKey,
    setSortKey,
    songs,
    favorites,
    count: songs.length,
    playerState,
    setPlayerState,
    audio,
  };
}

export type ContextType = ReturnType<typeof useProviderValue>;

export const FreqholeContext = createContext<ContextType | undefined>(
  undefined,
);

export const FreqholeProvider: ParentComponent = (props) => {
  const value = useProviderValue();
  return (
    <FreqholeContext.Provider value={value}>
      {props.children}
    </FreqholeContext.Provider>
  );
};

// bit.ly/SafeContext
export function useSongs() {
  const context = useContext(FreqholeContext);
  if (context === undefined) {
    throw new Error(`useSongs must be used within a FreqholeProvider`);
  }
  return context;
}

export function usePlayer() {
  const context = useProviderValue();
  if (context === undefined) {
    throw new Error(`usePlayer must be used within a FreqholeProvider`);
  }
  return {
    playerState: context.playerState,
    setPlayerState: context.setPlayerState,
    audio: context.audio,
  };
}

export function songTitleOrPath(song: Song | null | undefined) {
  if (!song) return;

  if (!song.title && !song.artist && !song.album)
    return [song.path.replace(`${song.base_path}/`, "")];
  return [
    song.title.replace(`${song.base_path}/`, ""),
    `${song.artist && " - "}${song.artist}`,
    `${song.album && "["} ${song.album} ${song.album && "]"}`,
  ];
}
