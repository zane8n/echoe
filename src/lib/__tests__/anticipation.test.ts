import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { anticipate, doorPrompt, hasDoorWaiting, THE_DAY_PROMPT, tomorrowLine, whenOf } from "@/lib/anticipation";
import type { MilestoneEvent } from "@/lib/types";

const TODAY = "2026-11-03"; // a Tuesday
const trip: MilestoneEvent = { id: "trip", name: "Lisbon trip", start: "2026-10-20", target: "2026-11-15", color: "coral", pinned: false, kind: "countdown" };

describe("whenOf", () => {
    it("names the day the way you'd say it, never as a count of days", () => {
        expect(whenOf("2026-11-03", TODAY)).toMatchObject({ days: 0, when: "Today" });
        expect(whenOf("2026-11-04", TODAY)).toMatchObject({ days: 1, when: "Tomorrow", hint: "one more sleep" });
        expect(whenOf("2026-11-05", TODAY)).toMatchObject({ when: "Thursday", hint: "after tomorrow" });
        expect(whenOf("2026-11-05", TODAY).date).not.toMatch(/Thursday/);
        expect(whenOf("2026-11-07", TODAY)).toMatchObject({ when: "Saturday", hint: "this week" });
        expect(whenOf("2026-11-09", TODAY)).toMatchObject({ when: "Monday", hint: "next week" });
        expect(whenOf("2026-11-15", TODAY)).toMatchObject({ days: 12, when: "Next week" });
        expect(whenOf("2026-11-16", TODAY)).toMatchObject({ when: "Week after next" });
        expect(whenOf("2026-11-24", TODAY)).toMatchObject({ when: "In 3 weeks" });
        expect(whenOf("2026-12-12", TODAY)).toMatchObject({ when: "Mid December" });
        expect(whenOf("2026-12-28", TODAY)).toMatchObject({ when: "Late December" });
        expect(whenOf("2027-11-20", TODAY).when).toBe("Mid November 2027");
    });

    it("looks back gently once the day has passed", () => {
        expect(whenOf("2026-11-02", TODAY)).toMatchObject({ days: -1, when: "Yesterday", hint: "behind you" });
        expect(whenOf("2026-10-28", TODAY)).toMatchObject({ days: -6, hint: "behind you" });
    });
});

describe("tomorrowLine", () => {
    it("finds the landmark tomorrow brings", () => {
        expect(tomorrowLine("Lisbon trip", "2026-11-04", TODAY)).toBe("Lisbon trip is tomorrow!");
        expect(tomorrowLine("Lisbon trip", "2026-11-05", TODAY)).toBe("Tomorrow is the eve of Lisbon trip.");
        expect(tomorrowLine("Lisbon trip", "2026-11-08", TODAY)).toBe("Tomorrow is the last Wednesday before Lisbon trip.");
        expect(tomorrowLine("Lisbon trip", "2026-11-11", "2026-11-06")).toBe("Tomorrow starts the last weekend before Lisbon trip.");
        expect(tomorrowLine("Lisbon trip", "2026-11-12", "2026-11-08")).toBe("Tomorrow begins the week of Lisbon trip.");
        expect(tomorrowLine("Lisbon trip", "2026-11-11", TODAY)).toBe("Tomorrow, Lisbon trip is just a week away.");
        expect(tomorrowLine("Lisbon trip", "2026-11-20", "2026-11-08")).toBe("Tomorrow begins the week before Lisbon trip.");
        expect(tomorrowLine("Lisbon trip", "2026-12-20", "2026-11-30")).toBe("Tomorrow it's December, the month of Lisbon trip.");
        expect(tomorrowLine("Lisbon trip", "2026-12-12", TODAY, 0.49, 0.51)).toBe("Tomorrow you'll be past halfway to Lisbon trip.");
        expect(tomorrowLine("Lisbon trip", "2026-12-12", TODAY, 0.74, 0.76)).toBe("Tomorrow the home stretch to Lisbon trip begins.");
    });

    it("falls back to a steady, stable everyday line", () => {
        const line = tomorrowLine("Lisbon trip", "2026-12-12", TODAY, 0.2, 0.22);
        expect(line).toMatch(/tomorrow/i);
        expect(tomorrowLine("Lisbon trip", "2026-12-12", TODAY, 0.2, 0.22)).toBe(line);
    });

    it("has a line for the day itself and for after it", () => {
        expect(tomorrowLine("Lisbon trip", TODAY, TODAY)).toBe("It's here. Enjoy every minute.");
        expect(tomorrowLine("Lisbon trip", "2026-11-01", TODAY)).toBe("Hope it was everything you waited for.");
    });
});

describe("anticipate", () => {
    it("measures how far the sun has risen, today and tomorrow", () => {
        const look = anticipate(trip, TODAY);
        expect(look).toMatchObject({ days: 12, sleeps: 12, when: "Next week" });
        expect(look.rise).toBeCloseTo(14 / 26);
        expect(look.riseTomorrow).toBeCloseTo(15 / 26);
        expect(anticipate(trip, "2026-11-15")).toMatchObject({ rise: 1, sleeps: 0, when: "Today" });
    });
});

describe("doors", () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date(2026, 10, 3, 12));
    });
    afterEach(() => vi.useRealTimers());

    it("keeps a day's prompt stable and saves a special one for the day itself", () => {
        expect(doorPrompt("trip", TODAY)).toBe(doorPrompt("trip", TODAY));
        expect(doorPrompt("trip", "2026-11-15", true)).toBe(THE_DAY_PROMPT);
    });

    it("knows when today's door is still closed", () => {
        expect(hasDoorWaiting(trip)).toBe(true);
        expect(hasDoorWaiting({ ...trip, countdown: { doors: [{ date: TODAY, prompt: "?", openedAt: "2026-11-03T08:00:00.000Z" }] } })).toBe(false);
        expect(hasDoorWaiting({ ...trip, target: "2026-11-01" })).toBe(false);
        expect(hasDoorWaiting({ ...trip, kind: "habit" })).toBe(false);
    });
});
