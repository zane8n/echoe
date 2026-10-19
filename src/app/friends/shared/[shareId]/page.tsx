"use client";

import Link from "next/link";
import { useState } from "react";
import { useParams } from "next/navigation";
import { CoProgress } from "@/components/co-progress";
import { Icon } from "@/components/icon";
import { PathDetail } from "@/components/path-detail";
import { SHARED_PALETTE } from "@/lib/constants";
import { checkInSharedPath } from "@/lib/social-client";
import { useDashboard } from "../../../providers/dashboard-provider";

export default function SharedPathPage() {
    const { shareId } = useParams<{ shareId: string }>();
    const { tick, social, socialLoading, refreshSocial, cheerShare, showToast } = useDashboard();
    const [busy, setBusy] = useState(false);
    const [cheerSent, setCheerSent] = useState(false);
    const share = social.sharedWithMe.find((item) => item.id === shareId);

    const checkIn = async () => {
        if (!share) return;
        setBusy(true);
        try {
            await checkInSharedPath(share.id);
            await refreshSocial();
            showToast("Shared check-in recorded");
        } catch (error) {
            showToast(error instanceof Error ? error.message : "That check-in could not be recorded.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <main className="app-page relative z-10 mx-auto w-[min(calc(100%-40px),920px)]">
            <Link href="/friends" className="quiet-button -ml-1.5 mb-2 text-[var(--color-muted)] no-underline">
                <Icon name="chevron-left" size={15} /> Friends
            </Link>
            {socialLoading ? (
                <div className="friends-skeleton" aria-label="Loading shared path" />
            ) : !share?.event ? (
                <section className="friends-view friends-gate animate-soft-enter">
                    <Icon name="eye" size={25} />
                    <h1>This path isn&apos;t shared anymore</h1>
                    <p>Your friend may have stopped sharing it, or it was removed.</p>
                </section>
            ) : (
                <div className="shared-detail">
                    <PathDetail event={share.event} tick={tick} readOnly palette={SHARED_PALETTE} sharedLabel={`Shared by ${share.person.displayName}`} />
                    {share.mode === "participant" && (
                        <div className="shared-detail-participation">
                            <CoProgress
                                partnerName={share.person.displayName}
                                youDoneToday={share.guestToday > 0}
                                partnerDoneToday={share.ownerToday > 0}
                                cheerSent={cheerSent}
                                onCheer={() => { setCheerSent(true); void cheerShare(share.id); }}
                            />
                            <button type="button" className="compact-button" disabled={busy || (share.guestToday > 0 && !share.allowExtraCheckIns)} onClick={() => void checkIn()}>
                                <Icon name="check" size={14} />{share.guestToday ? share.allowExtraCheckIns ? "Check in again" : "Checked in" : "Check in"}
                            </button>
                        </div>
                    )}
                </div>
            )}
        </main>
    );
}
