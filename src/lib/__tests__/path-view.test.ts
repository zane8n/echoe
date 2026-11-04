import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { kindLabel, summarizePath } from "@/lib/path-view";
import type { MilestoneEvent } from "@/lib/types";

const base: MilestoneEvent = { id: "p", name: "Path", start: "2026-08-01", target: "2026-09-01", color: "teal", pinned: false };

describe("summarizePath", () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date(2026, 7, 6, 12)); // Thursday 6 August 2026
    });
    afterEach(() => vi.useRealTimers());

    it("describes a daily habit by its streak and knows when today is done", () => {
        const habit = { ...base, kind: "habit" as const, habit: { frequency: "daily" as const, entries: [{ date: "2026-08-05", status: "done" as const }, { date: "2026-08-06", status: "done" as const }] } };
        expect(summarizePath(habit)).toMatchObject({ checkable: true, doneToday: true, doneForPeriod: true, metric: "2", meta: "2 days in a row" });
        expect(kindLabel(habit)).toBe("Daily habit");
    });

    it("counts weekly targets toward the current week", () => {
        const habit = { ...base, kind: "habit" as const, habit: { frequency: "weekly" as const, targetPerPeriod: 3, entries: [{ date: "2026-08-03", status: "done" as const }] } };
        expect(summarizePath(habit)).toMatchObject({ doneToday: false, doneForPeriod: false, period: { done: 1, target: 3 }, meta: "1 of 3 this week" });
        expect(kindLabel(habit)).toBe("3 times a week");
    });

    it("summarises a project by effort and readiness", () => {
        const project = { ...base, kind: "project" as const, project: { plannedHours: 40, readiness: 50, entries: [{ id: "e", date: "2026-08-02", hours: 10 }], checkInFrequency: "daily" as const, checkIns: [] } };
        expect(summarizePath(project)).toMatchObject({ checkable: true, doneToday: false, meta: "10h of 40h, 50% ready", metric: "38%" });
    });

    it("counts down to dates and up from beginnings", () => {
        expect(summarizePath({ ...base, kind: "countdown" })).toMatchObject({ checkable: false, metric: "26", metricLabel: "days to go" });
        expect(summarizePath({ ...base, kind: "countdown", target: "2026-08-06" })).toMatchObject({ metric: "Today" });
        expect(summarizePath({ ...base, kind: "ongoing", target: "", start: "2025-08-06" })).toMatchObject({ checkable: false, metric: "1y", metricLabel: "and counting" });
    });
});
