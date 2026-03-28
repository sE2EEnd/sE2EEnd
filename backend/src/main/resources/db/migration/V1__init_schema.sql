CREATE TABLE sends (
    id               UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    access_id        VARCHAR(22)  NOT NULL UNIQUE,
    owner_id         UUID,
    owner_name       VARCHAR(255),
    owner_email      VARCHAR(255),
    name             VARCHAR(255),
    type             VARCHAR(50)  NOT NULL,
    encrypted_metadata TEXT,
    expires_at       TIMESTAMP,
    max_downloads    INTEGER      NOT NULL DEFAULT 1,
    download_count   INTEGER      NOT NULL DEFAULT 0,
    password_protected BOOLEAN    NOT NULL DEFAULT FALSE,
    password_hash    VARCHAR(60),
    created_at       TIMESTAMP    NOT NULL,
    revoked          BOOLEAN      NOT NULL DEFAULT FALSE
);

CREATE TABLE files (
    id           UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    send_id      UUID          NOT NULL REFERENCES sends (id) ON DELETE CASCADE,
    filename     VARCHAR(255)  NOT NULL,
    storage_path VARCHAR(512)  NOT NULL,
    size_bytes   BIGINT        NOT NULL,
    checksum     VARCHAR(128)
);