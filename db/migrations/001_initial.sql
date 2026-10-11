CREATE TABLE games (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  coverKey TEXT NOT NULL UNIQUE,
  minPlayers INTEGER NOT NULL CHECK(minPlayers > 0),
  maxPlayers INTEGER NOT NULL CHECK(maxPlayers >= minPlayers),
  bestPlayerCounts TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(bestPlayerCounts)),
  durationMinutes INTEGER NOT NULL CHECK(durationMinutes > 0),
  tags TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(tags)),
  description TEXT NOT NULL DEFAULT '',
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);
CREATE TABLE admin_sessions (
  tokenHash TEXT PRIMARY KEY,
  createdAt INTEGER NOT NULL,
  expiresAt INTEGER NOT NULL
);
CREATE INDEX sessions_expiry ON admin_sessions(expiresAt);
CREATE TABLE login_attempts (
  bucket TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  expiresAt INTEGER NOT NULL
);
