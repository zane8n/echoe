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
    logProjectProgress: vi.fn(),
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

    it("brands the app as Echoe, removes mortality framing, and credits Kikandi", () => {
        render(<Home />);
        expect(screen.getByRole("link", { name: "Echoe home" })).toHaveTextContent("Echoe");
        expect(screen.getByText("Designed by").parentElement).toHaveTextContent("Designed by Kikandi");
        expect(screen.queryByText(/where you stand/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/life.*ending/i)).not.toBeInTheDocument();
        expect(screen.getByText(/stored on this device/i)).toBeInTheDocument();
    });

    it("previews a general theme across the app and opens frosted add/edit surfaces", async () => {
        const user = userEvent.setup();
        render(<Home />);

        await user.click(screen.getByRole("button", { name: "Settings" }));
        await user.click(screen.getByRole("button", { name: "Fresh teal" }));
        expect(dashboardMock.updateTheme).toHaveBeenCalledWith("teal");
        expect(screen.getByRole("dialog", { name: "Settings" })).toHaveClass("acrylic-surface");
        await user.click(screen.getByRole("button", { name: "Close settings" }));

        await user.click(screen.getByRole("button", { name: "Add" }));
        expect(screen.getByRole("dialog", { name: "Add milestone" })).toHaveClass("acrylic-surface");
    });
});
