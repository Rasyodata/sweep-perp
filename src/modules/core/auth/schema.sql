-- CORE.AUTH schema (generated from manifest)
CREATE TABLE IF NOT EXISTS auth_session (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  token TEXT,
  expires_at TEXT
);