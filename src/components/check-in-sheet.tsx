"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COLOR_MAP } from "@/lib/constants";
import type { HabitEntry, MilestoneEvent } from "@/lib/types";
import { addDays, formatDate, habitInsight, localDate, startOfDay } from "@/lib/utils";
import { Icon } from "./icon";

interface Props {
    event: MilestoneEvent;
    onCheckIn: (eventId: string, status: HabitEntry["status"], date: string, note?: string) => void;
    onClear: (eventId: string, date: string) => void;
    onClose: () => void;
}

export function CheckInSheet({ event, onCheckIn, onClear, onClose }: Props) {
    const [selectedDate, setSelectedDate] = useState(localDate());
    const [note, setNote] = useState("");
    const [confirmClear, setConfirmClear] = useState(false);
    const closeButton = useRef<HTMLButtonElement>(null);
    const palette = COLOR_MAP[event.color] ?? COLOR_MAP.amber;
    const entries = useMemo(() => new Map(event.habit?.entries.map((entry) => [entry.date, entry]) ?? []), [event.habit?.entries]);
    const days = useMemo(() => Array.from({ length: 28 }, (_, index) => addDays(startOfDay(), index - 27)), []);
    const selectedEntry = entries.get(selectedDate);

    useEffect(() => closeButton.current?.focus(), []);
    const save = (status: HabitEntry["status"]) => onCheckIn(event.id, status, selectedDate, note);
    const chooseDate = (date: string) => {
        setSelectedDate(date);
        setConfirmClear(false);
        setNote(entries.get(date)?.note ?? "");
    };

    return (
        <>
            <div className="fixed inset-0 z-75 acrylic-backdrop animate-fade-in" onClick={onClose} />
            <aside className="sheet-surface fixed inset-y-0 right-0 z-80 h-dvh w-[min(100%,500px)] overflow-y-auto acrylic-surface p-[clamp(22px,5vw,38px)] animate-slide-up" role="dialog" aria-modal="true" aria-labelledby="checkInTitle">
                <span className="sheet-grabber" aria-hidden="true" />
                <div className="flex items-start justify-between gap-5 border-b border-[var(--color-line)] pb-5">
                    <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--color-accent-ink)]">
                            <Icon name="history" size={14} /> Check-in history
                        </div>
                        <h2 id="checkInTitle" className="m-0 mt-1 truncate text-[var(--text-xl)] font-semibold leading-tight">{event.name}</h2>
                    </div>
                    <button ref={closeButton} onClick={onClose} className="icon-button" aria-label="Close check-in history" title="Close">
                        <Icon name="x" size={18} />
                    </button>
                </div>

                <div className="mt-7">
                    <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-[13px] font-semibold text-[var(--color-ink-soft)]">Last 28 days</span>
                        <span className="text-xs text-[var(--color-muted)]">Select any day</span>
                    </div>
                    <div className="grid grid-cols-7 gap-2" aria-label="Habit check-in calendar">
                        {days.map((day) => {
                            const date = localDate(day);
                            const entry = entries.get(date);
                            const selected = date === selectedDate;
                            const background = entry?.status === "done"
                                ? palette.color
                                : entry?.status === "missed"
                                    ? "var(--color-danger)"
                                    : "var(--color-panel)";
                            return (
                                <button
                                    key={date}
                                    type="button"
                                    onClick={() => chooseDate(date)}
                                    className="aspect-square min-w-0 rounded-[var(--radius-sm)] border text-xs font-semibold tabular-nums transition-colors duration-150"
                                    style={{
                                        background,
                                        borderColor: selected ? "var(--color-ink)" : entry ? "transparent" : "var(--color-line)",
                                        color: entry ? "var(--color-on-accent)" : "var(--color-muted)",
                                        boxShadow: selected ? "0 0 0 2px var(--color-surface), 0 0 0 4px var(--color-accent)" : undefined,
                                    }}
                                    aria-pressed={selected}
                                    aria-label={`${formatDate(date, { weekday: "long" })}: ${entry?.status ?? "not recorded"}`}
                                    title={`${formatDate(date, { weekday: "short", month: "short" })}: ${entry?.status ?? "not recorded"}`}
                                >
                                    {day.getDate()}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-7 border-t border-[var(--color-line)] pt-6">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <div className="text-[13px] font-semibold text-[var(--color-ink)]">{formatDate(selectedDate, { weekday: "long" })}</div>
                            <div className="text-xs capitalize text-[var(--color-muted)]">{selectedEntry?.status ?? "Not recorded"}</div>
                        </div>
                        {selectedEntry && (confirmClear ? (
                            <span className="flex items-center gap-2">
                                <span className="text-xs text-[var(--color-muted)]">Clear?</span>
                                <button type="button" onClick={() => { onClear(event.id, selectedDate); setConfirmClear(false); }} className="quiet-button text-[var(--color-danger)]">Yes</button>
                                <button type="button" onClick={() => setConfirmClear(false)} className="quiet-button">Cancel</button>
                            </span>
                        ) : (
                            <button type="button" onClick={() => setConfirmClear(true)} className="quiet-button text-[var(--color-danger)]">
                                <Icon name="refresh" size={14} /> Clear
                            </button>
                        ))}
                    </div>

                    <label className="mt-4 grid gap-2">
                        <span className="text-[13px] font-semibold text-[var(--color-ink-soft)]">A useful note <span className="font-normal text-[var(--color-muted)]">(optional)</span></span>
                        <textarea
                            value={note}
                            onChange={(event) => setNote(event.target.value)}
                            rows={3}
                            maxLength={180}
                            placeholder="What helped, or what got in the way?"
                            className="field resize-none"
                        />
                    </label>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <button type="button" onClick={() => save("done")} className="primary-button" style={{ background: palette.color }}>
                            <Icon name="check" size={16} /> Completed
                        </button>
                        <button type="button" onClick={() => save("missed")} className="secondary-button text-[var(--color-danger)]">
                            <Icon name="missed" size={16} /> Missed
                        </button>
                    </div>
                </div>

                <div className="mt-8 flex gap-3 border-l-2 border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-4 py-3 text-sm text-[var(--color-ink-soft)]">
                    <Icon name="sparkle" size={16} className="mt-0.5 shrink-0 text-[var(--color-accent-ink)]" />
                    <p className="m-0">{habitInsight(event)}</p>
                </div>
            </aside>
        </>
    );
}
