import { DAY_MS } from "./constants";
import type { MilestoneEvent, RemainingDisplay, TimeSpent, DashboardState, HabitStats } from "./types";

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
    const end = targetValue ? parseDate(targetValue) : new Date();
    if (!start || !end || end <= start) return { days: 0, weeks: 0, months: 0, percent: 0 };
    const days = Math.floor((end.getTime() - start.getTime()) / DAY_MS);
    const months = Math.floor(days / 30.44);
    const weeks = Math.floor(days / 7);
    const percent = targetValue
        ? clamp(((Date.now() - start.getTime()) / (end.getTime() - start.getTime())) * 100)
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
    const sorted = [...event.habit.entries].sort((a, b) => b.date.localeCompare(a.date));
    let streak = 0;
    const today = localDate();
    let check = today;
    for (const e of sorted) {
        if (e.status !== "done") break;
        if (e.date === check || daysSince(check) - daysSince(e.date) <= 1) { streak++; check = e.date; }
        else break;
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

// ── Seed data (empty — user builds from scratch) ──
export const seedState = (): DashboardState => ({
    events: [],
    achievements: [],
    settings: { theme: "warm", showLifeGrid: true },
});

export const escapeHtml = (value: string): string =>
    String(value).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[c] ?? c);
