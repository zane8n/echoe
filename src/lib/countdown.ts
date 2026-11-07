import { DAY_MS } from "./constants";
import type { CountdownConfig, CountdownRepeat, CountdownUnit, MilestoneEvent } from "./types";
import { clamp, formatDate, localDate, parseDate, startOfDay } from "./utils";

/** What a countdown shows, computed once and worded the same on every screen. */
export interface CountdownView {
    /** The occurrence being counted to (YYYY-MM-DD); for repeating countdowns, the next one. */
    target: string;
    /** Calendar days until the occurrence; negative once a one-off date has passed. */
    days: number;
    /** Monday to Friday days left before the occurrence. */
    workdays: number;
    state: "ahead" | "today" | "past";
    /** The headline: "12", "3w 2d", "4mo 5d", "2d 4h 10m", "Today". */
    value: string;
    /** Set when value is a plain count, so screens can animate it. */
    count?: number;
    /** What the value means: "days to go", "working days left", "to go", "days ago". */
    label: string;
    /** "Fri, 8 Nov", "Fri, 8 Nov, 09:30". */
    dateLabel: string;
    /** "Every year", "Every month", or undefined for a one-off. */
    repeatLabel?: string;
    /** Share of the wait already behind you, 0 to 100. */
    percent: number;
    /** Start of the current wait (event start, or the previous occurrence for repeats). */
    from: string;
}

export const UNIT_OPTIONS: Array<{ value: CountdownUnit; label: string }> = [
    { value: "days", label: "Days" },
    { value: "weeks", label: "Weeks" },
    { value: "months", label: "Months" },
    { value: "precise", label: "Exact" },
];

export const REPEAT_OPTIONS: Array<{ value: CountdownRepeat; label: string }> = [
    { value: "none", label: "Once" },
    { value: "monthly", label: "Monthly" },
    { value: "yearly", label: "Yearly" },
];

const REPEAT_LABEL: Record<Exclude<CountdownRepeat, "none">, string> = { monthly: "Every month", yearly: "Every year" };

const plural = (count: number, one: string, many = `${one}s`) => (count === 1 ? one : many);
const dayDiff = (from: Date, to: Date) => Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);

/** Same day of month, `months` later, clamped to the month's length (Jan 31 → Feb 28). */
function shiftMonths(date: Date, months: number, day = date.getDate()): Date {
    const year = date.getFullYear();
    const month = date.getMonth() + months;
    const last = new Date(year, month + 1, 0).getDate();
    return new Date(year, month, Math.min(day, last));
}

function atTime(date: Date, time?: string): Date {
    const [hours, minutes] = (time ?? "00:00").split(":").map(Number);
    const moment = new Date(date);
    moment.setHours(hours || 0, minutes || 0, 0, 0);
    return moment;
}

/** The occurrence being counted to and the one before it, rolling repeats forward past today. */
export function occurrence(event: Pick<MilestoneEvent, "start" | "target" | "countdown">, now = new Date()): { target: Date; previous: Date } {
    const base = parseDate(event.target) ?? startOfDay(now);
    const start = parseDate(event.start) ?? base;
    const repeat = event.countdown?.repeat ?? "none";
    if (repeat === "none") return { target: base, previous: start };

    const step = repeat === "yearly" ? 12 : 1;
    const day = base.getDate();
    let index = 0;
    let target = base;
    // A repeat is over once its moment has passed: the day itself, or the time on that day.
    const passed = (date: Date) => (event.countdown?.time ? atTime(date, event.countdown.time) <= now : startOfDay(date) < startOfDay(now));
    while (passed(target) && index < 12_000) {
        index += 1;
        target = shiftMonths(base, index * step, day);
    }
    return { target, previous: index === 0 ? start : shiftMonths(base, (index - 1) * step, day) };
}

/** Monday to Friday days from today up to, not including, the target day. */
export function workdaysBetween(from: Date, to: Date): number {
    const total = dayDiff(from, to);
    if (total <= 0) return 0;
    const full = Math.floor(total / 7);
    let count = full * 5;
    const startDay = startOfDay(from).getDay();
    for (let offset = 0; offset < total % 7; offset += 1) {
        const weekday = (startDay + offset) % 7;
        if (weekday !== 0 && weekday !== 6) count += 1;
    }
    return count;
}

function monthsAndDays(from: Date, to: Date): { months: number; days: number } {
    const start = startOfDay(from);
    let months = (to.getFullYear() - start.getFullYear()) * 12 + to.getMonth() - start.getMonth();
    if (shiftMonths(start, months) > to) months -= 1;
    return { months: Math.max(0, months), days: dayDiff(shiftMonths(start, Math.max(0, months)), to) };
}

function preciseParts(ms: number): string {
    const minutes = Math.max(0, Math.floor(ms / 60_000));
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const rest = minutes % 60;
    if (days > 0) return `${days}d ${hours}h ${rest}m`;
    if (hours > 0) return `${hours}h ${rest}m`;
    return `${rest}m`;
}

export function countdownView(event: Pick<MilestoneEvent, "start" | "target" | "countdown">, now = new Date()): CountdownView {
    const config: CountdownConfig = event.countdown ?? {};
    const unit = config.unit ?? "days";
    const { target, previous } = occurrence(event, now);
    const days = dayDiff(now, target);
    const workdays = workdaysBetween(now, target);
    const moment = atTime(target, config.time);
    const sameYear = target.getFullYear() === now.getFullYear();
    const dateLabel = [
        formatDate(localDate(target), { weekday: "short", day: "numeric", month: "short", year: sameYear ? undefined : "numeric" }),
        config.time,
    ].filter(Boolean).join(", ");
    const begin = atTime(previous, config.time);
    const span = moment.getTime() - begin.getTime();
    const percent = span > 0 ? clamp(((now.getTime() - begin.getTime()) / span) * 100) : 100;
    const base = {
        target: localDate(target),
        days,
        workdays,
        dateLabel,
        repeatLabel: config.repeat && config.repeat !== "none" ? REPEAT_LABEL[config.repeat] : undefined,
        percent,
        from: localDate(previous),
    };

    if (days < 0) {
        const ago = Math.abs(days);
        return { ...base, state: "past", value: String(ago), count: ago, label: `${plural(ago, "day")} ago` };
    }

    // Exact countdowns tick down to the minute, including on the day itself.
    if (unit === "precise" && moment.getTime() > now.getTime() && (days > 0 || config.time)) {
        return { ...base, state: days === 0 ? "today" : "ahead", value: preciseParts(moment.getTime() - now.getTime()), label: "to go" };
    }
    if (days === 0) {
        return { ...base, state: "today", value: "Today", label: config.time ? `at ${config.time}` : "is the day" };
    }

    if (unit === "weeks" && days >= 7) {
        const weeks = Math.floor(days / 7);
        const rest = days % 7;
        return rest === 0
            ? { ...base, state: "ahead", value: String(weeks), count: weeks, label: `${plural(weeks, "week")} to go` }
            : { ...base, state: "ahead", value: `${weeks}w ${rest}d`, label: "to go" };
    }
    if (unit === "months") {
        const span = monthsAndDays(now, target);
        if (span.months > 0) {
            return span.days === 0
                ? { ...base, state: "ahead", value: String(span.months), count: span.months, label: `${plural(span.months, "month")} to go` }
                : { ...base, state: "ahead", value: `${span.months}mo ${span.days}d`, label: "to go" };
        }
    }
    if (unit === "days" && config.weekdaysOnly) {
        return { ...base, state: "ahead", value: String(workdays), count: workdays, label: `working ${plural(workdays, "day")} left` };
    }
    return { ...base, state: "ahead", value: String(days), count: days, label: `${plural(days, "day")} to go` };
}

/** One short line describing a countdown's options, for list rows and the editor. */
export function countdownMeta(view: CountdownView): string {
    return [view.dateLabel, view.repeatLabel].filter(Boolean).join(" · ");
}
