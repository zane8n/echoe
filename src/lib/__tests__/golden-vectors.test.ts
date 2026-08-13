import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { HabitConfig, MilestoneEvent } from "@/lib/types";
import { habitStreak, periodProgress, projectProgress } from "@/lib/utils";

interface HabitVector {
    name: string;
    tz: string;
    asOf: string;
    habit: HabitConfig;
    expected: { done: number; target: number; satisfied: boolean; streak: number };
}

interface ProjectVector {
    name: string;
    tz: string;
    asOf: string;
    event: Partial<MilestoneEvent>;
    expected: {
        investedHours: number;
        plannedHours: number;
        remainingHours: number;
        readiness: number;
        effortPercent: number;
        elapsedPercent: number;
        overallPercent: number;
        requiredHoursPerWeek: number;
        risk: string;
    };
}

const fixturePath = resolve(process.cwd(), "fixtures/golden-vectors.json");
const data = JSON.parse(readFileSync(fixturePath, "utf8")) as {
    habitVectors: HabitVector[];
    projectVectors: ProjectVector[];
};

const originalTz = process.env.TZ;

const withClock = (tz: string, asOf: string, run: () => void) => {
    process.env.TZ = tz;
    vi.useFakeTimers();
    vi.setSystemTime(new Date(`${asOf}T12:00:00`));
    try {
        run();
    } finally {
        vi.useRealTimers();
        if (originalTz === undefined) delete process.env.TZ; else process.env.TZ = originalTz;
    }
};

afterEach(() => {
    vi.useRealTimers();
    if (originalTz === undefined) delete process.env.TZ; else process.env.TZ = originalTz;
});

describe("golden vectors — habit satisfaction, streak (DOM-5, DOM-7, DOM-9)", () => {
    for (const vector of data.habitVectors) {
        it(vector.name, () => {
            withClock(vector.tz, vector.asOf, () => {
                const progress = periodProgress(vector.habit, vector.asOf);
                expect(progress.done).toBe(vector.expected.done);
                expect(progress.target).toBe(vector.expected.target);
                expect(progress.satisfied).toBe(vector.expected.satisfied);

                const event = { id: "v", name: "v", start: "2020-01-01", target: "2020-01-01", color: "teal", pinned: false, habit: vector.habit } as unknown as MilestoneEvent;
                expect(habitStreak(event)).toBe(vector.expected.streak);
            });
        });
    }
});

describe("golden vectors — project progress, risk thresholds (DOM-14, DOM-16)", () => {
    for (const vector of data.projectVectors) {
        it(vector.name, () => {
            withClock(vector.tz, vector.asOf, () => {
                const event = { id: "v", name: "v", color: "teal", pinned: false, ...vector.event } as unknown as MilestoneEvent;
                const progress = projectProgress(event);
                expect(progress).toMatchObject(vector.expected);
            });
        });
    }
});
