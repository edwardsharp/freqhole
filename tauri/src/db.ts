import Dexie, { type EntityTable, type Table } from "dexie";

interface Song {
  id: number;
  title: string;
  artist: string;
  album: string;
  date_added: string;
  seconds: number;
  base_path: string;
  path: string;
  url: string;
}

interface Playlist {
  id: number;
  name: string;
}

interface Favorite {
  id: number;
  song_id: string;
}
interface PlaylistSongs {
  id: string;
  playlistId: string;
  songId: string;
  sortOrder: number;
}

interface QueryOptions {
  filter: string;
  search: string;
  sortKey: keyof Song;
  offset: number;
  limit: number;
}

const db = new Dexie("freqhole") as Dexie & {
  songs: EntityTable<Song, "id">;
  favorites: EntityTable<Favorite, "id">;
  playlists: EntityTable<Playlist, "id">;
  playlist_songs: Table<PlaylistSongs>;
};

// Schema declaration:
db.version(4).stores({
  songs: "id, title, artist, album, date_added, seconds, base_path",
  favorites: "++id, song_id",
  playlists: "++id, name",
  playlistSongs: "[playlistId+songId]",
});

export type { Song };
export { db };

export async function toggleFavoriteSong(song_id: string) {
  const is_fav = await db.favorites.get({ song_id });
  if (is_fav) {
    return await db.favorites.delete(is_fav.id);
  }
  return await db.favorites.add({ song_id });
}

export async function getFavoriteSongs() {
  return db.songs
    .where("id")
    .anyOf((await db.favorites.toArray()).map((f) => f.song_id))
    .toArray();
}

export async function querySongs(options: QueryOptions): Promise<Song[]> {
  console.log("querySongs options:", options);
  if (options.filter === "favorites") return await getFavoriteSongs();

  const matchSong = (song: Song) => {
    const matchesFilter = options.filter === "all";

    const matchesSearch =
      !options.search ||
      Object.values(song).some(
        (v) =>
          typeof v === "string" &&
          v.toLowerCase().includes(options.search.toLowerCase()),
      );

    console.log("zomg does match:", matchesFilter && matchesSearch);
    return matchesFilter && matchesSearch;
  };

  // const sortFn = (a, b) =>
  //   `${a[options.sortKey] ?? ""}`.localeCompare(`${b[options.sortKey] ?? ""}`);

  options.offset + options.limit;
  const songs = await db.songs
    .orderBy(options.sortKey)
    .filter(matchSong)
    .offset(options.offset)
    .limit(options.limit)
    .toArray();
  console.log("zomg querySongs results songs.length", songs[0]);
  return songs;
}

export async function initSeedSongs() {
  console.log("gonna initSeedSongs from http://localhost:3030/songs");
  const songs = (await fetch(
    // "http://localhost:3030/examples/seed_songs.json",
    "http://localhost:3030/songs.json",
  ).then((r) => r.json())) as any[];

  // id, title, artist, album, date_added, seconds

  await db.songs.bulkPut(songs);

  // await Promise.all(
  //   songs.map((song) =>
  //     db.songs.get(song.id).then((s) => {
  //       if (!s) return db.songs.add(song);
  //     }),
  //   ),
  // );

  console.log("done seeding initial songs!");
}

export async function resetDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const dbName = "freqhole";

    const deleteRequest = indexedDB.deleteDatabase(dbName);

    deleteRequest.onsuccess = () => {
      console.log(`✅ Deleted database "${dbName}"`);
      resolve();
    };

    deleteRequest.onerror = () => {
      console.error(
        `❌ Failed to delete database "${dbName}"`,
        deleteRequest.error,
      );
      reject(deleteRequest.error);
    };

    deleteRequest.onblocked = () => {
      console.warn(
        `⚠️ Delete blocked. Make sure all tabs are closed using the "${dbName}" database.`,
      );
    };
  });
}
