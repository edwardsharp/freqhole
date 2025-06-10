# Media Library Sync Example (ElectricSQL-style)

...

## Schema Migrations

Migrations are stored in `schema/` and executed in timestamp order.
Use Unix timestamps in the file names to preserve order.

apply all:
```bash
psql -U postgres -d yourdb -f schema/init.sql
```

seed:
```bash
psql -U postgres -d yourdb -f schema/seeds.sql
```

### electric
install the electric cli `npm install -g @electric-sql/cli`
then compile with electric: `electric migrate compile schema/`

...then restart your sync server (or client with hot reload)


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


#### other meandering notez

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
