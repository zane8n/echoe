import { beforeEach, describe, expect, it } from "vitest";
import {
    clearEchoeDatabase,
    commitDashboardState,
    deleteLocalDatabaseForTests,
    getAuditLog,
    getStorageSummary,
    initializeLocalDatabase,
    loadDashboardState,
    setRemoteVersion,
} from "@/lib/local-db";
import { addDays, localDate, seedState } from "@/lib/utils";

describe("ordered IndexedDB repository", () => {
    beforeEach(async () => {
        await deleteLocalDatabaseForTests();
        window.localStorage.clear();
    });

    it("clears stale blobs once and initializes an empty versioned store", async () => {
        window.localStorage.setItem("echoe.v1", JSON.stringify({ stale: true }));
        window.localStorage.setItem("echoe.audit.v1", JSON.stringify([{ stale: true }]));
        await initializeLocalDatabase();
        const state = await loadDashboardState();

        expect(window.localStorage.getItem("echoe.v1")).toBeNull();
        expect(window.localStorage.getItem("echoe.audit.v1")).toBeNull();
        expect(window.localStorage.getItem("echoe.stale-data-cleared.v2")).toBeTruthy();
        expect(state.events).toEqual([]);
        expect(state.settings.accent).toBe("blue");
    });

    it("stores milestones, dated outcomes, sequential logs, and historical snapshots", async () => {
        await initializeLocalDatabase();
        const base = seedState();
        const withHabit = {
            ...base,
            events: [{
                id: "habit-1",
                name: "Practice",
                start: "2026-08-01",
                target: "2026-09-01",
                color: "sky" as const,
                pinned: true,
                habit: {
                    frequency: "daily" as const,
                    entries: [
                        { date: "2026-08-01", status: "done" as const },
                        { date: "2026-08-02", status: "missed" as const, note: "Travel day" },
                    ],
                },
            }],
        };

        await commitDashboardState(withHabit, "create", "Created Practice", "habit-1");
        const loaded = await loadDashboardState();
        const summary = await getStorageSummary("local");
        const audit = await getAuditLog();

        expect(loaded.events[0].habit?.entries).toHaveLength(2);
        expect(loaded.events[0].color).toBe("sky");
        expect(loaded.events[0].habit?.entries[1]).toMatchObject({ status: "missed", note: "Travel day" });
        expect(summary).toMatchObject({ milestoneCount: 1, checkInCount: 2, historyCount: 1 });
        expect(audit.map((entry) => entry.action)).toEqual(["create", "bootstrap"]);
        expect(audit[0].seq).toBeGreaterThan(audit[1].seq ?? 0);
    });

    it("migrates and persists a personal profile without disturbing existing data", async () => {
        await initializeLocalDatabase();
        const state = seedState();
        const personalized = await commitDashboardState({
            ...state,
            settings: {
                ...state.settings,
                accent: "teal",
                profile: { displayName: "Kikandi", intention: "Build deliberately.", supportStyle: "direct" },
            },
        }, "settings", "Personalized Echoe");

        const loaded = await loadDashboardState();
        expect(personalized.settings.profile.displayName).toBe("Kikandi");
        expect(loaded.settings).toMatchObject({ accent: "teal", profile: { displayName: "Kikandi", supportStyle: "direct" } });
    });

    it("keeps project investment updates ordered and permanent", async () => {
        await initializeLocalDatabase();
        const state = seedState();
        await commitDashboardState({
            ...state,
            events: [{
                id: "project-1", name: "CCNP Core", kind: "project", start: "2026-08-01", target: "2026-12-01", color: "sky", pinned: true,
                project: { plannedHours: 120, readiness: 42, entries: [
                    { id: "later", date: "2026-08-03", hours: 2, readiness: 42 },
                    { id: "first", date: "2026-08-01", hours: 1.5, readiness: 30 },
                ] },
            }],
        }, "progress", "Logged project work", "project-1");
        const loaded = await loadDashboardState();
        expect(loaded.events[0].project).toMatchObject({ plannedHours: 120, readiness: 42 });
        expect(loaded.events[0].project?.entries.map((entry) => entry.id)).toEqual(["first", "later"]);
        expect((await getAuditLog())[0]).toMatchObject({ action: "progress", entityId: "project-1" });
    });

    it("persists daily tasks and prunes anything older than yesterday", async () => {
        await initializeLocalDatabase();
        const state = seedState();
        const today = localDate();
        const yesterday = localDate(addDays(new Date(), -1));
        const threeDaysAgo = localDate(addDays(new Date(), -3));
        await commitDashboardState({
            ...state,
            dailyTasks: [
                { id: "today-1", text: "Call the dentist", done: false, date: today, order: 0, createdAt: new Date().toISOString() },
                { id: "yesterday-1", text: "Yesterday leftover", done: false, date: yesterday, order: 0, createdAt: new Date().toISOString() },
                { id: "old-1", text: "Ancient task", done: false, date: threeDaysAgo, order: 0, createdAt: new Date().toISOString() },
            ],
        }, "edit", "Added My Day tasks");

        const loaded = await loadDashboardState();
        expect(loaded.dailyTasks.map((task) => task.id).sort()).toEqual(["today-1", "yesterday-1"]);
    });

    it("records the last verified cloud exchange separately from local saves", async () => {
        await initializeLocalDatabase();
        await setRemoteVersion(7);
        const summary = await getStorageSummary("synced");
        expect(summary.lastSyncedAt).toBeTruthy();
        expect(summary.isOnline).toBe(true);
        expect(summary.syncStatus).toBe("synced");
    });

    it("soft-archives removed milestones and can start a genuinely fresh history", async () => {
        await initializeLocalDatabase();
        const state = seedState();
        const created = await commitDashboardState({ ...state, events: [{ id: "one", name: "One", start: "2026-08-01", target: "2026-09-01", color: "teal", pinned: true }] }, "create", "Created One", "one");
        await commitDashboardState({ ...created, events: [] }, "delete", "Archived One", "one");
        expect((await loadDashboardState()).events).toEqual([]);
        expect((await getStorageSummary("local")).historyCount).toBe(2);

        const fresh = await clearEchoeDatabase();
        expect(fresh.events).toEqual([]);
        expect((await getStorageSummary("local"))).toMatchObject({ milestoneCount: 0, checkInCount: 0, historyCount: 0 });
        expect((await getAuditLog())[0].summary).toContain("fresh history");
    });
});
