"use client";

import { FriendsView } from "@/components/friends-view";
import { useDashboard } from "../providers/dashboard-provider";

export default function FriendsPage() {
    const { state, social, socialLoading, refreshSocial, cheerShare, syncNow, openSettings, showToast, upsertEvent } = useDashboard();

    return (
        <main className="app-page friends-page relative z-10 mx-auto w-[min(calc(100%-40px),920px)]">
            <FriendsView
                events={state.events}
                social={social}
                socialLoading={socialLoading}
                onRefreshSocial={refreshSocial}
                onCheer={cheerShare}
                onSync={syncNow}
                onOpenSettings={openSettings}
                onToast={showToast}
                onUpdateEvent={upsertEvent}
            />
        </main>
    );
}
