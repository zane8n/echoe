"use client";

import { useState } from "react";
import { useDashboard } from "@/app/providers/dashboard-provider";
import { useRowGestures } from "@/hooks/use-row-gestures";
import { riskLabel, summarizePath, type PathSummary } from "@/lib/path-view";
import type { MilestoneEvent } from "@/lib/types";
import { milestoneKind, parseDate } from "@/lib/utils";
import { ActionMenu, type MenuAction } from "./action-menu";
import { BeatStrip } from "./beat-strip";
import { Icon } from "./icon";
import { TransitionLink } from "./transition-link";

const GROUPS: Array<{ kind: ReturnType<typeof milestoneKind>; title: string }> = [
    { kind: "habit", title: "Habits" },
    { kind: "project", title: "Projects" },
    { kind: "countdown", title: "Countdowns" },
    { kind: "ongoing", title: "Ongoing" },
];

function PathRow({ event, summary, menu, shared }: { event: MilestoneEvent; summary: PathSummary; menu: MenuAction[]; shared?: boolean }) {
    const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
    const { rowRef, handlers } = useRowGestures({ onMenu: setMenuAt });
    const metric = summary.kind === "project" && event.isCountdown && summary.daysLeft !== undefined
        ? { value: String(Math.max(0, summary.daysLeft)), label: "days left" }
        : { value: summary.metric, label: summary.metricLabel };

    return (
        <li ref={rowRef as React.RefObject<HTMLLIElement>} className="path-row" data-hue={event.color} {...handlers}>
            <TransitionLink href={`/paths/${event.id}`} className="path-row-link" draggable={false}>
                <span className="path-row-main">
                    <span className="path-row-title">
                        <strong style={{ viewTransitionName: `path-${event.id}` }}>{event.name}</strong>
                        {event.pinned && <span className="path-row-pin"><Icon name="pin" size={13} /><span className="sr-only">In focus</span></span>}
                    </span>
                    <span className="path-row-meta">
                        {summary.kind === "project" && summary.risk && summary.risk !== "on-track"
                            ? <span className={`pill ${summary.risk === "at-risk" ? "pill-danger" : summary.risk === "watch" ? "pill-warn" : "pill-accent"}`}>{riskLabel[summary.risk]}</span>
                            : null}
                        {shared && <span className="pill pill-hue" data-hue="shared"><Icon name="users" size={12} />Shared</span>}
                        <span>{summary.meta}</span>
                    </span>
                    {event.habit
                        ? <BeatStrip entries={summary.entries} days={14} />
                        : summary.progressPercent !== undefined && <span className="path-row-bar" aria-hidden="true"><span style={{ width: `${summary.progressPercent}%` }} /></span>}
                </span>
                <span className="path-row-metric">
                    <strong className="num">{metric.value}</strong>
                    <small>{metric.label}</small>
                </span>
            </TransitionLink>
            <button type="button" className="icon-btn icon-btn-sm rhythm-more" aria-label={`More for ${event.name}`} onClick={(click) => { const rect = click.currentTarget.getBoundingClientRect(); setMenuAt({ x: rect.right, y: rect.bottom + 4 }); }}>
                <Icon name="more-horiz" size={18} />
            </button>
            {menuAt && <ActionMenu x={menuAt.x} y={menuAt.y} title={event.name} actions={menu} onClose={() => setMenuAt(null)} />}
        </li>
    );
}

export function PathsView() {
    const { state, social, openComposer, openEventEditor, togglePin, handleDelete, toggleToday, setCheckInEventId, setProgressEventId, navigateTo } = useDashboard();
    const events = [...state.events].sort((a, b) => Number(b.pinned) - Number(a.pinned) || ((parseDate(a.target)?.getTime() ?? Number.MAX_SAFE_INTEGER) - (parseDate(b.target)?.getTime() ?? Number.MAX_SAFE_INTEGER)));
    const sharedEventIds = new Set(social.sharedByMe.map((share) => share.eventId));
    const counts = GROUPS.map((group) => ({ ...group, events: events.filter((event) => milestoneKind(event) === group.kind) })).filter((group) => group.events.length);

    const menuFor = (event: MilestoneEvent, summary: PathSummary): MenuAction[] => {
        const actions: MenuAction[] = [];
        if (summary.checkable) actions.push({ label: summary.doneToday ? "Undo today's check-in" : "Check in for today", icon: summary.doneToday ? "undo" : "check", onSelect: () => toggleToday(event.id) });
        if (event.habit) actions.push({ label: "History and notes", icon: "calendar", onSelect: () => setCheckInEventId(event.id) });
        if (event.project) actions.push({ label: "Log effort or readiness", icon: "timer", onSelect: () => setProgressEventId(event.id) });
        actions.push({ label: "Share with a friend", icon: "share", onSelect: () => navigateTo(`/friends?share=${event.id}`) });
        if (!event.pinned) actions.push({ label: "Keep in focus", icon: "pin", onSelect: () => togglePin(event.id) });
        actions.push({ label: "Edit", icon: "pencil", onSelect: () => openEventEditor(event.id) });
        actions.push({ label: "Delete", icon: "trash", tone: "danger", separatorBefore: true, onSelect: () => handleDelete(event.id) });
        return actions;
    };

    return (
        <main className="page paths">
            <header className="page-head">
                <div>
                    <h1>Paths</h1>
                    <p>{events.length ? `${events.length} ${events.length === 1 ? "path" : "paths"} you're building. Press and hold one for shortcuts.` : "Habits, projects, and dates worth counting."}</p>
                </div>
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => openComposer()}><Icon name="plus" size={16} />New</button>
            </header>

            {events.length === 0 ? (
                <div className="group empty-state">
                    <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
                    <h2>Nothing here yet</h2>
                    <p>A path is anything you want to keep showing up for: a habit, a project with a deadline, or a date you&apos;re counting toward.</p>
                    <button type="button" className="btn btn-primary mt-3" onClick={() => openComposer()}><Icon name="plus" size={17} />Add your first path</button>
                </div>
            ) : counts.map((group) => (
                <section key={group.kind} className="section" aria-labelledby={`group-${group.kind}`}>
                    <div className="section-head">
                        <h2 id={`group-${group.kind}`}>{group.title}</h2>
                        <span className="section-meta">{group.events.length}</span>
                    </div>
                    <ul className="rhythm-list group">
                        {group.events.map((event) => {
                            const summary = summarizePath(event);
                            return <PathRow key={event.id} event={event} summary={summary} menu={menuFor(event, summary)} shared={sharedEventIds.has(event.id)} />;
                        })}
                    </ul>
                </section>
            ))}
        </main>
    );
}
