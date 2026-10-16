import type { HabitEntry, MilestoneEvent, ProjectRisk } from "./types";
import {
    daysUntil,
    formatDate,
    formatOpenDuration,
    habitStats,
    isCheckedInForPeriod,
    localDate,
    milestoneKind,
    periodProgress,
    projectProgress,
    timeSpent,
} from "./utils";

/** Everything a list row or header needs to describe a path, worded the same way on every screen. */
export interface PathSummary {
    kind: ReturnType<typeof milestoneKind>;
    kindLabel: string;
    /** Can be checked in from a list (habits, projects, tracked ongoing paths). */
    checkable: boolean;
    doneToday: boolean;
    /** The current day or week is satisfied. */
    doneForPeriod: boolean;
    period?: { done: number; target: number; label: "today" | "this week" };
    metric: string;
    metricLabel: string;
    meta: string;
    /** Check-in history used by beat strips and calendars. */
    entries: HabitEntry[];
    progressPercent?: number;
    risk?: ProjectRisk;
    daysLeft?: number;
}

export function kindLabel(event: MilestoneEvent): string {
    const kind = milestoneKind(event);
    if (kind === "project") return "Project";
    if (kind === "countdown") return "Countdown";
    if (kind === "ongoing") return event.habit ? "Ongoing practice" : "Ongoing";
    if (event.habit?.frequency === "weekly") {
        const target = event.habit.targetPerPeriod ?? 1;
        return target === 1 ? "Weekly habit" : `${target} times a week`;
    }
    return "Daily habit";
}

const plural = (count: number, one: string, many = `${one}s`) => `${count} ${count === 1 ? one : many}`;

export function summarizePath(event: MilestoneEvent, today = localDate()): PathSummary {
    const kind = milestoneKind(event);
    const label = kindLabel(event);

    if (event.habit) {
        const stats = habitStats(event);
        const period = periodProgress(event.habit, today);
        const weekly = event.habit.frequency === "weekly";
        const doneToday = event.habit.entries.some((entry) => entry.date === today && entry.status === "done");
        const streakUnit = weekly ? "week" : "day";
        const meta = weekly && period.target > 1
            ? `${period.done} of ${period.target} this week`
            : stats.streak > 0
                ? `${plural(stats.streak, streakUnit)} in a row`
                : stats.total > 0 ? `${stats.rate}% consistent` : "Ready for a first check-in";
        return {
            kind,
            kindLabel: label,
            checkable: !event.achievedAt,
            doneToday,
            doneForPeriod: period.satisfied,
            period: { done: period.done, target: period.target, label: period.periodLabel },
            metric: String(stats.streak),
            metricLabel: `${streakUnit} streak`,
            meta,
            entries: event.habit.entries,
            progressPercent: stats.rate,
            daysLeft: kind === "ongoing" ? undefined : daysUntil(event.target),
        };
    }

    if (event.project) {
        const progress = projectProgress(event);
        const checkIns = event.project.checkIns ?? [];
        const frequency = event.project.checkInFrequency ?? "daily";
        return {
            kind,
            kindLabel: label,
            checkable: !event.achievedAt && progress.risk !== "complete",
            doneToday: checkIns.some((entry) => entry.date === today && entry.status === "done"),
            doneForPeriod: isCheckedInForPeriod(frequency, checkIns, today),
            period: { done: isCheckedInForPeriod(frequency, checkIns, today) ? 1 : 0, target: 1, label: frequency === "weekly" ? "this week" : "today" },
            metric: `${progress.overallPercent}%`,
            metricLabel: "overall",
            meta: `${progress.investedHours}h of ${progress.plannedHours}h, ${progress.readiness}% ready`,
            entries: checkIns,
            progressPercent: progress.overallPercent,
            risk: progress.risk,
            daysLeft: daysUntil(event.target),
        };
    }

    if (kind === "ongoing") {
        return {
            kind,
            kindLabel: label,
            checkable: false,
            doneToday: false,
            doneForPeriod: false,
            metric: formatOpenDuration(event.start),
            metricLabel: "and counting",
            meta: `Since ${formatDate(event.start, { day: undefined })}`,
            entries: [],
        };
    }

    const days = daysUntil(event.target);
    return {
        kind,
        kindLabel: label,
        checkable: false,
        doneToday: false,
        doneForPeriod: false,
        metric: days === 0 ? "Today" : String(Math.abs(days)),
        metricLabel: days > 0 ? (days === 1 ? "day to go" : "days to go") : days === 0 ? "" : days === -1 ? "day ago" : "days ago",
        meta: formatDate(event.target, { weekday: "short", day: "numeric", month: "short", year: undefined }),
        entries: [],
        progressPercent: timeSpent(event.start, event.target).percent,
        daysLeft: days,
    };
}

export const riskLabel: Record<ProjectRisk, string> = {
    "on-track": "On track",
    watch: "Worth a look",
    "at-risk": "Needs a decision",
    complete: "Complete",
};

export function greeting(date = new Date()): string {
    const hour = date.getHours();
    if (hour < 5) return "Still up";
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
}
