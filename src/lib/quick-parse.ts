import { addDays, localDate, startOfDay } from "./utils";

export type QuickKind = "task" | "habit" | "project" | "countdown" | "ongoing";

export interface QuickParse {
    kind: QuickKind;
    name: string;
    /** Task day or path target date (YYYY-MM-DD). Tasks default to today. */
    date?: string;
    /** 24h HH:MM, tasks only. */
    time?: string;
    frequency?: "daily" | "weekly";
    targetPerPeriod?: number;
    plannedHours?: number;
    /** Ongoing paths only. */
    start?: string;
    /** The phrases that were understood, in the order they were found. */
    tokens: string[];
}

// Dates further away than this read as something to count down to rather than a task.
const TASK_HORIZON_DAYS = 7;

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";
const WEEKDAYS: Record<string, number> = { sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6 };
const WEEKDAY = "(monday|mon|tuesday|tues|tue|wednesday|wed|thursday|thurs|thur|thu|friday|fri|saturday|sat|sunday|sun)";
const NUMBER_WORDS: Record<string, number> = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12 };
const NUMBER = "(\\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|twelve)";
const PREPOSITION = "(?:(?:by|until|till|due|on|before|for)\\s+)?";

const toNumber = (value: string) => NUMBER_WORDS[value.toLowerCase()] ?? Number(value);
const monthIndex = (value: string) => MONTHS.indexOf(value.slice(0, 3).toLowerCase());

const validDate = (year: number, month: number, day: number): Date | null => {
    const date = new Date(year, month, day);
    return date.getMonth() === month && date.getDate() === day ? date : null;
};

const addMonths = (date: Date, months: number) => {
    const next = new Date(date);
    next.setMonth(next.getMonth() + months);
    return next;
};

interface Extraction<T> { value: T; text: string; rest: string }

// Finds the first match, removes it from the text, and reports what it consumed.
function extract<T>(text: string, pattern: RegExp, read: (match: RegExpExecArray) => T | null): Extraction<T> | null {
    const match = pattern.exec(text);
    if (!match) return null;
    const value = read(match);
    if (value === null || value === undefined) return null;
    return { value, text: match[0].trim(), rest: `${text.slice(0, match.index)} ${text.slice(match.index + match[0].length)}` };
}

function readDate(text: string, today: Date): Extraction<Date> | null {
    const candidates: Array<[RegExp, (match: RegExpExecArray) => Date | null]> = [
        [/\b(\d{4})-(\d{2})-(\d{2})\b/, (m) => validDate(Number(m[1]), Number(m[2]) - 1, Number(m[3]))],
        [/\bday after tomorrow\b/i, () => addDays(today, 2)],
        [/\b(today|tonight)\b/i, () => today],
        [/\b(tomorrow|tmrw|tmr)\b/i, () => addDays(today, 1)],
        [new RegExp(`\\bin\\s+${NUMBER}\\s+(day|week|month|year)s?\\b`, "i"), (m) => {
            const amount = toNumber(m[1]);
            const unit = m[2].toLowerCase();
            if (unit === "day") return addDays(today, amount);
            if (unit === "week") return addDays(today, amount * 7);
            return addMonths(today, unit === "month" ? amount : amount * 12);
        }],
        [/\bnext\s+(week|month|year)\b/i, (m) => m[1].toLowerCase() === "week" ? addDays(today, 7) : addMonths(today, m[1].toLowerCase() === "month" ? 1 : 12)],
        [new RegExp(`\\b${MONTH}\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`, "i"), (m) => monthDay(today, monthIndex(m[1]), Number(m[2]), m[3])],
        [new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${MONTH}(?:,?\\s+(\\d{4}))?\\b`, "i"), (m) => monthDay(today, monthIndex(m[2]), Number(m[1]), m[3])],
        [new RegExp(`\\b(?:(next|this)\\s+)?${WEEKDAY}\\b`, "i"), (m) => {
            const target = WEEKDAYS[m[2].slice(0, 3).toLowerCase()];
            let ahead = (target - today.getDay() + 7) % 7;
            if (ahead === 0 || m[1]?.toLowerCase() === "next") ahead = ahead === 0 ? 7 : ahead;
            return addDays(today, ahead);
        }],
    ];
    for (const [pattern, read] of candidates) {
        const withPreposition = new RegExp(`${PREPOSITION}${pattern.source}`, pattern.flags);
        const found = extract(text, withPreposition, read);
        if (found) return { ...found, text: stripPreposition(found.text) };
    }
    return null;
}

function monthDay(today: Date, month: number, day: number, year?: string): Date | null {
    if (month < 0) return null;
    if (year) return validDate(Number(year), month, day);
    const thisYear = validDate(today.getFullYear(), month, day);
    if (!thisYear) return null;
    return thisYear < today ? validDate(today.getFullYear() + 1, month, day) : thisYear;
}

function readSince(text: string): Extraction<Date> | null {
    const patterns: Array<[RegExp, (match: RegExpExecArray) => Date | null]> = [
        [/\bsince\s+(\d{4})-(\d{2})-(\d{2})\b/i, (m) => validDate(Number(m[1]), Number(m[2]) - 1, Number(m[3]))],
        [new RegExp(`\\bsince\\s+${MONTH}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(\\d{4})\\b`, "i"), (m) => validDate(Number(m[3]), monthIndex(m[1]), Number(m[2]))],
        [new RegExp(`\\bsince\\s+${MONTH}\\s+(\\d{4})\\b`, "i"), (m) => validDate(Number(m[2]), monthIndex(m[1]), 1)],
        [/\bsince\s+(\d{4})\b/i, (m) => validDate(Number(m[1]), 0, 1)],
    ];
    for (const [pattern, read] of patterns) {
        const found = extract(text, pattern, read);
        if (found) return found;
    }
    return null;
}

const stripPreposition = (text: string) => text.replace(/^(by|until|till|due|on|before|for)\s+/i, "");

function readTime(text: string): Extraction<string> | null {
    const format = (hours: number, minutes: number) => `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
    const meridiem = extract(text, /\b(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i, (m) => {
        const hours = Number(m[1]);
        const minutes = Number(m[2] ?? 0);
        if (hours < 1 || hours > 12 || minutes > 59) return null;
        const pm = m[3].toLowerCase() === "pm";
        return format((hours % 12) + (pm ? 12 : 0), minutes);
    });
    if (meridiem) return meridiem;
    const clock = extract(text, /\b(?:at\s+)?([01]?\d|2[0-3]):([0-5]\d)\b/i, (m) => format(Number(m[1]), Number(m[2])));
    if (clock) return clock;
    return extract(text, /\bat\s+([01]?\d|2[0-3])\b(?!\s*(?:h|hrs?|hours|x|times|%))/i, (m) => format(Number(m[1]), 0));
}

function readFrequency(text: string): Extraction<{ frequency: "daily" | "weekly"; target: number }> | null {
    const weekly = extract(text, new RegExp(`\\b${NUMBER}\\s*(?:x|times|days)\\s*(?:a|per|each|\\/)\\s*w(?:ee)?k\\b`, "i"), (m) => ({ frequency: "weekly" as const, target: Math.min(7, Math.max(1, toNumber(m[1]))) }))
        ?? extract(text, /\b(\d)\s*x\s*\/\s*w(?:ee)?k\b/i, (m) => ({ frequency: "weekly" as const, target: Math.min(7, Math.max(1, Number(m[1]))) }))
        ?? extract(text, /\b(once|twice|thrice)\s+(?:a|per|each)\s+week\b/i, (m) => ({ frequency: "weekly" as const, target: { once: 1, twice: 2, thrice: 3 }[m[1].toLowerCase() as "once"] }))
        ?? extract(text, /\b(?:weekly|every\s+week|each\s+week)\b/i, () => ({ frequency: "weekly" as const, target: 1 }));
    if (weekly) return weekly;
    return extract(text, /\b(?:daily|every\s*day|each\s+day|every\s+morning|every\s+night|every\s+evening)\b/i, () => ({ frequency: "daily" as const, target: 1 }));
}

const tidyName = (text: string) => {
    const cleaned = text
        .replace(/\s+/g, " ")
        .replace(/^[\s,.;:–—-]+|[\s,.;:–—-]+$/g, "")
        .replace(/\s+(on|by|at|until|till|due|for|every|in)$/i, "")
        .replace(/^(on|by|at|until|till|due|for|every|in)\s+/i, "")
        .trim();
    return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : "";
};

export function parseQuickInput(input: string, now = new Date(), forceKind?: QuickKind): QuickParse {
    const today = startOfDay(now);
    const tokens: string[] = [];
    let rest = ` ${input.trim()} `;
    const take = <T>(found: Extraction<T> | null): T | undefined => {
        if (!found) return undefined;
        tokens.push(found.text);
        rest = found.rest;
        return found.value;
    };

    const since = take(readSince(rest));
    const frequency = take(readFrequency(rest));
    const plannedHours = take(extract(rest, /\b(\d+(?:\.\d+)?)\s*(?:h|hrs?|hours)\b/i, (m) => {
        const hours = Number(m[1]);
        return hours > 0 && hours <= 10_000 ? hours : null;
    }));
    const time = take(readTime(rest));
    const date = take(readDate(rest, today));
    const name = tidyName(rest);

    const daysAway = date ? Math.round((startOfDay(date).getTime() - today.getTime()) / 86_400_000) : 0;
    const inferred: QuickKind = since ? "ongoing"
        : frequency ? "habit"
            : plannedHours ? "project"
                : date && !time && daysAway > TASK_HORIZON_DAYS ? "countdown"
                    : "task";
    const kind = forceKind ?? inferred;

    const result: QuickParse = { kind, name, tokens };
    if (kind === "task") {
        result.date = localDate(date ?? today);
        if (time) result.time = time;
    } else if (kind === "ongoing") {
        result.start = localDate(since ?? date ?? today);
    } else if (date) {
        result.date = localDate(date);
    }
    if (kind === "habit") {
        result.frequency = frequency?.frequency ?? "daily";
        if (result.frequency === "weekly") result.targetPerPeriod = frequency?.target ?? 1;
    }
    if (kind === "project" && plannedHours) result.plannedHours = plannedHours;
    return result;
}
