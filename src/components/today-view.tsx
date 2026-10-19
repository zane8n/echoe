"use client";

import { useMemo, useState } from "react";
import { useDashboard } from "@/app/providers/dashboard-provider";
import { greeting, summarizePath } from "@/lib/path-view";
import type { MilestoneEvent, SharedPathSummary } from "@/lib/types";
import { habitInsight, localDate, milestoneKind } from "@/lib/utils";
import type { MenuAction } from "./action-menu";
import { CoProgress } from "./co-progress";
import { Icon } from "./icon";
import { MyDayView } from "./my-day-view";
import { RhythmRow } from "./rhythm-row";
import { TransitionLink } from "./transition-link";

const STARTERS = ["Read 20 pages daily", "Run 3x a week", "Lisbon trip Nov 8", "Thesis 40h by Dec 1"];

function DayMeter({ done, total, now }: { done: number; total: number; now: Date }) {
    const end = new Date(now);
    end.setHours(24, 0, 0, 0);
    const minutesLeft = Math.max(0, Math.round((end.getTime() - now.getTime()) / 60_000));
    const left = minutesLeft >= 60 ? `${Math.floor(minutesLeft / 60)}h ${minutesLeft % 60}m left today` : `${minutesLeft}m left today`;
    if (!total) return <p className="day-meter-copy">{left}</p>;
    return (
        <div className="day-meter" role="img" aria-label={`${done} of ${total} done today, ${left}`}>
            <div className="day-meter-beats" aria-hidden="true">
                {Array.from({ length: total }, (_, index) => <span key={index} data-done={index < done} style={{ "--i": index } as React.CSSProperties} />)}
            </div>
            <p className="day-meter-copy"><strong className="num">{done}</strong> of {total} done<span aria-hidden="true">, </span>{left}</p>
        </div>
    );
}

export function TodayView() {
    const {
        state, tick, social, todaysTasks, laterTasks,
        toggleToday, handleHabitCheckIn, checkInShare, cheerShare, togglePin, handleDelete,
        openEventEditor, openComposer, setCheckInEventId, setProgressEventId,
        handleAddDailyTask, toggleDailyTask, updateDailyTask, handleDeleteDailyTask,
    } = useDashboard();
    const [cheered, setCheered] = useState<Set<string>>(new Set());
    const now = useMemo(() => tick ? new Date(tick) : new Date(), [tick]);
    const today = localDate(now);
    const profile = state.settings.profile;
    const firstName = profile.displayName.trim().split(/\s+/)[0];

    const ordered = useMemo(() => [...state.events].sort((a, b) => Number(b.pinned) - Number(a.pinned)), [state.events]);
    const rhythm = ordered.map((event) => ({ event, summary: summarizePath(event, today) })).filter(({ summary }) => summary.checkable);
    const milestones = ordered
        .map((event) => ({ event, summary: summarizePath(event, today) }))
        .filter(({ event, summary }) => !summary.checkable || milestoneKind(event) === "project")
        .filter(({ summary }) => summary.daysLeft === undefined || summary.daysLeft >= 0)
        .sort((a, b) => (a.summary.daysLeft ?? Number.MAX_SAFE_INTEGER) - (b.summary.daysLeft ?? Number.MAX_SAFE_INTEGER));
    const shares = social.sharedWithMe.filter((share) => share.mode === "participant");
    const ownedShares = new Map(social.sharedByMe.filter((share) => share.mode === "participant").map((share) => [share.eventId, share]));

    const doneCount = rhythm.filter(({ summary }) => summary.doneForPeriod).length + shares.filter((share) => share.guestToday > 0).length + todaysTasks.filter((task) => task.done).length;
    const totalCount = rhythm.length + shares.length + todaysTasks.length;
    const remaining = rhythm.filter(({ summary }) => !summary.doneForPeriod).length + shares.filter((share) => share.guestToday === 0).length;

    const cheer = (share: SharedPathSummary) => { setCheered((current) => new Set(current).add(share.id)); void cheerShare(share.id); };

    const menuFor = (event: MilestoneEvent, done: boolean): MenuAction[] => {
        const actions: MenuAction[] = [{ label: done ? "Undo today's check-in" : "Check in for today", icon: done ? "undo" : "check", onSelect: () => toggleToday(event.id) }];
        if (event.habit) {
            actions.push({ label: "Mark today as missed", icon: "minus", onSelect: () => handleHabitCheckIn(event.id, "missed") });
            actions.push({ label: "History and notes", icon: "calendar", onSelect: () => setCheckInEventId(event.id) });
        }
        if (event.project) actions.push({ label: "Log effort or readiness", icon: "timer", onSelect: () => setProgressEventId(event.id) });
        if (!event.pinned) actions.push({ label: "Keep in focus", icon: "pin", onSelect: () => togglePin(event.id) });
        actions.push({ label: "Edit", icon: "pencil", onSelect: () => openEventEditor(event.id) });
        actions.push({ label: "Delete", icon: "trash", tone: "danger", separatorBefore: true, onSelect: () => handleDelete(event.id) });
        return actions;
    };

    const isEmpty = state.events.length === 0 && shares.length === 0;

    return (
        <main className="page today">
            <header className="today-head">
                <p className="today-date">{now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</p>
                <h1>{greeting(now)}{firstName ? `, ${firstName}` : ""}</h1>
                <DayMeter done={doneCount} total={totalCount} now={now} />
            </header>

            {isEmpty ? (
                <section className="today-start" aria-labelledby="startHeading">
                    <h2 id="startHeading">{profile.intention ? profile.intention : "Start with one thing that matters"}</h2>
                    <p>Write it the way you&apos;d say it. Echoe works out whether it&apos;s a habit, a project, or a date to count down to.</p>
                    <button type="button" className="today-start-input" onClick={() => openComposer()}>
                        <Icon name="plus" size={20} />Add a task, habit, or date…
                    </button>
                    <div className="today-start-examples">
                        {STARTERS.map((example) => <button key={example} type="button" className="chip" onClick={() => openComposer(example)}>{example}</button>)}
                    </div>
                </section>
            ) : (rhythm.length > 0 || shares.length > 0) && (
                <section className="section" aria-labelledby="rhythmHeading">
                    <div className="section-head">
                        <h2 id="rhythmHeading">Rhythm</h2>
                        <span className="section-meta">{remaining ? `${remaining} to go` : "All checked in"}</span>
                    </div>
                    <ul className="rhythm-list group">
                        {rhythm.map(({ event, summary }) => {
                            const done = summary.period && summary.period.target > 1 ? summary.doneToday : summary.doneForPeriod;
                            const featured = event.pinned && rhythm.length > 1;
                            const owned = ownedShares.get(event.id);
                            return (
                                <RhythmRow
                                    key={event.id}
                                    hue={event.color}
                                    title={event.name}
                                    meta={summary.meta}
                                    href={`/paths/${event.id}`}
                                    entries={summary.entries}
                                    done={done}
                                    progress={summary.period && summary.period.target > 1 ? { done: summary.period.done, target: summary.period.target } : undefined}
                                    checkLabel={done ? `Undo today's check-in for ${event.name}` : `Check in to ${event.name}`}
                                    onToggle={(origin) => toggleToday(event.id, origin)}
                                    onSwipeLeft={event.habit ? () => handleHabitCheckIn(event.id, "missed") : undefined}
                                    menu={menuFor(event, summary.doneToday)}
                                    featured={featured}
                                    insight={featured && event.habit ? habitInsight(event, profile.supportStyle) : undefined}
                                    transitionName={`path-${event.id}`}
                                    footer={owned ? <CoProgress compact partnerName={owned.person.displayName} youDoneToday={owned.ownerToday > 0 || summary.doneToday} partnerDoneToday={owned.guestToday > 0} cheerSent={cheered.has(owned.id)} onCheer={() => cheer(owned)} /> : undefined}
                                />
                            );
                        })}
                        {shares.map((share) => {
                            const done = share.guestToday > 0;
                            const canCheckAgain = share.allowExtraCheckIns || !done;
                            return (
                                <RhythmRow
                                    key={share.id}
                                    hue="shared"
                                    title={share.eventName}
                                    meta={<><Icon name="users" size={13} className="inline -mt-0.5 mr-1" />With {share.person.displayName}</>}
                                    href={`/friends/shared/${share.id}`}
                                    done={done}
                                    checkLabel={done ? (share.allowExtraCheckIns ? `Check in again to ${share.eventName}` : `Checked in to ${share.eventName}`) : `Check in to ${share.eventName}`}
                                    onToggle={(origin) => { if (canCheckAgain) void checkInShare(share.id, origin); }}
                                    footer={<CoProgress compact partnerName={share.person.displayName} youDoneToday={done} partnerDoneToday={share.ownerToday > 0} cheerSent={cheered.has(share.id)} onCheer={() => cheer(share)} />}
                                />
                            );
                        })}
                    </ul>
                </section>
            )}

            <MyDayView tasks={todaysTasks} later={laterTasks} onAdd={handleAddDailyTask} onToggle={toggleDailyTask} onUpdate={updateDailyTask} onDelete={handleDeleteDailyTask} />

            {milestones.length > 0 && (
                <section className="section" aria-labelledby="milestonesHeading">
                    <div className="section-head">
                        <h2 id="milestonesHeading">Milestones</h2>
                        <TransitionLink href="/paths" className="section-meta section-link">All paths</TransitionLink>
                    </div>
                    <ul className="milestone-strip">
                        {milestones.map(({ event, summary }) => (
                            <li key={event.id} data-hue={event.color}>
                                <TransitionLink href={`/paths/${event.id}`} className="milestone-tile">
                                    <span className="milestone-kind">{summary.kindLabel}</span>
                                    <span className="milestone-metric">
                                        <strong className="num">{summary.kind === "project" ? summary.daysLeft : summary.metric}</strong>
                                        <small>{summary.kind === "project" ? (summary.daysLeft === 1 ? "day left" : "days left") : summary.metricLabel}</small>
                                    </span>
                                    <span className="milestone-name">{event.name}</span>
                                    {summary.progressPercent !== undefined && summary.kind !== "ongoing" && (
                                        <span className="milestone-bar" aria-hidden="true"><span style={{ width: `${summary.progressPercent}%` }} /></span>
                                    )}
                                </TransitionLink>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {!isEmpty && profile.intention && <p className="today-intention"><Icon name="sparkle" size={15} />{profile.intention}</p>}
        </main>
    );
}
