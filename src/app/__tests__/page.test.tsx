import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { dashboardState, storageSummary } from "@/test/fixtures";

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
    addDailyTask: vi.fn(),
    toggleDailyTask: vi.fn(),
    updateDailyTask: vi.fn(),
    deleteDailyTask: vi.fn(),
    listSnapshots: vi.fn().mockResolvedValue([]),
    restoreSnapshot: vi.fn().mockResolvedValue(undefined),
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
        routerMock.push.mockClear();
        routerMock.replace.mockClear();
        routerMock.back.mockClear();
    });

    it("uses a focused shell with one settings action and a six-item bottom navigation to real routes", async () => {
        render(<AppShell><Home /></AppShell>);
        expect(screen.getByRole("link", { name: "Echoe home" })).toHaveTextContent("Echoe");
        expect(screen.getAllByRole("button", { name: "Settings" })).toHaveLength(1);
        const nav = screen.getByRole("navigation", { name: "Primary navigation" });
        expect(nav.querySelectorAll("a, button")).toHaveLength(6);
        expect(screen.getByRole("link", { name: "Paths" })).toHaveAttribute("href", "/paths");
        expect(screen.getByRole("link", { name: "My Day" })).toHaveAttribute("href", "/my-day");
        expect(screen.getByRole("link", { name: "Momentum" })).toHaveAttribute("href", "/momentum");
        expect(screen.getByRole("link", { name: "Friends" })).toHaveAttribute("href", "/friends");
        expect(screen.getByRole("button", { name: "Add a path" })).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: /what you're building/i })).not.toBeInTheDocument();
    });

    it("previews an accent color across the app and opens frosted add/edit surfaces", async () => {
        const user = userEvent.setup();
        render(<AppShell><Home /></AppShell>);

        await user.click(screen.getByRole("button", { name: "Settings" }));
        await user.click(screen.getByRole("radio", { name: "Teal" }));
        expect(dashboardMock.updateAccent).toHaveBeenCalledWith("teal");
        expect(document.documentElement).toHaveAttribute("data-accent", "teal");
        expect(screen.getByRole("dialog", { name: "Settings" })).toHaveClass("acrylic-surface");
        await user.click(screen.getByRole("button", { name: "Close settings" }));

        await user.click(screen.getByRole("button", { name: "Add a path" }));
        expect(screen.getByRole("dialog", { name: "Create a path" })).toHaveClass("acrylic-surface");
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
