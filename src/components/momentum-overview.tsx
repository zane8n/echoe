"use client";

import { useMemo } from "react";
import type { MilestoneEvent } from "@/lib/types";
import { addDays, localDate, projectProgress, startOfDay } from "@/lib/utils";
import { Icon } from "./icon";

interface Props { events: MilestoneEvent[]; tick: number; }

export function MomentumOverview({ events, tick }: Props) {
    const analysis = useMemo(() => {
        const today = startOfDay();
        const days = Array.from({ length: 14 }, (_, index) => localDate(addDays(today, index - 13)));
        const scores = new Map(days.map((date) => [date, 0]));
        let currentCheckIns = 0;
        let previousCheckIns = 0;
        let currentHours = 0;
        let missed = 0;
        const activeDays = new Set<string>();

        for (const event of events) {
            const checkIns = event.project?.checkIns ?? event.habit?.entries ?? [];
            for (const entry of checkIns) {
                const index = days.indexOf(entry.date);
                if (index < 0) continue;
                if (entry.status === "done") {
                    scores.set(entry.date, (scores.get(entry.date) ?? 0) + 1);
                    activeDays.add(entry.date);
                    if (index >= 7) currentCheckIns += 1;
                    else previousCheckIns += 1;
                } else if (index >= 7) missed += 1;
            }
            for (const entry of event.project?.entries ?? []) {
                const index = days.indexOf(entry.date);
                if (index < 7) continue;
                currentHours += entry.hours;
                if (entry.hours > 0) activeDays.add(entry.date);
                scores.set(entry.date, (scores.get(entry.date) ?? 0) + Math.min(3, entry.hours));
            }
        }

        const opportunities = events.reduce((total, event) => {
            const frequency = event.habit?.frequency ?? event.project?.checkInFrequency;
            return total + (frequency === "daily" ? 7 : frequency === "weekly" ? 1 : 0);
        }, 0);
        const completion = opportunities ? Math.min(100, Math.round((currentCheckIns / opportunities) * 100)) : 0;
        const delta = currentCheckIns - previousCheckIns;
        const attention = events
            .filter((event) => event.project && ["watch", "at-risk"].includes(projectProgress(event).risk))
            .sort((a, b) => projectProgress(b).elapsedPercent - projectProgress(b).overallPercent - (projectProgress(a).elapsedPercent - projectProgress(a).overallPercent));
        return { days, scores, currentCheckIns, currentHours: Math.round(currentHours * 10) / 10, activeDays: [...activeDays].filter((date) => days.indexOf(date) >= 7).length, completion, delta, missed, attention };
        // tick advances date windows without recalculating on every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [events, tick]);

    const maximum = Math.max(1, ...analysis.scores.values());
    const signal = analysis.delta > 0 ? `${analysis.delta} more check-ins than last week` : analysis.delta < 0 ? `${Math.abs(analysis.delta)} fewer check-ins than last week` : "Your check-in pace is steady";

    return <section className="momentum-overview animate-soft-enter">
        <header className="momentum-heading"><div className="section-kicker"><Icon name="trending-up" size={14} />Momentum</div><h1>What your rhythm is saying</h1><p>{signal}. {analysis.missed ? `${analysis.missed} missed ${analysis.missed === 1 ? "day is" : "days are"} useful context, not a verdict.` : "Keep protecting the conditions that make showing up easier."}</p></header>
        <dl className="momentum-stats">
            <div><dt>Follow-through</dt><dd>{analysis.completion}%</dd><small>planned rhythm, 7 days</small></div>
            <div><dt>Active days</dt><dd>{analysis.activeDays}</dd><small>of the last 7</small></div>
            <div><dt>Deep work</dt><dd>{analysis.currentHours}h</dd><small>logged this week</small></div>
        </dl>
        <div className="momentum-fortnight" role="img" aria-label="Daily activity over the last fourteen days">{analysis.days.map((date, index) => <span key={date} title={`${date}: ${Math.round(analysis.scores.get(date) ?? 0)} activity`} data-current={index >= 7}><i style={{ height: `${Math.max(7, ((analysis.scores.get(date) ?? 0) / maximum) * 100)}%` }} /></span>)}</div>
        <div className="momentum-review">
            <div><span>Next review</span><strong>{analysis.attention.length ? `${analysis.attention.length} ${analysis.attention.length === 1 ? "path" : "paths"} need a decision` : "No path is asking for intervention"}</strong></div>
            {analysis.attention.slice(0, 2).map((event) => { const progress = projectProgress(event); return <div className="momentum-attention" key={event.id}><span>{event.name}</span><strong>{Math.max(0, Math.round(progress.elapsedPercent - progress.overallPercent))}% pace gap</strong></div>; })}
        </div>
    </section>;
}
