import type { EchoeNotification, MilestoneEvent, PersonalProfile } from "./types";
import { habitInsight, isCheckedInForPeriod, isSatisfied, localDate, milestoneKind, projectProgress } from "./utils";

export function buildNotifications(events: MilestoneEvent[], profile: PersonalProfile, today = localDate()): EchoeNotification[] {
    const notifications: EchoeNotification[] = [];
    for (const event of events) {
        const kind = milestoneKind(event);
        const habitEntries = event.habit?.entries ?? [];
        const projectEntries = event.project?.checkIns ?? [];
        const projectFrequency = event.project?.checkInFrequency ?? "daily";
        const entries = kind === "project" ? projectEntries : habitEntries;
        const dueThisPeriod = kind === "project"
            ? !isCheckedInForPeriod(projectFrequency, projectEntries, today)
            : event.habit ? !isSatisfied(event.habit, today) : false;
        const checkedInToday = entries.some((entry) => entry.date === today && entry.status === "done");

        if (!event.achievedAt && (event.habit || event.project) && dueThisPeriod) {
            notifications.push({ id: `due:${event.id}:${today}`, kind: "check-in", title: `${event.name} is ready`, body: "A simple check-in is enough for today.", createdAt: today, actionable: true, eventId: event.id });
        } else if (checkedInToday) {
            notifications.push({ id: `done:${event.id}:${today}`, kind: "progress", title: `You showed up for ${event.name}`, body: "That check-in is part of the pattern now.", createdAt: today, actionable: false, eventId: event.id });
        }

        if (!event.achievedAt && event.project && projectProgress(event).risk === "at-risk") {
            notifications.push({ id: `risk:${event.id}:${today}`, kind: "risk", title: `${event.name} needs a decision`, body: "Review the remaining pace when you have a clear minute.", createdAt: today, actionable: true, eventId: event.id });
        }
    }

    const focused = events.find((event) => event.pinned) ?? events[0];
    const body = focused?.habit
        ? habitInsight(focused, profile.supportStyle)
        : profile.intention || "Choose one useful action and let the rest wait.";
    notifications.push({ id: `encouragement:${today}`, kind: "encouragement", title: profile.displayName ? `A note for ${profile.displayName.split(/\s+/)[0]}` : "A note for today", body, createdAt: today, actionable: false });
    return notifications;
}
