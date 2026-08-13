"use client";

import { useState } from "react";
import type { DailyTask } from "@/lib/types";
import { Icon } from "./icon";

interface Props {
    tasks: DailyTask[];
    onAdd: (text: string, time?: string) => void;
    onToggle: (id: string) => void;
    onUpdate: (id: string, changes: { text?: string; time?: string | null }) => void;
    onDelete: (id: string) => void;
}

export function MyDayView({ tasks, onAdd, onToggle, onUpdate, onDelete }: Props) {
    const [text, setText] = useState("");
    const [time, setTime] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");

    const pending = tasks.filter((task) => !task.done);
    const done = tasks.filter((task) => task.done);

    const submitAdd = (event: React.FormEvent) => {
        event.preventDefault();
        if (!text.trim()) return;
        onAdd(text, time || undefined);
        setText("");
        setTime("");
    };

    const startEdit = (task: DailyTask) => {
        setEditingId(task.id);
        setEditText(task.text);
    };

    const commitEdit = (id: string) => {
        if (editText.trim()) onUpdate(id, { text: editText });
        setEditingId(null);
    };

    const renderTask = (task: DailyTask) => (
        <article key={task.id} className="path-row" style={{ "--path-color": "var(--color-accent)", "--path-glow": "var(--color-accent-soft)" } as React.CSSProperties}>
            <span className="path-marker" aria-hidden="true" />
            <div className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-3">
                <button
                    type="button"
                    onClick={() => onToggle(task.id)}
                    aria-pressed={task.done}
                    aria-label={task.done ? `Mark "${task.text}" not done` : `Mark "${task.text}" done`}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-[var(--radius-sm)] border transition-colors duration-150"
                    style={{ borderColor: task.done ? "var(--color-accent)" : "var(--color-line)", background: task.done ? "var(--color-accent)" : "transparent" }}
                >
                    {task.done && <Icon name="check" size={13} style={{ color: "var(--color-on-accent)" }} />}
                </button>

                {editingId === task.id ? (
                    <input
                        autoFocus
                        value={editText}
                        onChange={(input) => setEditText(input.target.value)}
                        onBlur={() => commitEdit(task.id)}
                        onKeyDown={(keyEvent) => { if (keyEvent.key === "Enter") commitEdit(task.id); if (keyEvent.key === "Escape") setEditingId(null); }}
                        className="field min-h-0 flex-1 py-1"
                        maxLength={140}
                    />
                ) : (
                    <button type="button" onClick={() => startEdit(task)} className="min-w-0 flex-1 truncate text-left text-[var(--text-base)]" style={{ color: task.done ? "var(--color-muted)" : "var(--color-ink)", textDecoration: task.done ? "line-through" : undefined }}>
                        {task.text}
                    </button>
                )}

                {task.time && <span className="shrink-0 font-[var(--font-mono)] text-xs tabular-nums text-[var(--color-muted)]">{task.time}</span>}

                <button type="button" onClick={() => onDelete(task.id)} className="icon-button shrink-0" aria-label={`Delete "${task.text}"`} title="Delete">
                    <Icon name="x" size={14} />
                </button>
            </div>
        </article>
    );

    return (
        <section id="my-day" className="scroll-mt-24 animate-soft-enter">
            <div className="mb-5">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-[var(--color-accent-ink)]"><Icon name="list-checks" size={14} />My Day</div>
                <h1 className="m-0 mt-1 text-[clamp(26px,5vw,38px)] font-semibold leading-tight tracking-[-0.01em]">What&apos;s on your plate today</h1>
            </div>

            <form onSubmit={submitAdd} className="tracking-pair mb-5">
                <label className="grid min-w-0 gap-2">
                    <span className="field-label">Add something</span>
                    <input value={text} onChange={(input) => setText(input.target.value)} placeholder="e.g. Call the dentist" maxLength={140} className="field" enterKeyHint="done" />
                </label>
                <label className="grid min-w-0 gap-2">
                    <span className="field-label">Time <span className="font-normal text-[var(--color-muted)]">(optional)</span></span>
                    <span className="flex gap-2">
                        <input type="time" value={time} onChange={(input) => setTime(input.target.value)} className="field min-w-0 flex-1" aria-label="Task time" />
                        <button type="submit" className="primary-button shrink-0" disabled={!text.trim()}><Icon name="plus" size={16} />Add</button>
                    </span>
                </label>
            </form>

            {tasks.length === 0 ? (
                <div className="empty-paths py-10 text-center">
                    <span className="echo-orb mx-auto mb-4 block" aria-hidden="true" />
                    <p className="m-0 text-sm text-[var(--color-muted)]">Nothing on your plate yet.</p>
                    <p className="m-0 mt-2 text-xs text-[var(--color-accent-ink)]">Add the small things — the paths above already hold the big ones.</p>
                </div>
            ) : (
                <>
                    {pending.length > 0 ? (
                        <div className="path-list">{pending.map(renderTask)}</div>
                    ) : (
                        <p className="border-y border-[var(--color-line)] py-8 text-center text-sm text-[var(--color-muted)]">Everything for today is done.</p>
                    )}

                    {done.length > 0 && (
                        <details className="editor-details mt-5">
                            <summary>Done today ({done.length})</summary>
                            <div className="path-list mt-4">{done.map(renderTask)}</div>
                        </details>
                    )}
                </>
            )}
        </section>
    );
}
