import type { DashboardState, MilestoneEvent, StorageSummary } from "@/lib/types";

export const habitMilestone: MilestoneEvent = {
    id: "habit-1",
    name: "Practice deliberately",
    start: "2026-08-01",
    target: "2026-08-11",
    color: "teal",
    pinned: true,
    habit: {
        frequency: "daily",
        target: 30,
        entries: [
            { date: "2026-08-01", status: "done" },
            { date: "2026-08-02", status: "missed", note: "Low energy" },
        ],
    },
};

export const dashboardState: DashboardState = {
    schemaVersion: 2,
    events: [habitMilestone],
    achievements: [],
    settings: {
        theme: "warm",
        showActivityHistogram: true,
        profile: { displayName: "Mika", intention: "Build a life with room to breathe.", supportStyle: "gentle" },
    },
    updatedAt: "2026-08-03T08:00:00.000Z",
};

export const storageSummary: StorageSummary = {
    milestoneCount: 1,
    checkInCount: 2,
    historyCount: 4,
    lastSavedAt: "2026-08-03T08:00:00.000Z",
    lastSyncedAt: "2026-08-03T08:00:00.000Z",
    isOnline: true,
    syncStatus: "synced",
};
