-- Keep non-sensitive send metadata once the payload is gone, so users can browse their send history.
ALTER TABLE deleted_sends ADD COLUMN name            VARCHAR(255);
ALTER TABLE deleted_sends ADD COLUMN expires_at      TIMESTAMP;
ALTER TABLE deleted_sends ADD COLUMN max_downloads   INTEGER;
ALTER TABLE deleted_sends ADD COLUMN download_count  INTEGER;

CREATE INDEX idx_deleted_sends_owner_deleted_at ON deleted_sends (owner_id, deleted_at DESC);
