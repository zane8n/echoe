import { DAY_MS } from "./constants";
import type { DashboardState, HabitStats, MilestoneEvent, RemainingDisplay, TimeSpent } from "./types";

// ── Date helpers ──
export const localDate = (date = new Date()): string => {
    const offset = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

export const addDays = (date: Date, days: number): Date => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
};

export const parseDate = (value: string): Date | null => {
    if (!value) return null;
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
};

export const startOfDay = (date = new Date()): Date =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const daysUntil = (value: string): number => {
    const target = parseDate(value);
    if (!target) return 0;
    return Math.ceil((startOfDay(target).getTime() - startOfDay().getTime()) / DAY_MS);
};

export const daysSince = (value: string): number => {
    const d = parseDate(value);
    if (!d) return 0;
    return Math.floor((startOfDay().getTime() - startOfDay(d).getTime()) / DAY_MS);
};

export const clamp = (value: number, min = 0, max = 100): number =>
    Math.min(max, Math.max(min, value));

// ── Time spent (the core philosophy) ──
export const timeSpent = (startValue: string, targetValue?: string): TimeSpent => {
    const start = parseDate(startValue);
    const target = targetValue ? parseDate(targetValue) : null;
    if (!start || (target && target <= start)) return { days: 0, weeks: 0, months: 0, percent: 0 };
    const now = startOfDay();
    const end = target && now > target ? target : now;
    const days = Math.max(0, Math.floor((end.getTime() - start.getTime()) / DAY_MS));
    const months = Math.floor(days / 30.44);
    const weeks = Math.floor(days / 7);
    const percent = target
        ? clamp(((now.getTime() - start.getTime()) / (target.getTime() - start.getTime())) * 100)
        : 100;
    return { days, weeks, months, percent };
};

export const progressBetween = (startValue: string, targetValue: string): number => {
    return timeSpent(startValue, targetValue).percent;
};

// ── Formatting ──
export const formatDate = (value: string | Date, options: Intl.DateTimeFormatOptions = {}): string => {
    const date = typeof value === "string" ? parseDate(value) : value;
    if (!date) return "";
    return new Intl.DateTimeFormat(undefined, { day: "numeric", month: "long", year: "numeric", ...options }).format(date);
};

export const formatSpent = (ts: TimeSpent): string => {
    if (ts.months >= 12) return `${Math.floor(ts.months / 12)}y ${ts.months % 12}mo invested`;
    if (ts.months >= 1) return `${ts.months}mo ${ts.weeks % 4}w invested`;
    if (ts.weeks >= 1) return `${ts.weeks}w invested`;
    return `${ts.days}d invested`;
};

export const formatRemaining = (days: number): RemainingDisplay => {
    if (days > 1) return { value: days, unit: "days" };
    if (days === 1) return { value: 1, unit: "day" };
    if (days === 0) return { value: "Now", unit: "" };
    return { value: Math.abs(days), unit: days === -1 ? "day ago" : "days ago" };
};

// ── Event helpers ──
export const getPinnedEvent = (events: MilestoneEvent[]): MilestoneEvent | null => {
    const future = [...events]
        .filter((e) => daysUntil(e.target) >= 0)
        .sort((a, b) => (parseDate(a.target)?.getTime() ?? 0) - (parseDate(b.target)?.getTime() ?? 0));
    return events.find((e) => e.pinned) ?? future[0] ?? events[0] ?? null;
};

export const habitStreak = (event: MilestoneEvent): number => {
    if (!event.habit) return 0;
    const doneDates = new Set(event.habit.entries.filter((entry) => entry.status === "done").map((entry) => entry.date));
    if (!doneDates.size) return 0;

    if (event.habit.frequency === "weekly") {
        const weeks = new Set([...doneDates].map((date) => {
            const parsed = parseDate(date) ?? new Date();
            const monday = addDays(startOfDay(parsed), -((parsed.getDay() + 6) % 7));
            return localDate(monday);
        }));
        let streak = 0;
        let week = addDays(startOfDay(), -((new Date().getDay() + 6) % 7));
        if (!weeks.has(localDate(week))) week = addDays(week, -7);
        while (weeks.has(localDate(week))) {
            streak += 1;
            week = addDays(week, -7);
        }
        return streak;
    }

    let streak = 0;
    let cursor = startOfDay();
    if (!doneDates.has(localDate(cursor))) cursor = addDays(cursor, -1);
    while (doneDates.has(localDate(cursor))) {
        streak += 1;
        cursor = addDays(cursor, -1);
    }
    return streak;
};

export const habitStats = (event: MilestoneEvent): HabitStats => {
    if (!event.habit) return { streak: 0, done: 0, missed: 0, total: 0, rate: 0 };
    const done = event.habit.entries.filter(e => e.status === "done").length;
    const missed = event.habit.entries.filter(e => e.status === "missed").length;
    const total = done + missed;
    return { streak: habitStreak(event), done, missed, total, rate: total > 0 ? Math.round((done / total) * 100) : 0 };
};

export const habitInsight = (event: MilestoneEvent): string => {
    const stats = habitStats(event);
    if (!event.habit || stats.total === 0) return "Begin with the smallest version you can repeat.";
    if (stats.streak >= 7) return "This rhythm is holding. Protect the conditions that make it easy.";
    const latest = [...event.habit.entries].sort((a, b) => b.date.localeCompare(a.date))[0];
    if (latest?.status === "missed") return "A missed day is information. Make the next step smaller and restart.";
    if (stats.rate >= 70) return "Consistency is growing. Keep the next action obvious and light.";
    return "Notice what interrupts the pattern, then adjust one condition at a time.";
};

// ── Seed data (empty — user builds from scratch) ──
export const seedState = (): DashboardState => ({
    schemaVersion: 2,
    events: [],
    achievements: [],
    settings: { theme: "warm", showActivityHistogram: true },
    updatedAt: new Date().toISOString(),
});

export const isDashboardState = (value: unknown): value is DashboardState => {
    if (!value || typeof value !== "object") return false;
    const candidate = value as Partial<DashboardState>;
    return Array.isArray(candidate.events)
        && Array.isArray(candidate.achievements)
        && Boolean(candidate.settings)
        && typeof candidate.settings?.theme === "string";
};

export const escapeHtml = (value: string): string =>
    String(value).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[c] ?? c);
