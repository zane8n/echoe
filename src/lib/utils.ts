import { DAY_MS } from "./constants";
import type {
    DashboardSettings,
    DashboardState,
    HabitConfig,
    HabitStats,
    MilestoneEvent,
    MilestoneKind,
    PeriodProgress,
    PersonalProfile,
    RemainingDisplay,
    SupportStyle,
    TimeSpent,
    ProjectProgress,
} from "./types";

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

export const milestoneKind = (event: MilestoneEvent): MilestoneKind =>
    event.kind ?? (event.habit ? "habit" : "project");

export const projectProgress = (event: MilestoneEvent): ProjectProgress => {
    const plannedHours = Math.max(1, event.project?.plannedHours ?? 40);
    const investedHours = Math.round((event.project?.entries.reduce((total, entry) => total + Math.max(0, entry.hours), 0) ?? 0) * 10) / 10;
    const readiness = clamp(event.project?.readiness ?? 0);
    const effortPercent = clamp((investedHours / plannedHours) * 100);
    const elapsedPercent = progressBetween(event.start, event.target);
    const overallPercent = Math.round((effortPercent * 0.5) + (readiness * 0.5));
    const remainingHours = Math.max(0, Math.round((plannedHours - investedHours) * 10) / 10);
    const remainingDays = Math.max(0, daysUntil(event.target));
    const requiredHoursPerWeek = remainingHours === 0
        ? 0
        : Math.round((remainingHours / Math.max(1, remainingDays / 7)) * 10) / 10;
    const scheduleGap = elapsedPercent - overallPercent;
    const risk = event.achievedAt || (readiness >= 100 && remainingHours === 0)
        ? "complete"
        : remainingDays === 0 || scheduleGap >= 25
            ? "at-risk"
            : scheduleGap >= 10
                ? "watch"
                : "on-track";
    return { investedHours, plannedHours, remainingHours, readiness, effortPercent, elapsedPercent, overallPercent, requiredHoursPerWeek, risk };
};

export const formatOpenDuration = (startValue: string): string => {
    const days = Math.max(0, daysSince(startValue));
    if (days >= 365) {
        const years = Math.floor(days / 365);
        const months = Math.floor((days % 365) / 30.44);
        return `${years}y${months ? ` ${months}mo` : ""}`;
    }
    if (days >= 30) return `${Math.floor(days / 30.44)}mo`;
    if (days >= 7) return `${Math.floor(days / 7)}w`;
    return `${days}d`;
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
        .filter((e) => milestoneKind(e) !== "ongoing" && daysUntil(e.target) >= 0)
        .sort((a, b) => (parseDate(a.target)?.getTime() ?? 0) - (parseDate(b.target)?.getTime() ?? 0));
    return events.find((e) => e.pinned) ?? future[0] ?? events[0] ?? null;
};

export const isCheckedInForPeriod = (
    frequency: "daily" | "weekly",
    entries: Array<{ date: string; status: "done" | "missed" }>,
    today = localDate(),
): boolean => {
    if (frequency === "daily") return entries.some((entry) => entry.date === today && entry.status === "done");
    const now = startOfDay(parseDate(today) ?? new Date());
    const monday = addDays(now, -((now.getDay() + 6) % 7));
    return entries.some((entry) => {
        const date = parseDate(entry.date);
        return entry.status === "done" && Boolean(date && date >= monday && date <= now);
    });
};

// ── Canonical habit satisfaction (DOM-5) — every surface that needs to know
// whether a habit's current period is "done" must go through this, not re-derive it.
export const startOfWeek = (date: Date): Date => addDays(startOfDay(date), -((date.getDay() + 6) % 7));

export const periodTarget = (habit: Pick<HabitConfig, "frequency" | "targetPerPeriod">): number =>
    habit.frequency === "weekly" ? clamp(habit.targetPerPeriod ?? 1, 1, 7) : 1;

export const periodProgress = (habit: HabitConfig, today = localDate()): PeriodProgress => {
    const target = periodTarget(habit);
    if (habit.frequency === "daily") {
        const done = habit.entries.some((entry) => entry.date === today && entry.status === "done") ? 1 : 0;
        return { done, target, satisfied: done >= target, periodLabel: "today" };
    }
    const now = startOfDay(parseDate(today) ?? new Date());
    const monday = startOfWeek(now);
    const done = habit.entries.filter((entry) => {
        const date = parseDate(entry.date);
        return entry.status === "done" && Boolean(date && date >= monday && date <= now);
    }).length;
    return { done, target, satisfied: done >= target, periodLabel: "this week" };
};

export const isSatisfied = (habit: HabitConfig, today = localDate()): boolean => periodProgress(habit, today).satisfied;

// DOM-9: a new distinct day beyond the period's target is rejected unless allowExtraCheckIns is on.
// Correcting an existing date's entry is never blocked — only new "extra" days are.
export const isBlockedExtraCheckIn = (habit: HabitConfig, date: string, allowExtraCheckIns: boolean | undefined): boolean =>
    !habit.entries.some((entry) => entry.date === date)
    && periodProgress(habit, date).satisfied
    && allowExtraCheckIns !== true;

export const habitStreak = (event: MilestoneEvent): number => {
    if (!event.habit) return 0;
    const doneDates = new Set(event.habit.entries.filter((entry) => entry.status === "done").map((entry) => entry.date));
    if (!doneDates.size) return 0;

    if (event.habit.frequency === "weekly") {
        const target = periodTarget(event.habit);
        const doneCountByWeek = new Map<string, number>();
        for (const date of doneDates) {
            const parsed = parseDate(date) ?? new Date();
            const monday = localDate(startOfWeek(parsed));
            doneCountByWeek.set(monday, (doneCountByWeek.get(monday) ?? 0) + 1);
        }
        let streak = 0;
        let week = startOfWeek(startOfDay());
        if ((doneCountByWeek.get(localDate(week)) ?? 0) < target) week = addDays(week, -7);
        while ((doneCountByWeek.get(localDate(week)) ?? 0) >= target) {
            streak += 1;
            week = addDays(week, -7);
        }
        return streak;
    }

    // Daily habits: a "missed" entry and simply no entry are treated identically here —
    // only presence of a "done" date breaks/continues the streak (DOM-7).
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

const missedDayCopy: Record<SupportStyle, string> = {
    gentle: "A missed day is information. Make the next step smaller and restart.",
    direct: "Review the obstacle, reduce the next step, and resume today.",
    reflective: "Keep what the missed day taught you, then begin again with one clear step.",
};

export const habitInsight = (event: MilestoneEvent, supportStyle: SupportStyle = "gentle"): string => {
    const stats = habitStats(event);
    if (!event.habit || stats.total === 0) return "Begin with the smallest version you can repeat.";
    if (stats.streak >= 7) return "This rhythm is holding. Protect the conditions that make it easy.";
    const latest = [...event.habit.entries].sort((a, b) => b.date.localeCompare(a.date))[0];
    if (latest?.status === "missed") return missedDayCopy[supportStyle];
    if (stats.rate >= 70) return "Consistency is growing. Keep the next action obvious and light.";
    return "Notice what interrupts the pattern, then adjust one condition at a time.";
};

export const defaultProfile = (): PersonalProfile => ({
    displayName: "",
    intention: "",
    supportStyle: "gentle",
});

export const normalizeSettings = (settings?: Partial<DashboardSettings> | null): DashboardSettings => ({
    accent: settings?.accent ?? "blue",
    appearance: settings?.appearance ?? "system",
    showActivityHistogram: settings?.showActivityHistogram ?? true,
    readNotificationIds: settings?.readNotificationIds ?? [],
    profile: {
        ...defaultProfile(),
        ...(settings?.profile ?? {}),
    },
});

// Seed data is intentionally empty so each person builds from real input.
export const seedState = (): DashboardState => ({
    schemaVersion: 2,
    events: [],
    achievements: [],
    settings: normalizeSettings(),
    updatedAt: new Date().toISOString(),
});

export const isDashboardState = (value: unknown): value is DashboardState => {
    if (!value || typeof value !== "object") return false;
    const candidate = value as Partial<DashboardState>;
    return Array.isArray(candidate.events)
        && Array.isArray(candidate.achievements)
        && Boolean(candidate.settings);
};

export const escapeHtml = (value: string): string =>
    String(value).replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[c] ?? c);
