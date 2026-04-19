-- Password Manager credentials table
CREATE TABLE IF NOT EXISTS credentials (
    id TEXT PRIMARY KEY,
    site TEXT NOT NULL,
    username TEXT NOT NULL,
    password_encrypted TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_autofilled_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_credentials_site ON credentials(site);
CREATE UNIQUE INDEX IF NOT EXISTS idx_credentials_site_user ON credentials(site, username);
