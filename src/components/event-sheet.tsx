"use client";

import { useEffect, useRef, useState } from "react";
import { COLOR_MAP } from "@/lib/constants";
import type { AccentColor, MilestoneEvent, MilestoneKind } from "@/lib/types";
import { addDays, localDate, milestoneKind } from "@/lib/utils";
import { Icon, type IconName } from "./icon";

const COLORS: AccentColor[] = ["amber", "coral", "teal", "lavender", "mint", "sky"];
const KINDS: Array<{ value: MilestoneKind; label: string; detail: string; icon: IconName }> = [
    { value: "project", label: "Project", detail: "A goal with a deadline", icon: "target" },
    { value: "habit", label: "Habit", detail: "A repeatable rhythm", icon: "flame" },
    { value: "ongoing", label: "Ongoing", detail: "No finish line", icon: "history" },
];

interface Props {
    eventId: string | null;
    events: MilestoneEvent[];
    onSave: (event: MilestoneEvent) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
}

export function EventSheet({ eventId, events, onSave, onDelete, onClose }: Props) {
    const event = eventId ? events.find((item) => item.id === eventId) ?? null : null;
    const isEdit = Boolean(event);
    const initialKind = event ? milestoneKind(event) : "project";
    const [kind, setKind] = useState<MilestoneKind>(initialKind);
    const [name, setName] = useState(event?.name ?? "");
    const [start, setStart] = useState(event?.start ?? localDate());
    const [target, setTarget] = useState(event?.target || localDate(addDays(new Date(), 30)));
    const [color, setColor] = useState<AccentColor>(event?.color ?? "teal");
    const [pinned, setPinned] = useState(event?.pinned ?? events.length === 0);
    const [isCountdown, setIsCountdown] = useState(event?.isCountdown ?? false);
    const [habitFreq, setHabitFreq] = useState<"daily" | "weekly">(event?.habit?.frequency ?? "daily");
    const [trackOngoing, setTrackOngoing] = useState(Boolean(event?.habit));
    const [plannedHours, setPlannedHours] = useState(event?.project?.plannedHours ?? 40);
    const [readiness, setReadiness] = useState(event?.project?.readiness ?? 0);
    const [error, setError] = useState("");
    const firstInput = useRef<HTMLInputElement>(null);

    useEffect(() => { firstInput.current?.focus(); }, []);

    const handleSubmit = (submitEvent: React.FormEvent) => {
        submitEvent.preventDefault();
        const trimmed = name.trim();
        if (!trimmed || !start || (kind !== "ongoing" && !target)) {
            setError("Add a name and the dates this path needs.");
            return;
        }
        if (kind !== "ongoing" && new Date(target) <= new Date(start)) {
            setError("The target date must be after the start date.");
            return;
        }

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
            habit: habitEnabled
                ? { frequency: habitFreq, entries: event?.habit?.entries ?? [], target: event?.habit?.target ?? 1 }
                : undefined,
            project: kind === "project"
                ? { plannedHours: Math.max(1, plannedHours), readiness, entries: event?.project?.entries ?? [] }
                : undefined,
            achievedAt: event?.achievedAt,
            createdAt: event?.createdAt,
            updatedAt: event?.updatedAt,
        });
        onClose();
    };

    return (
        <>
            <div className="fixed inset-0 z-60 acrylic-backdrop animate-fade-in" onClick={onClose} />
            <aside className="sheet-surface fixed inset-y-0 right-0 z-70 h-dvh w-[min(100%,520px)] overflow-y-auto acrylic-surface px-[clamp(20px,5vw,40px)] py-[24px] animate-slide-up" role="dialog" aria-modal="true" aria-labelledby="eventSheetTitle">
                <div className="flex items-start justify-between gap-5 border-b border-[var(--color-line)] pb-5">
                    <div>
                        <div className="text-xs font-semibold uppercase text-[var(--color-accent-ink)]">{isEdit ? "Edit path" : "New path"}</div>
                        <h2 id="eventSheetTitle" className="m-0 mt-1 font-[var(--font-display)] text-[34px] font-normal">{isEdit ? "Edit milestone" : "Add milestone"}</h2>
                    </div>
                    <button onClick={onClose} className="icon-button" aria-label="Close" title="Close"><Icon name="x" /></button>
                </div>

                <form onSubmit={handleSubmit} className="grid gap-5 pt-6">
                    <label className="grid gap-2">
                        <span className="text-[13px] font-semibold text-[var(--color-ink-soft)]">Name</span>
                        <input ref={firstInput} value={name} onChange={(input) => setName(input.target.value)} maxLength={48} placeholder="e.g. CCNP Enterprise" required className="field" />
                    </label>

                    <fieldset className="m-0 grid gap-2 border-0 p-0">
                        <legend className="mb-2 text-[13px] font-semibold text-[var(--color-ink-soft)]">What kind of path is this?</legend>
                        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Milestone type">
                            {KINDS.map((item) => (
                                <button key={item.value} type="button" role="radio" aria-label={item.label} aria-checked={kind === item.value} onClick={() => setKind(item.value)} className="kind-choice" data-active={kind === item.value}>
                                    <Icon name={item.icon} size={17} />
                                    <strong>{item.label}</strong>
                                    <small>{item.detail}</small>
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    <div className={`grid gap-3 ${kind === "ongoing" ? "grid-cols-1" : "grid-cols-2"}`}>
                        <label className="grid gap-2">
                            <span className="text-[13px] font-semibold text-[var(--color-ink-soft)]">Starts</span>
                            <input type="date" value={start} onChange={(input) => setStart(input.target.value)} required className="field" />
                        </label>
                        {kind !== "ongoing" && (
                            <label className="grid gap-2">
                                <span className="text-[13px] font-semibold text-[var(--color-ink-soft)]">Target date</span>
                                <input type="date" value={target} onChange={(input) => setTarget(input.target.value)} required className="field" />
                            </label>
                        )}
                    </div>

                    {kind === "project" && (
                        <div className="project-fields grid grid-cols-2 gap-3 border-y border-[var(--color-line)] py-5">
                            <label className="grid gap-2">
                                <span className="text-[13px] font-semibold text-[var(--color-ink-soft)]">Effort budget</span>
                                <span className="field-with-unit"><input type="number" min={1} max={10000} step={1} value={plannedHours} onChange={(input) => setPlannedHours(Number(input.target.value))} aria-label="Planned effort hours" /><span>hours</span></span>
                            </label>
                            <label className="grid gap-2">
                                <span className="text-[13px] font-semibold text-[var(--color-ink-soft)]">Readiness now</span>
                                <span className="field-with-unit"><input type="number" min={0} max={100} value={readiness} onChange={(input) => setReadiness(Number(input.target.value))} aria-label="Current readiness" /><span>%</span></span>
                            </label>
                            <p className="col-span-2 m-0 text-xs leading-relaxed text-[var(--color-muted)]">Echoe weighs readiness more than hours, then compares both with time elapsed.</p>
                        </div>
                    )}

                    {(kind === "habit" || kind === "ongoing") && (
                        <div className="grid gap-4 border-y border-[var(--color-line)] py-5">
                            {kind === "ongoing" && (
                                <label className="flex cursor-pointer items-center justify-between gap-4">
                                    <span><strong className="block text-sm">Track consistency</strong><small className="text-xs text-[var(--color-muted)]">Leave off for tenure, turn on for ongoing practice.</small></span>
                                    <input type="checkbox" checked={trackOngoing} onChange={(input) => setTrackOngoing(input.target.checked)} className="theme-checkbox" />
                                </label>
                            )}
                            {(kind === "habit" || trackOngoing) && (
                                <label className="grid gap-2">
                                    <span className="text-[13px] font-semibold text-[var(--color-ink-soft)]">Check-in rhythm</span>
                                    <select value={habitFreq} onChange={(input) => setHabitFreq(input.target.value as "daily" | "weekly")} className="field">
                                        <option value="daily">Once each day</option>
                                        <option value="weekly">Once each week</option>
                                    </select>
                                </label>
                            )}
                        </div>
                    )}

                    <details className="editor-details">
                        <summary>Focus and color</summary>
                        <div className="mt-4 grid gap-5">
                            <label className="grid cursor-pointer grid-cols-[auto_1fr] items-start gap-3">
                                <input type="checkbox" checked={pinned} onChange={(input) => setPinned(input.target.checked)} className="theme-checkbox mt-[3px]" />
                                <span><strong className="block text-sm">Keep in focus</strong><small className="text-xs text-[var(--color-muted)]">Use this path in the momentum summary.</small></span>
                            </label>
                            {kind === "project" && (
                                <label className="grid cursor-pointer grid-cols-[auto_1fr] items-start gap-3">
                                    <input type="checkbox" checked={isCountdown} onChange={(input) => setIsCountdown(input.target.checked)} className="theme-checkbox mt-[3px]" />
                                    <span><strong className="block text-sm">Countdown emphasis</strong><small className="text-xs text-[var(--color-muted)]">Make remaining time more prominent.</small></span>
                                </label>
                            )}
                            <fieldset className="m-0 grid gap-2 border-0 p-0">
                                <legend className="text-[13px] font-semibold text-[var(--color-ink-soft)]">Path color</legend>
                                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Milestone color">
                                    {COLORS.map((choice) => {
                                        const palette = COLOR_MAP[choice];
                                        const active = color === choice;
                                        const label = choice.charAt(0).toUpperCase() + choice.slice(1);
                                        return <button key={choice} type="button" role="radio" aria-checked={active} aria-label={label} onClick={() => setColor(choice)} className="color-choice" style={{ borderColor: active ? palette.color : "var(--color-line)", background: active ? palette.glow : "var(--color-panel)" }}><span style={{ background: palette.color }} />{label}{active && <Icon name="check" size={13} style={{ color: palette.ink }} />}</button>;
                                    })}
                                </div>
                            </fieldset>
                        </div>
                    </details>

                    {error && <p className="m-0 text-[13px] text-[var(--color-danger)]" role="alert">{error}</p>}
                    <div className="acrylic-actions sticky -bottom-6 z-2 mt-1 flex flex-wrap justify-between gap-3 border-t border-[var(--color-line)] pb-6 pt-4">
                        {isEdit && <button type="button" onClick={() => { onDelete(event!.id); onClose(); }} className="secondary-button text-[var(--color-danger)]"><Icon name="trash" size={16} />Delete</button>}
                        <div className="ml-auto flex gap-2"><button type="button" onClick={onClose} className="secondary-button">Cancel</button><button type="submit" className="primary-button">Save milestone</button></div>
                    </div>
                </form>
            </aside>
        </>
    );
}
