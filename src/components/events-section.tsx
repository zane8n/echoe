"use client";

import { useMemo } from "react";
import type { MilestoneEvent } from "@/lib/types";
import { COLOR_MAP } from "@/lib/constants";
import { daysUntil, formatDate, formatRemaining, formatSpent, habitStreak, localDate, parseDate, timeSpent } from "@/lib/utils";
import { Icon } from "./icon";

interface Props {
    events: MilestoneEvent[];
    onEdit: (id: string) => void;
    onExport: () => void;
    onCheckIn: (id: string) => void;
    onOpenHistory: (id: string) => void;
}

export function EventsSection({ events, onEdit, onExport, onCheckIn, onOpenHistory }: Props) {
    const sorted = useMemo(
        () => [...events].sort((a, b) => (parseDate(a.target)?.getTime() ?? 0) - (parseDate(b.target)?.getTime() ?? 0)),
        [events],
    );

    return (
        <section className="mt-[clamp(56px,8vw,92px)] animate-soft-enter">
            <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--color-accent-ink)]">
                        <Icon name="layers" size={14} /> Milestones
                    </div>
                    <h2 className="m-0 mt-1.5 font-[var(--font-display)] text-[clamp(28px,4vw,42px)] font-normal leading-[1.08]">Your path</h2>
                </div>
                {sorted.length > 0 && (
                    <button onClick={onExport} className="quiet-button text-[var(--color-muted)]">
                        <Icon name="download" size={14} /> Export
                    </button>
                )}
            </div>

            {sorted.length === 0 ? (
                <div className="border-y border-[var(--color-line)] py-12 text-center">
                    <p className="m-0 text-sm text-[var(--color-muted)]">Your timeline will grow from what you add here.</p>
                    <button onClick={() => onEdit("")} className="quiet-button mx-auto mt-2 text-[var(--color-accent-ink)]">
                        <Icon name="plus" size={14} /> Add your first milestone
                    </button>
                </div>
            ) : (
                <div className="flex flex-col">
                    {sorted.map((event, index) => {
                        const palette = COLOR_MAP[event.color] ?? COLOR_MAP.amber;
                        const remaining = daysUntil(event.target);
                        const remainingDisplay = formatRemaining(remaining);
                        const spent = timeSpent(event.start, event.target);
                        const streak = habitStreak(event);
                        const today = event.habit?.entries.find((entry) => entry.date === localDate());

                        return (
                            <article key={event.id} className="group -mx-3 flex items-center gap-2 border-b border-[var(--color-line)] px-3 transition-colors duration-200 hover:bg-[var(--color-accent-soft)]" style={{ animationDelay: `${Math.min(index, 5) * 50}ms` }}>
                                <button onClick={() => onEdit(event.id)} className="min-w-0 flex-1 border-0 bg-transparent py-5 text-left text-[var(--color-ink)]" aria-label={`Edit ${event.name}`}>
                                    <div className="flex items-stretch gap-4">
                                        <span className="w-1 shrink-0 rounded-full" style={{ background: palette.color }} aria-hidden="true" />
                                        <span className="min-w-0 flex-1">
                                            <span className="flex flex-wrap items-center gap-2">
                                                <span className="[overflow-wrap:anywhere] font-[var(--font-display)] text-xl" style={{ color: palette.ink }}>{event.name}</span>
                                                {event.pinned && <span className="status-pill bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]">Focus</span>}
                                                {streak > 0 && <span className="status-pill" style={{ background: palette.glow, color: palette.ink }}><Icon name="flame" size={10} />{streak}</span>}
                                            </span>
                                            <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-[var(--color-muted)]">
                                                <span className="flex items-center gap-1"><Icon name="calendar" size={12} />{formatDate(event.target)}</span>
                                                <span className="flex items-center gap-1"><Icon name="clock" size={12} />{formatSpent(spent)}</span>
                                            </span>
                                        </span>
                                        <span className="flex w-[78px] shrink-0 flex-col items-end justify-center gap-1.5 text-right">
                                            <span className="flex items-baseline gap-1">
                                                <span className="font-[var(--font-display)] text-2xl font-normal leading-none tabular-nums">{remainingDisplay.value}</span>
                                                <span className="text-[10px] text-[var(--color-muted)]">{remainingDisplay.unit}</span>
                                            </span>
                                            <span className="h-1 w-16 overflow-hidden rounded-full bg-[var(--color-line)]">
                                                <span className="progress-fill block h-full rounded-full" style={{ width: `${spent.percent}%`, background: palette.color }} />
                                            </span>
                                        </span>
                                    </div>
                                </button>

                                <div className="flex shrink-0 items-center gap-1">
                                    {event.habit && (
                                        <>
                                            <button onClick={() => onCheckIn(event.id)} className="icon-button" style={today?.status === "done" ? { background: palette.glow, color: palette.ink } : undefined} aria-label={`Mark ${event.name} done today`} title="Done today">
                                                <Icon name="check" size={15} />
                                            </button>
                                            <button onClick={() => onOpenHistory(event.id)} className="icon-button" aria-label={`Open ${event.name} check-in history`} title="Check-in history">
                                                <Icon name="history" size={15} />
                                            </button>
                                        </>
                                    )}
                                    <button onClick={() => onEdit(event.id)} className="icon-button" aria-label={`Edit ${event.name}`} title="Edit milestone">
                                        <Icon name="more-horiz" size={16} />
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
