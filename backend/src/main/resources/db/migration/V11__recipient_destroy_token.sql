-- SHA-256 (base64url) of the token a recipient presents to destroy a send. NULL = option off.
-- The token itself is derived client-side from the send key and is never stored.
ALTER TABLE sends ADD COLUMN recipient_destroy_token_hash VARCHAR(64);

-- Instance-wide switch for recipient destruction (new sends only). Default: enabled.
INSERT INTO instance_settings (key, value) VALUES ('allow_recipient_destroy', 'true');
