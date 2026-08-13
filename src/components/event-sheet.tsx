"use client";

import { useEffect, useRef, useState } from "react";
import { COLOR_MAP } from "@/lib/constants";
import type { AccentColor, MilestoneEvent, MilestoneKind } from "@/lib/types";
import { addDays, localDate, milestoneKind } from "@/lib/utils";
import { Icon, type IconName } from "./icon";

const COLORS: AccentColor[] = ["amber", "coral", "teal", "lavender", "mint", "sky"];
const KINDS: Array<{ value: MilestoneKind; label: string; detail: string; icon: IconName }> = [
    { value: "project", label: "Project", detail: "Deadline and effort", icon: "target" },
    { value: "habit", label: "Habit", detail: "Repeatable rhythm", icon: "flame" },
    { value: "ongoing", label: "Ongoing", detail: "No finish line", icon: "history" },
    { value: "countdown", label: "Countdown", detail: "Just a date", icon: "hourglass" },
];

interface Props {
    eventId: string | null;
    events: MilestoneEvent[];
    onSave: (event: MilestoneEvent) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
    seed?: { kind: MilestoneKind; frequency?: "daily" | "weekly" } | null;
}

export function EventSheet({ eventId, events, onSave, onDelete, onClose, seed }: Props) {
    const event = eventId ? events.find((item) => item.id === eventId) ?? null : null;
    const isEdit = Boolean(event);
    const [kind, setKind] = useState<MilestoneKind>(event ? milestoneKind(event) : seed?.kind ?? "project");
    const [name, setName] = useState(event?.name ?? "");
    const [start, setStart] = useState(event?.start ?? localDate());
    const [target, setTarget] = useState(event?.target || localDate(addDays(new Date(), 30)));
    const [color, setColor] = useState<AccentColor>(event?.color ?? "teal");
    const [pinned, setPinned] = useState(event?.pinned ?? events.length === 0);
    const [isCountdown, setIsCountdown] = useState(event?.isCountdown ?? false);
    const [habitFreq, setHabitFreq] = useState<"daily" | "weekly">(event?.habit?.frequency ?? seed?.frequency ?? "daily");
    const [targetPerPeriod, setTargetPerPeriod] = useState(event?.habit?.targetPerPeriod ?? 1);
    const [trackOngoing, setTrackOngoing] = useState(Boolean(event?.habit));
    const [plannedHours, setPlannedHours] = useState(event?.project?.plannedHours ?? 40);
    const [readiness, setReadiness] = useState(event?.project?.readiness ?? 0);
    const [projectFreq, setProjectFreq] = useState<"daily" | "weekly">(event?.project?.checkInFrequency ?? "daily");
    const [nameError, setNameError] = useState("");
    const [dateError, setDateError] = useState("");
    const [confirmDelete, setConfirmDelete] = useState(false);
    const firstInput = useRef<HTMLInputElement>(null);
    const targetInput = useRef<HTMLInputElement>(null);
    const sheet = useRef<HTMLElement>(null);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const timer = window.matchMedia("(pointer: fine)").matches
            ? window.setTimeout(() => firstInput.current?.focus(), 120)
            : null;
        return () => {
            document.body.style.overflow = previousOverflow;
            if (timer) window.clearTimeout(timer);
        };
    }, []);

    const handleDialogKeyDown = (keyEvent: React.KeyboardEvent<HTMLElement>) => {
        if (keyEvent.key === "Escape") {
            keyEvent.preventDefault();
            onClose();
            return;
        }
        if (keyEvent.key !== "Tab") return;
        const focusable = Array.from(sheet.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex='-1'])") ?? []);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable.at(-1)!;
        if (keyEvent.shiftKey && document.activeElement === first) {
            keyEvent.preventDefault();
            last.focus();
        } else if (!keyEvent.shiftKey && document.activeElement === last) {
            keyEvent.preventDefault();
            first.focus();
        }
    };

    const handleSubmit = (submitEvent: React.FormEvent) => {
        submitEvent.preventDefault();
        const trimmed = name.trim();
        let hasError = false;
        if (!trimmed) {
            setNameError("Give this path a name.");
            firstInput.current?.focus();
            hasError = true;
        } else {
            setNameError("");
        }
        if (!start || (kind !== "ongoing" && !target)) {
            setDateError("This path needs a start date" + (kind === "ongoing" ? "." : " and a target date."));
            if (!hasError) targetInput.current?.focus();
            hasError = true;
        } else if (kind !== "ongoing" && new Date(target) <= new Date(start)) {
            setDateError("The target date must be after the start date.");
            if (!hasError) targetInput.current?.focus();
            hasError = true;
        } else {
            setDateError("");
        }
        if (hasError) return;

        const habitEnabled = kind === "habit" || (kind === "ongoing" && trackOngoing);
        onSave({
            id: event?.id ?? (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`),
            name: trimmed,
            start,
            target: kind === "ongoing" ? "" : target,
            color,
            pinned,
            kind,
            isCountdown: kind === "project" ? isCountdown : false,
            allowExtraCheckIns: event?.allowExtraCheckIns ?? false,
            habit: habitEnabled
                ? { frequency: habitFreq, targetPerPeriod: habitFreq === "weekly" ? targetPerPeriod : undefined, entries: event?.habit?.entries ?? [] }
                : undefined,
            project: kind === "project"
                ? { plannedHours: Math.max(1, plannedHours), readiness, entries: event?.project?.entries ?? [], checkInFrequency: projectFreq, checkIns: event?.project?.checkIns ?? [] }
                : undefined,
            achievedAt: event?.achievedAt,
            createdAt: event?.createdAt,
            updatedAt: event?.updatedAt,
        });
        onClose();
    };

    return <>
        <div className="fixed inset-0 z-60 acrylic-backdrop animate-fade-in" onClick={onClose} />
        <aside ref={sheet} onKeyDown={handleDialogKeyDown} className="sheet-surface path-editor-sheet fixed inset-y-0 right-0 z-70 flex h-dvh w-[min(100%,520px)] flex-col overflow-hidden acrylic-surface animate-slide-up" role="dialog" aria-modal="true" aria-labelledby="eventSheetTitle">
            <header className="path-editor-header">
                <div><span>{isEdit ? "Edit path" : "New path"}</span><h2 id="eventSheetTitle">{isEdit ? event?.name : "Create a path"}</h2></div>
                <button onClick={onClose} className="icon-button" aria-label="Close" title="Close"><Icon name="x" /></button>
            </header>

            <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                <div className="path-editor-body">
                    <div className="path-editor-panel">
                        <label className="grid gap-2">
                            <span className="field-label">Name</span>
                            <input ref={firstInput} value={name} onChange={(input) => { setName(input.target.value); setNameError(""); }} maxLength={48} placeholder="e.g. CCNP Enterprise" className="field" autoComplete="off" enterKeyHint="next" aria-invalid={Boolean(nameError)} />
                            {nameError && <p className="editor-error" role="alert">{nameError}</p>}
                        </label>

                        <fieldset className="m-0 grid gap-2 border-0 p-0">
                            <legend className="field-label mb-1">Path type</legend>
                            <div className="editor-kind-grid" role="radiogroup" aria-label="Milestone type">
                                {KINDS.map((item) => <button key={item.value} type="button" role="radio" aria-label={item.label} aria-checked={kind === item.value} onClick={() => setKind(item.value)} className="editor-kind" data-active={kind === item.value}><Icon name={item.icon} size={16} /><span><strong>{item.label}</strong><small>{item.detail}</small></span></button>)}
                            </div>
                        </fieldset>

                        <div className={`path-date-grid ${kind === "ongoing" ? "path-date-single" : ""}`}>
                            <label className="grid min-w-0 gap-2"><span className="field-label">Starts</span><input type="date" value={start} onChange={(input) => { setStart(input.target.value); setDateError(""); }} className="field min-w-0" /></label>
                            {kind !== "ongoing" && <label className="grid min-w-0 gap-2"><span className="field-label">Target date</span><input ref={targetInput} type="date" value={target} onChange={(input) => { setTarget(input.target.value); setDateError(""); }} className="field min-w-0" aria-invalid={Boolean(dateError)} /></label>}
                        </div>
                        {dateError && <p className="editor-error" role="alert">{dateError}</p>}

                        {kind === "project" && <>
                            <div className="tracking-pair">
                                <label className="grid min-w-0 gap-2"><span className="field-label">Effort budget</span><span className="field-with-unit"><input type="number" inputMode="decimal" min={1} max={10000} step={1} value={plannedHours} onChange={(input) => setPlannedHours(Number(input.target.value))} aria-label="Planned effort hours" /><span>hours</span></span></label>
                                <label className="grid min-w-0 gap-2"><span className="field-label">Readiness</span><span className="field-with-unit"><input type="number" inputMode="numeric" min={0} max={100} value={readiness} onChange={(input) => setReadiness(Number(input.target.value))} aria-label="Current readiness" /><span>%</span></span></label>
                            </div>
                            <label className="grid gap-2"><span className="field-label">Check-in rhythm</span><select value={projectFreq} onChange={(input) => setProjectFreq(input.target.value as "daily" | "weekly")} className="field"><option value="daily">Once each day</option><option value="weekly">Once each week</option></select></label>
                        </>}

                        {kind === "ongoing" && <label className="editor-toggle"><span><strong>Track consistency</strong><small>Leave off for tenure; turn on for an ongoing practice.</small></span><input type="checkbox" checked={trackOngoing} onChange={(input) => setTrackOngoing(input.target.checked)} className="theme-checkbox" /></label>}

                        {(kind === "habit" || (kind === "ongoing" && trackOngoing)) && (
                            <div className="tracking-pair">
                                <label className="grid min-w-0 gap-2"><span className="field-label">Check-in rhythm</span><select value={habitFreq} onChange={(input) => setHabitFreq(input.target.value as "daily" | "weekly")} className="field"><option value="daily">Once each day</option><option value="weekly">Once each week</option></select></label>
                                {habitFreq === "weekly" && (
                                    <label className="grid min-w-0 gap-2"><span className="field-label">Times per week</span><select value={targetPerPeriod} onChange={(input) => setTargetPerPeriod(Number(input.target.value))} className="field" aria-label="Times per week">{[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n} value={n}>{n}×</option>)}</select></label>
                                )}
                            </div>
                        )}

                        {kind === "ongoing" && !trackOngoing && <div className="tracking-rest"><Icon name="history" size={20} /><strong>Continuity only</strong><small>Echoe will quietly track how long this path has been part of your life.</small></div>}

                        {kind === "countdown" && <div className="tracking-rest"><Icon name="hourglass" size={20} /><strong>Just a date to look forward to</strong><small>No check-ins, no tracking — just the days remaining.</small></div>}

                        <details className="editor-details">
                            <summary>Advanced</summary>
                            <div className="mt-4 grid gap-4">
                                <label className="editor-toggle"><span><strong>Keep in focus</strong><small>Place this path first on Home.</small></span><input type="checkbox" checked={pinned} onChange={(input) => setPinned(input.target.checked)} className="theme-checkbox" /></label>
                                {kind === "project" && <label className="editor-toggle"><span><strong>Countdown emphasis</strong><small>Make the remaining time the primary signal.</small></span><input type="checkbox" checked={isCountdown} onChange={(input) => setIsCountdown(input.target.checked)} className="theme-checkbox" /></label>}
                                <fieldset className="m-0 grid gap-3 border-0 p-0"><legend className="field-label">Path color</legend><div className="editor-color-grid" role="radiogroup" aria-label="Milestone color">{COLORS.map((choice) => { const palette = COLOR_MAP[choice]; const active = color === choice; const label = choice.charAt(0).toUpperCase() + choice.slice(1); return <button key={choice} type="button" role="radio" aria-checked={active} aria-label={label} onClick={() => setColor(choice)} className="editor-color" style={{ "--swatch": palette.color, "--swatch-glow": palette.glow } as React.CSSProperties}><span /> <small>{label}</small>{active && <Icon name="check" size={13} />}</button>; })}</div></fieldset>
                            </div>
                        </details>
                    </div>
                </div>

                <footer className="path-editor-actions acrylic-actions">
                    {isEdit && (confirmDelete ? (
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-[var(--color-muted)]">Delete?</span>
                            <button type="button" onClick={() => onDelete(event!.id)} className="quiet-button text-[var(--color-danger)]">Yes</button>
                            <button type="button" onClick={() => setConfirmDelete(false)} className="quiet-button">Cancel</button>
                        </div>
                    ) : (
                        <button type="button" onClick={() => setConfirmDelete(true)} className="icon-button text-[var(--color-danger)]" aria-label="Delete path" title="Delete"><Icon name="trash" size={17} /></button>
                    ))}
                    <div><button type="button" onClick={onClose} className="secondary-button">Cancel</button><button type="submit" className="primary-button">{isEdit ? "Save changes" : "Create path"}</button></div>
                </footer>
            </form>
        </aside>
    </>;
}
