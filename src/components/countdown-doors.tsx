"use client";

import { useState } from "react";
import type { Origin } from "@/app/providers/dashboard-provider";
import { doorFor, doorPrompt } from "@/lib/anticipation";
import type { MilestoneEvent } from "@/lib/types";
import { addDays, formatDate, parseDate } from "@/lib/utils";
import { Icon } from "./icon";

interface Props {
    event: MilestoneEvent;
    today: string;
    /** Days until the countdown's date; negative once it has passed. */
    days: number;
    readOnly?: boolean;
    onOpen?: (date: string, prompt: string, note?: string, origin?: Origin) => void;
}

const dayLabel = (date: string) => formatDate(date, { weekday: "short", day: "numeric", month: "short", year: undefined });

function Door({ open, small }: { open?: boolean; small?: boolean }) {
    return (
        <span className="door-art" data-open={open || undefined} data-size={small ? "sm" : undefined} aria-hidden="true">
            <span className="door-light" />
            <span className="door-panel"><i /></span>
        </span>
    );
}

/**
 * One small door a day. Opening it is the whole ritual; behind it is a prompt to imagine the
 * day a little, and room for a line. Opened doors collect on a shelf. Unopened days aren't
 * missed, they just aren't there.
 */
export function CountdownDoors({ event, today, days, readOnly, onOpen }: Props) {
    const doors = event.countdown?.doors ?? [];
    const door = doorFor(event, today);
    const prompt = door?.prompt ?? doorPrompt(event.id, today, days === 0);
    const [draft, setDraft] = useState(door?.note ?? "");
    const [editing, setEditing] = useState(false);
    const interactive = !readOnly && Boolean(onOpen);
    const writing = interactive && Boolean(door) && (editing || !door?.note);
    const kept = doors.filter((item) => item.note && (item.date !== today || days < 0)).reverse();
    const tomorrow = formatDate(addDays(parseDate(today) ?? new Date(), 1), { weekday: "long", day: undefined, month: undefined, year: undefined });

    const save = (submit: { preventDefault: () => void }) => {
        submit.preventDefault();
        onOpen?.(today, prompt, draft);
        setEditing(false);
    };

    return (
        <section className="detail-section" aria-labelledby="doorsHeading">
            <div className="section-head">
                <h2 id="doorsHeading">A door a day</h2>
                <span className="section-meta">{doors.length ? `${doors.length} opened` : days >= 0 ? "One to open each day" : "None opened"}</span>
            </div>

            {days >= 0 && (
                <div className="doors">
                    <div className="door-card" data-open={Boolean(door)}>
                        {interactive && !door ? (
                            <button type="button" className="door-button" aria-label={days === 0 ? "Open the big door" : "Open today's door"} onClick={(click) => {
                                const rect = click.currentTarget.getBoundingClientRect();
                                onOpen?.(today, prompt, undefined, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
                            }}>
                                <Door />
                            </button>
                        ) : <Door open={Boolean(door)} />}
                        <div className="door-copy" aria-live="polite">
                            <span className="door-eyebrow">{days === 0 ? "The big door" : "Today's door"}</span>
                            {door ? <strong className="door-prompt">{prompt}</strong> : (
                                <>
                                    <strong className="door-prompt">{readOnly ? "Not opened yet" : "Something's behind it"}</strong>
                                    {interactive && <small>Tap the door to open it.</small>}
                                </>
                            )}
                            {writing ? (
                                <form className="door-form" onSubmit={save}>
                                    <textarea
                                        className="field door-input"
                                        value={draft}
                                        rows={2}
                                        maxLength={280}
                                        placeholder="Jot a line, or just enjoy the thought"
                                        aria-label={prompt}
                                        onChange={(input) => setDraft(input.target.value)}
                                        onKeyDown={(key) => { if (key.key === "Enter" && (key.metaKey || key.ctrlKey)) save(key); }}
                                    />
                                    <div className="door-form-actions">
                                        {editing && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setDraft(door?.note ?? ""); setEditing(false); }}>Cancel</button>}
                                        <button type="submit" className="btn btn-hue btn-sm" disabled={!draft.trim() && !door?.note}>Keep it</button>
                                    </div>
                                </form>
                            ) : door?.note && (
                                <>
                                    <p className="door-note">{door.note}</p>
                                    {interactive && <button type="button" className="btn btn-ghost btn-sm door-edit" onClick={() => setEditing(true)}><Icon name="pencil" size={14} />Edit</button>}
                                </>
                            )}
                        </div>
                    </div>

                    {days >= 1 && (
                        <div className="door-next">
                            <Door small />
                            <span><strong>Tomorrow&apos;s door</strong><small>{days === 1 ? "The big one. It opens tomorrow." : `Opens ${tomorrow}, after a sleep.`}</small></span>
                            <Icon name="lock" size={16} />
                        </div>
                    )}
                </div>
            )}

            {doors.length > 0 && (
                <div className="door-shelf">
                    <span className="door-shelf-label">Collected</span>
                    <span className="door-shelf-doors" role="img" aria-label={`${doors.length} ${doors.length === 1 ? "door" : "doors"} opened so far`}>
                        {doors.map((item) => <span key={item.date} className="door-mini" data-note={Boolean(item.note) || undefined} data-today={item.date === today || undefined} title={dayLabel(item.date)} />)}
                    </span>
                </div>
            )}

            {kept.length > 0 && (
                <ol className="history-list door-journal">
                    {kept.map((item) => (
                        <li key={item.date}>
                            <span><small>{dayLabel(item.date)} · {item.prompt}</small><strong>{item.note}</strong></span>
                        </li>
                    ))}
                </ol>
            )}
        </section>
    );
}
