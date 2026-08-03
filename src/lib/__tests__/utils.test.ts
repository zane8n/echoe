import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HabitEntry, MilestoneEvent } from "@/lib/types";
import { formatOpenDuration, habitInsight, habitStats, habitStreak, projectProgress, seedState, timeSpent } from "@/lib/utils";

const habitEvent = (entries: HabitEntry[]): MilestoneEvent => ({
    id: "habit-1",
    name: "Morning walk",
    start: "2026-07-01",
    target: "2026-12-31",
    color: "teal",
    pinned: true,
    habit: { frequency: "daily", target: 30, entries },
});

describe("Echoe time and habit logic", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("starts with no stale demonstration milestones", () => {
        const state = seedState();
        expect(state.events).toEqual([]);
        expect(state.schemaVersion).toBe(2);
        expect(state.settings.showActivityHistogram).toBe(true);
    });

    it("calculates invested time only up to today", () => {
        vi.setSystemTime(new Date(2026, 7, 3, 12));
        const spent = timeSpent("2026-08-01", "2026-08-11");
        expect(spent.days).toBe(2);
        expect(spent.percent).toBe(20);
    });

    it("counts consecutive habit days and frames a miss as useful information", () => {
        vi.setSystemTime(new Date(2026, 7, 3, 12));
        const event = habitEvent([
            { date: "2026-08-01", status: "done" },
            { date: "2026-08-02", status: "done" },
            { date: "2026-08-03", status: "done" },
        ]);
        expect(habitStreak(event)).toBe(3);
        expect(habitStats(event)).toMatchObject({ done: 3, missed: 0, rate: 100 });

        const missed = habitEvent([...event.habit!.entries, { date: "2026-08-04", status: "missed" }]);
        expect(habitInsight(missed)).toContain("information");
        expect(habitInsight(missed)).toContain("restart");
    });

    it("combines invested effort, honest readiness, and elapsed time into project risk", () => {
        vi.setSystemTime(new Date(2026, 10, 1, 12));
        const project: MilestoneEvent = {
            id: "ccnp",
            name: "CCNP Core",
            kind: "project",
            start: "2026-08-01",
            target: "2026-12-01",
            color: "sky",
            pinned: true,
            project: {
                plannedHours: 120,
                readiness: 35,
                entries: [{ id: "p1", date: "2026-10-31", hours: 24, readiness: 35 }],
            },
        };
        expect(projectProgress(project)).toMatchObject({ investedHours: 24, remainingHours: 96, readiness: 35, effortPercent: 20, overallPercent: 30, risk: "at-risk" });
        expect(projectProgress(project).requiredHoursPerWeek).toBeGreaterThan(20);
    });

    it("frames open-ended milestones by time carried without inventing a deadline", () => {
        vi.setSystemTime(new Date(2026, 7, 3, 12));
        expect(formatOpenDuration("2024-06-01")).toMatch(/^2y/);
    });
});
