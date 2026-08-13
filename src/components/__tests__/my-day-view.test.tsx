import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MyDayView } from "@/components/my-day-view";
import type { DailyTask } from "@/lib/types";

const task = (overrides: Partial<DailyTask> = {}): DailyTask => ({
    id: "t1",
    text: "Call the dentist",
    done: false,
    date: "2026-08-13",
    order: 0,
    createdAt: "2026-08-13T08:00:00.000Z",
    ...overrides,
});

describe("MyDayView", () => {
    it("shows an empty state with no tasks", () => {
        render(<MyDayView tasks={[]} onAdd={vi.fn()} onToggle={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()} />);
        expect(screen.getByText("Nothing on your plate yet.")).toBeInTheDocument();
    });

    it("adds a task with optional text and time", async () => {
        const user = userEvent.setup();
        const onAdd = vi.fn();
        render(<MyDayView tasks={[]} onAdd={onAdd} onToggle={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()} />);
        await user.type(screen.getByRole("textbox", { name: "Add something" }), "Buy groceries");
        await user.click(screen.getByRole("button", { name: /add/i }));
        expect(onAdd).toHaveBeenCalledWith("Buy groceries", undefined);
    });

    it("does not submit an empty task", async () => {
        const user = userEvent.setup();
        const onAdd = vi.fn();
        render(<MyDayView tasks={[]} onAdd={onAdd} onToggle={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()} />);
        expect(screen.getByRole("button", { name: /add/i })).toBeDisabled();
        await user.click(screen.getByRole("button", { name: /add/i }));
        expect(onAdd).not.toHaveBeenCalled();
    });

    it("toggles a task done and deletes a task", async () => {
        const user = userEvent.setup();
        const onToggle = vi.fn();
        const onDelete = vi.fn();
        render(<MyDayView tasks={[task()]} onAdd={vi.fn()} onToggle={onToggle} onUpdate={vi.fn()} onDelete={onDelete} />);
        await user.click(screen.getByRole("button", { name: 'Mark "Call the dentist" done' }));
        expect(onToggle).toHaveBeenCalledWith("t1");
        await user.click(screen.getByRole("button", { name: 'Delete "Call the dentist"' }));
        expect(onDelete).toHaveBeenCalledWith("t1");
    });

    it("collapses completed tasks into a Done today section", () => {
        render(<MyDayView tasks={[task({ id: "t2", done: true, text: "Gym" })]} onAdd={vi.fn()} onToggle={vi.fn()} onUpdate={vi.fn()} onDelete={vi.fn()} />);
        expect(screen.getByText("Done today (1)")).toBeInTheDocument();
        expect(screen.getByText("Everything for today is done.")).toBeInTheDocument();
    });
});
