"use client";

import { useMemo } from "react";
import type { MilestoneEvent } from "@/lib/types";
import { addDays, formatDate, milestoneKind, parseDate, projectProgress, startOfDay } from "@/lib/utils";
import { Icon } from "./icon";
import { NeuronLineChart } from "./neuron-line-chart";

interface Props { events: MilestoneEvent[]; show: boolean; tick: number; }

export function WeeksGrid({ events, show, tick }: Props) {
    const buckets = useMemo(() => {
        const today = startOfDay();
        const firstDay = addDays(today, -(12 * 14 - 1));
        return Array.from({ length: 12 }, (_, index) => {
            const start = addDays(firstDay, index * 14);
            const end = addDays(start, 13);
            let score = 0;

            for (const event of events) {
                const habitCheckIns = event.habit?.entries.filter((entry) => {
                    const date = parseDate(entry.date);
                    return date && date >= start && date <= end;
                }) ?? [];
                const projectCheckIns = event.project?.checkIns?.filter((entry) => {
                    const date = parseDate(entry.date);
                    return date && date >= start && date <= end;
                }) ?? [];
                const completedCheckIns = [...habitCheckIns, ...projectCheckIns].filter((entry) => entry.status === "done");
                score += completedCheckIns.length;
                const progressEntries = event.project?.entries.filter((entry) => {
                    const date = parseDate(entry.date);
                    return date && date >= start && date <= end;
                }) ?? [];
                score += progressEntries.reduce((total, entry) => total + Math.min(4, entry.hours), 0);
            }

            return { start, end, score };
        });
        // tick advances date-driven clusters while preserving memoization between minute ticks.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [events, tick]);

    if (!show || !events.length) return null;
    const checkIns = events.reduce((total, event) => total
        + (event.habit?.entries.filter((entry) => entry.status === "done").length ?? 0)
        + (event.project?.checkIns?.filter((entry) => entry.status === "done").length ?? 0), 0);
    const projectHours = Math.round(events.reduce((total, event) => total + (event.project?.entries.reduce((sum, entry) => sum + entry.hours, 0) ?? 0), 0) * 10) / 10;
    const attention = events.filter((event) => milestoneKind(event) === "project" && ["watch", "at-risk"].includes(projectProgress(event).risk)).length;

    return (
        <section id="activity" className="dashboard-disclosure mt-5 animate-soft-enter">
            <div className="mb-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--color-accent-ink)]"><Icon name="trending-up" size={14} /> Momentum</div>
                <h2 className="m-0 mt-1.5 font-[var(--font-display)] text-[clamp(24px,3vw,34px)] font-normal leading-[1.08]">Your activity rhythm</h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">Twelve two-week clusters, shaped by your actual check-ins and project work.</p>
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--color-ink-soft)]"><span><strong>{checkIns}</strong> completed</span><span><strong>{projectHours}h</strong> invested</span><span><strong>{attention}</strong> {attention === 1 ? "path needs" : "paths need"} attention</span></div>
            </div>

            <div className="histogram">
                <NeuronLineChart values={buckets.map((bucket) => bucket.score)} titles={buckets.map((bucket) => `${formatDate(bucket.start, { month: "short", day: "numeric" })} to ${formatDate(bucket.end, { month: "short", day: "numeric" })}: ${Math.round(bucket.score)} activity points`)} ariaLabel="Milestone and check-in activity over the last 24 weeks" />
                <div className="mt-3 flex justify-between text-[11px] text-[var(--color-muted)]">
                    <span>{formatDate(buckets[0].start, { month: "short", day: "numeric" })}</span>
                    <span>{formatDate(buckets[5].end, { month: "short", day: "numeric" })}</span>
                    <span>Today</span>
                </div>
            </div>
        </section>
    );
}
