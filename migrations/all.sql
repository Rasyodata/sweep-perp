-- ===== AUTH (scaffold) =====
CREATE TABLE IF NOT EXISTS _auth_user (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  pass TEXT NOT NULL,
  created TEXT
);
CREATE TABLE IF NOT EXISTS _auth_session (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created TEXT,
  expires TEXT
);

-- ===== CORE.AUTH =====
-- CORE.AUTH schema (generated from manifest)
CREATE TABLE IF NOT EXISTS auth_session (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  token TEXT,
  expires_at TEXT
);

-- ===== CORE.USERS =====
-- CORE.USERS schema (generated from manifest)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  active INTEGER DEFAULT 1
);

-- ===== CORE.ROLES =====
-- CORE.ROLES schema (generated from manifest)
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);
