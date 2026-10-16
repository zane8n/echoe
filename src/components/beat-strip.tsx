import { memo } from "react";
import type { HabitEntry } from "@/lib/types";
import { addDays, localDate, startOfDay } from "@/lib/utils";

interface Props {
    entries: Array<Pick<HabitEntry, "date" | "status">>;
    days?: number;
    size?: "sm" | "md" | "lg";
    label?: string;
}

/** Recent days as a waveform: full beats for check-ins, low beats for missed days, dots for rest. */
export const BeatStrip = memo(function BeatStrip({ entries, days = 14, size = "sm", label }: Props) {
    const statuses = new Map(entries.map((entry) => [entry.date, entry.status]));
    const today = startOfDay();
    const dates = Array.from({ length: days }, (_, index) => localDate(addDays(today, index - days + 1)));
    const done = dates.filter((date) => statuses.get(date) === "done").length;
    return (
        <span className="beats" data-size={size} role="img" aria-label={label ?? `${done} check-in${done === 1 ? "" : "s"} in the last ${days} days`}>
            {dates.map((date, index) => (
                <span key={date} className="beat" data-status={statuses.get(date) ?? "none"} data-today={index === days - 1} style={{ "--i": index } as React.CSSProperties} />
            ))}
        </span>
    );
});
