"use client";

import { addDays, startOfDay } from "@/lib/utils";

interface Props { tick: number }

/** How much of the day, month, and year has passed: a quiet sense of time, not a countdown. */
export function TimeSection({ tick }: Props) {
    if (!tick) return null;
    const now = new Date(tick);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const dayStart = startOfDay(now);
    const dayEnd = addDays(dayStart, 1);
    const share = (start: Date, end: Date) => ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100;
    const dayOfYear = Math.floor((dayStart.getTime() - yearStart.getTime()) / 86_400_000) + 1;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const rows = [
        { label: "Today", percent: share(dayStart, dayEnd), detail: now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) },
        { label: now.toLocaleDateString(undefined, { month: "long" }), percent: share(monthStart, monthEnd), detail: `Day ${now.getDate()} of ${daysInMonth}` },
        { label: String(now.getFullYear()), percent: share(yearStart, yearEnd), detail: `Day ${dayOfYear}` },
    ];

    return (
        <section className="section" aria-labelledby="timeHeading">
            <div className="section-head"><h2 id="timeHeading">Time</h2></div>
            <div className="time-rows">
                {rows.map((row) => (
                    <div key={row.label} className="time-row">
                        <span className="time-label">{row.label}</span>
                        <span className="time-bar" role="progressbar" aria-label={`${row.label} elapsed`} aria-valuenow={Math.round(row.percent)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(100, Math.max(0, row.percent))}%` }} /></span>
                        <span className="time-value"><strong className="num">{Math.floor(row.percent)}%</strong><small>{row.detail}</small></span>
                    </div>
                ))}
            </div>
        </section>
    );
}
