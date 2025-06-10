CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS schema_versions (
  filename TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- initializes DB by running each timestamped migration
\i 1749530140_create_songs.sql
\i 1749530181_create_media_blobs.sql
\i 1749530218_create_playlists.sql
\i 1749530244_playlist_songs.sql
\i 1749574909_create_config.sql
\i 1749582703_create_favz.sql
