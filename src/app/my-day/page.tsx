"use client";

import { MyDayView } from "@/components/my-day-view";
import { useDashboard } from "../providers/dashboard-provider";

export default function MyDayPage() {
    const { todaysTasks, handleAddDailyTask, toggleDailyTask, updateDailyTask, handleDeleteDailyTask } = useDashboard();

    return (
        <main className="app-page relative z-10 mx-auto w-[min(calc(100%-40px),920px)]">
            <MyDayView
                tasks={todaysTasks}
                onAdd={handleAddDailyTask}
                onToggle={toggleDailyTask}
                onUpdate={updateDailyTask}
                onDelete={handleDeleteDailyTask}
            />
        </main>
    );
}
