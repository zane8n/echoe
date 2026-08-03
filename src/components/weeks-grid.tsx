"use client";

import { useMemo } from "react";
import type { MilestoneEvent } from "@/lib/types";
import { COLOR_MAP } from "@/lib/constants";
import { addDays, formatDate, parseDate, startOfDay } from "@/lib/utils";
import { Icon } from "./icon";

interface Props { events: MilestoneEvent[]; show: boolean; tick: number; }

export function WeeksGrid({ events, show, tick }: Props) {
    const buckets = useMemo(() => {
        const today = startOfDay();
        const firstDay = addDays(today, -(12 * 14 - 1));
        return Array.from({ length: 12 }, (_, index) => {
            const start = addDays(firstDay, index * 14);
            const end = addDays(start, 13);
            let score = 0;
            const colors: string[] = [];

            for (const event of events) {
                const eventStart = parseDate(event.start);
                const eventTarget = parseDate(event.target);
                const overlaps = eventStart && eventTarget && eventStart <= end && eventTarget >= start;
                if (overlaps) score += 0.35;
                if (eventStart && eventStart >= start && eventStart <= end) score += 2;
                if (eventTarget && eventTarget >= start && eventTarget <= end) score += 2;

                const checkIns = event.habit?.entries.filter((entry) => {
                    const date = parseDate(entry.date);
                    return date && date >= start && date <= end;
                }) ?? [];
                score += checkIns.length;
                if (overlaps || checkIns.length) colors.push(COLOR_MAP[event.color]?.color ?? "var(--color-accent)");
            }

            return { start, end, score, colors: [...new Set(colors)] };
        });
        // tick advances date-driven clusters while preserving memoization between minute ticks.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [events, tick]);

    if (!show || !events.length) return null;
    const maximum = Math.max(1, ...buckets.map((bucket) => bucket.score));

    return (
        <section className="mt-[clamp(56px,8vw,92px)] animate-soft-enter">
            <div className="mb-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--color-accent-ink)]"><Icon name="trending-up" size={14} /> Momentum</div>
                <h2 className="m-0 mt-1.5 font-[var(--font-display)] text-[clamp(24px,3vw,34px)] font-normal leading-[1.08]">Your activity rhythm</h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">Twelve two-week clusters, shaped by active milestones and check-ins.</p>
            </div>

            <div className="histogram" role="img" aria-label="Milestone and check-in activity over the last 24 weeks">
                <div className="grid h-40 grid-cols-12 items-end gap-[clamp(4px,1vw,10px)]">
                    {buckets.map((bucket, index) => {
                        const height = bucket.score ? Math.max(8, (bucket.score / maximum) * 100) : 3;
                        const color = bucket.colors[index % Math.max(1, bucket.colors.length)] ?? "var(--color-line-strong)";
                        return (
                            <div key={bucket.start.toISOString()} className="group relative flex h-full items-end" title={`${formatDate(bucket.start, { month: "short", day: "numeric" })} to ${formatDate(bucket.end, { month: "short", day: "numeric" })}: ${Math.round(bucket.score)} activity points`}>
                                <span className="progress-fill block w-full rounded-t-[4px] opacity-80 group-hover:opacity-100" style={{ height: `${height}%`, background: bucket.score ? color : "var(--color-line)" }} />
                            </div>
                        );
                    })}
                </div>
                <div className="mt-3 flex justify-between text-[11px] text-[var(--color-muted)]">
                    <span>{formatDate(buckets[0].start, { month: "short", day: "numeric" })}</span>
                    <span>{formatDate(buckets[5].end, { month: "short", day: "numeric" })}</span>
                    <span>Today</span>
                </div>
            </div>
        </section>
    );
}
