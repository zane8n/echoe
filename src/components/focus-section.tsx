"use client";

import { useMemo, useRef, useEffect } from "react";
import type { MilestoneEvent } from "@/lib/types";
import { getPinnedEvent, timeSpent, formatDate, formatSpent, formatRemaining, daysUntil, habitStreak, habitStats } from "@/lib/utils";
import { Icon } from "./icon";
import { COLOR_MAP } from "@/lib/constants";

interface Props { events: MilestoneEvent[]; tick: number; onEdit: (id: string) => void; onConfetti: () => void; onCheckIn: (id: string) => void; onMiss: (id: string) => void; }

export function FocusSection({ events, tick, onEdit, onConfetti, onCheckIn, onMiss }: Props) {
  const event = getPinnedEvent(events);
  const prevRemaining = useRef<number | null>(null);

  const display = useMemo(() => {
    if (!event) return null;
    const spent = timeSpent(event.start, event.target);
    const remaining = daysUntil(event.target);
    const fmt = formatRemaining(remaining);
    const streak = habitStreak(event);
    const stats = habitStats(event);
    const palette = COLOR_MAP[event.color] ?? COLOR_MAP.amber;
    return { event, spent, remaining, progress: spent.percent, fmt, streak, stats, palette };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events, tick]);

  useEffect(() => {
    if (display && prevRemaining.current !== null && prevRemaining.current > 0 && display.remaining === 0) onConfetti();
    prevRemaining.current = display?.remaining ?? null;
  }, [display, onConfetti]);

  if (!display) {
    return (
      <section className="animate-soft-enter py-[clamp(32px,6vw,60px)]">
        <div className="text-[var(--color-muted)] text-xs font-semibold tracking-[0.14em] uppercase mb-3 flex items-center gap-2">
          <Icon name="target" size={14} /> Focus
        </div>
        <div className="flex flex-col gap-3">
          <h1 className="text-[clamp(40px,7vw,80px)] leading-[1.02] font-[var(--font-display)] font-normal m-0 text-[var(--color-muted)]">Start something</h1>
          <p className="text-[var(--color-muted)]/70 text-base m-0">Add a milestone to begin tracking your time invested.</p>
        </div>
      </section>
    );
  }

  const { event: ev, spent, remaining, progress, fmt, streak, stats, palette } = display;

  return (
    <section className="animate-soft-enter py-[clamp(32px,6vw,60px)]">
      {/* Kicker */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-[var(--color-muted)] text-xs font-semibold tracking-[0.14em] uppercase flex items-center gap-1.5">
          <Icon name="target" size={14} /> Focus
        </span>
        {ev.habit && streak > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: palette.glow, color: palette.ink }}>
            <Icon name="flame" size={12} className="animate-streak-flame" /> {streak}d
          </span>
        )}
        {ev.habit && stats.total > 0 && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: stats.rate >= 70 ? "rgba(125,191,142,0.2)" : "rgba(232,115,90,0.15)", color: stats.rate >= 70 ? "var(--color-mint-ink)" : "var(--color-coral-ink)" }}>
            {stats.rate}% consistency
          </span>
        )}
        {ev.achievedAt && (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--color-mint)]/20 text-[var(--color-mint-ink)]">
            <Icon name="check" size={12} /> Done
          </span>
        )}
      </div>

      {/* Hero */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-8">
        <div className="flex-1">
          <h1 className="text-[clamp(40px,7vw,80px)] leading-[1.02] font-[var(--font-display)] font-normal m-0">{ev.name}</h1>
          <p className="mt-2 text-[var(--color-muted)] text-sm">
            {formatDate(ev.target)} · <span className="font-medium" style={{ color: palette.ink }}>{formatSpent(spent)}</span>
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1" aria-live="polite">
          <div className="text-[clamp(60px,10vw,120px)] leading-[0.76] font-[var(--font-display)] tabular-nums animate-breathe" style={{ color: palette.color }}>
            {progress.toFixed(0)}%
          </div>
          <div className="text-[var(--color-muted)] text-sm">
            {remaining > 0 ? `${fmt.value} ${fmt.unit} to go` : remaining === 0 ? "today!" : `${fmt.value} ${fmt.unit}`}
          </div>
        </div>
      </div>

      {/* Progress + Actions */}
      <div className="mt-8 flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative h-2 overflow-hidden rounded-full bg-[var(--color-line)]" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
            <span className="progress-fill shimmer absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100, Math.max(0, progress))}%`, background: palette.color }} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          {ev.habit && (
            <>
              <button onClick={() => onCheckIn(ev.id)}
                className="h-9 px-3 rounded-xl text-xs font-semibold cursor-pointer border transition-all duration-200 flex items-center gap-1.5 hover:scale-105 active:scale-95"
                style={{ borderColor: palette.color, color: palette.ink, background: palette.glow }}>
                <Icon name="check" size={13} /> Done
              </button>
              <button onClick={() => onMiss(ev.id)}
                className="h-9 px-3 rounded-xl text-xs font-semibold cursor-pointer border border-[var(--color-line)] text-[var(--color-muted)] bg-transparent hover:border-[var(--color-coral)]/40 hover:text-[var(--color-coral-ink)] transition-all duration-200 flex items-center gap-1.5">
                <Icon name="x" size={12} /> Missed
              </button>
            </>
          )}
          <button onClick={() => onEdit(ev.id)}
            className="h-9 px-3 rounded-xl text-xs font-semibold cursor-pointer border border-[var(--color-line)] text-[var(--color-ink-soft)] bg-transparent hover:border-[var(--color-line-strong)] hover:text-[var(--color-ink)] transition-all duration-200 flex items-center gap-1.5">
            <Icon name="pencil" size={13} /> Edit
          </button>
        </div>
      </div>

      {/* Habit mini-grid */}
      {ev.habit && (
        <div className="mt-4 flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-[var(--color-muted)] uppercase tracking-wider">Habit</span>
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: Math.min(ev.habit.target, 40) }).map((_, i) => {
              const entry = ev.habit!.entries[i];
              const bg = !entry ? "var(--color-line)" : entry.status === "done" ? palette.color : "rgba(232,115,90,0.35)";
              return <span key={i} className="w-2 h-2 rounded-sm transition-colors duration-200" style={{ background: bg }} />;
            })}
          </div>
          <span className="text-[11px] font-semibold ml-1" style={{ color: palette.ink }}>{stats.done}/{stats.total || ev.habit.target}</span>
        </div>
      )}
    </section>
  );
}
