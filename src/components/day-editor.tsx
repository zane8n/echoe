"use client";

import { useState } from "react";
import type { HabitEntry } from "@/lib/types";
import { formatDate, localDate } from "@/lib/utils";
import { Icon } from "./icon";

interface Props {
    date: string;
    entry?: HabitEntry;
    onSave?: (status: HabitEntry["status"], note?: string) => void;
    onClear?: () => void;
    /** Show the day and its note without any way to change them (a friend's shared path). */
    readOnly?: boolean;
}

/** Record or correct a single day: done or missed, with an optional note. */
export function DayEditor({ date, entry, onSave, onClear, readOnly }: Props) {
    const [note, setNote] = useState(entry?.note ?? "");
    const isToday = date === localDate();
    const status = entry?.status === "done" ? "Checked in" : entry?.status === "missed" ? "Missed" : "Not recorded";

    return (
        <div className="day-editor" key={date}>
            <div className="day-editor-head">
                <div>
                    <strong>{isToday ? "Today" : formatDate(date, { weekday: "long", day: "numeric", month: "long", year: undefined })}</strong>
                    <small>{status}</small>
                </div>
                {entry && !readOnly && <button type="button" onClick={onClear} className="btn btn-ghost btn-sm"><Icon name="undo" size={14} />Clear</button>}
            </div>
            {readOnly ? entry?.note && <p className="day-editor-note">{entry.note}</p> : <>
            <label className="grid gap-1.5">
                <span className="sr-only">A useful note (optional)</span>
                <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={2}
                    maxLength={180}
                    placeholder="A useful note: what helped, or what got in the way?"
                    className="field"
                    aria-label="A useful note (optional)"
                />
            </label>
            <div className="day-editor-actions">
                <button type="button" onClick={() => onSave?.("done", note)} className="btn btn-hue" aria-pressed={entry?.status === "done"}>
                    <Icon name="check" size={17} />Done
                </button>
                <button type="button" onClick={() => onSave?.("missed", note)} className="btn btn-secondary" aria-pressed={entry?.status === "missed"}>
                    <Icon name="minus" size={17} />Missed
                </button>
            </div>
            </>}
        </div>
    );
}
