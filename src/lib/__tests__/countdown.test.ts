import { describe, expect, it } from "vitest";
import { countdownView, occurrence, workdaysBetween } from "@/lib/countdown";
import { parseQuickInput } from "@/lib/quick-parse";

// Thursday 6 August 2026, midday.
const now = new Date(2026, 7, 6, 12);
const base = { start: "2026-08-01", target: "2026-09-01" };

describe("countdownView", () => {
    it("counts plain days by default", () => {
        expect(countdownView(base, now)).toMatchObject({ state: "ahead", value: "26", count: 26, label: "days to go", days: 26 });
        expect(countdownView({ ...base, target: "2026-08-07" }, now)).toMatchObject({ value: "1", label: "day to go" });
    });

    it("reads in weeks or months when asked", () => {
        expect(countdownView({ ...base, countdown: { unit: "weeks" } }, now)).toMatchObject({ value: "3w 5d", label: "to go" });
        expect(countdownView({ ...base, target: "2026-08-20", countdown: { unit: "weeks" } }, now)).toMatchObject({ value: "2", label: "weeks to go" });
        expect(countdownView({ ...base, target: "2026-12-10", countdown: { unit: "months" } }, now)).toMatchObject({ value: "4mo 4d" });
        expect(countdownView({ ...base, target: "2026-10-06", countdown: { unit: "months" } }, now)).toMatchObject({ value: "2", label: "months to go" });
    });

    it("counts down to the minute with a time", () => {
        expect(countdownView({ ...base, target: "2026-08-07", countdown: { unit: "precise", time: "09:30" } }, now)).toMatchObject({ value: "21h 30m", label: "to go" });
        expect(countdownView({ ...base, target: "2026-08-06", countdown: { unit: "precise", time: "14:05" } }, now)).toMatchObject({ state: "today", value: "2h 5m" });
        expect(countdownView({ ...base, target: "2026-08-06", countdown: { time: "18:00" } }, now)).toMatchObject({ state: "today", value: "Today", label: "at 18:00", dateLabel: expect.stringContaining("18:00") });
    });

    it("counts working days only when asked", () => {
        expect(workdaysBetween(now, new Date(2026, 7, 14))).toBe(6); // Thu, Fri, Mon to Thu
        expect(countdownView({ ...base, target: "2026-08-14", countdown: { weekdaysOnly: true } }, now)).toMatchObject({ value: "6", label: "working days left" });
    });

    it("reports a passed one-off date", () => {
        expect(countdownView({ ...base, target: "2026-08-03" }, now)).toMatchObject({ state: "past", value: "3", label: "days ago" });
    });

    it("rolls yearly and monthly repeats forward", () => {
        const birthday = { start: "2026-01-01", target: "1990-03-03", countdown: { repeat: "yearly" as const } };
        expect(localDay(occurrence(birthday, now).target)).toBe("2027-03-03");
        expect(countdownView(birthday, now)).toMatchObject({ state: "ahead", repeatLabel: "Every year", target: "2027-03-03" });
        const rent = { start: "2026-01-01", target: "2026-01-31", countdown: { repeat: "monthly" as const } };
        expect(localDay(occurrence(rent, now).target)).toBe("2026-08-31");
        expect(localDay(occurrence(rent, new Date(2026, 8, 5)).target)).toBe("2026-09-30");
        expect(countdownView({ ...rent, target: "2026-08-06" }, now)).toMatchObject({ state: "today" });
    });
});

describe("quick input for countdowns", () => {
    it("understands repeats, birthdays, and times", () => {
        expect(parseQuickInput("Rent every month Aug 31", now)).toMatchObject({ kind: "countdown", name: "Rent", countdown: { repeat: "monthly" } });
        expect(parseQuickInput("Mum's birthday Aug 9", now)).toMatchObject({ kind: "countdown", countdown: { repeat: "yearly" } });
        expect(parseQuickInput("Flight Dec 12 9:30", now, "countdown")).toMatchObject({ kind: "countdown", countdown: { time: "09:30" } });
    });
});

const localDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
