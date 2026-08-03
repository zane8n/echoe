import "server-only";

import { neon } from "@neondatabase/serverless";
import type { AuditAction, DashboardState } from "./types";

export interface RemoteStateRecord {
    state: DashboardState;
    version: number;
    updatedAt: string;
}

let schemaPromise: Promise<void> | null = null;

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
        })().catch((error) => {
            schemaPromise = null;
            throw error;
        });
    }
    return schemaPromise;
};

export const databaseConfigured = () => Boolean(process.env.DATABASE_URL);

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
