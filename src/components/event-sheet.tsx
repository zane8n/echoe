"use client";

import { useRef, useState } from "react";
import type { EditorSeed } from "@/app/providers/dashboard-provider";
import { PATH_COLORS } from "@/lib/constants";
import type { AccentColor, MilestoneEvent, MilestoneKind } from "@/lib/types";
import { addDays, daysUntil, localDate, milestoneKind } from "@/lib/utils";
import { Icon, type IconName } from "./icon";
import { Segmented } from "./segmented";
import { Sheet, SheetBody, SheetFooter, SheetHeader, useSheet } from "./sheet";

const KINDS: Array<{ value: MilestoneKind; label: string; icon: IconName }> = [
    { value: "habit", label: "Habit", icon: "repeat" },
    { value: "project", label: "Project", icon: "target" },
    { value: "countdown", label: "Countdown", icon: "hourglass" },
    { value: "ongoing", label: "Ongoing", icon: "history" },
];

const KIND_HINT: Record<MilestoneKind, string> = {
    habit: "Something you repeat. Check in each day or week.",
    project: "A deadline with an effort budget and honest readiness.",
    countdown: "Just a date to look forward to. No check-ins, no tracking.",
    ongoing: "No finish line. Echoe counts up from when it began.",
};

const TARGET_PRESETS = [{ label: "2 weeks", days: 14 }, { label: "1 month", days: 30 }, { label: "3 months", days: 91 }, { label: "6 months", days: 182 }];

interface Props {
    eventId: string | null;
    events: MilestoneEvent[];
    onSave: (event: MilestoneEvent) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
    seed?: EditorSeed | null;
}

export function EventSheet(props: Props) {
    const event = props.eventId ? props.events.find((item) => item.id === props.eventId) ?? null : null;
    const nameInput = useRef<HTMLInputElement>(null);
    const [color, setColor] = useState<AccentColor>(event?.color ?? PATH_COLORS[props.events.length % PATH_COLORS.length] ?? "teal");
    return (
        <Sheet onClose={props.onClose} label={event ? event.name : "Create a path"} hue={color} initialFocus={nameInput} size="md">
            <EventForm {...props} event={event} nameInput={nameInput} color={color} setColor={setColor} />
        </Sheet>
    );
}

function EventForm({ event, events, onSave, onDelete, seed, nameInput, color, setColor }: Props & { event: MilestoneEvent | null; nameInput: React.RefObject<HTMLInputElement | null>; color: AccentColor; setColor: (color: AccentColor) => void }) {
    const { close } = useSheet();
    const isEdit = Boolean(event);
    const [kind, setKind] = useState<MilestoneKind>(event ? milestoneKind(event) : seed?.kind ?? "habit");
    const [name, setName] = useState(event?.name ?? seed?.name ?? "");
    const [start, setStart] = useState(event?.start ?? seed?.start ?? localDate());
    const [target, setTarget] = useState(event?.target || seed?.target || localDate(addDays(new Date(), 30)));
    const [pinned, setPinned] = useState(event?.pinned ?? events.length === 0);
    const [isCountdown, setIsCountdown] = useState(event?.isCountdown ?? false);
    const [habitFreq, setHabitFreq] = useState<"daily" | "weekly">(event?.habit?.frequency ?? seed?.frequency ?? "daily");
    const [targetPerPeriod, setTargetPerPeriod] = useState(event?.habit?.targetPerPeriod ?? seed?.targetPerPeriod ?? 3);
    const [trackOngoing, setTrackOngoing] = useState(Boolean(event?.habit));
    const [plannedHours, setPlannedHours] = useState(event?.project?.plannedHours ?? seed?.plannedHours ?? 40);
    const [readiness, setReadiness] = useState(event?.project?.readiness ?? 0);
    const [projectFreq, setProjectFreq] = useState<"daily" | "weekly">(event?.project?.checkInFrequency ?? "daily");
    const [nameError, setNameError] = useState("");
    const [dateError, setDateError] = useState("");
    const targetInput = useRef<HTMLInputElement>(null);
    const tracksHabit = kind === "habit" || (kind === "ongoing" && trackOngoing);
    const days = daysUntil(target);

    const handleSubmit = (submitEvent: React.FormEvent) => {
        submitEvent.preventDefault();
        const trimmed = name.trim();
        let hasError = false;
        if (!trimmed) {
            setNameError("Give this path a name.");
            nameInput.current?.focus();
            hasError = true;
        } else setNameError("");
        if (!start || (kind !== "ongoing" && !target)) {
            setDateError(kind === "ongoing" ? "This path needs a start date." : "This path needs a start date and a target date.");
            if (!hasError) targetInput.current?.focus();
            hasError = true;
        } else if (kind !== "ongoing" && new Date(target) <= new Date(start)) {
            setDateError("The target date needs to come after the start date.");
            if (!hasError) targetInput.current?.focus();
            hasError = true;
        } else setDateError("");
        if (hasError) return;

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
            habit: tracksHabit
                ? { frequency: habitFreq, targetPerPeriod: habitFreq === "weekly" ? targetPerPeriod : undefined, entries: event?.habit?.entries ?? [] }
                : undefined,
            project: kind === "project"
                ? { plannedHours: Math.max(1, plannedHours), readiness, entries: event?.project?.entries ?? [], checkInFrequency: projectFreq, checkIns: event?.project?.checkIns ?? [] }
                : undefined,
            achievedAt: event?.achievedAt,
            createdAt: event?.createdAt,
            updatedAt: event?.updatedAt,
        });
        close();
    };

    const rhythmControl = (
        <div className="grid gap-2">
            <span className="field-label">Check-in rhythm</span>
            <Segmented label="Check-in rhythm" value={habitFreq} onChange={setHabitFreq} options={[{ value: "daily", label: "Every day" }, { value: "weekly", label: "Each week" }]} />
            {habitFreq === "weekly" && (
                <div className="stepper" role="group" aria-label="Times per week">
                    <button type="button" className="icon-btn" aria-label="Fewer times per week" disabled={targetPerPeriod <= 1} onClick={() => setTargetPerPeriod(Math.max(1, targetPerPeriod - 1))}><Icon name="minus" size={18} /></button>
                    <span><strong className="num">{targetPerPeriod}</strong> {targetPerPeriod === 1 ? "time" : "times"} a week</span>
                    <button type="button" className="icon-btn" aria-label="More times per week" disabled={targetPerPeriod >= 7} onClick={() => setTargetPerPeriod(Math.min(7, targetPerPeriod + 1))}><Icon name="plus" size={18} /></button>
                </div>
            )}
        </div>
    );

    return (
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
            <SheetHeader title={isEdit ? "Edit path" : "New path"} />
            <SheetBody className="editor">
                <label className="grid gap-2">
                    <span className="sr-only">Name</span>
                    <input ref={nameInput} value={name} onChange={(input) => { setName(input.target.value); setNameError(""); }} maxLength={48} placeholder="Name it, like “Morning pages”" className="editor-name" autoComplete="off" enterKeyHint="done" aria-label="Name" aria-invalid={Boolean(nameError)} />
                    {nameError && <p className="field-error" role="alert">{nameError}</p>}
                </label>

                <div className="swatches" role="radiogroup" aria-label="Milestone color">
                    {PATH_COLORS.map((choice) => {
                        const label = choice.charAt(0).toUpperCase() + choice.slice(1);
                        return (
                            <button key={choice} type="button" role="radio" aria-checked={color === choice} aria-label={label} title={label} onClick={() => setColor(choice)} className="swatch" data-hue={choice}>
                                {color === choice && <Icon name="check" size={15} strokeWidth={2.6} />}
                            </button>
                        );
                    })}
                </div>

                <fieldset className="grid gap-2">
                    <legend className="field-label mb-2">What kind of path?</legend>
                    <div className="kind-grid" role="radiogroup" aria-label="Milestone type">
                        {KINDS.map((item) => (
                            <button key={item.value} type="button" role="radio" aria-label={item.label} aria-checked={kind === item.value} onClick={() => setKind(item.value)} className="kind-choice">
                                <Icon name={item.icon} size={20} />
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>
                    <p className="field-hint">{KIND_HINT[kind]}</p>
                </fieldset>

                {kind === "habit" && rhythmControl}

                {kind === "ongoing" && (
                    <>
                        <label className="grid min-w-0 gap-2"><span className="field-label">Started</span><input type="date" value={start} max={localDate()} onChange={(input) => { setStart(input.target.value); setDateError(""); }} className="field" /></label>
                        <label className="toggle-row"><span><strong>Track consistency</strong><small>Leave off to simply count the time. Turn on for an ongoing practice with check-ins.</small></span><input type="checkbox" className="switch" checked={trackOngoing} onChange={(input) => setTrackOngoing(input.target.checked)} /></label>
                        {trackOngoing && rhythmControl}
                    </>
                )}

                {kind !== "ongoing" && (
                    <div className="grid gap-2">
                        <label className="grid min-w-0 gap-2">
                            <span className="flex items-baseline justify-between"><span className="field-label">Target date</span>{days > 0 && <span className="field-hint">{days} day{days === 1 ? "" : "s"} from today</span>}</span>
                            <input ref={targetInput} type="date" value={target} onChange={(input) => { setTarget(input.target.value); setDateError(""); }} className="field" aria-invalid={Boolean(dateError)} />
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {TARGET_PRESETS.map((preset) => <button key={preset.label} type="button" className="chip" onClick={() => { setTarget(localDate(addDays(new Date(), preset.days))); setDateError(""); }}>{preset.label}</button>)}
                        </div>
                    </div>
                )}
                {dateError && <p className="field-error" role="alert">{dateError}</p>}

                {kind === "countdown" && <div className="editor-note"><Icon name="hourglass" size={18} /><span><strong>Just a date to look forward to</strong><small>No check-ins, no tracking. Only the days remaining.</small></span></div>}

                {kind === "project" && (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            <label className="grid min-w-0 gap-2"><span className="field-label">Effort budget</span><span className="unit-field"><input className="field" type="number" inputMode="decimal" min={1} max={10000} step={1} value={plannedHours} onChange={(input) => setPlannedHours(Number(input.target.value))} aria-label="Planned effort hours" /><span>hours</span></span></label>
                            <label className="grid min-w-0 gap-2"><span className="field-label">Readiness now</span><span className="unit-field"><input className="field" type="number" inputMode="numeric" min={0} max={100} value={readiness} onChange={(input) => setReadiness(Number(input.target.value))} aria-label="Current readiness" /><span>%</span></span></label>
                        </div>
                        <div className="grid gap-2">
                            <span className="field-label">Check-in rhythm</span>
                            <Segmented label="Project check-in rhythm" value={projectFreq} onChange={setProjectFreq} options={[{ value: "daily", label: "Every day" }, { value: "weekly", label: "Each week" }]} />
                        </div>
                    </>
                )}

                <details className="fold editor-advanced">
                    <summary><Icon name="chevron-right" size={16} />Advanced</summary>
                    <div className="grid gap-2 pt-2">
                        {kind !== "ongoing" && <label className="grid min-w-0 gap-2"><span className="field-label">Starts</span><input type="date" value={start} onChange={(input) => { setStart(input.target.value); setDateError(""); }} className="field" /></label>}
                        <label className="toggle-row"><span><strong>Keep in focus</strong><small>Show this path first on Today.</small></span><input type="checkbox" className="switch" checked={pinned} onChange={(input) => setPinned(input.target.checked)} /></label>
                        {kind === "project" && <label className="toggle-row"><span><strong>Countdown emphasis</strong><small>Make the days remaining the main number.</small></span><input type="checkbox" className="switch" checked={isCountdown} onChange={(input) => setIsCountdown(input.target.checked)} /></label>}
                    </div>
                </details>
            </SheetBody>
            <SheetFooter>
                {isEdit && <button type="button" onClick={() => onDelete(event!.id)} className="icon-btn text-[var(--color-danger)]" aria-label="Delete path" title="Delete"><Icon name="trash" size={19} /></button>}
                <span className="spacer" />
                <button type="button" onClick={close} className="btn btn-ghost">Cancel</button>
                <button type="submit" className="btn btn-hue">{isEdit ? "Save changes" : "Create path"}</button>
            </SheetFooter>
        </form>
    );
}
