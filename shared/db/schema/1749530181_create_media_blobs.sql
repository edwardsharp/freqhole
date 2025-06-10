-- :electric:txn:start
CREATE TABLE media_blobs (
    -- id UUID PRIMARY KEY,
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    sha256 TEXT NOT NULL,
    size BIGINT,
    mime TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
    source_client_id TEXT,
    local_path TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
);

CREATE INDEX idx_media_blobs_path ON media_blobs (path);

CREATE INDEX idx_media_blobs_client_id ON media_blobs (client_id);

CREATE INDEX idx_media_blobs_created_at ON media_blobs (created_at DESC);

-- consider JSON indxes at some point?
-- CREATE INDEX idx_media_blobs_metadata_artist ON media_blobs ((metadata - > > 'artist'));
-- :electric:txn:end
