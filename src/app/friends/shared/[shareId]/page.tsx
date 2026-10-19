"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { CheckButton } from "@/components/check-button";
import { CoProgress } from "@/components/co-progress";
import { Icon } from "@/components/icon";
import { PathDetail } from "@/components/path-detail";
import { useDashboard } from "../../../providers/dashboard-provider";

export default function SharedPathPage() {
    const { shareId } = useParams<{ shareId: string }>();
    const { tick, social, socialLoading, goBack, checkInShare, cheerShare } = useDashboard();
    const [cheerSent, setCheerSent] = useState(false);
    const share = social.sharedWithMe.find((item) => item.id === shareId);

    return (
        <main className="page">
            <button type="button" onClick={goBack} className="back-link"><Icon name="chevron-left" size={20} />Back</button>
            {socialLoading ? (
                <div className="skeleton" aria-label="Loading shared path" />
            ) : !share?.event ? (
                <div className="group empty-state">
                    <Icon name="eye" size={24} />
                    <h2>This path isn&apos;t shared anymore</h2>
                    <p>Your friend may have stopped sharing it, or removed it.</p>
                </div>
            ) : (
                <>
                    {share.mode === "participant" && (() => {
                        const done = share.guestToday > 0;
                        const canCheckAgain = share.allowExtraCheckIns || !done;
                        return (
                            <section className="shared-together group" data-hue="shared" aria-label={`Your check-ins with ${share.person.displayName}`}>
                                <CoProgress partnerName={share.person.displayName} youDoneToday={done} partnerDoneToday={share.ownerToday > 0} cheerSent={cheerSent} onCheer={() => { setCheerSent(true); void cheerShare(share.id); }} />
                                <CheckButton
                                    done={done && !share.allowExtraCheckIns}
                                    disabled={!canCheckAgain}
                                    label={done ? (share.allowExtraCheckIns ? `Check in again to ${share.eventName}` : `Checked in to ${share.eventName}`) : `Check in to ${share.eventName}`}
                                    onToggle={(origin) => { if (canCheckAgain) void checkInShare(share.id, origin); }}
                                />
                            </section>
                        );
                    })()}
                    <PathDetail event={share.event} tick={tick} readOnly hue="shared" sharedLabel={`Shared by ${share.person.displayName}`} />
                </>
            )}
        </main>
    );
}
