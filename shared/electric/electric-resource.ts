// src/lib/electric.ts
import { PGlite } from "@electric-sql/pglite";
import { electricSync } from "@electric-sql/pglite-sync";
import { live } from "@electric-sql/pglite/live";
import { createResource } from "solid-js";

export type PGliteWithLive = PGlite & {
  live: {
    query: (
      sql: string,
      params: unknown[],
      callback: (result: { rows: any[] }) => void,
    ) => Promise<{ unsubscribe: () => void }>;
  };
};

export async function setupElectric() {
  // might consider `relaxedDurability: true`
  // beter perf for IndexedDB
  const pg = await PGlite.create({
    dataDir: "idb://electric-music-db",
    extensions: {
      electric: electricSync(),
      live,
    },
  });

  await pg.exec(`
    CREATE TABLE IF NOT EXISTS songs (
      id TEXT PRIMARY KEY,
      artist TEXT NOT NULL,
      title TEXT NOT NULL,
      album TEXT,
      length INTEGER,
      path TEXT,
      image_path TEXT,
      date_added TEXT
    );
  `);

  await pg.electric.syncShapeToTable({
    shape: {
      url: "http://localhost:3000/v1/shape",
      params: { table: "songs" },
    },
    table: "songs",
    primaryKey: ["id"],
    shapeKey: "songs-sync",
  });

  return pg;
}

export function useElectric() {
  const [db] = createResource<PGliteWithLive>(setupElectric);
  return db;
}

// so app like:
/*
import { createResource, Show } from "solid-js";
import { setupElectric, type PGliteWithLive } from "./electric";
import { SongList } from "./SongList";
import { LiveSongList } from "./LiveSongList";

export default function App() {
  // note: could `useElectric()` in component, otherwise!
  const [db] = createResource<PGliteWithLive>(setupElectric);

  return (
    <Show when={db()}>
      <SongList db={db()} />
      <LiveSongList db={db()} />
    </Show>
  );
}
*/
// and then a component that does a live query like:
/*
import { createSignal, onCleanup, onMount } from "solid-js";
import type { PGliteWithLive } from "./electric";

export function LiveSongList({ db }: { db?: PGliteWithLive }) {
  const [songs, setSongs] = createSignal<any[]>([]);
  let unsubscribe: () => void;

  onMount(async () => {
    if (!db) return;
    const result = await db.live.query(
      "SELECT * FROM songs ORDER BY date_added DESC",
      [],
      ({ rows }) => {
        setSongs(rows);
      },
    );
    unsubscribe = result.unsubscribe;
  });

  onCleanup(() => {
    unsubscribe?.();
  });

  return (
    <ul>
      {songs().map((song) => (
        <li>
          {song.artist} – {song.title}
        </li>
      ))}
    </ul>
  );
}
*/
