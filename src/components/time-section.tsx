"use client";

import { useMemo } from "react";
import { startOfDay, addDays } from "@/lib/utils";
import { Icon } from "./icon";

interface Props { tick: number; }

export function TimeSection({ tick }: Props) {
  const now = new Date();

  const yearPct = useMemo(() => { const s = new Date(now.getFullYear(),0,1); const e = new Date(now.getFullYear()+1,0,1); return ((now.getTime()-s.getTime())/(e.getTime()-s.getTime()))*100; }, [now]);
  const monthPct = useMemo(() => { const s = new Date(now.getFullYear(),now.getMonth(),1); const e = new Date(now.getFullYear(),now.getMonth()+1,1); return ((now.getTime()-s.getTime())/(e.getTime()-s.getTime()))*100; }, [now]);
  const dayPct = useMemo(() => { const s = startOfDay(now); const e = addDays(s,1); return ((now.getTime()-s.getTime())/(e.getTime()-s.getTime()))*100; }, [now]);

  const dayOfYear = Math.floor((startOfDay(now).getTime()-new Date(now.getFullYear(),0,1).getTime())/86400000)+1;
  const daysInYear = Math.round((new Date(now.getFullYear()+1,0,1).getTime()-new Date(now.getFullYear(),0,1).getTime())/86400000);
  const daysInMonth = new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const hLeft = Math.max(0, Math.ceil((addDays(startOfDay(now),1).getTime()-now.getTime())/3600000));

  const bars = [
    { label: "Day", icon: "clock" as const, pct: dayPct, text: `${hLeft}h elapsed`, color: "var(--color-accent)", ink: "var(--color-accent-ink)" },
    { label: "Month", icon: "calendar" as const, pct: monthPct, text: `${now.getDate()}/${daysInMonth}`, color: "var(--color-coral)", ink: "var(--color-coral-ink)" },
    { label: "Year", icon: "layers" as const, pct: yearPct, text: `${dayOfYear}/${daysInYear}`, color: "var(--color-teal)", ink: "var(--color-teal-ink)" },
  ];

  return (
    <section className="mt-[clamp(52px,8vw,92px)] animate-soft-enter">
      <div className="mb-6">
        <div className="text-[var(--color-muted)] text-xs font-semibold tracking-[0.14em] uppercase flex items-center gap-2">
          <Icon name="clock" size={14} /> Rhythm
        </div>
        <h2 className="mt-1.5 text-[clamp(24px,3vw,34px)] leading-[1.08] font-[var(--font-display)] font-normal m-0">Your tempo</h2>
      </div>
      <div className="flex flex-col gap-4">
        {bars.map(bar => (
          <div key={bar.label} className="flex items-center gap-4 group">
            <span className="w-16 text-xs font-semibold text-[var(--color-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Icon name={bar.icon} size={13} />{bar.label}
            </span>
            <div className="flex-1 relative h-2.5 rounded-full overflow-hidden group-hover:brightness-110 transition-all duration-500" style={{ background: `color-mix(in srgb, ${bar.color} 13%, transparent)` }}>
              <div className="progress-fill absolute inset-y-0 left-0 rounded-full" style={{ width: `${Math.min(100,Math.max(0,bar.pct))}%`, background: `linear-gradient(90deg, ${bar.color}, ${bar.color}cc)`, backgroundSize: "200% 100%", animation: bar.pct>0?"gentle-shift 6s ease-in-out infinite":"none" }} />
            </div>
            <span className="w-20 text-right text-xs tabular-nums font-medium" style={{ color: bar.ink }}>{bar.text}</span>
            <span className="w-10 text-right text-xs tabular-nums text-[var(--color-muted)]">{bar.pct.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}
