-- CORE.USERS schema (generated from manifest)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  active INTEGER DEFAULT 1
);