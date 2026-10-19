import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PathDetail } from "@/components/path-detail";
import { SHARED_PALETTE } from "@/lib/constants";
import { habitMilestone } from "@/test/fixtures";

describe("Path detail", () => {
    it("shows a friend's full path without any controls that would change it", () => {
        render(<PathDetail event={habitMilestone} tick={0} readOnly palette={SHARED_PALETTE} sharedLabel="Shared by Amina" />);
        expect(screen.getByRole("heading", { name: "Practice deliberately" })).toBeInTheDocument();
        expect(screen.getByText("Shared by Amina")).toBeInTheDocument();
        expect(screen.getByText("View only")).toBeInTheDocument();
        expect(screen.queryByRole("button")).not.toBeInTheDocument();
        const activity = screen.getByRole("region", { name: "Activity" });
        expect(activity).toHaveTextContent("Checked in");
        expect(activity).toHaveTextContent("Missed");
        expect(activity).toHaveTextContent("Low energy");
    });

    it("keeps the owner's controls when not read-only", () => {
        render(<PathDetail event={habitMilestone} tick={0} onEdit={vi.fn()} onCheckIn={vi.fn()} onMiss={vi.fn()} onOpenHistory={vi.fn()} />);
        expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /done/i })).toBeInTheDocument();
        expect(screen.queryByRole("region", { name: "Activity" })).not.toBeInTheDocument();
    });
});
