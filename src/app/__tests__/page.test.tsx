import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { dashboardState, storageSummary } from "@/test/fixtures";

const dashboardMock = vi.hoisted(() => ({
    state: undefined as unknown,
    storageSummary: undefined as unknown,
    updateSettings: vi.fn(),
    updateTheme: vi.fn(),
    upsertEvent: vi.fn(),
    deleteEvent: vi.fn(),
    restoreEvent: vi.fn(),
    addAchievement: vi.fn(),
    checkInHabit: vi.fn(),
    clearHabitCheckIn: vi.fn(),
    checkInProject: vi.fn(),
    logProjectEffort: vi.fn(),
    updateProjectReadiness: vi.fn(),
    markNotificationsRead: vi.fn(),
    syncNow: vi.fn(),
    importState: vi.fn(),
    clearAllData: vi.fn().mockResolvedValue(undefined),
    resetForAccountSwitch: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/hooks/use-dashboard", () => ({ useDashboardState: () => dashboardMock }));

import Home from "@/app/page";

describe("Echoe app shell", () => {
    beforeEach(() => {
        dashboardMock.state = { ...dashboardState, events: [] };
        dashboardMock.storageSummary = { ...storageSummary, milestoneCount: 0, checkInCount: 0, historyCount: 0, syncStatus: "local" };
    });

    it("uses a focused app shell with one settings action and a three-item bottom navigation", async () => {
        const user = userEvent.setup();
        render(<Home />);
        expect(screen.getByRole("button", { name: "Echoe home" })).toHaveTextContent("Echoe");
        expect(screen.getAllByRole("button", { name: "Settings" })).toHaveLength(1);
        expect(screen.getByRole("button", { name: "Friends" })).toBeInTheDocument();
        expect(screen.getByRole("navigation", { name: "Primary navigation" }).querySelectorAll("button")).toHaveLength(3);
        expect(screen.getByRole("button", { name: "Add a path" })).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: /what you're building/i })).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Momentum" }));
        expect(screen.queryByText(/designed by/i)).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Echoe home" }).querySelector("svg")).toBeInTheDocument();
        expect(screen.queryByText(/where you stand/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/life.*ending/i)).not.toBeInTheDocument();
    });

    it("previews a general theme across the app and opens frosted add/edit surfaces", async () => {
        const user = userEvent.setup();
        render(<Home />);

        await user.click(screen.getByRole("button", { name: "Settings" }));
        await user.click(screen.getByRole("button", { name: "Fresh teal" }));
        expect(dashboardMock.updateTheme).toHaveBeenCalledWith("teal");
        expect(document.documentElement).toHaveAttribute("data-theme", "teal");
        expect(screen.getByRole("dialog", { name: "Settings" })).toHaveClass("acrylic-surface");
        await user.click(screen.getByRole("button", { name: "Close settings" }));

        await user.click(screen.getByRole("button", { name: "Add a path" }));
        expect(screen.getByRole("dialog", { name: "Add milestone" })).toHaveClass("acrylic-surface");
    });

    it("shows a meaningful notification behind an actionable badge", async () => {
        const user = userEvent.setup();
        dashboardMock.state = dashboardState;
        render(<Home />);
        await user.click(screen.getByRole("button", { name: /notifications, 1 unread/i }));
        expect(screen.getByRole("dialog", { name: "Notifications" })).toBeInTheDocument();
        expect(screen.getByText(/Practice deliberately is ready/i)).toBeInTheDocument();
    });
});
