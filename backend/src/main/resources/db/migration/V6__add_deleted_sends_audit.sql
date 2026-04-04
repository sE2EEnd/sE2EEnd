CREATE TABLE deleted_sends (
    id               UUID         NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    original_send_id UUID         NOT NULL,
    access_id        VARCHAR(22),
    owner_id         UUID,
    owner_name       VARCHAR(255),
    owner_email      VARCHAR(255),
    send_created_at  TIMESTAMP,
    deleted_at       TIMESTAMP    NOT NULL,
    delete_reason    VARCHAR(50)  NOT NULL,
    file_count       INTEGER      NOT NULL DEFAULT 0,
    total_size_bytes BIGINT       NOT NULL DEFAULT 0
);
