"use client";

import { useMemo } from "react";
import { Icon } from "./icon";
import type { MilestoneEvent } from "@/lib/types";
import { daysUntil, parseDate, formatDate, formatRemaining, timeSpent, formatSpent, habitStreak } from "@/lib/utils";
import { COLOR_MAP } from "@/lib/constants";

interface Props { events: MilestoneEvent[]; tick: number; onEdit: (id: string) => void; onExport: () => void; }

export function EventsSection({ events, tick, onEdit, onExport }: Props) {
    const sorted = useMemo(
        () => [...events].sort((a, b) => (parseDate(a.target)?.getTime() ?? 0) - (parseDate(b.target)?.getTime() ?? 0)),
        [events, tick],
    );

    return (
        <section className="mt-[clamp(52px,8vw,92px)] animate-soft-enter">
            <div className="flex items-end justify-between gap-4 mb-8 flex-wrap">
                <div>
                    <div className="text-[var(--color-muted)] text-xs font-semibold tracking-[0.14em] uppercase flex items-center gap-2">
                        <Icon name="layers" size={14} /> Milestones
                    </div>
                    <h2 className="mt-1.5 text-[clamp(28px,4vw,42px)] leading-[1.08] font-[var(--font-display)] font-normal m-0">Your path</h2>
                </div>
                <button onClick={onExport}
                    className="text-xs font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)] transition-colors duration-200 flex items-center gap-1.5 bg-transparent border-0 cursor-pointer">
                    <Icon name="download" size={13} /> Export
                </button>
            </div>

            {sorted.length === 0 ? (
                <div className="py-12 text-center text-[var(--color-muted)]">
                    <p className="m-0 mb-2">No milestones yet.</p>
                    <button onClick={() => onEdit("")} className="text-sm font-medium text-[var(--color-accent)] bg-transparent border-0 cursor-pointer hover:underline">Add your first</button>
                </div>
            ) : (
                <div className="flex flex-col gap-0">
                    {sorted.map((event, i) => {
                        const palette = COLOR_MAP[event.color] ?? COLOR_MAP.amber;
                        const remaining = daysUntil(event.target);
                        const fmt = formatRemaining(remaining);
                        const spent = timeSpent(event.start, event.target);
                        const streak = habitStreak(event);

                        return (
                            <div key={event.id}
                                role="button" tabIndex={0}
                                onClick={() => onEdit(event.id)}
                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onEdit(event.id); } }}
                                className="animate-row-enter group flex items-center gap-4 py-5 cursor-pointer border-b border-[var(--color-line)] hover:bg-[var(--color-accent)]/5 hover:-translate-y-[1px] transition-all duration-300 -mx-4 px-4 rounded-lg"
                                style={{ animationDelay: `${Math.min(i, 5) * 50}ms` }}>
                                {/* Visual bar */}
                                <div className="w-1 self-stretch rounded-full flex-shrink-0 transition-shadow duration-300 group-hover:shadow-[0_0_12px_var(--glow)]" style={{ background: `linear-gradient(180deg, ${palette.color}, ${palette.color}44)`, "--glow": palette.glow } as React.CSSProperties} />

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-[var(--font-display)] text-xl transition-colors duration-200"
                                            style={{ color: `${palette.ink}` }}>{event.name}</span>
                                        {event.pinned && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[var(--color-accent)]/20 text-[var(--color-accent-ink)]">Focus</span>}
                                        {streak > 0 && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ background: palette.glow, color: palette.ink }}><Icon name="flame" size={10} />{streak}</span>}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-[13px] text-[var(--color-muted)]">
                                        <span className="flex items-center gap-1"><Icon name="calendar" size={12} />{formatDate(event.target)}</span>
                                        <span className="flex items-center gap-1"><Icon name="clock" size={12} />{formatSpent(spent)}</span>
                                    </div>
                                </div>

                                {/* Right: remaining + progress */}
                                <div className="text-right flex-shrink-0 flex flex-col items-end gap-1.5">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-[var(--font-display)] text-2xl tabular-nums font-normal leading-none">{fmt.value}</span>
                                        <span className="text-[11px] text-[var(--color-muted)]">{fmt.unit}</span>
                                    </div>
                                    <div className="w-16 h-1 rounded-full bg-[var(--color-line)] overflow-hidden">
                                        <div className="progress-fill h-full rounded-full" style={{ width: `${Math.min(100, Math.max(0, spent.percent))}%`, background: palette.color }} />
                                    </div>
                                </div>

                                {/* Edit button */}
                                <button onClick={(e) => { e.stopPropagation(); onEdit(event.id); }}
                                    className="w-8 h-8 grid place-items-center rounded-full bg-transparent border-0 cursor-pointer text-[var(--color-muted)] opacity-0 group-hover:opacity-100 hover:text-[var(--color-ink)] hover:bg-[var(--color-accent)]/10 transition-all duration-200 flex-shrink-0">
                                    <Icon name="more-horiz" size={16} />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
