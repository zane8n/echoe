import { describe, expect, it } from "vitest";
import { parseQuickInput } from "@/lib/quick-parse";

// Friday 16 October 2026, 20:00 local time.
const now = new Date(2026, 9, 16, 20, 0);
const parse = (text: string) => parseQuickInput(text, now);

describe("parseQuickInput", () => {
    it("treats plain text as a task for today", () => {
        expect(parse("Book flights")).toMatchObject({ kind: "task", name: "Book flights", date: "2026-10-16" });
        expect(parse("Book flights").time).toBeUndefined();
    });

    it("reads clock times only when they are unambiguous", () => {
        expect(parse("Call the dentist 9:30")).toMatchObject({ kind: "task", name: "Call the dentist", time: "09:30" });
        expect(parse("meds at 8pm")).toMatchObject({ kind: "task", name: "Meds", time: "20:00" });
        expect(parse("Read 20 pages")).toMatchObject({ kind: "task", name: "Read 20 pages" });
        expect(parse("Read 20 pages").time).toBeUndefined();
    });

    it("plans near-term tasks on a later day", () => {
        expect(parse("Gym tomorrow 7am")).toMatchObject({ kind: "task", name: "Gym", date: "2026-10-17", time: "07:00" });
        expect(parse("Dentist today at 15:00")).toMatchObject({ kind: "task", name: "Dentist", date: "2026-10-16", time: "15:00" });
        expect(parse("Laundry sunday")).toMatchObject({ kind: "task", name: "Laundry", date: "2026-10-18" });
    });

    it("recognises daily and weekly habits", () => {
        expect(parse("Morning pages daily")).toMatchObject({ kind: "habit", name: "Morning pages", frequency: "daily" });
        expect(parse("Read every day")).toMatchObject({ kind: "habit", name: "Read", frequency: "daily" });
        expect(parse("Run 3x a week")).toMatchObject({ kind: "habit", name: "Run", frequency: "weekly", targetPerPeriod: 3 });
        expect(parse("Swim twice a week")).toMatchObject({ kind: "habit", name: "Swim", frequency: "weekly", targetPerPeriod: 2 });
        expect(parse("Strength 4 times per week")).toMatchObject({ kind: "habit", name: "Strength", frequency: "weekly", targetPerPeriod: 4 });
        expect(parse("Call home weekly")).toMatchObject({ kind: "habit", name: "Call home", frequency: "weekly", targetPerPeriod: 1 });
        expect(parse("Read 20 pages daily")).toMatchObject({ kind: "habit", name: "Read 20 pages" });
    });

    it("turns distant dates into countdowns", () => {
        expect(parse("Lisbon trip Nov 8")).toMatchObject({ kind: "countdown", name: "Lisbon trip", date: "2026-11-08" });
        expect(parse("Lisbon trip on 8 November")).toMatchObject({ kind: "countdown", name: "Lisbon trip", date: "2026-11-08" });
        expect(parse("Launch in 3 weeks")).toMatchObject({ kind: "countdown", name: "Launch", date: "2026-11-06" });
        expect(parse("Exam 2026-12-01")).toMatchObject({ kind: "countdown", name: "Exam", date: "2026-12-01" });
    });

    it("rolls month-day dates that already passed into next year", () => {
        expect(parse("Birthday March 3")).toMatchObject({ kind: "countdown", date: "2027-03-03" });
    });

    it("recognises projects from an effort budget", () => {
        expect(parse("CCNP 120h by Dec 20")).toMatchObject({ kind: "project", name: "CCNP", plannedHours: 120, date: "2026-12-20" });
        expect(parse("Thesis 40 hours")).toMatchObject({ kind: "project", name: "Thesis", plannedHours: 40 });
    });

    it("recognises ongoing paths from a start date", () => {
        expect(parse("Life in Nairobi since March 2023")).toMatchObject({ kind: "ongoing", name: "Life in Nairobi", start: "2023-03-01" });
        expect(parse("Sober since 2024-01-15")).toMatchObject({ kind: "ongoing", name: "Sober", start: "2024-01-15" });
    });

    it("reports the phrases it understood", () => {
        expect(parse("Run 3x a week").tokens).toEqual(["3x a week"]);
        expect(parse("Gym tomorrow 7am").tokens).toEqual(expect.arrayContaining(["tomorrow", "7am"]));
    });

    it("can be forced into a different kind while keeping what it parsed", () => {
        expect(parseQuickInput("Lisbon trip Nov 8", now, "task")).toMatchObject({ kind: "task", name: "Lisbon trip", date: "2026-11-08" });
        expect(parseQuickInput("Stretch", now, "habit")).toMatchObject({ kind: "habit", name: "Stretch", frequency: "daily" });
    });

    it("handles empty input", () => {
        expect(parse("   ")).toMatchObject({ kind: "task", name: "" });
    });
});
