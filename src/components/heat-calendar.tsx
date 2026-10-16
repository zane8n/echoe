"use client";

import { useMemo } from "react";
import type { HabitEntry } from "@/lib/types";
import { addDays, formatDate, localDate, startOfDay, startOfWeek } from "@/lib/utils";

interface Props {
    entries: HabitEntry[];
    weeks: number;
    /** "calendar": weeks as rows under weekday headings. "strip": weeks as columns, like a contribution graph. */
    layout?: "calendar" | "strip";
    selected?: string;
    onSelect?: (date: string) => void;
    label?: string;
    /** Days before the path began fade back. */
    start?: string;
}

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

export function HeatCalendar({ entries, weeks, layout = "strip", selected, onSelect, label = "Check-in calendar", start }: Props) {
    const byDate = useMemo(() => new Map(entries.map((entry) => [entry.date, entry])), [entries]);
    const today = startOfDay();
    const todayKey = localDate(today);
    const firstMonday = addDays(startOfWeek(today), -(weeks - 1) * 7);
    const days = Array.from({ length: weeks * 7 }, (_, index) => addDays(firstMonday, index));

    const cell = (day: Date) => {
        const date = localDate(day);
        const entry = byDate.get(date);
        const future = date > todayKey;
        const common = {
            "data-status": entry?.status ?? "none",
            "data-today": date === todayKey || undefined,
            "data-future": future || undefined,
            "data-note": entry?.note ? true : undefined,
            "data-before": start && date < start && !entry ? true : undefined,
        };
        if (!onSelect || future) return <span key={date} className="heat-cell" {...common} aria-hidden={future || undefined} title={future ? undefined : `${formatDate(date, { weekday: "short", month: "short", year: undefined })}: ${entry?.status ?? "not recorded"}`}>{layout === "calendar" && !future ? day.getDate() : null}</span>;
        return (
            <button
                key={date}
                type="button"
                className="heat-cell"
                {...common}
                aria-pressed={selected === date}
                aria-label={`${formatDate(date, { weekday: "long" })}: ${entry?.status ?? "not recorded"}${entry?.note ? ", has a note" : ""}`}
                onClick={() => onSelect(date)}
            >
                {layout === "calendar" ? day.getDate() : null}
            </button>
        );
    };

    if (layout === "calendar") {
        return (
            <div className="heat heat-calendar" role="group" aria-label={label}>
                {WEEKDAYS.map((weekday, index) => <span key={index} className="heat-weekday" aria-hidden="true">{weekday}</span>)}
                {days.map(cell)}
            </div>
        );
    }

    // Month labels sit above the first week that starts in a new month.
    const months = Array.from({ length: weeks }, (_, week) => {
        const monday = days[week * 7];
        const previous = week > 0 ? days[(week - 1) * 7] : null;
        return !previous || previous.getMonth() !== monday.getMonth() ? monday.toLocaleDateString(undefined, { month: "short" }) : "";
    });

    return (
        <div className="heat heat-strip" role="group" aria-label={label} style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}>
            {Array.from({ length: weeks }, (_, week) => (
                <div key={week} className="heat-week">
                    <span className="heat-month" aria-hidden="true">{months[week]}</span>
                    {days.slice(week * 7, week * 7 + 7).map(cell)}
                </div>
            ))}
        </div>
    );
}
