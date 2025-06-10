-- :electric:txn:start
CREATE TABLE playlist_songs (
    playlist_id UUID NOT NULL,
    song_id UUID NOT NULL,
    position INTEGER,
    PRIMARY KEY (playlist_id, song_id)
);

CREATE INDEX idx_playlist_songs_playlist_id ON playlist_songs (playlist_id);

CREATE INDEX idx_playlist_songs_song_id ON playlist_songs (song_id);

CREATE INDEX idx_playlist_songs_playlist_id_position ON playlist_songs (playlist_id, position);

-- :electric:txn:end
