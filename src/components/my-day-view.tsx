"use client";

import { useMemo, useState } from "react";
import { useRowGestures } from "@/hooks/use-row-gestures";
import { parseQuickInput } from "@/lib/quick-parse";
import type { DailyTask } from "@/lib/types";
import { formatDate, localDate } from "@/lib/utils";
import { ActionMenu } from "./action-menu";
import { Icon } from "./icon";

interface Props {
    tasks: DailyTask[];
    later?: DailyTask[];
    onAdd: (text: string, time?: string, date?: string) => void;
    onToggle: (id: string) => void;
    onUpdate: (id: string, changes: { text?: string; time?: string | null }) => void;
    onDelete: (id: string) => void;
}

function TaskRow({ task, onToggle, onUpdate, onDelete, showDate }: { task: DailyTask; onToggle: (id: string) => void; onUpdate: Props["onUpdate"]; onDelete: (id: string) => void; showDate?: boolean }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(task.text);
    const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
    const { rowRef, innerRef, handlers } = useRowGestures({
        onSwipeRight: () => onToggle(task.id),
        onSwipeLeft: () => onDelete(task.id),
        onMenu: setMenuAt,
        leftKind: "delete",
    });

    const commit = () => {
        if (draft.trim() && draft.trim() !== task.text) onUpdate(task.id, { text: draft });
        setEditing(false);
    };

    return (
        <li ref={rowRef as React.RefObject<HTMLLIElement>} className="rhythm-row task-row" data-hue="accent" data-done={task.done} {...(editing ? {} : handlers)}>
            <div className="swipe-reveal" aria-hidden="true">
                <span><Icon name={task.done ? "undo" : "check"} size={18} />{task.done ? "Not done" : "Done"}</span>
                <span>Delete<Icon name="trash" size={18} /></span>
            </div>
            <div ref={innerRef as React.RefObject<HTMLDivElement>} className="rhythm-row-inner task-inner">
                <button
                    type="button"
                    onClick={() => onToggle(task.id)}
                    aria-pressed={task.done}
                    aria-label={task.done ? `Mark "${task.text}" not done` : `Mark "${task.text}" done`}
                    className="task-check"
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" /><path d="M7.5 12.4l3 3 6-6.4" /></svg>
                </button>
                {editing ? (
                    <input
                        autoFocus
                        value={draft}
                        onChange={(input) => setDraft(input.target.value)}
                        onBlur={commit}
                        onKeyDown={(keyEvent) => { if (keyEvent.key === "Enter") commit(); if (keyEvent.key === "Escape") { keyEvent.stopPropagation(); setDraft(task.text); setEditing(false); } }}
                        className="task-edit"
                        aria-label="Edit task"
                        maxLength={140}
                    />
                ) : (
                    <button type="button" onClick={() => { setDraft(task.text); setEditing(true); }} className="task-text" title="Edit">
                        {task.text}
                    </button>
                )}
                {(task.time || showDate) && <span className="task-time num">{showDate ? formatDate(task.date, { weekday: "short", day: "numeric", month: "short", year: undefined }) : null}{showDate && task.time ? ", " : ""}{task.time}</span>}
                <button type="button" onClick={() => onDelete(task.id)} className="icon-btn icon-btn-sm task-delete" aria-label={`Delete "${task.text}"`} title="Delete">
                    <Icon name="x" size={16} />
                </button>
            </div>
            {menuAt && (
                <ActionMenu x={menuAt.x} y={menuAt.y} title={task.text} onClose={() => setMenuAt(null)} actions={[
                    { label: task.done ? "Mark not done" : "Mark done", icon: "check", onSelect: () => onToggle(task.id) },
                    { label: "Edit", icon: "pencil", onSelect: () => { setDraft(task.text); setEditing(true); } },
                    ...(task.time ? [{ label: "Remove the time", icon: "clock" as const, onSelect: () => onUpdate(task.id, { time: null }) }] : []),
                    { label: "Delete", icon: "trash", tone: "danger", separatorBefore: true, onSelect: () => onDelete(task.id) },
                ]} />
            )}
        </li>
    );
}

export function MyDayView({ tasks, later = [], onAdd, onToggle, onUpdate, onDelete }: Props) {
    const [text, setText] = useState("");
    const pending = tasks.filter((task) => !task.done);
    const done = tasks.filter((task) => task.done);
    const parsed = useMemo(() => text.trim() ? parseQuickInput(text, new Date(), "task") : null, [text]);
    const today = localDate();

    const submitAdd = (event: React.FormEvent) => {
        event.preventDefault();
        if (!parsed?.name) return;
        if (parsed.date && parsed.date !== today) onAdd(parsed.name, parsed.time, parsed.date);
        else onAdd(parsed.name, parsed.time);
        setText("");
    };

    const row = (task: DailyTask, showDate = false) => <TaskRow key={task.id} task={task} onToggle={onToggle} onUpdate={onUpdate} onDelete={onDelete} showDate={showDate} />;

    return (
        <section id="tasks" className="section tasks" aria-labelledby="tasksHeading">
            <div className="section-head">
                <h2 id="tasksHeading">Tasks</h2>
                {tasks.length > 0 && <span className="section-meta">{pending.length ? `${pending.length} left` : "All done"}</span>}
            </div>
            <div className="group">
                {tasks.length === 0 ? (
                    <div className="task-empty">
                        <p>Nothing on your plate yet.</p>
                        <small>Add the small things here. Your paths already hold the big ones.</small>
                    </div>
                ) : pending.length > 0 ? (
                    <ul className="rhythm-list">{pending.map((task) => row(task))}</ul>
                ) : (
                    <p className="task-empty task-all-done"><Icon name="check" size={16} />Everything for today is done.</p>
                )}
                <form onSubmit={submitAdd} className="task-add">
                    <span className="task-add-icon" aria-hidden="true"><Icon name="plus" size={18} /></span>
                    <input value={text} onChange={(input) => setText(input.target.value)} placeholder="Add a task, like “gym 6pm”" maxLength={140} aria-label="Add something" enterKeyHint="done" />
                    {parsed && parsed.tokens.length > 0 && <span className="task-add-parsed">{parsed.date && parsed.date !== today ? formatDate(parsed.date, { weekday: "short", day: "numeric", month: "short", year: undefined }) : "Today"}{parsed.time ? `, ${parsed.time}` : ""}</span>}
                    <button type="submit" className="btn btn-sm btn-primary" disabled={!text.trim()}>Add</button>
                </form>
            </div>

            {done.length > 0 && (
                <details className="fold">
                    <summary><Icon name="chevron-right" size={16} />Done today ({done.length})</summary>
                    <ul className="rhythm-list group">{done.map((task) => row(task))}</ul>
                </details>
            )}
            {later.length > 0 && (
                <details className="fold">
                    <summary><Icon name="chevron-right" size={16} />Later ({later.length})</summary>
                    <ul className="rhythm-list group">{later.map((task) => row(task, true))}</ul>
                </details>
            )}
        </section>
    );
}
