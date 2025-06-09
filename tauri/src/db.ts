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

export interface Playlist {
  id: number;
  name: string;
  image_path?: string;
  image_blob?: Uint8Array;
  date_added?: string;
  description?: string;
}

interface Favorite {
  id: number;
  song_id: string;
}
interface PlaylistSongs {
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
  playlistId?: string | null;
}

const db = new Dexie("freqhole") as Dexie & {
  songs: EntityTable<Song, "id">;
  favorites: EntityTable<Favorite, "id">;
  playlists: EntityTable<Playlist, "id">;
  playlist_songs: Table<PlaylistSongs>;
};

// Schema declaration:
db.version(5).stores({
  songs: "id, title, artist, album, date_added, seconds, base_path",
  favorites: "++id, song_id",
  playlists: "++id, name",
  playlist_songs: "[playlistId+songId]",
});

export type { Song };
export { db };

export async function addToNewPlaylist(song_ids: string[], name: string) {
  name = name ? name : `new playlist ${Date.now().toFixed(4)}`;
  const playlistId = await db.playlists.add({
    name,
    date_added: `${Date.now()}`,
  });
  return await addToPlaylist(song_ids, `${playlistId}`);
}

export async function addToPlaylist(song_ids: string[], playlistId: string) {
  await Promise.all(
    song_ids.map((sid) =>
      db.playlist_songs
        .put({
          playlistId: `${playlistId}`,
          songId: `${sid}`,
          sortOrder: 0,
        })
        .catch((e) => console.warn("playlist_songs.put error:", e)),
    ),
  );
}

export async function updatePlaylist(playlist: Partial<Playlist>) {
  if (!playlist.id) return;
  await db.playlists.update(playlist.id, playlist);
}
export async function toggleFavoriteSong(song_id: string) {
  const is_fav = await db.favorites.get({ song_id });
  if (is_fav) {
    return await db.favorites.delete(is_fav.id);
  }
  return await db.favorites.add({ song_id });
}

export async function getPlaylists() {
  return db.playlists.toArray();
}

export async function getFavoriteSongs() {
  return db.songs
    .where("id")
    .anyOf((await db.favorites.toArray()).map((f) => f.song_id))
    .toArray();
}

export async function getPlaylist(playlistId: string | null) {
  if (!playlistId) return null;
  const playlist = await db.playlists.get(parseInt(playlistId));
  return playlist;
}

export async function getPlaylistSongs(playlistId: string) {
  return db.songs
    .where("id")
    .anyOf(
      (await db.playlist_songs.where({ playlistId }).toArray()).map(
        (f) => f.songId,
      ),
    )
    .toArray();
}

export async function querySongs(options: QueryOptions): Promise<Song[]> {
  let favz: Song[] | undefined;
  const isFavz = options.filter === "favorites";
  if (isFavz) {
    favz = await getFavoriteSongs();
  }

  const isPlaylist = options.filter === "playlist" && options.playlistId;
  let playlist_song_ids: string[] = [];
  if (isPlaylist) {
    playlist_song_ids = (
      await db.playlist_songs
        .where({ playlistId: options.playlistId })
        .toArray()
    )?.map((ps) => ps.songId);
  }

  const matchSong = (song: Song) => {
    // so if favz filter andand this isn't in the favz,
    // bail before query check.
    if (isFavz && favz?.every((f) => f.id !== song.id)) {
      return false;
    }
    // same for playlist, if this song isn't in the playlist, bail.
    if (
      isPlaylist &&
      playlist_song_ids.every((psid) => psid !== `${song.id}`)
    ) {
      return false;
    }

    const matchesSearch =
      !options.search ||
      Object.values(song).some(
        (v) =>
          typeof v === "string" &&
          v.toLowerCase().includes(options.search.toLowerCase()),
      );

    return matchesSearch;
  };

  const songs = await db.songs
    .orderBy(options.sortKey)
    .filter(matchSong)
    .offset(options.offset)
    .limit(options.limit)
    .toArray();

  console.log("zomg querySongs results songs.length", songs.length);
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
