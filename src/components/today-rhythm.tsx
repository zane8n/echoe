"use client";

import { addDays, startOfDay } from "@/lib/utils";

interface Props { tick: number; }

export function TodayRhythm({ tick }: Props) {
    if (!tick) return <div className="today-rhythm" aria-label="Loading today's rhythm" />;
    const now = new Date(tick);
    const dayStart = startOfDay(now);
    const dayEnd = addDays(dayStart, 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
    const values = [
        { label: "Today", value: ((now.getTime() - dayStart.getTime()) / (dayEnd.getTime() - dayStart.getTime())) * 100, detail: `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}` },
        { label: "Month", value: ((now.getTime() - monthStart.getTime()) / (monthEnd.getTime() - monthStart.getTime())) * 100, detail: `${now.getDate()} of ${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}` },
        { label: "Year", value: ((now.getTime() - yearStart.getTime()) / (yearEnd.getTime() - yearStart.getTime())) * 100, detail: now.toLocaleDateString(undefined, { month: "short", day: "numeric" }) },
    ];
    return <section className="today-rhythm" aria-labelledby="todayRhythmTitle"><div className="today-rhythm-heading"><span>Today&apos;s rhythm</span><strong id="todayRhythmTitle">{now.toLocaleDateString(undefined, { weekday: "long" })}</strong></div><div className="rhythm-dials">{values.map((item) => <div key={item.label} className="rhythm-dial" style={{ "--progress": `${item.value * 3.6}deg` } as React.CSSProperties}><div><strong>{Math.round(item.value)}%</strong></div><span>{item.label}</span><small>{item.detail}</small></div>)}</div></section>;
}
