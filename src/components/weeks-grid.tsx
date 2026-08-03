"use client";

import { useRef, useEffect, useMemo } from "react";
import type { MilestoneEvent } from "@/lib/types";
import { parseDate } from "@/lib/utils";
import { COLOR_MAP } from "@/lib/constants";
import { Icon } from "./icon";

interface Props { events: MilestoneEvent[]; show: boolean; tick: number; }

export function WeeksGrid({ events, show, tick }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const buckets = useMemo(() => {
    if (!events.length) return [];
    const now = new Date();
    const maxWeeks = 26;
    const arr: { count: number; colors: string[] }[] = Array.from({ length: maxWeeks }, () => ({ count: 0, colors: [] }));
    events.forEach(ev => {
      const start = parseDate(ev.start);
      if (!start) return;
      const weeks = Math.floor((now.getTime() - start.getTime()) / (7 * 86400000));
      if (weeks < 0) return;
      const bucket = Math.min(weeks, maxWeeks - 1);
      arr[bucket].count++;
      arr[bucket].colors.push(COLOR_MAP[ev.color]?.color ?? "#f0a04b");
    });
    return arr;
  }, [events, tick]);

  useEffect(() => {
    if (!show || !canvasRef.current || !buckets.length) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = 600, h = 160, r = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * r; canvas.height = h * r;
    canvas.style.aspectRatio = `${w}/${h}`;
    ctx.scale(r, r); ctx.clearRect(0, 0, w, h);
    const barW = (w - 8) / buckets.length - 4;
    const maxCount = Math.max(1, ...buckets.map(b => b.count));
    buckets.forEach((b, i) => {
      const x = 8 + i * (barW + 4);
      const barH = Math.max(4, (b.count / maxCount) * (h - 30));
      const y = h - barH - 4;
      if (b.count > 0 && b.colors.length > 0) {
        const segH = barH / b.colors.length;
        b.colors.forEach((color, j) => { ctx.fillStyle = color; ctx.fillRect(x, y + j * segH, barW, Math.max(2, segH - 1)); });
      } else { ctx.fillStyle = "rgba(140,120,100,0.12)"; ctx.fillRect(x, y, barW, barH); }
      ctx.fillStyle = b.count > 0 ? (b.colors[0] || "#f0a04b") : "rgba(140,120,100,0.12)";
      ctx.beginPath(); ctx.roundRect(x, y, barW, Math.min(barH, 4), Math.min(2, barW / 2)); ctx.fill();
    });
  }, [buckets, show]);

  if (!show || !events.length) return null;
  return (
    <section className="mt-[clamp(52px,8vw,92px)] animate-soft-enter">
      <div className="mb-5">
        <div className="text-[var(--color-muted)] text-xs font-semibold tracking-[0.14em] uppercase flex items-center gap-2"><Icon name="trending-up" size={14} /> Momentum</div>
        <h2 className="mt-1.5 text-[clamp(24px,3vw,34px)] leading-[1.08] font-[var(--font-display)] font-normal m-0">Your time histogram</h2>
        <p className="text-[var(--color-muted)] text-sm mt-1">Each bar = a week. Height = milestones active that week.</p>
      </div>
      <div className="p-[clamp(14px,3vw,24px)] border border-[var(--color-line)] rounded-2xl overflow-hidden bg-[var(--color-surface)]/60">
        <canvas ref={canvasRef} className="block w-full h-auto max-h-[200px]" role="img" aria-label="Weekly milestone activity histogram" />
      </div>
    </section>
  );
}
