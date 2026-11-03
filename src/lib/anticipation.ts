import { DAY_MS } from "./constants";
import type { CountdownDoor, MilestoneEvent } from "./types";
import { addDays, clamp, formatDate, localDate, parseDate, startOfDay, startOfWeek } from "./utils";

/**
 * Countdowns in Echoe look toward tomorrow instead of tallying what's left: the headline is a
 * phrase you'd say out loud ("Next week", "Mid December"), and each day has a line about what
 * tomorrow brings. The exact number of sleeps is still there for anyone who taps for it.
 */
export interface When {
    /** Calendar days until the date; negative once it has passed. */
    days: number;
    /** The headline: "Tomorrow", "Thursday", "Next week", "Mid December". Never a tally of days. */
    when: string;
    /** A compact companion for tiles and rows: "after tomorrow", "this week", "Sun, Nov 15". */
    hint: string;
    /** The full date, for the path's own page. */
    date: string;
}

export interface Anticipation extends When {
    /** Nights until the date, for anyone who taps to count them. */
    sleeps: number;
    /** What tomorrow brings; on the day and after it, a line for that moment instead. */
    line: string;
    /** How far the sun has risen today and will have risen tomorrow, 0 to 1. */
    rise: number;
    riseTomorrow: number;
}

const daysBetween = (from: Date, to: Date) => Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY_MS);
const weeksBetween = (from: Date, to: Date) => Math.round(daysBetween(startOfWeek(from), startOfWeek(to)) / 7);
const weekdayOf = (date: Date) => formatDate(date, { weekday: "long", day: undefined, month: undefined, year: undefined });

/** Small, stable string hash so a day's line and prompt don't change on every render. */
const pick = <T>(items: readonly T[], seed: string): T => {
    let hash = 0;
    for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) | 0;
    return items[Math.abs(hash) % items.length];
};

export function whenOf(target: string, today = localDate()): When {
    const date = parseDate(target) ?? new Date();
    const now = parseDate(today) ?? new Date();
    const days = daysBetween(now, date);
    const sameYear = date.getFullYear() === now.getFullYear();
    const full = formatDate(date, { weekday: "long", day: "numeric", month: "long", year: sameYear ? undefined : "numeric" });
    const short = formatDate(date, { weekday: "short", day: "numeric", month: "short", year: sameYear ? undefined : "numeric" });
    const weekday = weekdayOf(date);
    const weeks = weeksBetween(now, date);
    const base = { days, date: full };
    // When the headline is already the weekday, the date line shouldn't say it again.
    const named = { days, date: formatDate(date, { day: "numeric", month: "long", year: sameYear ? undefined : "numeric" }) };

    if (days < -1) return { ...base, when: formatDate(date, { day: "numeric", month: "short", year: sameYear ? undefined : "numeric" }), hint: "behind you" };
    if (days === -1) return { ...base, when: "Yesterday", hint: "behind you" };
    if (days === 0) return { ...base, when: "Today", hint: "it's the day" };
    if (days === 1) return { ...base, when: "Tomorrow", hint: "one more sleep" };
    if (days === 2) return { ...named, when: weekday, hint: "after tomorrow" };
    if (days < 7) return { ...named, when: weekday, hint: weeks === 0 ? "this week" : "next week" };
    if (weeks === 1) return { ...base, when: "Next week", hint: short };
    if (weeks === 2 && days < 14) return { ...base, when: "Week after next", hint: short };
    if (days < 28) return { ...base, when: `In ${Math.round(days / 7)} weeks`, hint: short };
    const part = date.getDate() <= 10 ? "Early" : date.getDate() <= 20 ? "Mid" : "Late";
    const month = formatDate(date, { month: "long", day: undefined, year: days > 330 ? "numeric" : undefined });
    return { ...base, when: `${part} ${month}`, hint: short };
}

const EVERYDAY_LINES: ReadonlyArray<(name: string) => string> = [
    (name) => `Tomorrow, ${name} is one sleep closer.`,
    (name) => `Tomorrow brings ${name} a little nearer.`,
    (name) => `Every tomorrow from here leads to ${name}.`,
    (name) => `Tomorrow's sunrise moves ${name} closer.`,
    () => "Tomorrow there's another door to open.",
];

/** A sentence about tomorrow, picked from the landmarks a person would actually notice. */
export function tomorrowLine(name: string, target: string, today = localDate(), rise = 0, riseTomorrow = 0): string {
    const date = parseDate(target) ?? new Date();
    const now = parseDate(today) ?? new Date();
    const days = daysBetween(now, date);
    if (days < 0) return "Hope it was everything you waited for.";
    if (days === 0) return "It's here. Enjoy every minute.";
    if (days === 1) return `${name} is tomorrow!`;
    if (days === 2) return `Tomorrow is the eve of ${name}.`;

    const tomorrow = addDays(now, 1);
    const gap = days - 1;
    const weekOfTarget = weeksBetween(tomorrow, date);
    if (tomorrow.getDay() === 1 && weekOfTarget === 0) return `Tomorrow begins the week of ${name}.`;
    if (tomorrow.getDay() === 6 && gap < 7) return `Tomorrow starts the last weekend before ${name}.`;
    if (gap < 7) return `Tomorrow is the last ${weekdayOf(tomorrow)} before ${name}.`;
    if (gap === 7) return `Tomorrow, ${name} is just a week away.`;
    if (tomorrow.getDay() === 1 && weekOfTarget === 1) return `Tomorrow begins the week before ${name}.`;
    if (tomorrow.getDate() === 1 && tomorrow.getMonth() === date.getMonth() && tomorrow.getFullYear() === date.getFullYear()) {
        return `Tomorrow it's ${formatDate(tomorrow, { month: "long", day: undefined, year: undefined })}, the month of ${name}.`;
    }
    if (rise < 0.5 && riseTomorrow >= 0.5) return `Tomorrow you'll be past halfway to ${name}.`;
    if (rise < 0.75 && riseTomorrow >= 0.75) return `Tomorrow the home stretch to ${name} begins.`;
    return pick(EVERYDAY_LINES, `${today}:${name}`)(name);
}

export function anticipate(event: Pick<MilestoneEvent, "name" | "start" | "target">, today = localDate()): Anticipation {
    const when = whenOf(event.target, today);
    const target = parseDate(event.target) ?? new Date();
    const start = parseDate(event.start);
    const total = start && start < target ? daysBetween(start, target) : 30;
    const elapsed = total - when.days;
    const rise = clamp(elapsed / total, 0, 1);
    const riseTomorrow = clamp((elapsed + 1) / total, 0, 1);
    return {
        ...when,
        sleeps: Math.max(0, when.days),
        line: tomorrowLine(event.name, event.target, today, rise, riseTomorrow),
        rise,
        riseTomorrow,
    };
}

// ── Doors ──
// One small door a day. What's behind it is a prompt to imagine the thing a little, and a
// place to jot a line. Nothing is "missed": unopened days simply aren't in the collection.

const DOOR_PROMPTS = [
    "What's one thing you can't wait for?",
    "Picture the first hour. What do you see?",
    "What could you get ready today, just for fun?",
    "Who would you love to tell about it?",
    "What song fits the mood?",
    "What would make it perfect?",
    "What will you want to remember?",
    "Name a small thing you're looking forward to.",
    "What's the first thing you'll do?",
    "How do you want to feel when it arrives?",
    "What smell, taste, or sound do you imagine?",
    "What would future you thank you for preparing?",
    "What are you most curious about?",
    "Write a line to yourself for the day itself.",
    "What has the waiting been like so far?",
    "What would you do with one extra hour of it?",
] as const;

export const THE_DAY_PROMPT = "It's here. What do you want to hold on to?";

export function doorPrompt(eventId: string, date: string, isTheDay = false): string {
    return isTheDay ? THE_DAY_PROMPT : pick(DOOR_PROMPTS, `${eventId}:${date}`);
}

export function doorFor(event: Pick<MilestoneEvent, "countdown">, date: string): CountdownDoor | undefined {
    return event.countdown?.doors.find((door) => door.date === date);
}

/** A countdown whose door for today is still closed. */
export function hasDoorWaiting(event: MilestoneEvent, today = localDate()): boolean {
    if (event.kind !== "countdown" || event.achievedAt) return false;
    const days = whenOf(event.target, today).days;
    return days >= 0 && !doorFor(event, today);
}
