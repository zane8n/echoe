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

CREATE TABLE IF NOT EXISTS echoe_friend_invites (
    id UUID PRIMARY KEY,
    token_hash TEXT UNIQUE NOT NULL,
    inviter_id UUID NOT NULL REFERENCES echoe_accounts(owner_id) ON DELETE CASCADE,
    accepted_by UUID REFERENCES echoe_accounts(owner_id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS echoe_friendships (
    owner_a UUID NOT NULL REFERENCES echoe_accounts(owner_id) ON DELETE CASCADE,
    owner_b UUID NOT NULL REFERENCES echoe_accounts(owner_id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (owner_a, owner_b),
    CHECK (owner_a::text < owner_b::text)
);

CREATE TABLE IF NOT EXISTS echoe_path_shares (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL REFERENCES echoe_accounts(owner_id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES echoe_accounts(owner_id) ON DELETE CASCADE,
    event_id TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('spectator', 'participant')),
    allow_extra_checkins BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (owner_id, friend_id, event_id)
);

CREATE INDEX IF NOT EXISTS echoe_path_shares_friend_idx
ON echoe_path_shares (friend_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS echoe_shared_checkins (
    share_id UUID NOT NULL REFERENCES echoe_path_shares(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES echoe_accounts(owner_id) ON DELETE CASCADE,
    checkin_date DATE NOT NULL,
    count SMALLINT NOT NULL DEFAULT 1 CHECK (count BETWEEN 1 AND 20),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (share_id, member_id, checkin_date)
);

CREATE TABLE IF NOT EXISTS echoe_social_events (
    seq BIGSERIAL PRIMARY KEY,
    owner_id UUID NOT NULL,
    action TEXT NOT NULL,
    subject_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS echoe_social_events_owner_seq_idx
ON echoe_social_events (owner_id, seq DESC);
