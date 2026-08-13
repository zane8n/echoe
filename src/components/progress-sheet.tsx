"use client";

import { useState } from "react";
import { useCountUp } from "@/hooks/use-count-up";
import { COLOR_MAP } from "@/lib/constants";
import type { MilestoneEvent } from "@/lib/types";
import { formatDate, localDate, projectProgress } from "@/lib/utils";
import { Icon } from "./icon";

interface Props {
    event: MilestoneEvent;
    onEffort: (id: string, hours: number, date: string, note?: string) => void;
    onReadiness: (id: string, readiness: number, note?: string) => void;
    onClose: () => void;
}

export function ProgressSheet({ event, onEffort, onReadiness, onClose }: Props) {
    const progress = projectProgress(event);
    const palette = COLOR_MAP[event.color];
    const [mode, setMode] = useState<"effort" | "readiness">("readiness");
    const [hours, setHours] = useState(1);
    const [readiness, setReadiness] = useState(progress.readiness);
    const [date, setDate] = useState(localDate());
    const [note, setNote] = useState("");
    const entries = [...(event.project?.entries ?? [])].sort((a, b) => b.date.localeCompare(a.date) || (b.recordedAt ?? "").localeCompare(a.recordedAt ?? ""));
    const overallPercent = useCountUp(progress.overallPercent);
    const investedHours = useCountUp(progress.investedHours);
    const readinessPercent = useCountUp(progress.readiness);

    const submit = (submitEvent: React.FormEvent) => {
        submitEvent.preventDefault();
        if (mode === "effort") onEffort(event.id, hours, date, note);
        else onReadiness(event.id, readiness, note);
        onClose();
    };

    return <>
        <div className="fixed inset-0 z-60 acrylic-backdrop animate-fade-in" onClick={onClose} />
        <aside className="sheet-surface fixed inset-y-0 right-0 z-70 h-dvh w-[min(100%,500px)] overflow-y-auto acrylic-surface px-[clamp(20px,5vw,38px)] py-6 animate-slide-up" role="dialog" aria-modal="true" aria-label={`Update ${event.name}`}>
            <span className="sheet-grabber" aria-hidden="true" />
            <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] pb-5"><div><div className="text-xs font-semibold uppercase" style={{ color: palette.ink }}>Project details</div><h2 className="m-0 mt-1 text-[var(--text-xl)] font-semibold">{event.name}</h2></div><button onClick={onClose} className="icon-button" aria-label="Close progress"><Icon name="x" /></button></div>
            <div className="progress-summary my-6"><div><span>Overall</span><strong>{Math.round(overallPercent)}%</strong></div><div><span>Invested</span><strong>{investedHours.toFixed(1)}h</strong></div><div><span>Readiness</span><strong>{Math.round(readinessPercent)}%</strong></div></div>
            <div className="settings-segment grid-cols-2 mb-5" role="tablist" aria-label="Project update type"><button type="button" role="tab" aria-selected={mode === "readiness"} onClick={() => setMode("readiness")}>Readiness</button><button type="button" role="tab" aria-selected={mode === "effort"} onClick={() => setMode("effort")}>Effort</button></div>
            <form onSubmit={submit} className="grid gap-4 border-y border-[var(--color-line)] py-5">
                {mode === "readiness" ? <>
                    <label className="grid gap-3"><span className="flex justify-between text-[13px] font-semibold text-[var(--color-ink-soft)]"><span>Honest readiness</span><strong>{readiness}%</strong></span><input className="readiness-slider" type="range" min={0} max={100} step={1} value={readiness} onChange={(input) => setReadiness(Number(input.target.value))} aria-label="Readiness now" /></label>
                    <label className="grid gap-2"><span className="text-[13px] font-semibold text-[var(--color-ink-soft)]">What changed? <small className="font-normal text-[var(--color-muted)]">optional</small></span><textarea className="field min-h-20 resize-none" maxLength={180} value={note} onChange={(input) => setNote(input.target.value)} /></label>
                    <button type="submit" className="primary-button">Update readiness</button>
                </> : <>
                    <div className="grid grid-cols-2 gap-3"><label className="grid gap-2"><span className="text-[13px] font-semibold text-[var(--color-ink-soft)]">Hours invested</span><input className="field" type="number" min={0.25} max={168} step={0.25} value={hours} onChange={(input) => setHours(Number(input.target.value))} /></label><label className="grid gap-2"><span className="text-[13px] font-semibold text-[var(--color-ink-soft)]">Date</span><input className="field" type="date" max={localDate()} value={date} onChange={(input) => setDate(input.target.value)} /></label></div>
                    <label className="grid gap-2"><span className="text-[13px] font-semibold text-[var(--color-ink-soft)]">A useful note <small className="font-normal text-[var(--color-muted)]">optional</small></span><textarea className="field min-h-20 resize-none" maxLength={180} value={note} onChange={(input) => setNote(input.target.value)} /></label>
                    <button type="submit" className="primary-button">Log effort</button>
                </>}
            </form>
            <section className="pt-6"><h3 className="m-0 text-sm font-semibold">Update history</h3>{entries.length === 0 ? <p className="text-xs text-[var(--color-muted)]">Updates will collect here without affecting check-ins.</p> : <ol className="m-0 mt-3 grid list-none p-0">{entries.slice(0, 12).map((entry) => <li key={entry.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-[var(--color-line)] py-3 text-xs"><span><strong className="block text-[var(--color-ink-soft)]">{formatDate(entry.date, { year: undefined })}</strong>{entry.note && <span className="text-[var(--color-muted)]">{entry.note}</span>}</span><span className="text-right"><strong className="block">{entry.hours > 0 ? `+${entry.hours}h` : `${entry.readiness}% ready`}</strong><span className="text-[var(--color-muted)]">{entry.hours > 0 ? "effort" : "readiness"}</span></span></li>)}</ol>}</section>
        </aside>
    </>;
}
