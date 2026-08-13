import { deleteDB, openDB, type DBSchema, type IDBPDatabase } from "idb";
import { LEGACY_STORAGE_KEYS, LEGACY_THEME_TO_ACCENT, LOCAL_DB_NAME, STALE_DATA_RESET_KEY } from "./constants";
import { normalizeSettings, seedState } from "./utils";
import type {
    Achievement,
    AuditAction,
    AuditEntry,
    DashboardSettings,
    DashboardState,
    HabitConfig,
    HabitEntry,
    MilestoneEvent,
    StateSnapshot,
    StorageSummary,
    SyncStatus,
} from "./types";

type StoredHabit = Omit<HabitConfig, "entries">;

interface StoredMilestone extends Omit<MilestoneEvent, "habit"> {
    habit?: StoredHabit;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string;
}

interface StoredCheckIn extends HabitEntry {
    id: string;
    eventId: string;
    recordedAt: string;
}

interface SettingsRecord {
    id: "current";
    value: DashboardSettings;
    updatedAt: string;
}

interface MetaRecord {
    key: string;
    value: string | number;
}

interface EchoeDatabase extends DBSchema {
    milestones: {
        key: string;
        value: StoredMilestone;
        indexes: { "by-updated": string; "by-target": string };
    };
    checkins: {
        key: string;
        value: StoredCheckIn;
        indexes: { "by-event": string; "by-event-date": [string, string]; "by-date": string };
    };
    achievements: {
        key: string;
        value: Achievement;
        indexes: { "by-date": string };
    };
    settings: {
        key: "current";
        value: SettingsRecord;
    };
    audit: {
        key: number;
        value: AuditEntry;
        indexes: { "by-time": string };
    };
    snapshots: {
        key: number;
        value: StateSnapshot;
        indexes: { "by-time": string };
    };
    meta: {
        key: string;
        value: MetaRecord;
    };
}

let databasePromise: Promise<IDBPDatabase<EchoeDatabase>> | null = null;

const createId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const getDatabase = () => {
    if (!databasePromise) {
        databasePromise = openDB<EchoeDatabase>(LOCAL_DB_NAME, 1, {
            upgrade(database) {
                const milestones = database.createObjectStore("milestones", { keyPath: "id" });
                milestones.createIndex("by-updated", "updatedAt");
                milestones.createIndex("by-target", "target");

                const checkins = database.createObjectStore("checkins", { keyPath: "id" });
                checkins.createIndex("by-event", "eventId");
                checkins.createIndex("by-event-date", ["eventId", "date"], { unique: true });
                checkins.createIndex("by-date", "date");

                const achievements = database.createObjectStore("achievements", { keyPath: "id" });
                achievements.createIndex("by-date", "date");

                database.createObjectStore("settings", { keyPath: "id" });

                const audit = database.createObjectStore("audit", { keyPath: "seq", autoIncrement: true });
                audit.createIndex("by-time", "occurredAt");

                const snapshots = database.createObjectStore("snapshots", { keyPath: "seq", autoIncrement: true });
                snapshots.createIndex("by-time", "createdAt");

                database.createObjectStore("meta", { keyPath: "key" });
            },
        });
    }
    return databasePromise;
};

const clearStaleBrowserData = () => {
    if (typeof window === "undefined" || window.localStorage.getItem(STALE_DATA_RESET_KEY)) return;
    for (const key of LEGACY_STORAGE_KEYS) window.localStorage.removeItem(key);
    window.localStorage.setItem(STALE_DATA_RESET_KEY, new Date().toISOString());
};

export async function initializeLocalDatabase(): Promise<void> {
    clearStaleBrowserData();
    const database = await getDatabase();
    const initialized = await database.get("meta", "initialized-at");
    if (initialized) {
        const accentMigrated = await database.get("meta", "accent-migration-v4");
        if (!accentMigrated) {
            const transaction = database.transaction(["meta", "settings"], "readwrite");
            const settings = await transaction.objectStore("settings").get("current");
            const legacyValue = settings?.value as (DashboardSettings & { theme?: string }) | undefined;
            if (settings && legacyValue && !legacyValue.accent && legacyValue.theme) {
                const accent = LEGACY_THEME_TO_ACCENT[legacyValue.theme] ?? "blue";
                await transaction.objectStore("settings").put({ ...settings, value: { ...legacyValue, accent, appearance: legacyValue.appearance ?? "system" } });
            }
            await transaction.objectStore("meta").put({ key: "accent-migration-v4", value: new Date().toISOString() });
            await transaction.done;
        }
        return;
    }

    const now = new Date().toISOString();
    const transaction = database.transaction(["meta", "settings", "audit"], "readwrite");
    await transaction.objectStore("meta").put({ key: "initialized-at", value: now });
    await transaction.objectStore("meta").put({ key: "blue-default-v3", value: now });
    await transaction.objectStore("settings").put({ id: "current", value: seedState().settings, updatedAt: now });
    await transaction.objectStore("audit").add({
        id: createId(),
        occurredAt: now,
        action: "bootstrap",
        summary: "Created the empty Echoe data store",
    });
    await transaction.done;
}

export async function loadDashboardState(): Promise<DashboardState> {
    const database = await getDatabase();
    const transaction = database.transaction(["milestones", "checkins", "achievements", "settings", "meta"], "readonly");
    const [milestones, checkins, achievements, settings, lastSaved] = await Promise.all([
        transaction.objectStore("milestones").getAll(),
        transaction.objectStore("checkins").getAll(),
        transaction.objectStore("achievements").getAll(),
        transaction.objectStore("settings").get("current"),
        transaction.objectStore("meta").get("last-saved-at"),
    ]);
    await transaction.done;

    const entriesByEvent = new Map<string, HabitEntry[]>();
    for (const checkIn of checkins.sort((a, b) => a.date.localeCompare(b.date))) {
        const entries = entriesByEvent.get(checkIn.eventId) ?? [];
        entries.push({ date: checkIn.date, status: checkIn.status, note: checkIn.note, recordedAt: checkIn.recordedAt });
        entriesByEvent.set(checkIn.eventId, entries);
    }

    const events = milestones
        .filter((event) => !event.deletedAt)
        .map(({ deletedAt, habit, ...event }) => {
            void deletedAt;
            return {
                ...event,
                habit: habit ? { ...habit, entries: entriesByEvent.get(event.id) ?? [] } : undefined,
            };
        })
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const fallback = seedState();
    return {
        schemaVersion: 2,
        events,
        achievements: achievements.sort((a, b) => b.date.localeCompare(a.date)),
        settings: normalizeSettings(settings?.value ?? fallback.settings),
        updatedAt: typeof lastSaved?.value === "string" ? lastSaved.value : fallback.updatedAt,
    };
}

export async function commitDashboardState(
    input: DashboardState,
    action: AuditAction,
    summary: string,
    entityId?: string,
): Promise<DashboardState> {
    const database = await getDatabase();
    const now = new Date().toISOString();
    const state: DashboardState = {
        ...input,
        schemaVersion: 2,
        events: input.events.map((event) => event.project ? {
            ...event,
            project: {
                ...event.project,
                entries: [...event.project.entries].sort((a, b) => a.date.localeCompare(b.date) || (a.recordedAt ?? "").localeCompare(b.recordedAt ?? "")),
                checkIns: [...(event.project.checkIns ?? [])].sort((a, b) => a.date.localeCompare(b.date)),
            },
        } : event),
        settings: normalizeSettings(input.settings),
        updatedAt: now,
    };
    const transaction = database.transaction(
        ["milestones", "checkins", "achievements", "settings", "audit", "snapshots", "meta"],
        "readwrite",
    );

    const milestoneStore = transaction.objectStore("milestones");
    const checkInStore = transaction.objectStore("checkins");
    const achievementStore = transaction.objectStore("achievements");
    const existingMilestones = await milestoneStore.getAll();
    const activeIds = new Set(state.events.map((event) => event.id));

    for (const event of state.events) {
        const existing = existingMilestones.find((item) => item.id === event.id);
        const { habit, ...base } = event;
        const stored: StoredMilestone = {
            ...base,
            habit: habit ? { frequency: habit.frequency, targetPerPeriod: habit.targetPerPeriod } : undefined,
            createdAt: existing?.createdAt ?? event.createdAt ?? now,
            updatedAt: event.updatedAt ?? now,
        };
        await milestoneStore.put(stored);

        if (habit) {
            const savedKeys = await checkInStore.index("by-event").getAllKeys(event.id);
            const desiredKeys = new Set(habit.entries.map((entry) => `${event.id}:${entry.date}`));
            for (const key of savedKeys) if (!desiredKeys.has(String(key))) await checkInStore.delete(key);
            for (const entry of habit.entries) {
                await checkInStore.put({
                    ...entry,
                    id: `${event.id}:${entry.date}`,
                    eventId: event.id,
                    recordedAt: entry.recordedAt ?? now,
                });
            }
        }
    }

    for (const stored of existingMilestones) {
        if (!activeIds.has(stored.id) && !stored.deletedAt) {
            await milestoneStore.put({ ...stored, deletedAt: now, updatedAt: now });
        }
    }

    const currentAchievementIds = new Set(state.achievements.map((achievement) => achievement.id));
    for (const achievement of state.achievements) await achievementStore.put(achievement);
    for (const key of await achievementStore.getAllKeys()) if (!currentAchievementIds.has(String(key))) await achievementStore.delete(key);

    await transaction.objectStore("settings").put({ id: "current", value: state.settings, updatedAt: now });
    await transaction.objectStore("meta").put({ key: "last-saved-at", value: now });
    await transaction.objectStore("audit").add({ id: createId(), occurredAt: now, action, entityId, summary });
    await transaction.objectStore("snapshots").add({ createdAt: now, action, state });

    const auditStore = transaction.objectStore("audit");
    const auditKeys = await auditStore.getAllKeys();
    for (const key of auditKeys.slice(0, Math.max(0, auditKeys.length - 1000))) await auditStore.delete(key);
    const snapshotStore = transaction.objectStore("snapshots");
    const snapshotKeys = await snapshotStore.getAllKeys();
    for (const key of snapshotKeys.slice(0, Math.max(0, snapshotKeys.length - 30))) await snapshotStore.delete(key);
    await transaction.done;
    return state;
}

export async function getStorageSummary(syncStatus: SyncStatus): Promise<StorageSummary> {
    const database = await getDatabase();
    const transaction = database.transaction(["milestones", "checkins", "snapshots", "meta"], "readonly");
    const [milestones, checkInCount, historyCount, lastSaved, lastSynced] = await Promise.all([
        transaction.objectStore("milestones").getAll(),
        transaction.objectStore("checkins").count(),
        transaction.objectStore("snapshots").count(),
        transaction.objectStore("meta").get("last-saved-at"),
        transaction.objectStore("meta").get("last-synced-at"),
    ]);
    await transaction.done;
    return {
        milestoneCount: milestones.filter((event) => !event.deletedAt).length,
        checkInCount: checkInCount + milestones.reduce((total, event) => total + (event.project?.checkIns?.length ?? 0), 0),
        historyCount,
        lastSavedAt: typeof lastSaved?.value === "string" ? lastSaved.value : null,
        lastSyncedAt: typeof lastSynced?.value === "string" ? lastSynced.value : null,
        isOnline: typeof navigator === "undefined" ? true : navigator.onLine,
        syncStatus,
    };
}

export async function getAuditLog(limit = 200): Promise<AuditEntry[]> {
    const database = await getDatabase();
    const entries = await database.getAllFromIndex("audit", "by-time");
    return entries.slice(-limit).reverse();
}

export async function listSnapshots(limit = 30): Promise<Array<Pick<StateSnapshot, "seq" | "createdAt" | "action">>> {
    const database = await getDatabase();
    const entries = await database.getAllFromIndex("snapshots", "by-time");
    return entries.slice(-limit).reverse().map(({ seq, createdAt, action }) => ({ seq, createdAt, action }));
}

export async function restoreSnapshot(seq: number): Promise<DashboardState> {
    const database = await getDatabase();
    const snapshot = await database.get("snapshots", seq);
    if (!snapshot) throw new Error("Snapshot not found");
    return commitDashboardState(snapshot.state, "restore-snapshot", `Restored a snapshot from ${formatSnapshotTime(snapshot.createdAt)}`);
}

const formatSnapshotTime = (iso: string): string => {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
};

export async function setRemoteVersion(version: number): Promise<void> {
    const database = await getDatabase();
    const transaction = database.transaction("meta", "readwrite");
    await transaction.store.put({ key: "remote-version", value: version });
    await transaction.store.put({ key: "last-synced-at", value: new Date().toISOString() });
    await transaction.done;
}

export async function clearEchoeDatabase(): Promise<DashboardState> {
    const database = await getDatabase();
    const transaction = database.transaction(
        ["milestones", "checkins", "achievements", "settings", "audit", "snapshots", "meta"],
        "readwrite",
    );
    await Promise.all([
        transaction.objectStore("milestones").clear(),
        transaction.objectStore("checkins").clear(),
        transaction.objectStore("achievements").clear(),
        transaction.objectStore("audit").clear(),
        transaction.objectStore("snapshots").clear(),
    ]);
    const state = seedState();
    await transaction.objectStore("settings").put({ id: "current", value: state.settings, updatedAt: state.updatedAt });
    await transaction.objectStore("meta").put({ key: "last-saved-at", value: state.updatedAt });
    await transaction.objectStore("audit").add({
        id: createId(),
        occurredAt: state.updatedAt,
        action: "bootstrap",
        summary: "Cleared Echoe data and started a fresh history",
    });
    await transaction.done;
    return state;
}

export async function deleteLocalDatabaseForTests(): Promise<void> {
    if (databasePromise) (await databasePromise).close();
    databasePromise = null;
    await deleteDB(LOCAL_DB_NAME);
}

export async function resetLocalDatabaseForAccountSwitch(): Promise<void> {
    if (databasePromise) (await databasePromise).close();
    databasePromise = null;
    await deleteDB(LOCAL_DB_NAME);
}
