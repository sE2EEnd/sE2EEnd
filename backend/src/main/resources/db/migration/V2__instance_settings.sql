CREATE TABLE instance_settings (
    key   VARCHAR(100) NOT NULL PRIMARY KEY,
    value TEXT         NOT NULL
);

INSERT INTO instance_settings (key, value) VALUES
    ('require_auth_for_download', 'true');
