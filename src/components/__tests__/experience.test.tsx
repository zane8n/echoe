import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckInSheet } from "@/components/check-in-sheet";
import { EventSheet } from "@/components/event-sheet";
import { FocusSection } from "@/components/focus-section";
import { SettingsSheet } from "@/components/settings-sheet";
import { WeeksGrid } from "@/components/weeks-grid";
import { habitMilestone, storageSummary } from "@/test/fixtures";

describe("Echoe milestone experience", () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date(2026, 7, 3, 12));
    });
    afterEach(() => vi.useRealTimers());

    it("keeps empty-state language constructive and theme-colored", () => {
        render(<FocusSection events={[]} tick={1} onEdit={vi.fn()} onConfetti={vi.fn()} onCheckIn={vi.fn()} onMiss={vi.fn()} onOpenHistory={vi.fn()} />);
        expect(screen.getByRole("heading", { name: /start with one meaningful step/i })).toBeInTheDocument();
        expect(screen.getByText(/add your first milestone/i)).toHaveClass("text-[var(--color-muted)]");
        expect(screen.queryByText(/where you stand/i)).not.toBeInTheDocument();
    });

    it("renders countdown mode dynamically and exposes direct habit check-ins", async () => {
        const user = userEvent.setup();
        const onCheckIn = vi.fn();
        const onOpenHistory = vi.fn();
        render(<FocusSection events={[{ ...habitMilestone, isCountdown: true }]} tick={1} onEdit={vi.fn()} onConfetti={vi.fn()} onCheckIn={onCheckIn} onMiss={vi.fn()} onOpenHistory={onOpenHistory} />);

        expect(screen.getByText("8")).toBeInTheDocument();
        expect(screen.getByText(/days until/i)).toBeInTheDocument();
        expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "20");

        await user.click(screen.getByRole("button", { name: "Done" }));
        await user.click(screen.getByRole("button", { name: /open check-in history/i }));
        expect(onCheckIn).toHaveBeenCalledWith("habit-1");
        expect(onOpenHistory).toHaveBeenCalledWith("habit-1");
    });

    it("supports backdated missed days, notes, and clearing history", async () => {
        const user = userEvent.setup();
        const onCheckIn = vi.fn();
        const onClear = vi.fn();
        render(<CheckInSheet event={habitMilestone} onCheckIn={onCheckIn} onClear={onClear} onClose={vi.fn()} />);

        const dialog = screen.getByRole("dialog", { name: habitMilestone.name });
        expect(dialog).toHaveClass("acrylic-surface");
        await user.click(screen.getByRole("button", { name: /August 2, 2026: missed/i }));
        expect(screen.getByDisplayValue("Low energy")).toBeInTheDocument();
        await user.clear(screen.getByRole("textbox", { name: /a useful note/i }));
        await user.type(screen.getByRole("textbox", { name: /a useful note/i }), "Needed a lighter plan");
        await user.click(screen.getByRole("button", { name: "Missed" }));
        expect(onCheckIn).toHaveBeenCalledWith("habit-1", "missed", "2026-08-02", "Needed a lighter plan");
        await user.click(screen.getByRole("button", { name: "Clear" }));
        expect(onClear).toHaveBeenCalledWith("habit-1", "2026-08-02");
        expect(screen.getByText(/missed day is information/i)).toBeInTheDocument();
    });

    it("offers independent app themes, including teal and blue, in frosted settings", async () => {
        const user = userEvent.setup();
        const onPreviewTheme = vi.fn();
        render(
            <SettingsSheet
                settings={{ theme: "warm", showActivityHistogram: true }}
                storage={storageSummary}
                onSave={vi.fn()}
                onPreviewTheme={onPreviewTheme}
                onExport={vi.fn()}
                onImport={vi.fn()}
                onClearData={vi.fn().mockResolvedValue(undefined)}
                onClose={vi.fn()}
            />,
        );

        expect(screen.getByRole("dialog", { name: "Settings" })).toHaveClass("acrylic-surface");
        expect(document.querySelector(".acrylic-backdrop")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Quiet teal" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Clear blue" })).toBeInTheDocument();
        expect(screen.getByText(/ordered records live in IndexedDB/i)).toBeInTheDocument();
        expect(screen.getByText(/synced with Postgres/i)).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Quiet teal" }));
        expect(onPreviewTheme).toHaveBeenCalledWith("teal");
    });

    it("uses the same acrylic treatment for adding and editing milestones", () => {
        const { rerender } = render(<EventSheet eventId={null} events={[]} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);
        expect(screen.getByRole("dialog", { name: "Add milestone" })).toHaveClass("acrylic-surface");
        expect(document.querySelector(".acrylic-backdrop")).toBeInTheDocument();

        rerender(<EventSheet eventId="habit-1" events={[habitMilestone]} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);
        expect(screen.getByRole("dialog", { name: "Edit milestone" })).toHaveClass("acrylic-surface");
        expect(screen.getByText("Countdown mode")).toBeInTheDocument();
        expect(screen.getByText("Track as habit")).toBeInTheDocument();
    });

    it("clusters activity into twelve accessible two-week histogram bars", () => {
        render(<WeeksGrid events={[habitMilestone]} show tick={1} />);
        expect(screen.getByRole("img", { name: /last 24 weeks/i })).toBeInTheDocument();
        expect(screen.getByText(/twelve two-week clusters/i)).toBeInTheDocument();
        expect(screen.getAllByTitle(/activity points/i)).toHaveLength(12);
    });
});
