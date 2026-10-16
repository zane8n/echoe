"use client";

import { useMemo } from "react";
import { useCountUp } from "@/hooks/use-count-up";
import type { MilestoneEvent } from "@/lib/types";
import { addDays, formatDate, milestoneKind, parseDate, projectProgress, startOfDay } from "@/lib/utils";
import { NeuronLineChart } from "./neuron-line-chart";

interface Props { events: MilestoneEvent[]; show: boolean; tick: number }

export function WeeksGrid({ events, show, tick }: Props) {
    const buckets = useMemo(() => {
        const today = startOfDay();
        const firstDay = addDays(today, -(12 * 14 - 1));
        return Array.from({ length: 12 }, (_, index) => {
            const start = addDays(firstDay, index * 14);
            const end = addDays(start, 13);
            const within = (value: string) => { const date = parseDate(value); return Boolean(date && date >= start && date <= end); };
            let score = 0;
            for (const event of events) {
                score += [...(event.habit?.entries ?? []), ...(event.project?.checkIns ?? [])].filter((entry) => entry.status === "done" && within(entry.date)).length;
                score += (event.project?.entries ?? []).filter((entry) => within(entry.date)).reduce((total, entry) => total + Math.min(4, entry.hours), 0);
            }
            return { start, end, score };
        });
        // tick advances date-driven clusters while preserving memoization between minute ticks.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [events, tick]);

    const rawCheckIns = events.reduce((total, event) => total
        + (event.habit?.entries.filter((entry) => entry.status === "done").length ?? 0)
        + (event.project?.checkIns?.filter((entry) => entry.status === "done").length ?? 0), 0);
    const rawProjectHours = Math.round(events.reduce((total, event) => total + (event.project?.entries.reduce((sum, entry) => sum + entry.hours, 0) ?? 0), 0) * 10) / 10;
    const rawAttention = events.filter((event) => milestoneKind(event) === "project" && ["watch", "at-risk"].includes(projectProgress(event).risk)).length;
    const checkIns = useCountUp(rawCheckIns);
    const projectHours = useCountUp(rawProjectHours);
    const attention = useCountUp(rawAttention);

    if (!show || !events.length) return null;

    return (
        <section id="activity" className="section long-view" aria-labelledby="longViewHeading">
            <div className="section-head">
                <h2 id="longViewHeading">The long view</h2>
            </div>
            <p className="long-view-copy">Twelve two-week clusters, shaped by your actual check-ins and project work.</p>
            <div className="long-view-totals">
                <span><strong className="num">{Math.round(checkIns)}</strong> completed</span>
                <span><strong className="num">{projectHours.toFixed(1)}h</strong> invested</span>
                <span><strong className="num">{Math.round(attention)}</strong> {rawAttention === 1 ? "path needs" : "paths need"} attention</span>
            </div>
            <div className="long-view-chart">
                <NeuronLineChart values={buckets.map((bucket) => bucket.score)} titles={buckets.map((bucket) => `${formatDate(bucket.start, { month: "short", day: "numeric", year: undefined })} to ${formatDate(bucket.end, { month: "short", day: "numeric", year: undefined })}: ${Math.round(bucket.score)} activity points`)} ariaLabel="Milestone and check-in activity over the last 24 weeks" />
                <div className="long-view-axis">
                    <span>{formatDate(buckets[0].start, { month: "short", day: "numeric", year: undefined })}</span>
                    <span>{formatDate(buckets.at(-1)!.end, { month: "short", day: "numeric", year: undefined })}</span>
                </div>
            </div>
        </section>
    );
}
