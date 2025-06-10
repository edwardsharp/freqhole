-- :electric:txn:start
CREATE TABLE playlist_items (
    playlist_id UUID NOT NULL,
    song_id UUID NOT NULL,
    position INTEGER,
    PRIMARY KEY (playlist_id, song_id)
);

CREATE INDEX idx_playlist_items_playlist_id ON playlist_items (playlist_id);

CREATE INDEX idx_playlist_items_song_id ON playlist_items (song_id);

CREATE INDEX idx_playlist_items_playlist_id_position ON playlist_items (playlist_id, position);

-- :electric:txn:end
