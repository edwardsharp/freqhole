# Media Library Sync Example (ElectricSQL-style)

...

## Schema Migrations

migrations are just plain pg .sql files stored in `schema/` and executed in timestamp order (unix timestamps in the file names to preserve order).

run `make` cmd for some helpful cli utils from `makefile`

for example, to create a new migration file:

```sh
make new
```

apply all:
```bash
psql -U postgres -d yourdb -f schema/init.sql
```

seed:
```bash
psql -U postgres -d yourdb -f schema/seeds.sql
```

### electric

```js
// Example using Vite's import.meta.glob
const migrationFiles = import.meta.glob('./migrations/*.sql', { as: 'raw' });

for (const path in migrationFiles) {
  const sql = await migrationFiles[path]();
  await pg.exec(sql);
}
```

versioning
```sql
CREATE TABLE IF NOT EXISTS schema_versions (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
```js
const result = await pg.query('SELECT 1 FROM schema_versions WHERE filename = $1', [filename]);

if (result.rows.length === 0) {
  await pg.exec(sqlContent);
  await pg.query('INSERT INTO schema_versions (filename) VALUES ($1)', [filename]);
}
```

then could use with (or without) electric:
```js
import { electricSync } from '@electric-sql/pglite-sync';

const pg = await PGlite.create({
  dataDir: 'idb://electric-music-db',
  extensions: {
    electric: electricSync(),
  },
});
```

note: the rest of this section is probably out-of-date info:

install the electric cli `npm install -g @electric-sql/cli`
then compile with electric: `electric migrate compile schema/`

...then restart your sync server (or client with hot reload)

is the cli deprecated?! see also: `@databases/pg-migrations`

https://www.atdatabases.org/docs/pg-migrations

```sh
pg-migrations apply --directory ./db/migrations
```

might need to look into `@electric-sql/client` see also: https://github.com/electric-sql/electric/blob/main/examples/write-patterns/package.json



### notes about `electric migrate compile`

This command:

Parses SQL migration files (those in schema/ folder)

Extracts the blocks between -- :electric:txn:start and -- :electric:txn:end

Generates a compiled schema bundle:

Writes out metadata about tables, columns, relations, etc.

Calculates a schema hash used for version compatibility checks

Produces a _electric/migrations file and optionally populates _electric.schema_versions when used with the server

This metadata is used by:

The Electric sync server

The client-side @electric-sql/pglite or @electric-sql/client libraries

Sync logic to validate if the schema on both ends is in sync and safe to replicate

#### other electric cli stuff:

Command	Purpose
electric migrate compile	Required after any schema change
electric daemon	Starts the local Electric dev sync server (for testing)
electric dev	Shortcut to compile + start dev sync server
electric info	Shows version, loaded schema, sync status
electric status	Status of schema compatibility
electric config	Dump your config (port, DB connection, etc.)

useful prestart package.json script:

```json
{
  "prestart": "electric migrate compile schema/"
}
```

or predev and a workdir check, if that's ur thing: `"prestart": "mkdir -p .electric && electric migrate compile schema/"`

or even more razzle-dazzle:

```json
{
  "name": "media-library-electric",
  "scripts": {
    "predev": "electric migrate compile schema/",
    "dev:sync": "electric dev",                // runs sync server and watches schema
    "dev": "concurrently -k -n SYNC,APP -c green,blue \"npm run dev:sync\" \"vite\"",
    "start": "vite"
  },
  "dependencies": {
    "solid-js": "^1.9.7"
  },
  "devDependencies": {
    "vite": "^4.5.0",
    "typescript": "^5.3.3",
    "concurrently": "^8.2.0"
  }
}
```

### some sql schema notes:


Query by artist:

```sql
SELECT * FROM media_blobs
WHERE metadata->>'artist' = 'Randomer';
```

Index nested value:

```sql
CREATE INDEX idx_artist ON media_blobs ((metadata->>'artist'));
```

note on composite key in `playlists_songs` table.

on the electric side:
```js
await db.syncShapeToTable({
  table: "playlist_items",
  shape: {
    where: {
      playlist_id: { equals: "..." }
    }
  },
  shapeKey: ["playlist_id", "song_id"] // composite key!
});
```

on the rust side:
```rs
let item = sqlx::query_as!(
    PlaylistItem,
    "SELECT * FROM playlist_items WHERE playlist_id = $1 AND song_id = $2",
    playlist_id,
    song_id
)
.fetch_one(&pool)
.await?;
```

#### JSON data

so songs and media_blobs use JSONB pg data types for arbitrary blobs of json.

they have a `{}` value set so there's less `NULL` checking needed. perhaps a different default could add root keys, like:

`metadata JSONB DEFAULT '{"artist": null, "genre": []}'::jsonb`

#### check constraints 4 data integrity

so could have db-level triggers or in app code like:

```sql
CHECK (char_length(title) > 0)
CHECK (array_length(genre, 1) <= 5)
CHECK (jsonb_typeof(metadata) = 'object')
```

#### a note about migrations

consider making them idempotent

```sql
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name='songs' AND column_name='genre'
  ) THEN
    ALTER TABLE songs ADD COLUMN genre TEXT;
  END IF;
END
$$;
```

run `electric migrate compile` to prepare migration output

run `electrify` in PGlite instance using a compiled schema


blob data
```js
// Say you have a Blob or File object
const file = new File([data], "song.wav");
const arrayBuffer = await file.arrayBuffer();
const uint8 = new Uint8Array(arrayBuffer);

// Save it to Electric
await db.media_blobs.create({
  data: uint8,  // this will go into BYTEA
  mime: file.type,
  sha256: await hashIt(uint8),
  size: file.size
});

// read audio
const audioBlob = new Blob([blobRow.data], { type: blobRow.mime });
const audioUrl = URL.createObjectURL(audioBlob);

const audio = new Audio(audioUrl);
audio.play(); // 👂💥

// read imgage data
const imageBlob = new Blob([blobRow.data], { type: blobRow.mime });
const imageUrl = URL.createObjectURL(imageBlob);

const img = document.createElement("img");
img.src = imageUrl;
document.body.appendChild(img);

// or jsx-style
const BlobImage = () => <img src={URL.createObjectURL(new Blob([blobRow.data], { type: blobRow.mime }))} />
// take care not to re-call createObjectURL every render — it leaks memory if you don't revoke it.
URL.revokeObjectURL(audioUrl);

```

#### notes on zod types

perhaps metadata blobs could begin to have some structure?? but still fall back `catchall` to any

```js
metadata: z
  .object({
    artist: z.string().optional(),
    bpm: z.number().optional(),
    tags: z.array(z.string()).optional(),
  })
  .catchall(z.any())
  .optional()
```

perhaps superRefine to help with all the optional()s when, e.g., creating new items from ui

```js
songsSchema.superRefine((data, ctx) => {
  if (!data.title && data.seconds) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "title must be present if seconds is provided",
      path: ['title'],
    })
  }
})
```

on `datetime({offset: true})

```js
// note: offset since db will be UTC
{
  created_at: z.string().datetime().optional()
}
// vs:
{
  created_at: z.string().datetime({ offset: true }).optional()
}
```

from https://zod.dev/api?ref=learnn.cc&id=iso-datetimes

```js
const datetime = z.iso.datetime();

datetime.parse("2020-01-01T00:00:00Z"); // ✅
datetime.parse("2020-01-01T00:00:00.123Z"); // ✅
datetime.parse("2020-01-01T00:00:00.123456Z"); // ✅ (arbitrary precision)
datetime.parse("2020-01-01T00:00:00+02:00"); // ❌ (no offsets allowed)
```

```js
const datetime = z.iso.datetime({ offset: true });

datetime.parse("2020-01-01T00:00:00+02:00"); // ✅
datetime.parse("2020-01-01T00:00:00.123+02:00"); // ✅ (millis optional)
datetime.parse("2020-01-01T00:00:00.123+0200"); // ✅ (millis optional)
datetime.parse("2020-01-01T00:00:00.123+02"); // ✅ (only offset hours)
datetime.parse("2020-01-01T00:00:00Z"); // ✅ (Z still supported)
```

#### some electric sync server setup

brew install elixir


```sh

git clone https://github.com/electric-sql/electric.git
cd electric

mix deps.get

echo 'DATABASE_URL=postgresql://postgres:password@localhost:5432/electric
ELECTRIC_WRITE_TO_PG_MODE=direct_writes
PG_PROXY_PASSWORD=youre_secure_pazzword
AUTH_MODE=insecure' > .env.prod

MIX_ENV=prod mix release
```

.env.example
```sh
DATABASE_URL=postgresql://postgres:password@localhost:5432/electric
ELECTRIC_INSECURE=true
ELECTRIC_WRITE_TO_PG_MODE=direct_writes
PG_PROXY_PASSWORD=youre_secure_pazzword
AUTH_MODE=insecure
```

start.sh
```sh
#!/bin/bash
set -a
source .env.prod
set +a
./_build/prod/rel/electric/bin/electric start
```

talk sql directly to pg!

```sh
docker exec -it electric_quickstart-postgres-1 psql -U postgres -d electric
```
```sql
INSERT INTO songs (
  id,
  artist,
  title,
  album,
  length,
  path,
  image_path,
  date_added
) VALUES (
  '4',
  'PARTY ANTHEMZ 444',
  'party anthem 444',
  'party anthem444z',
  44,
  '/music/party-anthemz4.mp3',
  '/images/party-anthemz4.jpg',
  CURRENT_TIMESTAMP
);
```


misc notes

`docker exec -i <container_name_or_id> psql -U postgres -d electric < init.sql`


#### pglite stuff

`/dev/blob`
PGlite has support for importing and exporting via the SQL COPY TO/FROM command by using a virtual /dev/blob device.

To import a file, pass the File or Blob in the query options as blob, and copy from the /dev/blob device.

```ts
await pg.query("COPY my_table FROM '/dev/blob';", [], {
  blob: MyBlob,
})
```

To export a table or query to a file, you just need to write to the /dev/blob device; the file will be returned as blob on the query results:

```ts
const ret = await pg.query("COPY my_table TO '/dev/blob';")
// ret.blob is a `Blob` object with the data from the copy.
```

REPL

```js
// npm install @electric-sql/pglite-repl
import { PGlite } from '@electric-sql/pglite'
import { Repl } from '@electric-sql/pglite-repl'

function MyComponent() {
  const pg = new PGlite()

  return (
    <>
      <Repl
        pg={pg}
        theme="dark"
        border?: boolean // Outer border on the component, defaults to false
        lightTheme?: Extension
        darkTheme?: Extension

      />
    </>
  )
}
```

pgdump for browser: https://pglite.dev/docs/pglite-tools

```js
import { PGlite } from '@electric-sql/pglite'
import { pgDump } from '@electric-sql/pglite-tools/pg_dump'

const pg = await PGlite.create()

// Create a table and insert some data
await pg.exec(`
  CREATE TABLE test (
    id SERIAL PRIMARY KEY,
    name TEXT
  );
`)
await pg.exec(`
  INSERT INTO test (name) VALUES ('test');
`)

// store the current search path so it can be used in the restored db
const initialSearchPath = (
  await pg1.query<{ search_path: string }>('SHOW SEARCH_PATH;')
).rows[0].search_path

// Dump the database to a file
const dump = await pgDump({ pg })
// Get the dump text - used for restore
const dumpContent = await dump.text()

// Create a new database
const restoredPG = await PGlite.create()
// ... and restore it using the dump
await restoredPG.exec(dumpContent)

// optional - after importing, set search path back to the initial one
await restoredPG.exec(`SET search_path TO ${initialSearchPath};`)
```

yay blob file handing https://pglite.dev/examples/copy

yay perl https://pglite.dev/examples/plpgsql

yay fts (full text search) https://pglite.dev/examples/fts

yay parametrised query https://pglite.dev/examples/query-params

note on worker import

```js
import PGWorker from './worker.js?worker'
export const pglite = new PGliteWorker(
  new PGWorker({
    type: 'module',
      name: 'pglite-worker',
    }),
    {
      // ...your options here
    }
  },
)
```

#### config

so a singleton table that only ever has one row (see schema/_create_config.sql)

🔁 In JS or SQL

```sql
SELECT * FROM config;
UPDATE config SET theme = 'dark';
```

or:

```ts
await db.config.update({
  where: { id: 'config' },
  set: { theme: 'dark' }
});
```

🔄 Optionally Seed Defaults
pre-load the single row in init.sql or seeds.sql:

```sql
INSERT INTO config (id, theme, volume, show_tips) VALUES ('config', 'light', 75, true);
```

or just rely on the defaults and:

```sql
INSERT INTO config DEFAULT VALUES;
```


#### other meandering notez


oh look into: `VitePWA`
```js
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
```

the "example-backend" https://github.com/electric-sql/electric/blob/main/.support/docker-compose.yml



raspi!

`/etc/systemd/system/boot-init.service`

```sh
[Unit]
Description=Run user-defined boot init script
After=network.target

[Service]
Type=oneshot
ExecStart=/bin/bash /boot/init.sh
ExecStartPost=/bin/mv /boot/init.sh /boot/init.sh.done
RemainAfterExit=true

[Install]
WantedBy=multi-user.target
```

enable it:

```sh
sudo systemctl daemon-reexec
sudo systemctl enable boot-init.service
```

ubuntu pi cloud init thing:

add this to sd card's `/boot/firmware/user-data` (or use the rapi imager)

```yaml
#cloud-config
hostname: mypi
users:
  - name: pi
    groups: sudo
    shell: /bin/bash
    sudo: ALL=(ALL) NOPASSWD:ALL
    lock_passwd: false
    plain_text_passwd: "raspberry"
runcmd:
  - apt update
  - apt install -y nginx
  - echo "Hello from user-data!" > /var/www/html/index.html
```

`/boot/firmware/network-config`

```yaml
version: 2
ethernets:
  eth0:
    dhcp4: true
```

browser persistance check

```js
/** Check if storage is persisted already.
  @returns {Promise<boolean>} Promise resolved with true if current origin is
  using persistent storage, false if not, and undefined if the API is not
  present.
*/
async function isStoragePersisted() {
  return await navigator.storage && navigator.storage.persisted ?
    navigator.storage.persisted() :
    undefined;
}

/** Tries to convert to persisted storage.
  @returns {Promise<boolean>} Promise resolved with true if successfully
  persisted the storage, false if not, and undefined if the API is not present.
*/
async function persist() {
  return await navigator.storage && navigator.storage.persist ?
    navigator.storage.persist() :
    undefined;
}

/** Queries available disk quota.
  @see https://developer.mozilla.org/en-US/docs/Web/API/StorageEstimate
  @returns {Promise<{quota: number, usage: number}>} Promise resolved with
  {quota: number, usage: number} or undefined.
*/
async function showEstimatedQuota() {
  return await navigator.storage && navigator.storage.estimate ?
    navigator.storage.estimate() :
    undefined;
}

/** Tries to persist storage without ever prompting user.
  @returns {Promise<string>}
    "never" In case persisting is not ever possible. Caller don't bother
      asking user for permission.
    "prompt" In case persisting would be possible if prompting user first.
    "persisted" In case this call successfully silently persisted the storage,
      or if it was already persisted.
*/
async function tryPersistWithoutPromtingUser() {
  if (!navigator.storage || !navigator.storage.persisted) {
    return "never";
  }
  let persisted = await navigator.storage.persisted();
  if (persisted) {
    return "persisted";
  }
  if (!navigator.permissions || !navigator.permissions.query) {
    return "prompt"; // It MAY be successful to prompt. Don't know.
  }
  const permission = await navigator.permissions.query({
    name: "persistent-storage"
  });
  if (permission.state === "granted") {
    persisted = await navigator.storage.persist();
    if (persisted) {
      return "persisted";
    } else {
      throw new Error("Failed to persist");
    }
  }
  if (permission.state === "prompt") {
    return "prompt";
  }
  return "never";
}

async function initStoragePersistence() {
  const persist = await tryPersistWithoutPromtingUser();
  switch (persist) {
    case "never":
      console.log("Not possible to persist storage");
      break;
    case "persisted":
      console.log("Successfully persisted storage silently");
      break;
    case "prompt":
      console.log("Not persisted, but we may prompt user when we want to.");
      // then do: navigator.storage.persist()
      break;
  }
}
```

some misc tauri js stuff

```rust
// # returing array bufferz
use tauri::ipc::Response;
#[tauri::command]
fn read_file() -> Response {
  let data = std::fs::read("/path/to/file").unwrap();
  tauri::ipc::Response::new(data)
}

// errorz
#[tauri::command]
fn login(user: String, password: String) -> Result<String, String> {
  if user == "tauri" && password == "tauri" {
    // resolve
    Ok("logged_in".to_string())
  } else {
    // reject
    Err("invalid credentials".to_string())
  }
}
// js example:
// invoke('login', { user: 'tauri', password: '0j4rijw8=' })
//   .then((message) => console.log(message))
//   .catch((error) => console.error(error));

// note on error typez
// create the error type that represents all errors possible in our program
#[derive(Debug, thiserror::Error)]
enum Error {
  #[error(transparent)]
  Io(#[from] std::io::Error)
}

// we must manually implement serde::Serialize
impl serde::Serialize for Error {
  fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
  where
    S: serde::ser::Serializer,
  {
    serializer.serialize_str(self.to_string().as_ref())
  }
}

#[tauri::command]
fn my_custom_command() -> Result<(), Error> {
  // This will return an error
  std::fs::File::open("path/that/does/not/exist")?;
  // Return `null` on success
  Ok(())
}
```
