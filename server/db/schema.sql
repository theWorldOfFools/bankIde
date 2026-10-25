BEGIN;

DO $$
BEGIN
  IF to_regclass('public.admin_users') IS NOT NULL
     AND to_regclass('public.users') IS NULL THEN
    ALTER TABLE admin_users RENAME TO users;
  END IF;
END
$$;

DO $$
BEGIN
  IF to_regclass('public.admin_users_email_uidx') IS NOT NULL
     AND to_regclass('public.users_email_uidx') IS NULL THEN
    ALTER INDEX admin_users_email_uidx RENAME TO users_email_uidx;
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user'
    CONSTRAINT users_role_check CHECK (role IN ('admin', 'user')),
  status TEXT NOT NULL DEFAULT 'pending_email'
    CONSTRAINT users_status_check CHECK (
      status IN ('pending_email', 'pending_approval', 'active', 'rejected')
    ),
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

UPDATE users SET role = 'admin' WHERE role IS NULL;
ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user';
ALTER TABLE users ALTER COLUMN role SET NOT NULL;

UPDATE users SET status = 'active' WHERE status IS NULL;
ALTER TABLE users ALTER COLUMN status SET DEFAULT 'pending_email';
ALTER TABLE users ALTER COLUMN status SET NOT NULL;

UPDATE users
SET email_verified_at = COALESCE(created_at, NOW())
WHERE email_verified_at IS NULL AND status = 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'users'::regclass AND conname = 'users_role_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_role_check
      CHECK (role IN ('admin', 'user'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'users'::regclass AND conname = 'users_status_check'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_status_check
      CHECK (status IN ('pending_email', 'pending_approval', 'active', 'rejected'));
  END IF;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS users_email_uidx
  ON users (lower(email));

CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS email_verification_tokens_user_idx
  ON email_verification_tokens (user_id, created_at DESC);

DO $$
BEGIN
  CREATE TYPE idea_status AS ENUM ('idea', 'planned', 'in_progress', 'done', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

CREATE TABLE IF NOT EXISTS ideas (
  id BIGSERIAL PRIMARY KEY,
  owner_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
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

ALTER TABLE ideas
  ADD COLUMN IF NOT EXISTS owner_id BIGINT REFERENCES users(id) ON DELETE CASCADE;

UPDATE ideas
SET owner_id = (
  SELECT id FROM users
  WHERE role = 'admin'
  ORDER BY id ASC
  LIMIT 1
)
WHERE owner_id IS NULL;

CREATE INDEX IF NOT EXISTS ideas_owner_idx ON ideas (owner_id);
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
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS user_id BIGINT REFERENCES users(id) ON DELETE CASCADE;

UPDATE push_subscriptions
SET user_id = (
  SELECT id FROM users
  WHERE role = 'admin'
  ORDER BY id ASC
  LIMIT 1
)
WHERE user_id IS NULL;

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
  ON push_subscriptions (user_id);

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
