"use client";

import { useState } from "react";
import { COLOR_MAP } from "@/lib/constants";
import type { MilestoneEvent } from "@/lib/types";
import { formatDate, localDate, projectProgress } from "@/lib/utils";
import { Icon } from "./icon";

interface Props {
    event: MilestoneEvent;
    onLog: (id: string, hours: number, readiness: number, date: string, note?: string) => void;
    onClose: () => void;
}

const riskCopy = {
    "on-track": "Your pace and readiness are aligned.",
    watch: "A small adjustment now can protect the deadline.",
    "at-risk": "The remaining work needs a clearer weekly commitment.",
    complete: "This path is complete.",
};

export function ProgressSheet({ event, onLog, onClose }: Props) {
    const progress = projectProgress(event);
    const palette = COLOR_MAP[event.color];
    const [hours, setHours] = useState(1);
    const [readiness, setReadiness] = useState(progress.readiness);
    const [date, setDate] = useState(localDate());
    const [note, setNote] = useState("");
    const entries = [...(event.project?.entries ?? [])].sort((a, b) => (b.date.localeCompare(a.date) || (b.recordedAt ?? "").localeCompare(a.recordedAt ?? "")));

    const submit = (submitEvent: React.FormEvent) => {
        submitEvent.preventDefault();
        onLog(event.id, hours, readiness, date, note);
        onClose();
    };

    return (
        <>
            <div className="fixed inset-0 z-60 acrylic-backdrop animate-fade-in" onClick={onClose} />
            <aside className="sheet-surface fixed inset-y-0 right-0 z-70 h-dvh w-[min(100%,500px)] overflow-y-auto acrylic-surface px-[clamp(20px,5vw,38px)] py-6 animate-slide-up" role="dialog" aria-modal="true" aria-label={`Update ${event.name}`}>
                <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] pb-5">
                    <div><div className="text-xs font-semibold uppercase" style={{ color: palette.ink }}>Project update</div><h2 className="m-0 mt-1 font-[var(--font-display)] text-[30px] font-normal">{event.name}</h2></div>
                    <button onClick={onClose} className="icon-button" aria-label="Close progress"><Icon name="x" /></button>
                </div>

                <div className="progress-summary my-6">
                    <div><span>Overall</span><strong>{progress.overallPercent}%</strong></div>
                    <div><span>Invested</span><strong>{progress.investedHours}h</strong></div>
                    <div><span>Readiness</span><strong>{progress.readiness}%</strong></div>
                </div>
                <div className="mb-6 grid gap-2">
                    <div className="flex justify-between gap-3 text-xs"><span className={`risk-label risk-${progress.risk}`}>{progress.risk.replace("-", " ")}</span><span className="text-[var(--color-muted)]">{progress.remainingHours}h left, {progress.requiredHoursPerWeek}h/week</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-[var(--color-line)]"><div className="progress-fill h-full rounded-full" style={{ width: `${progress.overallPercent}%`, background: palette.color }} /></div>
                    <p className="m-0 text-xs text-[var(--color-muted)]">{riskCopy[progress.risk]}</p>
                </div>

                <form onSubmit={submit} className="grid gap-4 border-y border-[var(--color-line)] py-5">
                    <div className="grid grid-cols-2 gap-3">
                        <label className="grid gap-2"><span className="text-[13px] font-semibold text-[var(--color-ink-soft)]">Hours invested</span><input className="field" type="number" min={0} max={168} step={0.25} value={hours} onChange={(input) => setHours(Number(input.target.value))} /></label>
                        <label className="grid gap-2"><span className="text-[13px] font-semibold text-[var(--color-ink-soft)]">Readiness now</span><span className="field-with-unit"><input type="number" min={0} max={100} value={readiness} onChange={(input) => setReadiness(Number(input.target.value))} /><span>%</span></span></label>
                    </div>
                    <label className="grid gap-2"><span className="text-[13px] font-semibold text-[var(--color-ink-soft)]">Date</span><input className="field" type="date" max={localDate()} value={date} onChange={(input) => setDate(input.target.value)} /></label>
                    <label className="grid gap-2"><span className="text-[13px] font-semibold text-[var(--color-ink-soft)]">A useful note <small className="font-normal text-[var(--color-muted)]">optional</small></span><textarea className="field min-h-20 resize-none" maxLength={180} value={note} onChange={(input) => setNote(input.target.value)} placeholder="What moved this forward?" /></label>
                    <button type="submit" className="primary-button"><Icon name="plus" size={16} />Log progress</button>
                </form>

                <section className="pt-6">
                    <h3 className="m-0 text-sm font-semibold">Progress history</h3>
                    {entries.length === 0 ? <p className="text-xs text-[var(--color-muted)]">Your first update will begin the project history.</p> : (
                        <ol className="m-0 mt-3 grid list-none gap-0 p-0">
                            {entries.slice(0, 12).map((entry) => <li key={entry.id} className="grid grid-cols-[1fr_auto] gap-3 border-b border-[var(--color-line)] py-3 text-xs"><span><strong className="block text-[var(--color-ink-soft)]">{formatDate(entry.date, { year: undefined })}</strong>{entry.note && <span className="text-[var(--color-muted)]">{entry.note}</span>}</span><span className="text-right"><strong className="block">+{entry.hours}h</strong><span className="text-[var(--color-muted)]">{entry.readiness}% ready</span></span></li>)}
                        </ol>
                    )}
                </section>
            </aside>
        </>
    );
}
