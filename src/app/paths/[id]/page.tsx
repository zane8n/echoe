"use client";

import { useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { Icon } from "@/components/icon";
import { PathDetail } from "@/components/path-detail";
import { useDashboard } from "../../providers/dashboard-provider";

export default function PathDetailPage() {
    const { id } = useParams<{ id: string }>();
    const {
        state, tick, social, goBack, openEventEditor, celebrate, toggleToday, recordEntry, clearEntry, setProgressEventId, logProjectEffort, togglePin, navigateTo, handleDelete,
    } = useDashboard();
    const event = state.events.find((item) => item.id === id);
    const sharedWith = social.sharedByMe.filter((share) => share.eventId === id).map((share) => share.person.displayName.split(/\s+/)[0]);
    const onCelebrate = useCallback(() => celebrate(undefined, event?.color ?? "accent", true), [celebrate, event?.color]);

    useEffect(() => {
        if (!event) goBack();
        // Only re-check when the path itself changes; goBack would otherwise re-run this after navigating away.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [event, id]);

    if (!event) return null;

    return (
        <main className="page">
            <button type="button" onClick={goBack} className="back-link"><Icon name="chevron-left" size={20} />Back</button>
            <PathDetail
                event={event}
                tick={tick}
                profile={state.settings.profile}
                sharedLabel={sharedWith.length ? `Shared with ${sharedWith.length > 1 ? `${sharedWith[0]} +${sharedWith.length - 1}` : sharedWith[0]}` : undefined}
                onEdit={openEventEditor}
                onCelebrate={onCelebrate}
                onToggleToday={toggleToday}
                onEntry={recordEntry}
                onClearEntry={clearEntry}
                onProgress={event.project ? setProgressEventId : undefined}
                onEffort={event.project ? (pathId, hours) => logProjectEffort(pathId, hours) : undefined}
                onPin={togglePin}
                onShare={(pathId) => navigateTo(`/friends?share=${pathId}`)}
                onDelete={handleDelete}
            />
        </main>
    );
}
