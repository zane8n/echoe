"use client";

import { useMemo } from "react";
import type { MilestoneEvent } from "@/lib/types";
import { addDays, localDate, parseDate, startOfDay } from "@/lib/utils";

const DAYS = 28;
const WIDTH = 600;
const HEIGHT = 84;
const PAD_X = 4;
const PAD_TOP = 10;
const BASE = HEIGHT - 8;

interface Point { x: number; y: number }

/* Catmull-Rom through the daily totals, so the line bends rather than jags. */
function smooth(points: Point[]): string {
    if (points.length < 2) return "";
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let index = 0; index < points.length - 1; index += 1) {
        const p0 = points[index - 1] ?? points[index];
        const p1 = points[index];
        const p2 = points[index + 1];
        const p3 = points[index + 2] ?? p2;
        const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
        const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
        path += ` C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
}

/**
 * Four weeks of check-ins drawn as one continuous line: every habit check-in,
 * project check-in, and hour logged counts as a beat for its day.
 * Today's point is the live end of the signal.
 */
export function SignalLine({ events, today }: { events: MilestoneEvent[]; today: string }) {
    const { line, area, now, total } = useMemo(() => {
        const end = parseDate(today) ?? startOfDay();
        const dates = Array.from({ length: DAYS }, (_, index) => localDate(addDays(end, index - DAYS + 1)));
        const counts = new Map(dates.map((date) => [date, 0]));
        const bump = (date: string) => { if (counts.has(date)) counts.set(date, (counts.get(date) ?? 0) + 1); };
        for (const event of events) {
            for (const entry of event.habit?.entries ?? []) if (entry.status === "done") bump(entry.date);
            for (const entry of event.project?.checkIns ?? []) if (entry.status === "done") bump(entry.date);
            for (const entry of event.project?.entries ?? []) if (entry.hours > 0) bump(entry.date);
        }
        const values = dates.map((date) => counts.get(date) ?? 0);
        const max = Math.max(1, ...values);
        const step = (WIDTH - PAD_X * 2) / (DAYS - 1);
        const points = values.map((value, index) => ({ x: PAD_X + index * step, y: BASE - (value / max) * (BASE - PAD_TOP) }));
        const line = smooth(points);
        const last = points[points.length - 1];
        return {
            line,
            area: `${line} L ${last.x} ${BASE} L ${points[0].x} ${BASE} Z`,
            now: last,
            total: values.reduce((sum, value) => sum + value, 0),
        };
    }, [events, today]);

    return (
        <figure className="signal" role="img" aria-label={`${total} check-in${total === 1 ? "" : "s"} in the last four weeks`}>
            <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
                <defs>
                    <linearGradient id="signal-fade" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" className="signal-fade-top" />
                        <stop offset="1" className="signal-fade-bottom" />
                    </linearGradient>
                </defs>
                <line className="signal-baseline" x1={PAD_X} y1={BASE} x2={WIDTH - PAD_X} y2={BASE} />
                {[7, 14, 21].map((week) => {
                    const x = PAD_X + (DAYS - 1 - week) * ((WIDTH - PAD_X * 2) / (DAYS - 1));
                    return <line key={week} className="signal-tick" x1={x} y1={BASE} x2={x} y2={BASE + 4} />;
                })}
                <path className="signal-area" d={area} />
                <path className="signal-line" d={line} pathLength={1} />
                <circle className="signal-now-ring" cx={now.x} cy={now.y} r={4} />
                <circle className="signal-now" cx={now.x} cy={now.y} r={3.5} />
            </svg>
            <figcaption className="signal-axis" aria-hidden="true"><span>Four weeks ago</span><span>Today</span></figcaption>
        </figure>
    );
}
