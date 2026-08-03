"use client";

import { useState, useEffect, useRef } from "react";
import { Icon } from "./icon";
import type { MilestoneEvent, AccentColor } from "@/lib/types";
import { localDate, addDays } from "@/lib/utils";
import { COLOR_MAP } from "@/lib/constants";

const COLORS: AccentColor[] = ["amber", "coral", "teal", "lavender", "mint", "sky"];

interface Props {
    eventId: string | null;
    events: MilestoneEvent[];
    onSave: (event: MilestoneEvent) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
}

export function EventSheet({ eventId, events, onSave, onDelete, onClose }: Props) {
    const event = eventId ? events.find((e) => e.id === eventId) ?? null : null;
    const isEdit = Boolean(event);

    const [name, setName] = useState(event?.name ?? "");
    const [start, setStart] = useState(event?.start ?? localDate());
    const [target, setTarget] = useState(event?.target ?? localDate(addDays(new Date(), 30)));
    const [color, setColor] = useState<AccentColor>(event?.color ?? "amber");
    const [pinned, setPinned] = useState(event?.pinned ?? events.length === 0);
    const [isCountdown, setIsCountdown] = useState(event?.isCountdown ?? false);
    const [hasHabit, setHasHabit] = useState(!!event?.habit);
    const [habitFreq, setHabitFreq] = useState<"daily" | "weekly">(event?.habit?.frequency ?? "daily");
    const [habitTarget, setHabitTarget] = useState(event?.habit?.target ?? 30);
    const [error, setError] = useState("");

    const firstInput = useRef<HTMLInputElement>(null);

    useEffect(() => {
        firstInput.current?.focus();
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = name.trim();
        if (!trimmed || !start || !target) {
            setError("Complete the event name and dates.");
            return;
        }
        if (new Date(target) <= new Date(start)) {
            setError("The target date must be after the start date.");
            return;
        }

        onSave({
            id: event?.id ?? (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`),
            name: trimmed,
            start,
            target,
            color,
            pinned,
            isCountdown,
            habit: hasHabit ? { frequency: habitFreq, entries: event?.habit?.entries ?? [], target: habitTarget } : undefined,
            achievedAt: event?.achievedAt,
            createdAt: event?.createdAt,
            updatedAt: event?.updatedAt,
        });
        onClose();
    };

    return (
        <>
            <div className="fixed inset-0 z-60 acrylic-backdrop animate-fade-in" onClick={onClose} />

            <aside
                className="fixed inset-y-0 right-0 z-70 h-dvh w-[min(100%,520px)] overflow-y-auto acrylic-surface px-[clamp(22px,5vw,42px)] py-[26px] animate-slide-up"
                role="dialog"
                aria-modal="true"
                aria-labelledby="eventSheetTitle"
            >
                <div className="flex justify-between gap-5 items-start pb-[22px] border-b border-[var(--color-line)]">
                    <div>
                        <div className="text-xs font-semibold uppercase text-[var(--color-accent-ink)]">
                            {isEdit ? "Edit milestone" : "New milestone"}
                        </div>
                        <h2 id="eventSheetTitle" className="text-[38px] font-[var(--font-display)] font-normal m-0 mt-1">
                            {isEdit ? "Edit milestone" : "Add milestone"}
                        </h2>
                    </div>
                    <button onClick={onClose} className="icon-button" aria-label="Close" title="Close">
                        <Icon name="x" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="grid gap-6 pt-7">
                    <label className="grid gap-2 min-w-0">
                        <span className="text-[var(--color-ink-soft)] text-[13px] font-semibold">Name</span>
                        <input
                            ref={firstInput}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            maxLength={48}
                            placeholder="e.g. CCNP Enterprise"
                            required
                            className="field"
                        />
                    </label>

                    <div className="grid grid-cols-2 gap-[14px] max-[860px]:grid-cols-1">
                        <label className="grid gap-2 min-w-0">
                            <span className="text-[var(--color-ink-soft)] text-[13px] font-semibold">Starts</span>
                            <input
                                type="date"
                                value={start}
                                onChange={(e) => setStart(e.target.value)}
                                required
                                className="field"
                            />
                        </label>
                        <label className="grid gap-2 min-w-0">
                            <span className="text-[var(--color-ink-soft)] text-[13px] font-semibold">Target date</span>
                            <input
                                type="date"
                                value={target}
                                onChange={(e) => setTarget(e.target.value)}
                                required
                                className="field"
                            />
                        </label>
                    </div>

                    <fieldset className="grid gap-2 m-0 p-0 border-0">
                        <legend className="text-[var(--color-ink-soft)] text-[13px] font-semibold">Quiet accent</legend>
                        <div className="grid grid-cols-2 gap-[10px] max-[860px]:grid-cols-1" role="radiogroup" aria-label="Event accent">
                            {COLORS.map((c) => {
                                const palette = COLOR_MAP[c];
                                return (
                                    <label key={c} className="relative cursor-pointer">
                                        <input
                                            type="radio"
                                            name="eventColor"
                                            value={c}
                                            checked={color === c}
                                            onChange={() => setColor(c)}
                                            className="absolute opacity-0 pointer-events-none"
                                        />
                                        <span
                                            className="flex min-h-[42px] items-center gap-[9px] rounded-[8px] border px-3 text-[13px] text-[var(--color-ink-soft)] transition-all duration-180"
                                            style={{
                                                borderColor: color === c ? palette.color : "var(--color-line)",
                                                background: color === c ? palette.glow : "var(--color-panel)",
                                            }}
                                        >
                                            <span
                                                className="w-3 h-3 rounded-full"
                                                style={{ background: palette.color }}
                                            />
                                            {c.charAt(0).toUpperCase() + c.slice(1)}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    </fieldset>

                    <label className="grid grid-cols-[auto_1fr] gap-3 items-start cursor-pointer">
                        <input
                            type="checkbox"
                            checked={pinned}
                            onChange={(e) => setPinned(e.target.checked)}
                            className="w-[18px] h-[18px] mt-[3px] accent-[var(--color-accent)]"
                        />
                        <span className="grid gap-[2px]">
                            <strong className="text-sm font-semibold">Make this the current focus</strong>
                            <small className="text-[var(--color-muted)] text-xs leading-[1.45]">It becomes the large countdown at the top.</small>
                        </span>
                    </label>

                    <label className="grid grid-cols-[auto_1fr] gap-3 items-start cursor-pointer">
                        <input type="checkbox" checked={isCountdown} onChange={e => setIsCountdown(e.target.checked)} className="w-[18px] h-[18px] mt-[3px] accent-[var(--color-accent)]" />
                        <span className="grid gap-[2px]"><strong className="text-sm font-semibold">Countdown mode</strong><small className="text-[var(--color-muted)] text-xs">Focus on time remaining rather than time invested.</small></span>
                    </label>

                    <label className="grid grid-cols-[auto_1fr] gap-3 items-start cursor-pointer">
                        <input type="checkbox" checked={hasHabit} onChange={e => setHasHabit(e.target.checked)} className="w-[18px] h-[18px] mt-[3px] accent-[var(--color-accent)]" />
                        <span className="grid gap-[2px]"><strong className="text-sm font-semibold">Track as habit</strong><small className="text-[var(--color-muted)] text-xs">Daily or weekly check-ins with streak tracking.</small></span>
                    </label>

                    {hasHabit && (
                        <div className="grid grid-cols-2 gap-3 rounded-[8px] border border-[var(--color-line)] bg-[var(--color-panel)] p-4">
                            <label className="grid gap-1.5">
                                <span className="text-[11px] uppercase text-[var(--color-muted)]">Frequency</span>
                                <select value={habitFreq} onChange={e => setHabitFreq(e.target.value as "daily" | "weekly")} className="field min-h-[40px] py-1 text-sm">
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                </select>
                            </label>
                            <label className="grid gap-1.5">
                                <span className="text-[11px] uppercase text-[var(--color-muted)]">Check-ins</span>
                                <input type="number" min={1} max={365} value={habitTarget} onChange={e => setHabitTarget(Number(e.target.value))} className="field min-h-[40px] py-1 text-sm" />
                            </label>
                        </div>
                    )}

                    {error && <p className="min-h-5 -mt-2 text-[var(--color-danger)] text-[13px]" role="alert">{error}</p>}

                    <div className="acrylic-actions sticky -bottom-[34px] z-2 mt-[10px] flex flex-wrap justify-between gap-[14px] border-t border-[var(--color-line)] pb-[34px] pt-5">
                        {isEdit && (
                            <button
                                type="button"
                                onClick={() => { onDelete(event!.id); onClose(); }}
                                className="secondary-button text-[var(--color-danger)]"
                            >
                                <Icon name="trash" size={16} />
                                Delete
                            </button>
                        )}
                        <div className="flex gap-[10px] ml-auto max-[860px]:w-full max-[860px]:[&>*]:flex-1">
                            <button type="button" onClick={onClose} className="secondary-button">
                                Cancel
                            </button>
                            <button type="submit" className="primary-button">
                                Save milestone
                            </button>
                        </div>
                    </div>
                </form>
            </aside>
        </>
    );
}
