import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PathDetail } from "@/components/path-detail";
import type { MilestoneEvent } from "@/lib/types";
import { habitMilestone } from "@/test/fixtures";

const project: MilestoneEvent = {
    id: "project-1",
    name: "Thesis",
    start: "2026-08-01",
    target: "2027-01-01",
    color: "sky",
    pinned: false,
    kind: "project",
    project: { plannedHours: 40, readiness: 20, entries: [{ id: "effort-1", date: "2026-08-03", hours: 2, recordedAt: "2026-08-03T10:00:00.000Z" }] },
};

describe("Path detail", () => {
    it("shows a friend's whole path in the shared colour without anything that changes it", () => {
        render(<PathDetail event={habitMilestone} tick={0} readOnly hue="shared" sharedLabel="Shared by Amina" />);
        expect(screen.getByRole("heading", { name: "Practice deliberately" }).closest("article")).toHaveAttribute("data-hue", "shared");
        expect(screen.getByText("Shared by Amina")).toBeInTheDocument();
        expect(screen.getByText("View only")).toBeInTheDocument();
        expect(screen.getByText("Low energy")).toBeInTheDocument();
        for (const name of ["Edit Practice deliberately", "More actions", "Check in for today", "Done", "Missed", "Clear"]) {
            expect(screen.queryByRole("button", { name })).not.toBeInTheDocument();
        }
        expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("lists a shared project's effort for the friend", () => {
        render(<PathDetail event={project} tick={0} readOnly hue="shared" />);
        expect(screen.getByRole("heading", { name: "Effort log" })).toBeInTheDocument();
        expect(screen.getByText("+2h")).toBeInTheDocument();
    });

    it("keeps the owner's controls and path colour", () => {
        render(<PathDetail event={habitMilestone} tick={0} onEdit={vi.fn()} onCelebrate={vi.fn()} onToggleToday={vi.fn()} onEntry={vi.fn()} onClearEntry={vi.fn()} sharedLabel="Shared with Amina" />);
        expect(screen.getByRole("heading", { name: "Practice deliberately" }).closest("article")).toHaveAttribute("data-hue", "teal");
        expect(screen.getByRole("button", { name: "Edit Practice deliberately" })).toBeInTheDocument();
        expect(screen.getByText("Shared with Amina").closest(".pill")).toHaveAttribute("data-hue", "shared");
        expect(screen.queryByText("View only")).not.toBeInTheDocument();
    });
});
