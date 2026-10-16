import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { dashboardState, storageSummary } from "@/test/fixtures";
import { localDate } from "@/lib/utils";

const dashboardMock = vi.hoisted(() => ({
    state: undefined as unknown,
    storageSummary: undefined as unknown,
    updateSettings: vi.fn(),
    updateAccent: vi.fn(),
    updateAppearance: vi.fn(),
    upsertEvent: vi.fn(),
    deleteEvent: vi.fn(),
    restoreEvent: vi.fn(),
    addAchievement: vi.fn(),
    addDailyTask: vi.fn(() => "task-1"),
    toggleDailyTask: vi.fn(),
    updateDailyTask: vi.fn(),
    deleteDailyTask: vi.fn(),
    restoreDailyTask: vi.fn(),
    listSnapshots: vi.fn().mockResolvedValue([]),
    restoreSnapshot: vi.fn().mockResolvedValue(undefined),
    checkInHabit: vi.fn(),
    clearHabitCheckIn: vi.fn(),
    checkInProject: vi.fn(),
    clearProjectCheckIn: vi.fn(),
    logProjectEffort: vi.fn(),
    removeProjectEntry: vi.fn(),
    updateProjectReadiness: vi.fn(),
    markNotificationsRead: vi.fn(),
    syncNow: vi.fn(),
    importState: vi.fn(),
    clearAllData: vi.fn().mockResolvedValue(undefined),
    resetForAccountSwitch: vi.fn().mockResolvedValue(undefined),
}));

const routerMock = vi.hoisted(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
}));

vi.mock("@/hooks/use-dashboard", () => ({ useDashboardState: () => dashboardMock }));
vi.mock("next/navigation", () => ({
    useRouter: () => routerMock,
    usePathname: () => "/",
    useParams: () => ({}),
}));
vi.mock("next/link", () => ({
    default: ({ href, children, ...props }: ComponentProps<"a"> & { href: string }) => <a href={href} {...props}>{children}</a>,
}));

import { AppShell } from "@/app/app-shell";
import Home from "@/app/page";

describe("Echoe app shell", () => {
    beforeEach(() => {
        window.history.replaceState({}, "", "/");
        dashboardMock.state = { ...dashboardState, events: [] };
        dashboardMock.storageSummary = { ...storageSummary, milestoneCount: 0, checkInCount: 0, historyCount: 0, syncStatus: "local" };
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ mode: "local", account: null }), { status: 503 })));
    });

    it("uses one New button and a four-tab navigation to real routes", () => {
        render(<AppShell><Home /></AppShell>);
        expect(screen.getByRole("link", { name: "Echoe home" })).toHaveTextContent("Echoe");
        expect(screen.getAllByRole("button", { name: "Settings" })).toHaveLength(1);
        const nav = screen.getByRole("navigation", { name: "Primary navigation" });
        expect(nav.querySelectorAll("a")).toHaveLength(4);
        expect(within(nav).getByRole("link", { name: "Today" })).toHaveAttribute("aria-current", "page");
        expect(within(nav).getByRole("link", { name: "Paths" })).toHaveAttribute("href", "/paths");
        expect(within(nav).getByRole("link", { name: "Momentum" })).toHaveAttribute("href", "/momentum");
        expect(within(nav).getByRole("link", { name: "Friends" })).toHaveAttribute("href", "/friends");
        expect(screen.getAllByRole("button", { name: "New" })).toHaveLength(1);
    });

    it("navigates between tabs through the router", async () => {
        const user = userEvent.setup();
        render(<AppShell><Home /></AppShell>);
        await user.click(within(screen.getByRole("navigation", { name: "Primary navigation" })).getByRole("link", { name: "Paths" }));
        expect(routerMock.push).toHaveBeenCalledWith("/paths");
    });

    it("creates a weekly habit straight from plain language", async () => {
        const user = userEvent.setup();
        render(<AppShell><Home /></AppShell>);
        await user.click(screen.getByRole("button", { name: "New" }));
        const dialog = screen.getByRole("dialog", { name: "Add anything" });
        await user.type(within(dialog).getByRole("combobox", { name: /what would you like to add/i }), "Run 3x a week");
        expect(within(dialog).getByRole("radio", { name: "Habit" })).toHaveAttribute("aria-checked", "true");
        await user.keyboard("{Enter}");
        expect(dashboardMock.upsertEvent).toHaveBeenCalledWith(expect.objectContaining({ name: "Run", kind: "habit", habit: expect.objectContaining({ frequency: "weekly", targetPerPeriod: 3 }) }));
        expect(screen.queryByRole("dialog", { name: "Add anything" })).not.toBeInTheDocument();
        expect(screen.getByText("Run created")).toBeInTheDocument();
    });

    it("adds a timed task for today and offers undo", async () => {
        const user = userEvent.setup();
        render(<AppShell><Home /></AppShell>);
        await user.click(screen.getByRole("button", { name: "New" }));
        await user.type(screen.getByRole("combobox", { name: /what would you like to add/i }), "Call the dentist 9:30");
        await user.click(screen.getByRole("button", { name: "Add to today" }));
        expect(dashboardMock.addDailyTask).toHaveBeenCalledWith("Call the dentist", "09:30", localDate());
        await user.click(screen.getByRole("button", { name: "Undo" }));
        expect(dashboardMock.deleteDailyTask).toHaveBeenCalledWith("task-1");
    });

    it("previews an accent color across the app and opens the path editor from the composer", async () => {
        const user = userEvent.setup();
        render(<AppShell><Home /></AppShell>);

        await user.click(screen.getByRole("button", { name: "Settings" }));
        await user.click(screen.getByRole("radio", { name: "Teal" }));
        expect(dashboardMock.updateAccent).toHaveBeenCalledWith("teal");
        expect(document.documentElement).toHaveAttribute("data-accent", "teal");
        expect(screen.getByRole("dialog", { name: "Settings" })).toHaveClass("acrylic-surface");
        await user.click(screen.getByRole("button", { name: "Close settings" }));

        await user.click(screen.getByRole("button", { name: "New" }));
        await user.type(screen.getByRole("combobox", { name: /what would you like to add/i }), "Thesis 40h");
        await user.click(screen.getByRole("button", { name: "More options" }));
        expect(screen.getByRole("dialog", { name: "Create a path" })).toHaveClass("acrylic-surface");
        expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Thesis");
        expect(screen.getByRole("radio", { name: "Project" })).toHaveAttribute("aria-checked", "true");
    });

    it("checks in to a habit from Today with one tap, and taps again to undo", async () => {
        const user = userEvent.setup();
        dashboardMock.state = dashboardState;
        const { rerender } = render(<AppShell><Home /></AppShell>);
        await user.click(screen.getByRole("button", { name: "Check in to Practice deliberately" }));
        expect(dashboardMock.checkInHabit).toHaveBeenCalledWith("habit-1", "done", localDate(), undefined);

        const today = localDate();
        dashboardMock.state = { ...dashboardState, events: [{ ...dashboardState.events[0], habit: { ...dashboardState.events[0].habit!, entries: [{ date: today, status: "done" as const }] } }] };
        rerender(<AppShell><Home /></AppShell>);
        await user.click(screen.getByRole("button", { name: /undo today's check-in for practice deliberately/i }));
        expect(dashboardMock.clearHabitCheckIn).toHaveBeenCalledWith("habit-1", today);
    });

    it("shows a meaningful notification behind an actionable badge", async () => {
        const user = userEvent.setup();
        dashboardMock.state = dashboardState;
        render(<AppShell><Home /></AppShell>);
        await user.click(screen.getByRole("button", { name: /notifications, 1 unread/i }));
        expect(screen.getByRole("dialog", { name: "Notifications" })).toBeInTheDocument();
        expect(screen.getByText(/Practice deliberately is ready/i)).toBeInTheDocument();
    });
});
