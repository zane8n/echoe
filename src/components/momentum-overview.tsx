"use client";

import { useMemo } from "react";
import { useCountUp } from "@/hooks/use-count-up";
import type { Achievement, MilestoneEvent } from "@/lib/types";
import { addDays, formatDate, localDate, projectProgress, startOfDay } from "@/lib/utils";
import { Icon } from "./icon";
import { TransitionLink } from "./transition-link";

interface Props { events: MilestoneEvent[]; achievements: Achievement[]; tick: number }

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
            const perWeek = event.habit?.frequency === "weekly" ? event.habit.targetPerPeriod ?? 1 : 1;
            return total + (frequency === "daily" ? 7 : frequency === "weekly" ? perWeek : 0);
        }, 0);
        const completion = opportunities ? Math.min(100, Math.round((currentCheckIns / opportunities) * 100)) : 0;
        const attention = events
            .filter((event) => event.project && ["watch", "at-risk"].includes(projectProgress(event).risk))
            .map((event) => ({ event, gap: Math.max(0, Math.round(projectProgress(event).elapsedPercent - projectProgress(event).overallPercent)) }))
            .sort((a, b) => b.gap - a.gap);
        return { days, scores, currentCheckIns, previousCheckIns, currentHours: Math.round(currentHours * 10) / 10, activeDays: [...activeDays].filter((date) => days.indexOf(date) >= 7).length, completion, delta: currentCheckIns - previousCheckIns, missed, attention };
        // tick advances date windows without recalculating on every render.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [events, tick]);

    const completion = useCountUp(analysis.completion);
    const activeDays = useCountUp(analysis.activeDays);
    const currentHours = useCountUp(analysis.currentHours);
    const max = Math.max(1, ...analysis.scores.values());
    const today = localDate();
    const signal = analysis.delta > 0
        ? `${analysis.delta} more check-in${analysis.delta === 1 ? "" : "s"} than last week. The rhythm is building.`
        : analysis.delta < 0
            ? `${Math.abs(analysis.delta)} fewer check-in${analysis.delta === -1 ? "" : "s"} than last week. A lighter week is still a week.`
            : analysis.currentCheckIns ? "Holding the same pace as last week." : "This week is still open. One check-in starts the rhythm.";

    return (
        <>
            <header className="page-head">
                <div>
                    <h1>Momentum</h1>
                    <p>{signal}</p>
                </div>
            </header>

            <section className="fortnight" aria-label="Check-ins and effort over the last two weeks">
                {[0, 1].map((week) => (
                    <div key={week} className="fortnight-week">
                        <div className="fortnight-bars">
                            {analysis.days.slice(week * 7, week * 7 + 7).map((date, index) => {
                                const score = analysis.scores.get(date) ?? 0;
                                return (
                                    <div key={date} className="fortnight-day" data-today={date === today} title={`${formatDate(date, { weekday: "long", year: undefined })}: ${Math.round(score)} activity`}>
                                        <span className="fortnight-bar" style={{ "--h": `${Math.max(6, (score / max) * 100)}%`, "--i": week * 7 + index } as React.CSSProperties} data-empty={score === 0} />
                                        <small>{new Date(`${date}T12:00:00`).toLocaleDateString(undefined, { weekday: "narrow" })}</small>
                                    </div>
                                );
                            })}
                        </div>
                        <span className="fortnight-label">{week === 0 ? `Last week, ${analysis.previousCheckIns}` : `This week, ${analysis.currentCheckIns}`}</span>
                    </div>
                ))}
            </section>

            <dl className="stat-row momentum-stats">
                <div><dt>Follow-through</dt><dd className="num">{Math.round(completion)}%</dd><small>of planned check-ins, 7 days</small></div>
                <div><dt>Active days</dt><dd className="num">{Math.round(activeDays)}<small>/7</small></dd><small>with any progress</small></div>
                <div><dt>Deep work</dt><dd className="num">{currentHours.toFixed(1)}h</dd><small>logged this week</small></div>
            </dl>

            {analysis.attention.length > 0 && (
                <section className="section" aria-labelledby="attentionHeading">
                    <div className="section-head"><h2 id="attentionHeading">Needs a decision</h2><span className="section-meta">{analysis.attention.length}</span></div>
                    <ul className="rhythm-list group">
                        {analysis.attention.slice(0, 3).map(({ event, gap }) => (
                            <li key={event.id} data-hue={event.color} className="path-row">
                                <TransitionLink href={`/paths/${event.id}`} className="path-row-link">
                                    <span className="path-row-main"><span className="path-row-title"><strong>{event.name}</strong></span><span className="path-row-meta">Behind the calendar by {gap}%</span></span>
                                    <Icon name="chevron-right" size={18} className="text-[var(--color-muted)]" />
                                </TransitionLink>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {achievements.length > 0 && (
                <section className="section" aria-labelledby="achievementsHeading">
                    <div className="section-head"><h2 id="achievementsHeading">Achievements</h2><span className="section-meta">{achievements.length}</span></div>
                    <ul className="trophy-shelf">
                        {achievements.slice(0, 12).map((achievement) => (
                            <li key={achievement.id}>
                                <span className="trophy-medal" aria-hidden="true"><Icon name="trophy" size={20} /></span>
                                <strong>{achievement.label}</strong>
                                <small>{formatDate(achievement.date, { month: "short", day: "numeric", year: undefined })}</small>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </>
    );
}
