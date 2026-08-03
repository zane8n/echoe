import "server-only";

import { neon } from "@neondatabase/serverless";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import type { AccountSummary, AuditAction, DashboardState } from "./types";

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
                    password_salt TEXT NOT NULL,
                    password_hash TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
            `;
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
    passwordSalt: row.password_salt ? String(row.password_salt) : undefined,
    passwordHash: row.password_hash ? String(row.password_hash) : undefined,
});

export class AccountConflictError extends Error {}

export async function readAccount(ownerId: string): Promise<AccountSummary | null> {
    await ensureSchema();
    const sql = neon(connectionString());
    const rows = await sql`
        SELECT owner_id, handle, display_name, created_at
        FROM echoe_accounts
        WHERE owner_id = ${ownerId}::uuid
        LIMIT 1
    `;
    return rows[0] ? accountFromRow(rows[0] as Record<string, unknown>) : null;
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
        return accountFromRow(rows[0] as Record<string, unknown>);
    } catch (error) {
        if ((error as { code?: string }).code === "23505") throw new AccountConflictError("That handle is already in use.");
        throw error;
    }
}

export async function authenticateAccount(handle: string, password: string): Promise<(AccountSummary & { ownerId: string }) | null> {
    await ensureSchema();
    const sql = neon(connectionString());
    const rows = await sql`
        SELECT owner_id, handle, display_name, password_salt, password_hash, created_at
        FROM echoe_accounts
        WHERE handle = ${handle}
        LIMIT 1
    `;
    if (!rows[0]) return null;
    const account = accountFromRow(rows[0] as Record<string, unknown>);
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
