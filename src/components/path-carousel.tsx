"use client";

import { COLOR_MAP } from "@/lib/constants";
import type { MilestoneEvent, PersonalProfile } from "@/lib/types";
import { daysUntil, formatOpenDuration, formatRemaining, habitInsight, habitStats, localDate, milestoneKind, projectProgress } from "@/lib/utils";
import { Icon } from "./icon";

interface Props {
    events: MilestoneEvent[];
    profile: PersonalProfile;
    onHabitCheckIn: (id: string) => void;
    onProjectCheckIn: (id: string) => void;
    onOpenHistory: (id: string) => void;
    onProgress: (id: string) => void;
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
    return `${formatOpenDuration(event.start)} of continuity is already part of your story.`;
}

export function PathCarousel({ events, profile, onHabitCheckIn, onProjectCheckIn, onOpenHistory, onProgress }: Props) {
    const ordered = [...events].sort((a, b) => Number(b.pinned) - Number(a.pinned));
    if (!ordered.length) return <section className="home-empty"><span className="echo-orb" aria-hidden="true" /><h1>{profile.displayName ? `${profile.displayName.split(/\s+/)[0]}, what deserves your attention?` : "What deserves your attention?"}</h1><p>A clear beginning is enough.</p></section>;

    return <div className="path-carousel" aria-label="Your paths">
        {ordered.map((event) => {
            const kind = milestoneKind(event);
            const palette = COLOR_MAP[event.color];
            const remaining = kind === "ongoing" ? null : formatRemaining(daysUntil(event.target));
            const project = event.project ? projectProgress(event) : null;
            const habit = event.habit ? habitStats(event) : null;
            const entries = event.project?.checkIns ?? event.habit?.entries ?? [];
            const checkedToday = entries.some((entry) => entry.date === localDate() && entry.status === "done");
            const progress = project?.overallPercent ?? habit?.rate ?? 0;
            return <article key={event.id} className="focus-path" style={{ "--path-color": palette.color, "--path-glow": palette.glow } as React.CSSProperties}>
                <div className="focus-path-top"><span>{event.pinned ? "In focus" : kind}</span>{project && <span className={`risk-label risk-${project.risk}`}>{project.risk.replace("-", " ")}</span>}</div>
                <div className="focus-path-body">
                    <h1>{event.name}</h1>
                    <div className="focus-metric">
                        {kind === "ongoing" ? <><strong>{event.habit ? habit?.streak ?? 0 : formatOpenDuration(event.start)}</strong><span>{event.habit ? `${event.habit.frequency} rhythm` : "in motion"}</span></> : <><strong>{remaining?.value}</strong><span>{remaining?.unit}{remaining?.unit ? " remaining" : ""}</span></>}
                    </div>
                </div>
                {(project || habit) && <div className="focus-progress"><div className="focus-progress-copy"><span>{project ? `${project.investedHours}h invested` : `${habit?.done ?? 0} check-ins`}</span><strong>{project ? `${project.readiness}% ready` : `${habit?.rate ?? 0}% consistent`}</strong></div><div role="progressbar" aria-label={`${event.name} progress`} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div></div>}
                <div className="focus-actions">
                    {event.project && <><button type="button" className="primary-button" onClick={() => onProjectCheckIn(event.id)} aria-pressed={checkedToday}><Icon name="check" size={16} />{checkedToday ? "Checked in" : "Check in"}</button><button type="button" className="secondary-button" onClick={() => onProgress(event.id)}>Readiness</button></>}
                    {event.habit && <><button type="button" className="primary-button" onClick={() => onHabitCheckIn(event.id)} aria-pressed={checkedToday}><Icon name="check" size={16} />{checkedToday ? "Done today" : "Check in"}</button><button type="button" className="icon-button" onClick={() => onOpenHistory(event.id)} aria-label={`Open ${event.name} history`}><Icon name="history" size={17} /></button></>}
                </div>
            </article>;
        })}
    </div>;
}
