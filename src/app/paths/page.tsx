"use client";

import { EventsSection } from "@/components/events-section";
import { useDashboard } from "../providers/dashboard-provider";

export default function PathsPage() {
    const { state, openEventEditor, handleExport, handleHabitCheckIn, handleProjectCheckIn, setCheckInEventId, setProgressEventId } = useDashboard();

    return (
        <main className="app-page relative z-10 mx-auto w-[min(calc(100%-40px),920px)]">
            <EventsSection events={state.events} onEdit={openEventEditor} onExport={handleExport} onCheckIn={(id) => handleHabitCheckIn(id)} onProjectCheckIn={handleProjectCheckIn} onOpenHistory={setCheckInEventId} onProgress={setProgressEventId} />
        </main>
    );
}
