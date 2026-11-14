-- Sambad demo feedback: D1 (SQLite) schema.
-- One row per feedback entry sent from the clickable mock. Raw IP addresses
-- are never stored, only a salted hash used for rate limiting.
-- Apply with: npx wrangler d1 execute sambad-feedback --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS feedback (
  id           TEXT PRIMARY KEY,  -- made by the page, so a retried send never duplicates
  received_at  TEXT NOT NULL,     -- ISO time the Worker accepted it
  created_at   TEXT,              -- ISO time the visitor wrote it (may be earlier if sent offline)
  device       TEXT NOT NULL,     -- random id kept in the visitor's browser
  ip_hash      TEXT NOT NULL,
  kind         TEXT NOT NULL,     -- feedback, vote, question, price
  rating       INTEGER,           -- 1 to 5, "how useful would this be at your work"
  topics       TEXT,              -- comma separated: confusing, missing, idea, bug, pricing, like
  message      TEXT,
  screen       TEXT,              -- page title the visitor was on
  route        TEXT,              -- the mock's hash route
  target       TEXT,              -- the element they pointed at, or the feature they voted for
  role         TEXT,
  company_size TEXT,
  contact      TEXT,
  demo_role    TEXT,              -- employee or admin, which side of the demo they used
  msg_hash     TEXT
);

CREATE INDEX IF NOT EXISTS idx_feedback_ip  ON feedback (ip_hash, received_at);
CREATE INDEX IF NOT EXISTS idx_feedback_dev ON feedback (device, received_at);
CREATE INDEX IF NOT EXISTS idx_feedback_msg ON feedback (msg_hash, received_at);
