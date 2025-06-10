-- :electric:txn:start
CREATE TABLE songs (
    -- id UUID PRIMARY KEY,
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    blob_id UUID NOT NULL,
    title TEXT,
    artist TEXT,
    album TEXT,
    seconds INTEGER,
    client_id TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
    metadata JSONB DEFAULT '{}'::jsonb,
);

CREATE INDEX idx_songs_title ON songs (title);

CREATE INDEX idx_songs_artist ON songs (artist);

CREATE INDEX idx_songs_album ON songs (album);

CREATE INDEX idx_songs_client_id ON songs (client_id);

CREATE INDEX idx_songs_date_added ON songs (date_added DESC);

-- :electric:txn:end
