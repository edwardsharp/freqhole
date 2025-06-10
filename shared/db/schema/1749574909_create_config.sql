-- :electric:txn:start

CREATE TABLE config (
    -- so this is a singleton table, there will only ever be 1 row
    id TEXT PRIMARY KEY DEFAULT 'config',
    shared JSONB DEFAULT '{}'::jsonb,
    app JSONB DEFAULT '{}'::jsonb,
    server JSONB DEFAULT '{}'::jsonb,
    appstate JSONB DEFAULT '{}'::jsonb,
    playerstate JSONB DEFAULT '{}'::jsonb,
    sources JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
);

-- :electric:txn:end
