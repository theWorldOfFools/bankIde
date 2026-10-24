BEGIN;

DO $$
BEGIN
  CREATE TYPE idea_status AS ENUM ('idea', 'planned', 'in_progress', 'done', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS admin_users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_uidx
  ON admin_users (lower(email));

CREATE TABLE IF NOT EXISTS ideas (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  category TEXT NOT NULL CHECK (char_length(btrim(category)) BETWEEN 1 AND 80),
  context TEXT NOT NULL DEFAULT '',
  v1_features TEXT NOT NULL DEFAULT '',
  solution TEXT NOT NULL DEFAULT '',
  agency_prompt TEXT NOT NULL DEFAULT '',
  status idea_status NOT NULL DEFAULT 'idea',
  reminder_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ideas_category_idx ON ideas (category);
CREATE INDEX IF NOT EXISTS ideas_status_idx ON ideas (status);
CREATE INDEX IF NOT EXISTS ideas_reminder_idx ON ideas (reminder_at)
  WHERE reminder_at IS NOT NULL;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ideas_set_updated_at ON ideas;
CREATE TRIGGER ideas_set_updated_at
BEFORE UPDATE ON ideas
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS recommended_ideas (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  v1_features TEXT NOT NULL DEFAULT '',
  solution TEXT NOT NULL DEFAULT '',
  agency_prompt TEXT NOT NULL DEFAULT '',
  potential_score SMALLINT NOT NULL DEFAULT 70
    CHECK (potential_score BETWEEN 1 AND 100),
  source TEXT NOT NULL DEFAULT 'curated'
    CHECK (source IN ('ai', 'curated')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE recommended_ideas
  ADD COLUMN IF NOT EXISTS v1_features TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS solution TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS agency_prompt TEXT NOT NULL DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS recommended_ideas_identity_uidx
  ON recommended_ideas (lower(title), category);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id BIGSERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS reminder_deliveries (
  id BIGSERIAL PRIMARY KEY,
  idea_id BIGINT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  reminder_at TIMESTAMPTZ NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('push', 'email')),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts SMALLINT NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (idea_id, reminder_at, channel)
);

CREATE INDEX IF NOT EXISTS reminder_deliveries_due_idx
  ON reminder_deliveries (status, next_attempt_at)
  WHERE status IN ('pending', 'failed');

COMMIT;
