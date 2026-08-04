import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CheckInSheet } from "@/components/check-in-sheet";
import { EventSheet } from "@/components/event-sheet";
import { FocusSection } from "@/components/focus-section";
import { ProgressSheet } from "@/components/progress-sheet";
import { PathCarousel } from "@/components/path-carousel";
import { SettingsSheet } from "@/components/settings-sheet";
import { WeeksGrid } from "@/components/weeks-grid";
import { habitMilestone, storageSummary } from "@/test/fixtures";

describe("Echoe milestone experience", () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(new Date(2026, 7, 3, 12));
    });
    afterEach(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

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
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ mode: "local", account: null }), { status: 503 })));
        const user = userEvent.setup();
        const onThemeChange = vi.fn();
        const onSave = vi.fn();
        render(
            <SettingsSheet
                settings={{ theme: "warm", showActivityHistogram: true, readNotificationIds: [], profile: { displayName: "", intention: "", supportStyle: "gentle" } }}
                storage={storageSummary}
                onSave={onSave}
                onThemeChange={onThemeChange}
                onSync={vi.fn()}
                onExport={vi.fn()}
                onImport={vi.fn()}
                onClearData={vi.fn().mockResolvedValue(undefined)}
                onAccountChange={vi.fn().mockResolvedValue(undefined)}
                onClose={vi.fn()}
            />,
        );

        expect(screen.getByRole("dialog", { name: "Settings" })).toHaveClass("acrylic-surface");
        expect(document.querySelector(".acrylic-backdrop")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Fresh teal" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Open blue" })).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Fresh teal" }));
        expect(onThemeChange).toHaveBeenCalledWith("teal");
        await user.click(screen.getByRole("button", { name: "Save changes" }));
        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ theme: "teal" }));
        await user.click(screen.getByRole("tab", { name: "Data" }));
        expect(screen.getByText(/every change is saved locally first/i)).toBeInTheDocument();
        expect(screen.getByText(/synced securely/i)).toBeInTheDocument();
    });

    it("saves a personal profile and preferred encouragement style", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ mode: "local", account: null }), { status: 503 })));
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(
            <SettingsSheet
                settings={{ theme: "blue", showActivityHistogram: true, readNotificationIds: [], profile: { displayName: "", intention: "", supportStyle: "gentle" } }}
                storage={storageSummary}
                onSave={onSave}
                onThemeChange={vi.fn()}
                onSync={vi.fn()}
                onExport={vi.fn()}
                onImport={vi.fn()}
                onClearData={vi.fn().mockResolvedValue(undefined)}
                onAccountChange={vi.fn().mockResolvedValue(undefined)}
                onClose={vi.fn()}
            />,
        );

        await user.click(screen.getByRole("tab", { name: "You" }));
        await user.type(screen.getByRole("textbox", { name: "Your name" }), "Kikandi");
        await user.type(screen.getByRole("textbox", { name: /what are you building toward/i }), "Move with purpose and patience.");
        await user.selectOptions(screen.getByRole("combobox", { name: /how Echoe should encourage you/i }), "reflective");
        await user.click(screen.getByRole("button", { name: "Save changes" }));

        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
            theme: "blue",
            profile: expect.objectContaining({ displayName: "Kikandi", intention: "Move with purpose and patience.", supportStyle: "reflective" }),
        }));
    });

    it("offers Google sign-in without exposing deployment configuration", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ mode: "cloud", account: null, googleAvailable: true }), { status: 200 })));
        const user = userEvent.setup();
        render(
            <SettingsSheet
                settings={{ theme: "warm", showActivityHistogram: true, readNotificationIds: [], profile: { displayName: "Kikandi", intention: "", supportStyle: "gentle" } }}
                storage={storageSummary}
                onSave={vi.fn()}
                onThemeChange={vi.fn()}
                onSync={vi.fn()}
                onExport={vi.fn()}
                onImport={vi.fn()}
                onClearData={vi.fn().mockResolvedValue(undefined)}
                onAccountChange={vi.fn().mockResolvedValue(undefined)}
                onClose={vi.fn()}
            />,
        );

        await user.click(screen.getByRole("tab", { name: "You" }));
        const googleLink = await screen.findByRole("link", { name: "Continue with Google" });
        expect(googleLink).toHaveAttribute("href", "/api/auth/google");
        expect(screen.queryByText(/DATABASE_URL|GOOGLE_CLIENT/i)).not.toBeInTheDocument();
    });

    it("selects and saves a milestone color with an explicit active state", async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(<EventSheet eventId={null} events={[]} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />);

        await user.type(screen.getByRole("textbox", { name: "Name" }), "Write the first chapter");
        await user.click(screen.getByRole("radio", { name: "Sky" }));
        await user.click(screen.getByRole("checkbox", { name: /allow extra check-ins/i }));
        expect(screen.getByRole("radio", { name: "Sky" })).toHaveAttribute("aria-checked", "true");
        await user.click(screen.getByRole("button", { name: "Save milestone" }));

        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ color: "sky", name: "Write the first chapter", kind: "project", allowExtraCheckIns: true, project: expect.objectContaining({ plannedHours: 40 }) }));
    });

    it("creates open-ended paths without a fake end date or ambiguous check-in count", async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(<EventSheet eventId={null} events={[]} onSave={onSave} onDelete={vi.fn()} onClose={vi.fn()} />);
        await user.type(screen.getByRole("textbox", { name: "Name" }), "My time at Kikandi");
        await user.click(screen.getByRole("radio", { name: "Ongoing" }));
        expect(screen.queryByText("Target date")).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Save milestone" }));
        expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ kind: "ongoing", target: "", habit: undefined }));
    });

    it("updates project readiness without requiring a check-in or effort", async () => {
        const user = userEvent.setup();
        const onReadiness = vi.fn();
        const project = { ...habitMilestone, kind: "project" as const, habit: undefined, project: { plannedHours: 80, readiness: 25, entries: [] } };
        render(<ProgressSheet event={project} onEffort={vi.fn()} onReadiness={onReadiness} onClose={vi.fn()} />);
        expect(screen.queryByRole("spinbutton", { name: /hours invested/i })).not.toBeInTheDocument();
        fireEvent.change(screen.getByRole("slider", { name: /readiness now/i }), { target: { value: "40" } });
        await user.type(screen.getByRole("textbox", { name: /what changed/i }), "Finished the routing lab");
        await user.click(screen.getByRole("button", { name: /update readiness/i }));
        expect(onReadiness).toHaveBeenCalledWith("habit-1", 40, "Finished the routing lab");
    });

    it("keeps project check-in separate from readiness on the home carousel", async () => {
        const user = userEvent.setup();
        const onProjectCheckIn = vi.fn();
        const project = { ...habitMilestone, kind: "project" as const, habit: undefined, project: { plannedHours: 80, readiness: 25, entries: [], checkInFrequency: "daily" as const, checkIns: [] } };
        render(<PathCarousel events={[project]} profile={{ displayName: "Kikandi", intention: "", supportStyle: "gentle" }} onHabitCheckIn={vi.fn()} onProjectCheckIn={onProjectCheckIn} onOpenHistory={vi.fn()} onProgress={vi.fn()} />);
        expect(screen.queryByRole("slider", { name: /readiness/i })).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Check in" }));
        expect(onProjectCheckIn).toHaveBeenCalledWith("habit-1");
    });

    it("uses the same acrylic treatment for adding and editing milestones", () => {
        const { unmount } = render(<EventSheet eventId={null} events={[]} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);
        expect(screen.getByRole("dialog", { name: "Add milestone" })).toHaveClass("acrylic-surface");
        expect(document.querySelector(".acrylic-backdrop")).toBeInTheDocument();

        unmount();
        render(<EventSheet eventId="habit-1" events={[habitMilestone]} onSave={vi.fn()} onDelete={vi.fn()} onClose={vi.fn()} />);
        expect(screen.getByRole("dialog", { name: "Edit milestone" })).toHaveClass("acrylic-surface");
        expect(screen.getByRole("radio", { name: "Habit" })).toBeInTheDocument();
        expect(screen.getByText("Check-in rhythm")).toBeInTheDocument();
        expect(screen.queryByText(/^Check-ins$/i)).not.toBeInTheDocument();
    });

    it("clusters activity into twelve accessible two-week histogram bars", () => {
        render(<WeeksGrid events={[habitMilestone]} show tick={1} />);
        expect(screen.getByRole("img", { name: /last 24 weeks/i })).toBeInTheDocument();
        expect(screen.getByText(/twelve two-week clusters/i)).toBeInTheDocument();
        expect(screen.getAllByTitle(/activity points/i)).toHaveLength(12);
    });

    it("includes independent project check-ins in momentum", () => {
        const project = {
            ...habitMilestone,
            kind: "project" as const,
            habit: undefined,
            project: { plannedHours: 80, readiness: 0, entries: [], checkIns: [{ date: "2026-08-03", status: "done" as const }] },
        };
        render(<WeeksGrid events={[project]} show tick={1} />);
        expect(screen.getByText(/completed/i)).toHaveTextContent("1 completed");
    });
});
