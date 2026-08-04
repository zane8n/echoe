import { describe, expect, it } from "vitest";
import { buildNotifications } from "@/lib/notifications";
import type { MilestoneEvent, PersonalProfile } from "@/lib/types";

const profile: PersonalProfile = { displayName: "Kikandi", intention: "Move with purpose.", supportStyle: "gentle" };
const project: MilestoneEvent = {
    id: "project-1", name: "CCNP Core", kind: "project", start: "2026-01-01", target: "2026-12-01", color: "sky", pinned: true,
    project: { plannedHours: 100, readiness: 10, entries: [], checkInFrequency: "daily", checkIns: [] },
};

describe("Echoe notifications", () => {
    it("makes badge-worthy notifications correspond to visible actions", () => {
        const notifications = buildNotifications([project], profile, "2026-11-01");
        expect(notifications.filter((item) => item.actionable).map((item) => item.id)).toEqual(expect.arrayContaining(["due:project-1:2026-11-01", "risk:project-1:2026-11-01"]));
        expect(notifications.find((item) => item.kind === "encouragement")?.actionable).toBe(false);
    });

    it("replaces a due reminder with a non-badged completion echo after check-in", () => {
        const checked = { ...project, project: { ...project.project!, checkIns: [{ date: "2026-11-01", status: "done" as const }] } };
        const notifications = buildNotifications([checked], profile, "2026-11-01");
        expect(notifications.some((item) => item.id.startsWith("due:"))).toBe(false);
        expect(notifications.find((item) => item.id.startsWith("done:"))).toMatchObject({ actionable: false });
    });

    it("does not ask for action on a completed path", () => {
        const completed = { ...project, achievedAt: "2026-10-31" };
        const notifications = buildNotifications([completed], profile, "2026-11-01");
        expect(notifications.some((item) => item.actionable)).toBe(false);
    });
});
