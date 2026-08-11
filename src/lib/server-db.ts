import "server-only";

import { neon } from "@neondatabase/serverless";
import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import type { AccountSummary, AuditAction, CheerNotice, DashboardState, FriendInvite, FriendRole, FriendSummary, MilestoneEvent, SharedPathSummary, SocialSnapshot } from "./types";

export interface RemoteStateRecord {
    state: DashboardState;
    version: number;
    updatedAt: string;
}

let schemaPromise: Promise<void> | null = null;

const derivePasswordKey = (password: string, salt: string, length = 64) =>
    new Promise<Buffer>((resolve, reject) => {
        scryptCallback(password, salt, length, (error, key) => {
            if (error) reject(error);
            else resolve(key);
        });
    });

const connectionString = () => {
    const value = process.env.DATABASE_URL;
    if (!value) throw new Error("DATABASE_URL is not configured");
    return value;
};

const ensureSchema = async () => {
    if (!schemaPromise) {
        schemaPromise = (async () => {
            const sql = neon(connectionString());
            await sql`
                CREATE TABLE IF NOT EXISTS echoe_state (
                    owner_id UUID PRIMARY KEY,
                    version BIGINT NOT NULL DEFAULT 1,
                    state JSONB NOT NULL,
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `;
            await sql`
                CREATE TABLE IF NOT EXISTS echoe_history (
                    seq BIGSERIAL PRIMARY KEY,
                    owner_id UUID NOT NULL,
                    version BIGINT NOT NULL,
                    action TEXT NOT NULL,
                    state JSONB NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `;
            await sql`
                CREATE INDEX IF NOT EXISTS echoe_history_owner_seq_idx
                ON echoe_history (owner_id, seq DESC)
            `;
            await sql`
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
                )
            `;
            await sql`ALTER TABLE echoe_accounts ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'password'`;
            await sql`ALTER TABLE echoe_accounts ADD COLUMN IF NOT EXISTS google_sub TEXT`;
            await sql`ALTER TABLE echoe_accounts ADD COLUMN IF NOT EXISTS email TEXT`;
            await sql`ALTER TABLE echoe_accounts ADD COLUMN IF NOT EXISTS avatar_url TEXT`;
            await sql`ALTER TABLE echoe_accounts ALTER COLUMN password_salt DROP NOT NULL`;
            await sql`ALTER TABLE echoe_accounts ALTER COLUMN password_hash DROP NOT NULL`;
            await sql`CREATE UNIQUE INDEX IF NOT EXISTS echoe_accounts_google_sub_idx ON echoe_accounts (google_sub) WHERE google_sub IS NOT NULL`;
            await sql`
                CREATE TABLE IF NOT EXISTS echoe_friend_invites (
                    id UUID PRIMARY KEY,
                    token_hash TEXT UNIQUE NOT NULL,
                    inviter_id UUID NOT NULL REFERENCES echoe_accounts(owner_id) ON DELETE CASCADE,
                    accepted_by UUID REFERENCES echoe_accounts(owner_id) ON DELETE SET NULL,
                    expires_at TIMESTAMPTZ NOT NULL,
                    accepted_at TIMESTAMPTZ,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `;
            await sql`
                CREATE TABLE IF NOT EXISTS echoe_friendships (
                    owner_a UUID NOT NULL REFERENCES echoe_accounts(owner_id) ON DELETE CASCADE,
                    owner_b UUID NOT NULL REFERENCES echoe_accounts(owner_id) ON DELETE CASCADE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    PRIMARY KEY (owner_a, owner_b),
                    CHECK (owner_a::text < owner_b::text)
                )
            `;
            await sql`
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
                )
            `;
            await sql`
                CREATE TABLE IF NOT EXISTS echoe_shared_checkins (
                    share_id UUID NOT NULL REFERENCES echoe_path_shares(id) ON DELETE CASCADE,
                    member_id UUID NOT NULL REFERENCES echoe_accounts(owner_id) ON DELETE CASCADE,
                    checkin_date DATE NOT NULL,
                    count SMALLINT NOT NULL DEFAULT 1 CHECK (count BETWEEN 1 AND 20),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    PRIMARY KEY (share_id, member_id, checkin_date)
                )
            `;
            await sql`
                CREATE TABLE IF NOT EXISTS echoe_social_events (
                    seq BIGSERIAL PRIMARY KEY,
                    owner_id UUID NOT NULL,
                    action TEXT NOT NULL,
                    subject_id TEXT,
                    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `;
            await sql`CREATE INDEX IF NOT EXISTS echoe_social_events_owner_seq_idx ON echoe_social_events (owner_id, seq DESC)`;
            await sql`CREATE INDEX IF NOT EXISTS echoe_path_shares_friend_idx ON echoe_path_shares (friend_id, updated_at DESC)`;
        })().catch((error) => {
            schemaPromise = null;
            throw error;
        });
    }
    return schemaPromise;
};

export const databaseConfigured = () => Boolean(process.env.DATABASE_URL);

interface StoredAccount extends AccountSummary {
    ownerId: string;
    passwordSalt?: string;
    passwordHash?: string;
}

const accountFromRow = (row: Record<string, unknown>): StoredAccount => ({
    ownerId: String(row.owner_id),
    handle: String(row.handle),
    displayName: String(row.display_name),
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    authProvider: (row.auth_provider as AccountSummary["authProvider"]) ?? "password",
    email: row.email ? String(row.email) : undefined,
    passwordSalt: row.password_salt ? String(row.password_salt) : undefined,
    passwordHash: row.password_hash ? String(row.password_hash) : undefined,
});

const publicAccount = (account: StoredAccount): AccountSummary => ({
    displayName: account.displayName,
    handle: account.handle,
    createdAt: account.createdAt,
    authProvider: account.authProvider,
    email: account.email,
});

export class AccountConflictError extends Error {}

export async function readAccount(ownerId: string): Promise<AccountSummary | null> {
    await ensureSchema();
    const sql = neon(connectionString());
    const rows = await sql`
        SELECT owner_id, handle, display_name, auth_provider, email, created_at
        FROM echoe_accounts
        WHERE owner_id = ${ownerId}::uuid
        LIMIT 1
    `;
    return rows[0] ? publicAccount(accountFromRow(rows[0] as Record<string, unknown>)) : null;
}

export async function registerAccount(
    ownerId: string,
    displayName: string,
    handle: string,
    password: string,
): Promise<AccountSummary> {
    await ensureSchema();
    const sql = neon(connectionString());
    const salt = randomBytes(16).toString("base64url");
    const passwordHash = (await derivePasswordKey(password, salt)).toString("base64url");
    try {
        const rows = await sql`
            INSERT INTO echoe_accounts (owner_id, handle, display_name, password_salt, password_hash)
            VALUES (${ownerId}::uuid, ${handle}, ${displayName}, ${salt}, ${passwordHash})
            RETURNING owner_id, handle, display_name, created_at
        `;
        return publicAccount(accountFromRow(rows[0] as Record<string, unknown>));
    } catch (error) {
        if ((error as { code?: string }).code === "23505") throw new AccountConflictError("That handle is already in use.");
        throw error;
    }
}

export interface GoogleProfile {
    sub: string;
    email: string;
    name: string;
    picture?: string;
}

export async function connectGoogleAccount(
    currentOwnerId: string,
    profile: GoogleProfile,
): Promise<{ account: AccountSummary; ownerId: string; switchedOwner: boolean }> {
    await ensureSchema();
    const sql = neon(connectionString());

    const existingGoogle = await sql`
        SELECT owner_id, handle, display_name, auth_provider, email, created_at
        FROM echoe_accounts
        WHERE google_sub = ${profile.sub}
        LIMIT 1
    `;
    if (existingGoogle[0]) {
        const account = accountFromRow(existingGoogle[0] as Record<string, unknown>);
        return { account: publicAccount(account), ownerId: account.ownerId, switchedOwner: account.ownerId !== currentOwnerId };
    }

    const existingOwner = await sql`
        SELECT owner_id, handle, display_name, auth_provider, email, created_at
        FROM echoe_accounts
        WHERE owner_id = ${currentOwnerId}::uuid
        LIMIT 1
    `;
    if (existingOwner[0]) {
        const rows = await sql`
            UPDATE echoe_accounts
            SET google_sub = ${profile.sub},
                email = ${profile.email},
                avatar_url = ${profile.picture ?? null},
                auth_provider = CASE WHEN password_hash IS NULL THEN 'google' ELSE 'password+google' END,
                updated_at = NOW()
            WHERE owner_id = ${currentOwnerId}::uuid
            RETURNING owner_id, handle, display_name, auth_provider, email, created_at
        `;
        return { account: publicAccount(accountFromRow(rows[0] as Record<string, unknown>)), ownerId: currentOwnerId, switchedOwner: false };
    }

    const generatedHandle = `g-${currentOwnerId.replaceAll("-", "").slice(0, 18)}`;
    const rows = await sql`
        INSERT INTO echoe_accounts (
            owner_id, handle, display_name, auth_provider, google_sub, email, avatar_url
        ) VALUES (
            ${currentOwnerId}::uuid, ${generatedHandle}, ${profile.name}, 'google',
            ${profile.sub}, ${profile.email}, ${profile.picture ?? null}
        )
        RETURNING owner_id, handle, display_name, auth_provider, email, created_at
    `;
    return { account: publicAccount(accountFromRow(rows[0] as Record<string, unknown>)), ownerId: currentOwnerId, switchedOwner: false };
}

export async function authenticateAccount(handle: string, password: string): Promise<(AccountSummary & { ownerId: string }) | null> {
    await ensureSchema();
    const sql = neon(connectionString());
    const rows = await sql`
        SELECT owner_id, handle, display_name, password_salt, password_hash, auth_provider, email, created_at
        FROM echoe_accounts
        WHERE handle = ${handle}
        LIMIT 1
    `;
    if (!rows[0]) return null;
    const account = accountFromRow(rows[0] as Record<string, unknown>);
    if (!account.passwordHash || !account.passwordSalt) return null;
    const expected = Buffer.from(account.passwordHash ?? "", "base64url");
    const actual = await derivePasswordKey(password, account.passwordSalt ?? "", expected.length);
    if (!expected.length || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    return {
        ownerId: account.ownerId,
        handle: account.handle,
        displayName: account.displayName,
        createdAt: account.createdAt,
    };
}

export async function readRemoteState(ownerId: string): Promise<RemoteStateRecord | null> {
    await ensureSchema();
    const sql = neon(connectionString());
    const rows = await sql`
        SELECT state, version, updated_at
        FROM echoe_state
        WHERE owner_id = ${ownerId}::uuid
        LIMIT 1
    `;
    const row = rows[0] as { state: DashboardState; version: string | number; updated_at: string | Date } | undefined;
    if (!row) return null;
    return {
        state: row.state,
        version: Number(row.version),
        updatedAt: new Date(row.updated_at).toISOString(),
    };
}

export async function writeRemoteState(
    ownerId: string,
    state: DashboardState,
    action: AuditAction,
): Promise<RemoteStateRecord> {
    await ensureSchema();
    const sql = neon(connectionString());
    const serialized = JSON.stringify(state);
    const rows = await sql`
        WITH saved AS (
            INSERT INTO echoe_state (owner_id, version, state, updated_at)
            VALUES (${ownerId}::uuid, 1, ${serialized}::jsonb, NOW())
            ON CONFLICT (owner_id) DO UPDATE
            SET version = echoe_state.version + 1,
                state = EXCLUDED.state,
                updated_at = NOW()
            RETURNING version, state, updated_at
        ), logged AS (
            INSERT INTO echoe_history (owner_id, version, action, state)
            SELECT ${ownerId}::uuid, version, ${action}, state FROM saved
        )
        SELECT version, state, updated_at FROM saved
    `;
    const row = rows[0] as { state: DashboardState; version: string | number; updated_at: string | Date };
    return {
        state: row.state,
        version: Number(row.version),
        updatedAt: new Date(row.updated_at).toISOString(),
    };
}

const inviteHash = (token: string) => createHash("sha256").update(token).digest("hex");
const orderedOwners = (first: string, second: string) => first.toLowerCase() < second.toLowerCase() ? [first, second] : [second, first];
const safeDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0, 10);

const logSocialEvent = async (ownerId: string, action: string, subjectId?: string, metadata: Record<string, unknown> = {}) => {
    const sql = neon(connectionString());
    await sql`
        INSERT INTO echoe_social_events (owner_id, action, subject_id, metadata)
        VALUES (${ownerId}::uuid, ${action}, ${subjectId ?? null}, ${JSON.stringify(metadata)}::jsonb)
    `;
    await sql`
        DELETE FROM echoe_social_events
        WHERE seq IN (
            SELECT seq FROM echoe_social_events
            WHERE owner_id = ${ownerId}::uuid
            ORDER BY seq DESC
            OFFSET 2000
        )
    `;
};

export async function createFriendInvite(ownerId: string, origin: string): Promise<FriendInvite> {
    await ensureSchema();
    if (!await readAccount(ownerId)) throw new Error("ACCOUNT_REQUIRED");
    const sql = neon(connectionString());
    const token = randomBytes(24).toString("base64url");
    const id = randomUUID();
    await sql`
        DELETE FROM echoe_friend_invites
        WHERE inviter_id = ${ownerId}::uuid
          AND (expires_at <= NOW() OR id IN (
              SELECT id FROM echoe_friend_invites
              WHERE inviter_id = ${ownerId}::uuid AND accepted_at IS NULL AND expires_at > NOW()
              ORDER BY created_at DESC
              OFFSET 4
          ))
    `;
    const rows = await sql`
        INSERT INTO echoe_friend_invites (id, token_hash, inviter_id, expires_at)
        VALUES (${id}::uuid, ${inviteHash(token)}, ${ownerId}::uuid, NOW() + INTERVAL '7 days')
        RETURNING expires_at
    `;
    await logSocialEvent(ownerId, "invite-created", id);
    return {
        token,
        url: new URL(`/?friend_invite=${encodeURIComponent(token)}`, origin).toString(),
        expiresAt: new Date(rows[0].expires_at as string | Date).toISOString(),
    };
}

export async function acceptFriendInvite(ownerId: string, token: string): Promise<void> {
    await ensureSchema();
    if (!await readAccount(ownerId)) throw new Error("ACCOUNT_REQUIRED");
    const sql = neon(connectionString());
    const rows = await sql`
        WITH claimed AS (
            UPDATE echoe_friend_invites
            SET accepted_by = ${ownerId}::uuid, accepted_at = NOW()
            WHERE token_hash = ${inviteHash(token)}
              AND accepted_at IS NULL
              AND expires_at > NOW()
              AND inviter_id <> ${ownerId}::uuid
            RETURNING id, inviter_id
        ), linked AS (
            INSERT INTO echoe_friendships (owner_a, owner_b)
            SELECT LEAST(inviter_id::text, ${ownerId})::uuid, GREATEST(inviter_id::text, ${ownerId})::uuid
            FROM claimed
            ON CONFLICT DO NOTHING
        )
        SELECT id, inviter_id FROM claimed
    `;
    if (!rows[0]) throw new Error("INVITE_INVALID");
    const inviterId = String(rows[0].inviter_id);
    await Promise.all([
        logSocialEvent(ownerId, "friend-accepted", inviterId),
        logSocialEvent(inviterId, "friend-accepted", ownerId),
    ]);
}

export async function removeFriend(ownerId: string, friendId: string): Promise<void> {
    await ensureSchema();
    const [ownerA, ownerB] = orderedOwners(ownerId, friendId);
    const sql = neon(connectionString());
    await sql`
        WITH removed_shares AS (
            DELETE FROM echoe_path_shares
            WHERE (owner_id = ${ownerId}::uuid AND friend_id = ${friendId}::uuid)
               OR (owner_id = ${friendId}::uuid AND friend_id = ${ownerId}::uuid)
        )
        DELETE FROM echoe_friendships
        WHERE owner_a = ${ownerA}::uuid AND owner_b = ${ownerB}::uuid
    `;
    await logSocialEvent(ownerId, "friend-removed", friendId);
}

export async function sharePath(ownerId: string, friendId: string, eventId: string, mode: FriendRole): Promise<void> {
    await ensureSchema();
    const remote = await readRemoteState(ownerId);
    const event = remote?.state.events.find((candidate) => candidate.id === eventId);
    if (!event) throw new Error("PATH_NOT_FOUND");
    const [ownerA, ownerB] = orderedOwners(ownerId, friendId);
    const sql = neon(connectionString());
    const id = randomUUID();
    const rows = await sql`
        INSERT INTO echoe_path_shares (id, owner_id, friend_id, event_id, mode, allow_extra_checkins)
        SELECT ${id}::uuid, ${ownerId}::uuid, ${friendId}::uuid, ${eventId}, ${mode}, ${Boolean(event.allowExtraCheckIns)}
        WHERE EXISTS (
            SELECT 1 FROM echoe_friendships
            WHERE owner_a = ${ownerA}::uuid AND owner_b = ${ownerB}::uuid
        )
        ON CONFLICT (owner_id, friend_id, event_id) DO UPDATE
        SET mode = EXCLUDED.mode,
            allow_extra_checkins = EXCLUDED.allow_extra_checkins,
            updated_at = NOW()
        RETURNING id
    `;
    if (!rows[0]) throw new Error("FRIEND_REQUIRED");
    await logSocialEvent(ownerId, "path-shared", String(rows[0].id), { eventId, friendId, mode });
}

export async function revokePathShare(ownerId: string, shareId: string): Promise<void> {
    await ensureSchema();
    const sql = neon(connectionString());
    const rows = await sql`
        DELETE FROM echoe_path_shares
        WHERE id = ${shareId}::uuid AND owner_id = ${ownerId}::uuid
        RETURNING id
    `;
    if (rows[0]) await logSocialEvent(ownerId, "share-revoked", shareId);
}

export async function checkInSharedPath(ownerId: string, shareId: string, date: string): Promise<number> {
    await ensureSchema();
    const sql = neon(connectionString());
    const rows = await sql`
        WITH allowed AS (
            SELECT id, allow_extra_checkins
            FROM echoe_path_shares
            WHERE id = ${shareId}::uuid
              AND friend_id = ${ownerId}::uuid
              AND mode = 'participant'
        )
        INSERT INTO echoe_shared_checkins (share_id, member_id, checkin_date, count)
        SELECT id, ${ownerId}::uuid, ${safeDate(date)}::date, 1 FROM allowed
        ON CONFLICT (share_id, member_id, checkin_date) DO UPDATE
        SET count = CASE
                WHEN (SELECT allow_extra_checkins FROM allowed) THEN LEAST(echoe_shared_checkins.count + 1, 20)
                ELSE echoe_shared_checkins.count
            END,
            updated_at = NOW()
        RETURNING count
    `;
    if (!rows[0]) throw new Error("PARTICIPANT_REQUIRED");
    await logSocialEvent(ownerId, "shared-check-in", shareId, { date: safeDate(date), count: Number(rows[0].count) });
    return Number(rows[0].count);
}

export async function sendCheer(ownerId: string, shareId: string): Promise<void> {
    await ensureSchema();
    const sql = neon(connectionString());
    const shareRows = await sql`
        SELECT s.owner_id, s.friend_id, s.event_id,
               CASE WHEN s.owner_id = ${ownerId}::uuid THEN s.friend_id ELSE s.owner_id END AS recipient_id,
               st.state
        FROM echoe_path_shares s
        LEFT JOIN echoe_state st ON st.owner_id = s.owner_id
        WHERE s.id = ${shareId}::uuid AND (s.owner_id = ${ownerId}::uuid OR s.friend_id = ${ownerId}::uuid)
    `;
    const share = shareRows[0];
    if (!share) throw new Error("SHARE_NOT_FOUND");
    const recipientId = String(share.recipient_id);
    const state = share.state as DashboardState | null;
    const event = state?.events.find((candidate) => candidate.id === String(share.event_id));
    const eventName = event?.name ?? "your path";

    const recent = await sql`
        SELECT 1 FROM echoe_social_events
        WHERE owner_id = ${recipientId}::uuid AND action = 'cheer' AND subject_id = ${shareId}
          AND metadata->>'fromOwnerId' = ${ownerId} AND created_at > NOW() - INTERVAL '12 hours'
        LIMIT 1
    `;
    if (recent[0]) throw new Error("CHEER_TOO_SOON");

    const sender = await readAccount(ownerId);
    await logSocialEvent(recipientId, "cheer", shareId, { fromOwnerId: ownerId, fromDisplayName: sender?.displayName ?? "A friend", eventName });
}

const eventCheckIns = (event: MilestoneEvent, date?: string) => {
    const entries = event.project?.checkIns ?? event.habit?.entries ?? [];
    return entries.filter((entry) => entry.status === "done" && (!date || entry.date === date)).length;
};

export async function readSocialSnapshot(ownerId: string, requestedDate: string): Promise<SocialSnapshot> {
    await ensureSchema();
    if (!await readAccount(ownerId)) return { mode: "cloud", accountRequired: true, friends: [], sharedByMe: [], sharedWithMe: [], recentCheers: [] };
    const sql = neon(connectionString());
    const today = safeDate(requestedDate);
    const friendRows = await sql`
        SELECT a.owner_id, a.display_name, a.handle, f.created_at
        FROM echoe_friendships f
        JOIN echoe_accounts a ON a.owner_id = CASE WHEN f.owner_a = ${ownerId}::uuid THEN f.owner_b ELSE f.owner_a END
        WHERE f.owner_a = ${ownerId}::uuid OR f.owner_b = ${ownerId}::uuid
        ORDER BY a.display_name, a.handle
    `;
    const friends: FriendSummary[] = friendRows.map((row) => ({
        id: String(row.owner_id),
        displayName: String(row.display_name),
        handle: String(row.handle),
        friendsSince: new Date(row.created_at as string | Date).toISOString(),
    }));

    const shareRows = await sql`
        SELECT s.id, s.owner_id, s.friend_id, s.event_id, s.mode, s.allow_extra_checkins, s.created_at,
               a.owner_id AS person_id, a.display_name AS person_name, a.handle AS person_handle,
               f.created_at AS friends_since, st.state
        FROM echoe_path_shares s
        JOIN echoe_accounts a ON a.owner_id = CASE WHEN s.owner_id = ${ownerId}::uuid THEN s.friend_id ELSE s.owner_id END
        JOIN echoe_friendships f ON f.owner_a = LEAST(s.owner_id::text, s.friend_id::text)::uuid
                                    AND f.owner_b = GREATEST(s.owner_id::text, s.friend_id::text)::uuid
        LEFT JOIN echoe_state st ON st.owner_id = s.owner_id
        WHERE s.owner_id = ${ownerId}::uuid OR s.friend_id = ${ownerId}::uuid
        ORDER BY s.updated_at DESC
    `;
    const checkInRows = await sql`
        SELECT c.share_id, c.member_id,
               SUM(c.count)::int AS total,
               COALESCE(SUM(c.count) FILTER (WHERE c.checkin_date = ${today}::date), 0)::int AS today
        FROM echoe_shared_checkins c
        JOIN echoe_path_shares s ON s.id = c.share_id
        WHERE s.owner_id = ${ownerId}::uuid OR s.friend_id = ${ownerId}::uuid
        GROUP BY c.share_id, c.member_id
    `;
    const counts = new Map(checkInRows.map((row) => [`${row.share_id}:${row.member_id}`, { total: Number(row.total), today: Number(row.today) }]));
    const mapped = shareRows.flatMap((row): SharedPathSummary[] => {
        const state = row.state as DashboardState | null;
        const event = state?.events.find((candidate) => candidate.id === String(row.event_id));
        if (!event) return [];
        const isOwner = String(row.owner_id) === ownerId;
        const guest = counts.get(`${row.id}:${row.friend_id}`) ?? { total: 0, today: 0 };
        const person: FriendSummary = {
            id: String(row.person_id),
            displayName: String(row.person_name),
            handle: String(row.person_handle),
            friendsSince: new Date(row.friends_since as string | Date).toISOString(),
        };
        return [{
            id: String(row.id),
            eventId: event.id,
            eventName: event.name,
            eventKind: event.kind ?? (event.habit ? "habit" : "project"),
            color: event.color,
            role: isOwner ? "owner" : "guest",
            mode: row.mode as FriendRole,
            allowExtraCheckIns: Boolean(row.allow_extra_checkins),
            person,
            ownerToday: eventCheckIns(event, today),
            guestToday: guest.today,
            ownerTotal: eventCheckIns(event),
            guestTotal: guest.total,
            createdAt: new Date(row.created_at as string | Date).toISOString(),
        }];
    });

    const cheerRows = await sql`
        SELECT seq, subject_id, metadata, created_at
        FROM echoe_social_events
        WHERE owner_id = ${ownerId}::uuid AND action = 'cheer' AND created_at > NOW() - INTERVAL '3 days'
        ORDER BY seq DESC
        LIMIT 5
    `;
    const recentCheers: CheerNotice[] = cheerRows.map((row) => {
        const metadata = row.metadata as { fromDisplayName?: string; eventName?: string };
        return {
            id: String(row.seq),
            shareId: String(row.subject_id ?? ""),
            eventName: metadata.eventName ?? "a shared path",
            fromDisplayName: metadata.fromDisplayName ?? "A friend",
            createdAt: new Date(row.created_at as string | Date).toISOString(),
        };
    });

    return {
        mode: "cloud",
        accountRequired: false,
        friends,
        sharedByMe: mapped.filter((share) => share.role === "owner"),
        sharedWithMe: mapped.filter((share) => share.role === "guest"),
        recentCheers,
    };
}
