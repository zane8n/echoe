"use client";

import { useState } from "react";
import { useCountUp } from "@/hooks/use-count-up";
import { riskLabel } from "@/lib/path-view";
import type { MilestoneEvent } from "@/lib/types";
import { formatDate, localDate, projectProgress } from "@/lib/utils";
import { Icon } from "./icon";
import { Segmented } from "./segmented";
import { Sheet, SheetBody, SheetHeader, useSheet } from "./sheet";

interface Props {
    event: MilestoneEvent;
    onEffort: (id: string, hours: number, date: string, note?: string) => void;
    onReadiness: (id: string, readiness: number, note?: string) => void;
    onClose: () => void;
}

const QUICK_HOURS = [0.25, 0.5, 1, 2, 3];
const hoursLabel = (hours: number) => hours < 1 ? `${Math.round(hours * 60)}m` : `${hours}h`;

export function ProgressSheet({ event, onEffort, onReadiness, onClose }: Props) {
    return (
        <Sheet onClose={onClose} label={`Update ${event.name}`} hue={event.color}>
            <ProgressBody event={event} onEffort={onEffort} onReadiness={onReadiness} />
        </Sheet>
    );
}

function ProgressBody({ event, onEffort, onReadiness }: Omit<Props, "onClose">) {
    const { close } = useSheet();
    const progress = projectProgress(event);
    const [mode, setMode] = useState<"readiness" | "effort">("readiness");
    const [hours, setHours] = useState(1);
    const [readiness, setReadiness] = useState(progress.readiness);
    const [date, setDate] = useState(localDate());
    const [note, setNote] = useState("");
    const entries = [...(event.project?.entries ?? [])].sort((a, b) => b.date.localeCompare(a.date) || (b.recordedAt ?? "").localeCompare(a.recordedAt ?? ""));
    const overall = useCountUp(progress.overallPercent);
    const invested = useCountUp(progress.investedHours);
    const ready = useCountUp(progress.readiness);

    const submit = (submitEvent: React.FormEvent) => {
        submitEvent.preventDefault();
        if (mode === "effort") onEffort(event.id, hours, date, note);
        else onReadiness(event.id, readiness, note);
        close();
    };

    return (
        <>
            <SheetHeader title={event.name} kicker={<><Icon name="target" size={15} />{riskLabel[progress.risk]}</>} closeLabel="Close progress" />
            <SheetBody>
                <dl className="stat-row">
                    <div><dt>Overall</dt><dd className="num">{Math.round(overall)}%</dd></div>
                    <div><dt>Invested</dt><dd className="num">{invested.toFixed(1)}h</dd></div>
                    <div><dt>Readiness</dt><dd className="num">{Math.round(ready)}%</dd></div>
                </dl>

                <Segmented
                    label="Project update type"
                    role="tablist"
                    value={mode}
                    onChange={setMode}
                    options={[{ value: "readiness", label: "Readiness" }, { value: "effort", label: "Effort" }]}
                />

                <form onSubmit={submit} className="mt-5 grid gap-5">
                    {mode === "readiness" ? (
                        <>
                            <label className="grid gap-3">
                                <span className="flex items-baseline justify-between"><span className="field-label">How ready are you, honestly?</span><strong className="num text-2xl">{readiness}%</strong></span>
                                <input className="range" type="range" min={0} max={100} step={1} value={readiness} onChange={(input) => setReadiness(Number(input.target.value))} aria-label="Readiness now" style={{ "--fill": `${readiness}%` } as React.CSSProperties} />
                            </label>
                            <label className="grid gap-2">
                                <span className="field-label">What changed? <span className="field-hint">Optional</span></span>
                                <textarea className="field" rows={2} maxLength={180} value={note} onChange={(input) => setNote(input.target.value)} aria-label="What changed?" />
                            </label>
                            <button type="submit" className="btn btn-primary btn-block">Update readiness</button>
                        </>
                    ) : (
                        <>
                            <div className="grid gap-2">
                                <span className="field-label">Time spent</span>
                                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Quick amounts">
                                    {QUICK_HOURS.map((amount) => <button key={amount} type="button" role="radio" aria-checked={hours === amount} className="chip" onClick={() => setHours(amount)}>{hoursLabel(amount)}</button>)}
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <label className="grid gap-2"><span className="field-label">Hours invested</span><input className="field" type="number" inputMode="decimal" min={0.25} max={168} step={0.25} value={hours} onChange={(input) => setHours(Number(input.target.value))} /></label>
                                <label className="grid gap-2"><span className="field-label">Date</span><input className="field" type="date" max={localDate()} value={date} onChange={(input) => setDate(input.target.value)} /></label>
                            </div>
                            <label className="grid gap-2">
                                <span className="field-label">A useful note <span className="field-hint">Optional</span></span>
                                <textarea className="field" rows={2} maxLength={180} value={note} onChange={(input) => setNote(input.target.value)} />
                            </label>
                            <button type="submit" className="btn btn-primary btn-block" disabled={!(hours > 0)}>Log {hoursLabel(hours)}</button>
                        </>
                    )}
                </form>

                <section className="mt-8">
                    <h3 className="m-0 text-base">Update history</h3>
                    {entries.length === 0
                        ? <p className="mt-2 text-sm text-[var(--color-muted)]">Updates collect here, separate from check-ins.</p>
                        : (
                            <ol className="history-list">
                                {entries.slice(0, 12).map((entry) => (
                                    <li key={entry.id}>
                                        <span><strong>{formatDate(entry.date, { weekday: "short", year: undefined })}</strong>{entry.note && <small>{entry.note}</small>}</span>
                                        <span className="num">{entry.hours > 0 ? `+${entry.hours}h` : `${entry.readiness}%`}<small>{entry.hours > 0 ? "effort" : "ready"}</small></span>
                                    </li>
                                ))}
                            </ol>
                        )}
                </section>
            </SheetBody>
        </>
    );
}
