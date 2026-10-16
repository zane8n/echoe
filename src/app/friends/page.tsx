"use client";

import { FriendsView } from "@/components/friends-view";
import { useDashboard } from "../providers/dashboard-provider";

export default function FriendsPage() {
    const { state, social, socialLoading, refreshSocial, cheerShare, syncNow, openSettings, showToast, upsertEvent } = useDashboard();

    return (
        <main className="page">
            <FriendsView
                events={state.events}
                social={social}
                socialLoading={socialLoading}
                onRefreshSocial={refreshSocial}
                onCheer={cheerShare}
                onSync={syncNow}
                onOpenSettings={openSettings}
                onToast={(message) => showToast(message)}
                onUpdateEvent={upsertEvent}
            />
        </main>
    );
}
