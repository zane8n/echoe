"use client";

import { useEffect, useMemo, useRef } from "react";
import type { MilestoneEvent, PersonalProfile } from "@/lib/types";
import {
    addDays,
    daysUntil,
    formatDate,
    formatRemaining,
    formatSpent,
    habitInsight,
    habitStats,
    habitStreak,
    localDate,
    milestoneKind,
    periodProgress,
    projectProgress,
    formatOpenDuration,
    startOfDay,
    timeSpent,
} from "@/lib/utils";
import { COLOR_MAP } from "@/lib/constants";
import { Icon } from "./icon";

interface Props {
    event: MilestoneEvent;
    tick: number;
    profile?: PersonalProfile;
    onEdit: (id: string) => void;
    onConfetti: () => void;
    onCheckIn: (id: string) => void;
    onMiss: (id: string) => void;
    onOpenHistory: (id: string) => void;
    onProgress?: (id: string) => void;
}

export function PathDetail({ event, tick, profile, onEdit, onConfetti, onCheckIn, onMiss, onOpenHistory, onProgress }: Props) {
    const previousRemaining = useRef<number | null>(null);

    const display = useMemo(() => {
        const spent = timeSpent(event.start, event.target);
        const remaining = daysUntil(event.target);
        return {
            spent,
            remaining,
            remainingDisplay: formatRemaining(remaining),
            streak: habitStreak(event),
            stats: habitStats(event),
            palette: COLOR_MAP[event.color] ?? COLOR_MAP.amber,
            kind: milestoneKind(event),
            project: milestoneKind(event) === "project" ? projectProgress(event) : null,
        };
        // tick keeps date-driven milestones live without recalculating every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [event, tick]);

    useEffect(() => {
        if (previousRemaining.current !== null && previousRemaining.current > 0 && display.remaining === 0) onConfetti();
        previousRemaining.current = display.remaining;
    }, [display, onConfetti]);

    const { spent, remaining, remainingDisplay, streak, stats, palette, kind, project } = display;
    const todayEntry = event.habit?.entries.find((entry) => entry.date === localDate());
    const habitProgress = event.habit ? periodProgress(event.habit) : null;
    const historyDays = Array.from({ length: 21 }, (_, index) => localDate(addDays(startOfDay(), index - 20)));
    const metric = kind === "ongoing"
        ? event.habit ? String(streak) : formatOpenDuration(event.start)
        : event.isCountdown
        ? remaining > 0 ? String(remaining) : remaining === 0 ? "Today" : "Reached"
        : `${project?.overallPercent ?? spent.percent.toFixed(0)}%`;
    const metricLabel = kind === "ongoing"
        ? event.habit ? `${event.habit.frequency} rhythm` : "moving with you"
        : event.isCountdown
        ? remaining > 0 ? `days until ${formatDate(event.target, { month: "short", day: "numeric" })}` : "target date"
        : project ? `${project.investedHours}h invested, ${project.readiness}% ready, ${project.requiredHoursPerWeek}h/week needed` : remaining > 0 ? `${remainingDisplay.value} ${remainingDisplay.unit} until target` : "target reached";
    const progressValue = project?.overallPercent ?? (kind === "ongoing" ? stats.rate : spent.percent);

    return (
        <section className="animate-soft-enter pb-10">
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-[var(--color-accent-ink)]">
                    <Icon name="target" size={14} /> Path
                </span>
                {event.habit && streak > 0 && (
                    <span className="status-pill" style={{ background: palette.glow, color: palette.ink }}>
                        <Icon name="flame" size={12} /> {streak}{event.habit.frequency === "daily" ? "d" : "w"} rhythm
                    </span>
                )}
                {event.habit && stats.total > 0 && (
                    <span className="status-pill bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]">{stats.rate}% consistency</span>
                )}
                {habitProgress && habitProgress.target > 1 && (
                    <span className="status-pill bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]">{habitProgress.done}/{habitProgress.target} this week</span>
                )}
                {event.achievedAt && (
                    <span className="status-pill bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]"><Icon name="check" size={12} /> Complete</span>
                )}
            </div>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
                <div className="min-w-0 flex-1">
                    <h1 className="m-0 [overflow-wrap:anywhere] text-[clamp(28px,5vw,42px)] font-semibold leading-[1.08] tracking-[-0.01em]">{event.name}</h1>
                    <p className="mt-2 text-sm text-[var(--color-muted)]">
                        {kind === "ongoing" ? `Since ${formatDate(event.start)}` : formatDate(event.target)} <span aria-hidden="true">·</span> <span className="font-medium" style={{ color: palette.ink }}>{kind === "ongoing" ? "No finish line" : formatSpent(spent)}</span>
                    </p>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end" aria-live="polite">
                    <div className="font-[var(--font-mono)] text-[clamp(38px,7vw,58px)] font-semibold leading-[0.95] tabular-nums" style={{ color: palette.color }}>{metric}</div>
                    <div className="text-sm text-[var(--color-muted)]">{metricLabel}</div>
                </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
                <div className="min-w-[200px] flex-1">
                    <div className="relative h-2 overflow-hidden rounded-full bg-[var(--color-line)]" role="progressbar" aria-label={`${event.name} progress`} aria-valuenow={Math.round(progressValue)} aria-valuemin={0} aria-valuemax={100}>
                        <span className="progress-fill absolute inset-y-0 left-0 rounded-full" style={{ width: `${progressValue}%`, background: palette.color }} />
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {event.habit && (
                        <>
                            <button onClick={() => onCheckIn(event.id)} className="compact-button" style={{ borderColor: palette.color, color: palette.ink, background: palette.glow }} aria-pressed={todayEntry?.status === "done"}>
                                <Icon name="check" size={14} /> Done
                            </button>
                            <button onClick={() => onMiss(event.id)} className="compact-button text-[var(--color-muted)]" aria-pressed={todayEntry?.status === "missed"}>
                                <Icon name="missed" size={14} /> Missed
                            </button>
                            <button onClick={() => onOpenHistory(event.id)} className="icon-button" aria-label="Open check-in history" title="Check-in history">
                                <Icon name="calendar" size={16} />
                            </button>
                        </>
                    )}
                    {project && onProgress && <button onClick={() => onProgress(event.id)} className="compact-button" style={{ borderColor: palette.color, color: palette.ink, background: palette.glow }}><Icon name="trending-up" size={14} /> Update</button>}
                    <button onClick={() => onEdit(event.id)} className="compact-button text-[var(--color-ink-soft)]">
                        <Icon name="pencil" size={14} /> Edit
                    </button>
                </div>
            </div>

            {event.habit && (
                <div className="mt-5 flex flex-col gap-3 border-l-2 pl-4" style={{ borderColor: palette.color }}>
                    <div className="flex items-center gap-1.5" aria-label="Recent habit history">
                        {historyDays.map((date) => {
                            const entry = event.habit?.entries.find((item) => item.date === date);
                            return <span key={date} title={`${date}: ${entry?.status ?? "not recorded"}`} className="h-2.5 min-w-1 flex-1 rounded-[2px]" style={{ background: entry?.status === "done" ? palette.color : entry?.status === "missed" ? "var(--color-danger)" : "var(--color-line)" }} />;
                        })}
                    </div>
                    <p className="m-0 flex items-start gap-2 text-xs text-[var(--color-muted)]"><Icon name="sparkle" size={13} className="mt-0.5 shrink-0 text-[var(--color-accent)]" /> {habitInsight(event, profile?.supportStyle)}</p>
                </div>
            )}
        </section>
    );
}
