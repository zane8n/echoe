"use client";

import { useMemo, useState } from "react";
import { COLOR_MAP } from "@/lib/constants";
import type { MilestoneEvent, MilestoneKind } from "@/lib/types";
import { daysUntil, formatOpenDuration, formatRemaining, habitStats, isCheckedInForPeriod, milestoneKind, parseDate, projectProgress } from "@/lib/utils";
import { Icon } from "./icon";

interface Props {
    events: MilestoneEvent[];
    onEdit: (id: string) => void;
    onExport: () => void;
    onCheckIn: (id: string) => void;
    onProjectCheckIn: (id: string) => void;
    onOpenHistory: (id: string) => void;
    onProgress: (id: string) => void;
}

type Filter = "all" | MilestoneKind;
const filters: Array<{ id: Filter; label: string }> = [
    { id: "all", label: "All" },
    { id: "project", label: "Projects" },
    { id: "habit", label: "Habits" },
    { id: "ongoing", label: "Ongoing" },
];

export function EventsSection({ events, onEdit, onExport, onCheckIn, onProjectCheckIn, onOpenHistory, onProgress }: Props) {
    const [filter, setFilter] = useState<Filter>("all");
    const sorted = useMemo(() => [...events]
        .filter((event) => filter === "all" || milestoneKind(event) === filter)
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || ((parseDate(a.target)?.getTime() ?? Number.MAX_SAFE_INTEGER) - (parseDate(b.target)?.getTime() ?? Number.MAX_SAFE_INTEGER))), [events, filter]);

    return (
        <section id="paths" className="scroll-mt-24 animate-soft-enter">
            <div className="mb-5 flex items-end justify-between gap-4">
                <div><div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--color-accent-ink)]"><Icon name="layers" size={14} />Paths</div><h1 className="m-0 mt-1 font-[var(--font-display)] text-[clamp(30px,5vw,44px)] font-normal leading-none">What you&apos;re building</h1></div>
                {events.length > 0 && <button onClick={onExport} className="icon-button" aria-label="Export paths" title="Export"><Icon name="download" size={16} /></button>}
            </div>

            {events.length > 0 && (
                <div className="path-filters mb-3" role="tablist" aria-label="Filter paths">
                    {filters.map((item) => <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} onClick={() => setFilter(item.id)}>{item.label}</button>)}
                </div>
            )}

            {events.length === 0 ? (
                <div className="empty-paths py-10 text-center">
                    <span className="echo-orb mx-auto mb-4 block" aria-hidden="true" />
                    <p className="m-0 text-sm text-[var(--color-muted)]">Start with something that deserves your attention.</p>
                    <p className="m-0 mt-2 text-xs text-[var(--color-accent-ink)]">There is room here for what matters next.</p>
                </div>
            ) : sorted.length === 0 ? (
                <p className="border-y border-[var(--color-line)] py-8 text-center text-sm text-[var(--color-muted)]">No paths in this view yet.</p>
            ) : (
                <div className="path-list">
                    {sorted.map((event) => {
                        const palette = COLOR_MAP[event.color] ?? COLOR_MAP.teal;
                        const kind = milestoneKind(event);
                        const project = kind === "project" ? projectProgress(event) : null;
                        const habit = event.habit ? habitStats(event) : null;
                        const entries = event.project?.checkIns ?? event.habit?.entries ?? [];
                        const frequency = event.habit?.frequency ?? event.project?.checkInFrequency ?? "daily";
                        const checkedForPeriod = isCheckedInForPeriod(frequency, entries);
                        const remaining = kind === "ongoing" ? null : formatRemaining(daysUntil(event.target));
                        const percent = project?.overallPercent ?? (habit?.rate ?? 0);
                        const statusText = kind === "project"
                            ? `${project!.investedHours}h invested, ${project!.readiness}% ready`
                            : kind === "ongoing"
                                ? event.habit ? `${habit!.rate}% consistency` : `${formatOpenDuration(event.start)} in motion`
                                : habit?.total ? `${habit.rate}% consistency` : "Ready for your first check-in";

                        return (
                            <article key={event.id} className="path-row" style={{ "--path-color": palette.color, "--path-glow": palette.glow } as React.CSSProperties}>
                                <button onClick={() => onEdit(event.id)} className="path-main" aria-label={`Edit ${event.name}`}>
                                    <span className="path-marker" aria-hidden="true" />
                                    <span className="min-w-0 flex-1">
                                        <span className="flex min-w-0 items-center gap-2"><strong className="truncate font-[var(--font-display)] text-[19px] font-normal">{event.name}</strong>{event.pinned && <span className="status-pill bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]">Focus</span>}</span>
                                        <span className="mt-0.5 block truncate text-xs text-[var(--color-muted)]">{statusText}</span>
                                        {(project || event.habit) && <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-[var(--color-line)]"><span className="progress-fill block h-full rounded-full" style={{ width: `${percent}%`, background: palette.color }} /></span>}
                                    </span>
                                    <span className="path-metric">
                                        {kind === "ongoing" ? <><strong>{event.habit ? habit?.streak ?? 0 : formatOpenDuration(event.start)}</strong><small>{event.habit ? `${event.habit.frequency} streak` : "ongoing"}</small></> : <><strong>{remaining?.value}</strong><small>{remaining?.unit}</small></>}
                                    </span>
                                </button>
                                <div className="path-actions">
                                    {kind === "project" && <button onClick={() => onProgress(event.id)} className="compact-button" aria-label={`Log progress for ${event.name}`}><Icon name="trending-up" size={14} /><span>Update</span></button>}
                                    {kind === "project" && <button onClick={() => onProjectCheckIn(event.id)} className="compact-button" aria-pressed={checkedForPeriod} aria-label={`Check in to ${event.name}`}><Icon name="check" size={14} /><span>{checkedForPeriod ? "Done" : "Check in"}</span></button>}
                                    {event.habit && <button onClick={() => onCheckIn(event.id)} className="compact-button" aria-pressed={checkedForPeriod} aria-label={`Check in to ${event.name}`}><Icon name="check" size={14} /><span>{checkedForPeriod ? "Done" : "Check in"}</span></button>}
                                    {event.habit && <button onClick={() => onOpenHistory(event.id)} className="icon-button" aria-label={`Open ${event.name} check-in history`} title="History"><Icon name="history" size={15} /></button>}
                                    <button onClick={() => onEdit(event.id)} className="icon-button" aria-label={`More options for ${event.name}`} title="Edit"><Icon name="more-horiz" size={16} /></button>
                                </div>
                                {project && <span className={`risk-line risk-${project.risk}`}>{project.risk === "on-track" ? "On track" : project.risk === "watch" ? "Needs attention" : project.risk === "at-risk" ? `${project.requiredHoursPerWeek}h/week needed` : "Complete"}</span>}
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
