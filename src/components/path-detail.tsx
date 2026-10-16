"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Origin } from "@/app/providers/dashboard-provider";
import { useCountUp } from "@/hooks/use-count-up";
import { useMediaQuery } from "@/hooks/use-media-query";
import { riskLabel, summarizePath } from "@/lib/path-view";
import type { HabitEntry, MilestoneEvent, PersonalProfile } from "@/lib/types";
import { daysSince, daysUntil, formatDate, habitInsight, habitStats, localDate, milestoneKind, projectProgress, timeSpent } from "@/lib/utils";
import { ActionMenu, type MenuAction } from "./action-menu";
import { CheckButton } from "./check-button";
import { DayEditor } from "./day-editor";
import { HeatCalendar } from "./heat-calendar";
import { Icon } from "./icon";

interface Props {
    event: MilestoneEvent;
    tick: number;
    profile?: PersonalProfile;
    onEdit: (id: string) => void;
    onCelebrate: () => void;
    onToggleToday: (id: string, origin?: Origin) => void;
    onEntry: (id: string, status: HabitEntry["status"], date: string, note?: string) => void;
    onClearEntry: (id: string, date: string) => void;
    onProgress?: (id: string) => void;
    onEffort?: (id: string, hours: number) => void;
    onPin?: (id: string) => void;
    onShare?: (id: string) => void;
    onDelete?: (id: string) => void;
}

const QUICK_EFFORT = [0.5, 1, 2];
const shortDate = (date: string) => formatDate(date, { day: "numeric", month: "short", year: undefined });

export function PathDetail({ event, tick, profile, onEdit, onCelebrate, onToggleToday, onEntry, onClearEntry, onProgress, onEffort, onPin, onShare, onDelete }: Props) {
    const previousRemaining = useRef<number | null>(null);
    const [selectedDate, setSelectedDate] = useState(localDate());
    const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
    // Wide screens show half a year instead of stretching a quarter into oversized cells.
    const weeks = useMediaQuery("(min-width: 900px)") ? 26 : 13;

    const view = useMemo(() => {
        const kind = milestoneKind(event);
        return {
            kind,
            summary: summarizePath(event),
            remaining: kind === "ongoing" ? null : daysUntil(event.target),
            spent: timeSpent(event.start, event.target || undefined),
            stats: habitStats(event),
            project: event.project ? projectProgress(event) : null,
        };
        // tick keeps date-driven numbers live without recalculating every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [event, tick]);
    const { kind, summary, remaining, spent, stats, project } = view;

    useEffect(() => {
        if (remaining === null) return;
        if (previousRemaining.current !== null && previousRemaining.current > 0 && remaining === 0) onCelebrate();
        previousRemaining.current = remaining;
    }, [remaining, onCelebrate]);

    const countdownFirst = kind === "countdown" || Boolean(event.isCountdown);
    const metric = countdownFirst && remaining !== null
        ? { value: remaining > 0 ? remaining : remaining === 0 ? "Today" : Math.abs(remaining), label: remaining > 0 ? `${remaining === 1 ? "day" : "days"} until ${shortDate(event.target)}` : remaining === 0 ? "is the day" : `${Math.abs(remaining) === 1 ? "day" : "days"} since ${shortDate(event.target)}` }
        : kind === "ongoing" && !event.habit
            ? { value: summary.metric, label: `since ${formatDate(event.start, { day: undefined })}` }
            : project
                ? { value: `${project.overallPercent}%`, label: "overall progress" }
                : { value: stats.streak, label: `${event.habit?.frequency === "weekly" ? "week" : "day"} streak` };
    const animated = useCountUp(typeof metric.value === "number" ? metric.value : 0);
    const metricText = typeof metric.value === "number" ? String(Math.round(animated)) : metric.value;

    const entries = summary.entries;
    const selectedEntry = entries.find((entry) => entry.date === selectedDate);
    const tracked = Boolean(event.habit || event.project);
    const notes = [
        ...entries.filter((entry) => entry.note).map((entry) => ({ key: `c-${entry.date}`, date: entry.date, text: entry.note!, tag: entry.status === "done" ? "Checked in" : "Missed" })),
        ...(event.project?.entries ?? []).filter((entry) => entry.note).map((entry) => ({ key: entry.id, date: entry.date, text: entry.note!, tag: entry.hours > 0 ? `+${entry.hours}h` : `${entry.readiness}% ready` })),
    ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);

    const menu: MenuAction[] = [
        ...(onPin && !event.pinned ? [{ label: "Keep in focus", icon: "pin" as const, onSelect: () => onPin(event.id) }] : []),
        ...(onShare ? [{ label: "Share with a friend", icon: "share" as const, onSelect: () => onShare(event.id) }] : []),
        ...(onProgress && event.project ? [{ label: "Log effort or readiness", icon: "timer" as const, onSelect: () => onProgress(event.id) }] : []),
        { label: "Edit", icon: "pencil", onSelect: () => onEdit(event.id) },
        ...(onDelete ? [{ label: "Delete", icon: "trash" as const, tone: "danger" as const, separatorBefore: true, onSelect: () => onDelete(event.id) }] : []),
    ];

    return (
        <article className="detail" data-hue={event.color}>
            <header className="detail-head">
                <div className="detail-kind">
                    <span className="detail-dot" aria-hidden="true" />
                    {summary.kindLabel}
                    {event.pinned && <span className="pill pill-hue"><Icon name="pin" size={11} />In focus</span>}
                    {project && <span className={`pill ${project.risk === "at-risk" ? "pill-danger" : project.risk === "watch" ? "pill-warn" : "pill-hue"}`}>{riskLabel[project.risk]}</span>}
                </div>
                <div className="detail-actions">
                    <button type="button" className="icon-btn" onClick={() => onEdit(event.id)} aria-label={`Edit ${event.name}`} title="Edit"><Icon name="pencil" size={18} /></button>
                    <button type="button" className="icon-btn" aria-label="More actions" onClick={(click) => { const rect = click.currentTarget.getBoundingClientRect(); setMenuAt({ x: rect.right, y: rect.bottom + 4 }); }}><Icon name="more-horiz" size={20} /></button>
                </div>
                <h1 style={{ viewTransitionName: `path-${event.id}` }}>{event.name}</h1>
            </header>

            <section className="detail-hero" aria-live="polite">
                <div className="detail-metric">
                    <strong className="num">{metricText}</strong>
                    <span>{metric.label}</span>
                </div>
                {summary.checkable && (
                    <div className="detail-check">
                        <CheckButton
                            size="lg"
                            done={summary.period && summary.period.target > 1 ? summary.doneToday : summary.doneForPeriod}
                            progress={summary.period && summary.period.target > 1 ? { done: summary.period.done, target: summary.period.target } : undefined}
                            label={summary.doneToday ? "Undo today's check-in" : "Check in for today"}
                            onToggle={(origin) => onToggleToday(event.id, origin)}
                        />
                        <span>{summary.doneToday ? "Done today" : summary.doneForPeriod ? "Done this week" : "Check in"}</span>
                    </div>
                )}
            </section>

            <dl className="stat-row">
                {event.habit && <>
                    <div><dt>Consistency</dt><dd className="num">{stats.rate}%</dd></div>
                    <div><dt>Check-ins</dt><dd className="num">{stats.done}</dd></div>
                    {summary.period && summary.period.target > 1
                        ? <div><dt>This week</dt><dd className="num">{summary.period.done}/{summary.period.target}</dd></div>
                        : <div><dt>Missed</dt><dd className="num">{stats.missed}</dd></div>}
                </>}
                {project && <>
                    <div><dt>Invested</dt><dd className="num">{project.investedHours}h<small>/{project.plannedHours}h</small></dd></div>
                    <div><dt>Readiness</dt><dd className="num">{project.readiness}%</dd></div>
                    <div><dt>Pace needed</dt><dd className="num">{project.requiredHoursPerWeek}h<small>/wk</small></dd></div>
                </>}
                {kind === "countdown" && <>
                    <div><dt>Date</dt><dd>{formatDate(event.target, { weekday: "short", day: "numeric", month: "short", year: undefined })}</dd></div>
                    <div><dt>Waited</dt><dd className="num">{spent.days}d</dd></div>
                    <div><dt>Elapsed</dt><dd className="num">{Math.round(spent.percent)}%</dd></div>
                </>}
                {kind === "ongoing" && !event.habit && <>
                    <div><dt>Began</dt><dd>{formatDate(event.start, { day: "numeric", month: "short" })}</dd></div>
                    <div><dt>Days</dt><dd className="num">{daysSince(event.start).toLocaleString()}</dd></div>
                </>}
            </dl>

            {kind !== "ongoing" && (
                <div className="timeline">
                    <div className="timeline-bar" role="progressbar" aria-label="Time elapsed" aria-valuenow={Math.round(spent.percent)} aria-valuemin={0} aria-valuemax={100}>
                        <span style={{ width: `${spent.percent}%` }} />
                    </div>
                    <div className="timeline-labels"><span>{shortDate(event.start)}</span><span>{remaining && remaining > 0 ? `${remaining} ${remaining === 1 ? "day" : "days"} left` : "Target reached"}</span><span>{shortDate(event.target)}</span></div>
                </div>
            )}

            {project && onEffort && (
                <section className="detail-section">
                    <div className="section-head"><h2>Log effort</h2><span className="section-meta">{project.remainingHours}h to go</span></div>
                    <div className="flex flex-wrap gap-2">
                        {QUICK_EFFORT.map((hours) => <button key={hours} type="button" className="btn btn-secondary btn-sm" onClick={() => onEffort(event.id, hours)}><Icon name="plus" size={14} />{hours < 1 ? `${hours * 60} min` : `${hours}h`}</button>)}
                        {onProgress && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onProgress(event.id)}>Readiness and more</button>}
                    </div>
                </section>
            )}

            {tracked && (
                <section className="detail-section">
                    <div className="section-head"><h2>History</h2><span className="section-meta">Tap a day to change it</span></div>
                    <HeatCalendar entries={entries} weeks={weeks} start={event.start} selected={selectedDate} onSelect={setSelectedDate} label={`${event.name} history, last ${weeks} weeks`} />
                    <div className="heat-legend" aria-hidden="true">
                        <span><i style={{ background: "var(--hue)" }} />Checked in</span>
                        <span><i style={{ boxShadow: "inset 0 0 0 1.5px var(--color-line-strong)" }} />Missed</span>
                        <span><i style={{ background: "color-mix(in srgb, var(--color-ink) 7%, transparent)" }} />Not recorded</span>
                    </div>
                    <DayEditor
                        key={selectedDate}
                        date={selectedDate}
                        entry={selectedEntry}
                        onSave={(status, note) => onEntry(event.id, status, selectedDate, note)}
                        onClear={() => onClearEntry(event.id, selectedDate)}
                    />
                </section>
            )}

            {event.habit && <p className="insight-note"><Icon name="sparkle" size={16} />{habitInsight(event, profile?.supportStyle)}</p>}

            {notes.length > 0 && (
                <section className="detail-section">
                    <div className="section-head"><h2>Notes</h2></div>
                    <ol className="history-list">
                        {notes.map((note) => (
                            <li key={note.key}>
                                <span><strong>{formatDate(note.date, { weekday: "short", year: undefined })}</strong><small>{note.text}</small></span>
                                <span className="num">{note.tag}</span>
                            </li>
                        ))}
                    </ol>
                </section>
            )}

            {menuAt && <ActionMenu x={menuAt.x} y={menuAt.y} title={event.name} actions={menu} onClose={() => setMenuAt(null)} />}
        </article>
    );
}
