-- Vela 2.0 Migration: Playback Sessions
-- Adds session-based streaming support with self-healing

-- ─────────────────────────────────────────────────────────────
-- Playback Sessions Table
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS playback_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  
  -- Stream data
  upstream_url TEXT NOT NULL,
  upstream_expiry INTEGER NOT NULL,
  quality TEXT DEFAULT '1080p',
  source TEXT NOT NULL,
  
  -- Resolution metadata
  info_hash TEXT,
  file_idx INTEGER,
  filename TEXT,
  
  -- Playback state
  position INTEGER DEFAULT 0,
  duration INTEGER DEFAULT 0,
  last_heartbeat INTEGER,
  
  -- Episode context
  season INTEGER,
  episode INTEGER,
  next_episode_session_id TEXT,
  
  -- Lifecycle
  status TEXT DEFAULT 'active',
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_sessions_user ON playback_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON playback_sessions(status);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON playback_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_content ON playback_sessions(external_id, season, episode);

-- ─────────────────────────────────────────────────────────────
-- Resolved Streams Cache Table
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS resolved_streams (
  id TEXT PRIMARY KEY,
  content_key TEXT NOT NULL,
  
  -- Stream data
  source TEXT NOT NULL,
  provider TEXT NOT NULL,
  quality TEXT NOT NULL,
  stream_url TEXT NOT NULL,
  
  -- Resolution details
  info_hash TEXT,
  file_idx INTEGER,
  filename TEXT,
  size INTEGER,
  
  -- Lifecycle
  resolved_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  last_used_at INTEGER,
  use_count INTEGER DEFAULT 0,
  
  -- Reliability tracking
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  avg_latency INTEGER,
  
  UNIQUE(content_key, source, quality)
);

CREATE INDEX IF NOT EXISTS idx_resolved_content ON resolved_streams(content_key);
CREATE INDEX IF NOT EXISTS idx_resolved_expires ON resolved_streams(expires_at);
