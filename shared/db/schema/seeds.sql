INSERT INTO
    media_blobs (id, path, metadata)
VALUES
    (
        gen_random_uuid (),
        '/media/tracks/randomer_stomp.mp3',
        '{
    "title": "Stomp",
    "artist": "Randomer",
    "album": "L.I.E.S.",
    "year": 2017,
    "genre": ["Techno", "UK Bass"]
  }'
    );

INSERT INTO
    media_blobs (
        id,
        sha256,
        size,
        mime,
        source_client_id,
        local_path
    )
VALUES
    (
        '00000000-0000-0000-0000-000000000001',
        'sha256:abc',
        1234567,
        'audio/wav',
        'laptop-01',
        '/music/forest.wav'
    );

INSERT INTO
    songs (id, blob_id, title, artist, album, client_id)
VALUES
    (
        '00000000-0000-0000-0000-000000000010',
        '00000000-0000-0000-0000-000000000001',
        'Forest Rave',
        'Randomer',
        'White Label',
        'laptop-01'
    );

INSERT INTO
    playlists (id, title, description, client_id)
VALUES
    (
        '00000000-0000-0000-0000-000000000100',
        'Party Mix',
        'High energy tracks',
        'laptop-01'
    );

INSERT INTO
    playlist_items (id, playlist_id, song_id, position)
VALUES
    (
        '00000000-0000-0000-0000-000000000200',
        '00000000-0000-0000-0000-000000000100',
        '00000000-0000-0000-0000-000000000010',
        1
    );
