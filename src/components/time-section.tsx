"use client";

import { addDays, startOfDay } from "@/lib/utils";
import { Icon } from "./icon";

interface Props { tick: number; }

export function TimeSection({ tick }: Props) {
    if (!tick) return null;
    const now = new Date(tick);
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear() + 1, 0, 1);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const dayStart = startOfDay(now);
    const dayEnd = addDays(dayStart, 1);
    const yearPercent = ((now.getTime() - yearStart.getTime()) / (yearEnd.getTime() - yearStart.getTime())) * 100;
    const monthPercent = ((now.getTime() - monthStart.getTime()) / (monthEnd.getTime() - monthStart.getTime())) * 100;
    const dayPercent = ((now.getTime() - dayStart.getTime()) / (dayEnd.getTime() - dayStart.getTime())) * 100;
    const dayOfYear = Math.floor((dayStart.getTime() - yearStart.getTime()) / 86_400_000) + 1;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const bars = [
        { label: "Day", icon: "clock" as const, percent: dayPercent, text: `Hour ${now.getHours() + 1}`, opacity: 1 },
        { label: "Month", icon: "calendar" as const, percent: monthPercent, text: `${now.getDate()} of ${daysInMonth}`, opacity: 0.78 },
        { label: "Year", icon: "layers" as const, percent: yearPercent, text: `Day ${dayOfYear}`, opacity: 0.58 },
    ];

    return (
        <section className="mt-[clamp(52px,8vw,92px)] animate-soft-enter">
            <div className="mb-6">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--color-accent-ink)]"><Icon name="clock" size={14} /> Time</div>
                <h2 className="m-0 mt-1.5 font-[var(--font-display)] text-[clamp(24px,3vw,34px)] font-normal leading-[1.08]">Today&apos;s rhythm</h2>
            </div>
            <div className="flex flex-col gap-4">
                {bars.map((bar) => (
                    <div key={bar.label} className="group flex items-center gap-4">
                        <span className="flex w-16 items-center gap-1.5 text-xs font-semibold uppercase text-[var(--color-muted)]"><Icon name={bar.icon} size={13} />{bar.label}</span>
                        <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-[var(--color-accent-soft)] transition-all duration-500 group-hover:brightness-110">
                            <div className="progress-fill absolute inset-y-0 left-0 rounded-full bg-[var(--color-accent)]" style={{ width: `${Math.min(100, Math.max(0, bar.percent))}%`, opacity: bar.opacity }} />
                        </div>
                        <span className="w-20 text-right text-xs font-medium tabular-nums text-[var(--color-accent-ink)]">{bar.text}</span>
                        <span className="w-10 text-right text-xs tabular-nums text-[var(--color-muted)]">{bar.percent.toFixed(0)}%</span>
                    </div>
                ))}
            </div>
        </section>
    );
}
