"use client";

import { useMemo } from "react";
import { useCountUp } from "@/hooks/use-count-up";
import type { Achievement, MilestoneEvent, ProjectProgress } from "@/lib/types";
import { addDays, formatDate, localDate, projectProgress, startOfDay } from "@/lib/utils";
import { Icon } from "./icon";
import { NeuronLineChart } from "./neuron-line-chart";

interface Props { events: MilestoneEvent[]; achievements: Achievement[]; tick: number; }

function AttentionRow({ event, progress }: { event: MilestoneEvent; progress: ProjectProgress }) {
    const gap = useCountUp(Math.max(0, Math.round(progress.elapsedPercent - progress.overallPercent)));
    return <div className="momentum-attention"><span>{event.name}</span><strong>{Math.round(gap)}% pace gap</strong></div>;
}

export function MomentumOverview({ events, achievements, tick }: Props) {
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

    const signal = analysis.delta > 0 ? `${analysis.delta} more check-ins than last week` : analysis.delta < 0 ? `${Math.abs(analysis.delta)} fewer check-ins than last week` : "Your check-in pace is steady";
    const completion = useCountUp(analysis.completion);
    const activeDays = useCountUp(analysis.activeDays);
    const currentHours = useCountUp(analysis.currentHours);

    return <section className="momentum-overview animate-soft-enter">
        <header className="momentum-heading"><div className="section-kicker"><Icon name="trending-up" size={14} />Momentum</div><h1>What your rhythm is saying</h1><p>{signal}.</p></header>
        <dl className="momentum-stats">
            <div><dt>Follow-through</dt><dd>{Math.round(completion)}%</dd><small>planned rhythm, 7 days</small></div>
            <div><dt>Active days</dt><dd>{Math.round(activeDays)}</dd><small>of the last 7</small></div>
            <div><dt>Deep work</dt><dd>{currentHours.toFixed(1)}h</dd><small>logged this week</small></div>
        </dl>
        <div className="momentum-fortnight"><NeuronLineChart compact values={analysis.days.map((date) => analysis.scores.get(date) ?? 0)} titles={analysis.days.map((date) => `${date}: ${Math.round(analysis.scores.get(date) ?? 0)} activity points`)} ariaLabel="Daily activity over the last fourteen days" /><div><span>Last 14 days</span></div></div>
        {achievements.length > 0 && (
            <div className="momentum-achievements">
                <div className="section-kicker"><Icon name="trophy" size={14} />Achievements</div>
                <ul>
                    {achievements.slice(0, 12).map((achievement) => (
                        <li key={achievement.id} className="achievement-chip" title={formatDate(achievement.date, { month: "short", day: "numeric", year: undefined })}>
                            <Icon name="trophy" size={14} />
                            <span>{achievement.label}</span>
                        </li>
                    ))}
                </ul>
            </div>
        )}
        <div className="momentum-review">
            <div><span>Next review</span><strong>{analysis.attention.length ? `${analysis.attention.length} ${analysis.attention.length === 1 ? "path" : "paths"} need a decision` : "No path is asking for intervention"}</strong></div>
            {analysis.attention.slice(0, 2).map((event) => <AttentionRow key={event.id} event={event} progress={projectProgress(event)} />)}
        </div>
    </section>;
}
