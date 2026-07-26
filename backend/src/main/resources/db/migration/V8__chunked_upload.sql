ALTER TABLE files ADD COLUMN chunk_size INTEGER;

CREATE TABLE upload_sessions (
    id           UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    send_id      UUID         NOT NULL REFERENCES sends(id) ON DELETE CASCADE,
    filename     VARCHAR(255) NOT NULL,
    created_at   TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE upload_chunks (
    id           UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id   UUID         NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
    chunk_index  INTEGER      NOT NULL,
    storage_path VARCHAR(512) NOT NULL,
    size_bytes   BIGINT       NOT NULL,
    UNIQUE (session_id, chunk_index)
);