"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { Icon } from "@/components/icon";
import { PathDetail } from "@/components/path-detail";
import { useDashboard } from "../../providers/dashboard-provider";

export default function PathDetailPage() {
    const { id } = useParams<{ id: string }>();
    const {
        state, tick, goBack, openEventEditor, setShowConfetti, handleHabitCheckIn, setCheckInEventId, setProgressEventId,
    } = useDashboard();
    const event = state.events.find((item) => item.id === id);

    useEffect(() => {
        if (!event) goBack();
        // Only re-check when the id itself changes — goBack is stable but including it
        // would re-run this on every render once we've already navigated away.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [event, id]);

    if (!event) return null;

    return (
        <main className="app-page relative z-10 mx-auto w-[min(calc(100%-40px),920px)]">
            <button type="button" onClick={goBack} className="quiet-button -ml-1.5 mb-2 text-[var(--color-muted)]">
                <Icon name="chevron-left" size={15} /> Back
            </button>
            <PathDetail
                event={event}
                tick={tick}
                profile={state.settings.profile}
                onEdit={openEventEditor}
                onConfetti={() => setShowConfetti(true)}
                onCheckIn={(checkInId) => handleHabitCheckIn(checkInId)}
                onMiss={(missId) => handleHabitCheckIn(missId, "missed")}
                onOpenHistory={setCheckInEventId}
                onProgress={event.project ? setProgressEventId : undefined}
            />
        </main>
    );
}
