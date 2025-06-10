-- :electric:txn:start
CREATE TABLE playlists (
    -- id UUID PRIMARY KEY,
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    title TEXT,
    description TEXT,
    image TEXT,
    client_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now ()
);

CREATE INDEX idx_playlists_title ON playlists (title);

CREATE INDEX idx_playlists_client_id ON playlists (client_id);

CREATE INDEX idx_playlists_created_at ON playlists (created_at DESC);

-- :electric:txn:end
