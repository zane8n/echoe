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
    password_salt TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
