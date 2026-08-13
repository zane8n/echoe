"use client";

import Link from "next/link";
import { useState } from "react";
import { COLOR_MAP } from "@/lib/constants";
import { checkInSharedPath } from "@/lib/social-client";
import type { MilestoneEvent, PersonalProfile, SharedPathSummary } from "@/lib/types";
import { daysUntil, formatOpenDuration, formatRemaining, habitInsight, habitStats, isCheckedInForPeriod, milestoneKind, periodProgress, projectProgress, timeSpent } from "@/lib/utils";
import { CoProgress } from "./co-progress";
import { Icon } from "./icon";
import { ProgressRing } from "./progress-ring";
import { QuickStart } from "./quick-start";

interface Props {
    events: MilestoneEvent[];
    profile: PersonalProfile;
    sharedByMe: SharedPathSummary[];
    sharedWithMe: SharedPathSummary[];
    onHabitCheckIn: (id: string) => void;
    onProjectCheckIn: (id: string) => void;
    onOpenHistory: (id: string) => void;
    onProgress: (id: string) => void;
    onCheer: (shareId: string) => void;
}

export function pathStatus(event: MilestoneEvent | undefined, profile: PersonalProfile): string {
    if (!event) return profile.intention || "Make room for one path that matters.";
    if (event.habit) return habitInsight(event, profile.supportStyle);
    if (event.project) {
        const progress = projectProgress(event);
        if (progress.risk === "at-risk") return "The plan needs attention, not judgement. Choose the next useful commitment.";
        if (progress.risk === "watch") return "A small adjustment now will protect the path ahead.";
        return "Your pace is holding. Keep the next action clear and honest.";
    }
    if (milestoneKind(event) === "countdown" || event.isCountdown) {
        const remaining = daysUntil(event.target);
        if (remaining > 0) return `${remaining} day${remaining === 1 ? "" : "s"} until ${event.name}.`;
        if (remaining === 0) return `${event.name} is today.`;
        return `${event.name} has passed.`;
    }
    return `${formatOpenDuration(event.start)} of continuity is already part of your story.`;
}

export function PathCarousel({ events, profile, sharedByMe, sharedWithMe, onHabitCheckIn, onProjectCheckIn, onOpenHistory, onProgress, onCheer }: Props) {
    const [cheeredIds, setCheeredIds] = useState<Set<string>>(new Set());
    const [checkedShareIds, setCheckedShareIds] = useState<Set<string>>(new Set());
    const ordered = [...events].sort((a, b) => Number(b.pinned) - Number(a.pinned));
    const friendShares = sharedWithMe.filter((item) => item.mode === "participant");
    if (!ordered.length && !friendShares.length) return <section className="home-empty"><span className="echo-orb" aria-hidden="true" /><h1>{profile.displayName ? `${profile.displayName.split(/\s+/)[0]}, what deserves your attention?` : "What deserves your attention?"}</h1><p>A clear beginning is enough.</p><QuickStart /></section>;

    return <div className="path-carousel" aria-label="Your paths">
        {ordered.map((event, index) => {
            const kind = milestoneKind(event);
            const palette = COLOR_MAP[event.color];
            const remaining = kind === "ongoing" ? null : formatRemaining(daysUntil(event.target));
            const project = event.project ? projectProgress(event) : null;
            const habit = event.habit ? habitStats(event) : null;
            const habitProgress = event.habit ? periodProgress(event.habit) : null;
            const isCountdownLike = kind === "countdown" || event.isCountdown;
            const ringPercent = isCountdownLike ? timeSpent(event.start, event.target).percent : project ? project.overallPercent : habit ? habit.rate : 0;
            const checkedForPeriod = event.habit
                ? habitProgress?.satisfied ?? false
                : isCheckedInForPeriod(event.project?.checkInFrequency ?? "daily", event.project?.checkIns ?? []);
            const progress = project?.overallPercent ?? habit?.rate ?? 0;
            const share = sharedByMe.find((item) => item.eventId === event.id && item.mode === "participant");
            return <article key={event.id} className="focus-path animate-soft-enter" style={{ "--path-color": palette.color, "--path-glow": palette.glow, animationDelay: `${Math.min(index, 4) * 50}ms` } as React.CSSProperties}>
                <Link href={`/paths/${event.id}`} className="contents no-underline text-inherit">
                    <div className="focus-path-top"><span>{event.pinned ? "In focus" : kind}</span>{project && <span className={`risk-label risk-${project.risk}`}>{project.risk.replace("-", " ")}</span>}</div>
                    <div className="focus-path-body">
                        <h1>{event.name}</h1>
                        <div className="focus-metric">
                            {kind === "ongoing" ? <><strong>{event.habit ? habit?.streak ?? 0 : formatOpenDuration(event.start)}</strong><span>{event.habit ? `${event.habit.frequency} rhythm` : "in motion"}</span></> : (
                                <>
                                    <ProgressRing percent={ringPercent} size={84} strokeWidth={6} color={palette.color}>
                                        <span className="text-[clamp(22px,5vw,28px)]" style={{ color: palette.color }}>{remaining?.value}</span>
                                    </ProgressRing>
                                    <span>{remaining?.unit}{remaining?.unit ? " remaining" : ""}</span>
                                </>
                            )}
                        </div>
                    </div>
                </Link>
                {(project || habit) && <div className="focus-progress"><div className="focus-progress-copy"><span>{project ? `${project.investedHours}h invested` : habitProgress && habitProgress.target > 1 ? `${habitProgress.done} of ${habitProgress.target} this week` : `${habit?.done ?? 0} check-ins`}</span><strong>{project ? `${project.readiness}% ready` : `${habit?.rate ?? 0}% consistent`}</strong></div><div role="progressbar" aria-label={`${event.name} progress`} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div>{project && <span className="focus-progress-hours">{project.requiredHoursPerWeek}h/week needed</span>}</div>}
                {share && (
                    <CoProgress
                        compact
                        partnerName={share.person.displayName}
                        youDoneToday={share.ownerToday > 0}
                        partnerDoneToday={share.guestToday > 0}
                        cheerSent={cheeredIds.has(share.id)}
                        onCheer={() => { setCheeredIds((current) => new Set(current).add(share.id)); onCheer(share.id); }}
                    />
                )}
                {(event.project || event.habit) && (
                    <div className="focus-actions">
                        {event.project && <><button type="button" className="primary-button" onClick={() => onProjectCheckIn(event.id)} aria-pressed={checkedForPeriod}><Icon name="check" size={16} />{checkedForPeriod ? "Checked in" : "Check in"}</button><button type="button" className="secondary-button" onClick={() => onProgress(event.id)}>Update</button></>}
                        {event.habit && <><button type="button" className="primary-button" onClick={() => onHabitCheckIn(event.id)} aria-pressed={checkedForPeriod}><Icon name="check" size={16} />{habitProgress && habitProgress.target > 1 ? `${habitProgress.done} of ${habitProgress.target} this week` : checkedForPeriod ? (event.habit.frequency === "weekly" ? "Done this week" : "Done today") : "Check in"}</button><button type="button" className="icon-button" onClick={() => onOpenHistory(event.id)} aria-label={`Open ${event.name} history`}><Icon name="history" size={17} /></button></>}
                    </div>
                )}
            </article>;
        })}
        {friendShares.map((share, index) => {
            const palette = COLOR_MAP[share.color] ?? COLOR_MAP.teal;
            const remaining = formatRemaining(daysUntil(share.target));
            const checked = checkedShareIds.has(share.id);
            const canCheckAgain = share.allowExtraCheckIns || share.guestToday === 0;
            return <article key={share.id} className="focus-path animate-soft-enter" style={{ "--path-color": palette.color, "--path-glow": palette.glow, animationDelay: `${Math.min(ordered.length + index, 4) * 50}ms` } as React.CSSProperties}>
                <div className="focus-path-top"><span className="status-pill bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]"><Icon name="users" size={11} />Shared by {share.person.displayName}</span></div>
                <div className="focus-path-body">
                    <h1>{share.eventName}</h1>
                    <div className="focus-metric">
                        {share.overallPercent !== undefined ? (
                            <ProgressRing percent={share.overallPercent} size={84} strokeWidth={6} color={palette.color}>
                                <span className="text-[clamp(22px,5vw,28px)]" style={{ color: palette.color }}>{remaining.value}</span>
                            </ProgressRing>
                        ) : <strong>{remaining.value}</strong>}
                        <span>{remaining.unit}{remaining.unit ? " remaining" : ""}</span>
                    </div>
                </div>
                <CoProgress
                    compact
                    partnerName={share.person.displayName}
                    youDoneToday={share.guestToday > 0}
                    partnerDoneToday={share.ownerToday > 0}
                    cheerSent={cheeredIds.has(share.id)}
                    onCheer={() => { setCheeredIds((current) => new Set(current).add(share.id)); onCheer(share.id); }}
                />
                <div className="focus-actions">
                    <button
                        type="button"
                        className="primary-button"
                        aria-pressed={checked || share.guestToday > 0}
                        disabled={!canCheckAgain && share.guestToday > 0}
                        onClick={() => { setCheckedShareIds((current) => new Set(current).add(share.id)); void checkInSharedPath(share.id); }}
                    >
                        <Icon name="check" size={16} />{share.guestToday > 0 ? (share.allowExtraCheckIns ? "Check in again" : "Checked in") : "Check in"}
                    </button>
                </div>
            </article>;
        })}
    </div>;
}
