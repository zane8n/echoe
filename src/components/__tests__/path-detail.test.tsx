import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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

    describe("countdowns", () => {
        const trip: MilestoneEvent = { id: "trip", name: "Lisbon trip", start: "2026-10-20", target: "2026-11-15", color: "coral", pinned: false, kind: "countdown" };

        beforeEach(() => {
            vi.useFakeTimers({ toFake: ["Date"] });
            vi.setSystemTime(new Date(2026, 10, 3, 12)); // Tuesday 3 November 2026
        });
        afterEach(() => vi.useRealTimers());

        it("leads with tomorrow, and only counts sleeps when asked", async () => {
            const user = userEvent.setup();
            render(<PathDetail event={trip} tick={1} onOpenDoor={vi.fn()} />);
            expect(screen.getByText("Next week")).toBeInTheDocument();
            expect(screen.getByText(/^Tomorrow/)).toBeInTheDocument();
            expect(screen.queryByText(/days? (until|left|to go)/i)).not.toBeInTheDocument();
            await user.click(screen.getByRole("button", { name: /Next week/ }));
            expect(screen.getByText("12 sleeps")).toBeInTheDocument();
        });

        it("opens today's door, then keeps a line behind it", async () => {
            const user = userEvent.setup();
            const onOpenDoor = vi.fn();
            const { rerender } = render(<PathDetail event={trip} tick={1} onOpenDoor={onOpenDoor} />);
            expect(screen.getByText(/Opens Wednesday/)).toBeInTheDocument();
            await user.click(screen.getByRole("button", { name: "Open today's door" }));
            expect(onOpenDoor).toHaveBeenCalledWith("trip", "2026-11-03", expect.any(String), undefined, expect.any(Object));

            const prompt = onOpenDoor.mock.calls[0][2] as string;
            rerender(<PathDetail event={{ ...trip, countdown: { doors: [{ date: "2026-11-03", prompt, openedAt: "2026-11-03T09:00:00.000Z" }] } }} tick={1} onOpenDoor={onOpenDoor} />);
            expect(screen.queryByRole("button", { name: "Open today's door" })).not.toBeInTheDocument();
            await user.type(screen.getByRole("textbox", { name: prompt }), "Custard tarts by the river");
            await user.click(screen.getByRole("button", { name: "Keep it" }));
            expect(onOpenDoor).toHaveBeenLastCalledWith("trip", "2026-11-03", prompt, "Custard tarts by the river", undefined);
        });

        it("shows a friend the doors without letting them open one", () => {
            render(<PathDetail event={{ ...trip, countdown: { doors: [{ date: "2026-11-01", prompt: "What song fits the mood?", note: "Fado, obviously", openedAt: "2026-11-01T09:00:00.000Z" }] } }} tick={1} readOnly hue="shared" />);
            expect(screen.getByText("Not opened yet")).toBeInTheDocument();
            expect(screen.getByText("Fado, obviously")).toBeInTheDocument();
            expect(screen.queryByRole("button", { name: "Open today's door" })).not.toBeInTheDocument();
            expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
        });
    });
});
