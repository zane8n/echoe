"use client";

import { useEffect, useMemo, useRef } from "react";
import type { MilestoneEvent, PersonalProfile } from "@/lib/types";
import {
    addDays,
    daysUntil,
    formatDate,
    formatRemaining,
    formatSpent,
    getPinnedEvent,
    habitInsight,
    habitStats,
    habitStreak,
    localDate,
    milestoneKind,
    projectProgress,
    formatOpenDuration,
    startOfDay,
    timeSpent,
} from "@/lib/utils";
import { COLOR_MAP } from "@/lib/constants";
import { Icon } from "./icon";

interface Props {
    events: MilestoneEvent[];
    tick: number;
    onEdit: (id: string) => void;
    onConfetti: () => void;
    onCheckIn: (id: string) => void;
    onMiss: (id: string) => void;
    onOpenHistory: (id: string) => void;
    onProgress?: (id: string) => void;
    profile?: PersonalProfile;
}

export function FocusSection({ events, tick, onEdit, onConfetti, onCheckIn, onMiss, onOpenHistory, onProgress, profile }: Props) {
    const event = getPinnedEvent(events);
    const previousRemaining = useRef<number | null>(null);
    const firstName = profile?.displayName.trim().split(/\s+/)[0];

    const display = useMemo(() => {
        if (!event) return null;
        const spent = timeSpent(event.start, event.target);
        const remaining = daysUntil(event.target);
        return {
            event,
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
    }, [events, tick]);

    useEffect(() => {
        if (display && previousRemaining.current !== null && previousRemaining.current > 0 && display.remaining === 0) onConfetti();
        previousRemaining.current = display?.remaining ?? null;
    }, [display, onConfetti]);

    if (!display) {
        return (
            <section id="momentum" className="animate-soft-enter py-8">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase text-[var(--color-accent-ink)]">
                    <Icon name="target" size={14} /> Focus
                </div>
                <div className="flex max-w-2xl flex-col gap-3">
                    <h1 className="m-0 font-[var(--font-display)] text-[clamp(32px,6vw,48px)] font-normal leading-[1.04] text-[var(--color-ink)]">{firstName ? `${firstName}, start with one meaningful step` : "Start with one meaningful step"}</h1>
                    <p className="m-0 max-w-xl text-base text-[var(--color-muted)]">{profile?.intention || "Add your first milestone. Echoe will build the timeline from real check-ins and dates as you go."}</p>
                    <button onClick={() => onEdit("")} className="primary-button mt-2 self-start">
                        <Icon name="plus" size={16} /> Add milestone
                    </button>
                </div>
            </section>
        );
    }

    const { event: current, spent, remaining, remainingDisplay, streak, stats, palette, kind, project } = display;
    const todayEntry = current.habit?.entries.find((entry) => entry.date === localDate());
    const historyDays = Array.from({ length: 21 }, (_, index) => localDate(addDays(startOfDay(), index - 20)));
    const metric = kind === "ongoing"
        ? event?.habit ? String(streak) : formatOpenDuration(current.start)
        : current.isCountdown
        ? remaining > 0 ? String(remaining) : remaining === 0 ? "Today" : "Reached"
        : `${project?.overallPercent ?? spent.percent.toFixed(0)}%`;
    const metricLabel = kind === "ongoing"
        ? current.habit ? `${current.habit.frequency} rhythm` : "moving with you"
        : current.isCountdown
        ? remaining > 0 ? `days until ${formatDate(current.target, { month: "short", day: "numeric" })}` : "target date"
        : project ? `${project.investedHours}h invested, ${project.readiness}% ready` : remaining > 0 ? `${remainingDisplay.value} ${remainingDisplay.unit} until target` : "target reached";
    const progressValue = project?.overallPercent ?? (kind === "ongoing" ? stats.rate : spent.percent);

    return (
        <section id="momentum" className="animate-soft-enter border-t border-[var(--color-line)] py-[clamp(34px,5vw,54px)]">
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-1.5 text-xs font-semibold uppercase text-[var(--color-accent-ink)]">
                    <Icon name="target" size={14} /> {firstName ? `${firstName}'s focus` : "Focus"}
                </span>
                {current.habit && streak > 0 && (
                    <span className="status-pill" style={{ background: palette.glow, color: palette.ink }}>
                        <Icon name="flame" size={12} /> {streak}{current.habit.frequency === "daily" ? "d" : "w"} rhythm
                    </span>
                )}
                {current.habit && stats.total > 0 && (
                    <span className="status-pill bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]">{stats.rate}% consistency</span>
                )}
                {current.achievedAt && (
                    <span className="status-pill bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]"><Icon name="check" size={12} /> Complete</span>
                )}
            </div>

            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between sm:gap-10">
                <div className="min-w-0 flex-1">
                    <h2 className="m-0 [overflow-wrap:anywhere] font-[var(--font-display)] text-[clamp(30px,5vw,48px)] font-normal leading-[1.04]">{current.name}</h2>
                    <p className="mt-2 text-sm text-[var(--color-muted)]">
                        {kind === "ongoing" ? `Since ${formatDate(current.start)}` : formatDate(current.target)} <span aria-hidden="true">·</span> <span className="font-medium" style={{ color: palette.ink }}>{kind === "ongoing" ? "No finish line" : formatSpent(spent)}</span>
                    </p>
                </div>
                <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end" aria-live="polite">
                    <div className="font-[var(--font-display)] text-[clamp(42px,7vw,68px)] leading-[0.9] tabular-nums" style={{ color: palette.color }}>{metric}</div>
                    <div className="text-sm text-[var(--color-muted)]">{metricLabel}</div>
                </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4">
                <div className="min-w-[200px] flex-1">
                    <div className="relative h-2 overflow-hidden rounded-full bg-[var(--color-line)]" role="progressbar" aria-label={`${current.name} progress`} aria-valuenow={Math.round(progressValue)} aria-valuemin={0} aria-valuemax={100}>
                        <span className="progress-fill absolute inset-y-0 left-0 rounded-full" style={{ width: `${progressValue}%`, background: palette.color }} />
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {current.habit && (
                        <>
                            <button onClick={() => onCheckIn(current.id)} className="compact-button" style={{ borderColor: palette.color, color: palette.ink, background: palette.glow }} aria-pressed={todayEntry?.status === "done"}>
                                <Icon name="check" size={14} /> Done
                            </button>
                            <button onClick={() => onMiss(current.id)} className="compact-button text-[var(--color-muted)]" aria-pressed={todayEntry?.status === "missed"}>
                                <Icon name="missed" size={14} /> Missed
                            </button>
                            <button onClick={() => onOpenHistory(current.id)} className="icon-button" aria-label="Open check-in history" title="Check-in history">
                                <Icon name="calendar" size={16} />
                            </button>
                        </>
                    )}
                    {project && onProgress && <button onClick={() => onProgress(current.id)} className="compact-button" style={{ borderColor: palette.color, color: palette.ink, background: palette.glow }}><Icon name="trending-up" size={14} /> Update</button>}
                    <button onClick={() => onEdit(current.id)} className="compact-button text-[var(--color-ink-soft)]">
                        <Icon name="pencil" size={14} /> Edit
                    </button>
                </div>
            </div>

            {current.habit && (
                <div className="mt-5 flex flex-col gap-3 border-l-2 pl-4" style={{ borderColor: palette.color }}>
                    <div className="flex items-center gap-1.5" aria-label="Recent habit history">
                        {historyDays.map((date) => {
                            const entry = current.habit?.entries.find((item) => item.date === date);
                            return <span key={date} title={`${date}: ${entry?.status ?? "not recorded"}`} className="h-2.5 min-w-1 flex-1 rounded-[2px]" style={{ background: entry?.status === "done" ? palette.color : entry?.status === "missed" ? "var(--color-danger)" : "var(--color-line)" }} />;
                        })}
                    </div>
                    <p className="m-0 flex items-start gap-2 text-xs text-[var(--color-muted)]"><Icon name="sparkle" size={13} className="mt-0.5 shrink-0 text-[var(--color-accent)]" /> {habitInsight(current, profile?.supportStyle)}</p>
                </div>
            )}
        </section>
    );
}
