CREATE TABLE IF NOT EXISTS echoe_state (
    owner_id UUID PRIMARY KEY,
    version BIGINT NOT NULL DEFAULT 1,
    state JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS echoe_history (
    seq BIGSERIAL PRIMARY KEY,
    owner_id UUID NOT NULL,
    version BIGINT NOT NULL,
    action TEXT NOT NULL,
    state JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS echoe_history_owner_seq_idx
ON echoe_history (owner_id, seq DESC);

CREATE TABLE IF NOT EXISTS echoe_accounts (
    owner_id UUID PRIMARY KEY,
    handle TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    password_salt TEXT,
    password_hash TEXT,
    auth_provider TEXT NOT NULL DEFAULT 'password',
    google_sub TEXT,
    email TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE echoe_accounts ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'password';
ALTER TABLE echoe_accounts ADD COLUMN IF NOT EXISTS google_sub TEXT;
ALTER TABLE echoe_accounts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE echoe_accounts ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE echoe_accounts ALTER COLUMN password_salt DROP NOT NULL;
ALTER TABLE echoe_accounts ALTER COLUMN password_hash DROP NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS echoe_accounts_google_sub_idx
ON echoe_accounts (google_sub)
WHERE google_sub IS NOT NULL;
