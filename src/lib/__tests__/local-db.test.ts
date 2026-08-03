import { beforeEach, describe, expect, it } from "vitest";
import {
    clearEchoeDatabase,
    commitDashboardState,
    deleteLocalDatabaseForTests,
    getAuditLog,
    getStorageSummary,
    initializeLocalDatabase,
    loadDashboardState,
} from "@/lib/local-db";
import { seedState } from "@/lib/utils";

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
                    target: 30,
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
        expect(loaded.events[0].habit?.entries[1]).toMatchObject({ status: "missed", note: "Travel day" });
        expect(summary).toMatchObject({ milestoneCount: 1, checkInCount: 2, historyCount: 1 });
        expect(audit.map((entry) => entry.action)).toEqual(["create", "bootstrap"]);
        expect(audit[0].seq).toBeGreaterThan(audit[1].seq ?? 0);
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
