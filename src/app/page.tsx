"use client";

import { Icon } from "@/components/icon";
import { PathCarousel, pathStatus } from "@/components/path-carousel";
import { TodayRhythm } from "@/components/today-rhythm";
import { useDashboard } from "./providers/dashboard-provider";

export default function Home() {
    const { state, tick, social, cheerShare, handleHabitCheckIn, handleProjectCheckIn, setCheckInEventId, setProgressEventId } = useDashboard();
    const focused = state.events.find((event) => event.pinned) ?? state.events[0];

    return (
        <main className="home-view relative z-10 mx-auto w-[min(100%,760px)]">
            <PathCarousel events={state.events} profile={state.settings.profile} sharedByMe={social.sharedByMe} onHabitCheckIn={(id) => handleHabitCheckIn(id)} onProjectCheckIn={handleProjectCheckIn} onOpenHistory={setCheckInEventId} onProgress={setProgressEventId} onCheer={(shareId) => void cheerShare(shareId)} />
            <p className="home-status"><Icon name="sparkle" size={14} />{pathStatus(focused, state.settings.profile)}</p>
            <TodayRhythm tick={tick} />
        </main>
    );
}
