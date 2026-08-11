"use client";

import { Icon } from "./icon";

interface Props {
    partnerName: string;
    youDoneToday: boolean;
    partnerDoneToday: boolean;
    onCheer?: () => void;
    cheerSent?: boolean;
    compact?: boolean;
}

const encouragement = (youDoneToday: boolean, partnerDoneToday: boolean, partnerName: string): string => {
    if (youDoneToday && partnerDoneToday) return `You and ${partnerName} both showed up today`;
    if (partnerDoneToday) return `${partnerName} already checked in — your turn`;
    if (youDoneToday) return `Rooting for ${partnerName} to join in today`;
    return `Kick today off together with ${partnerName}`;
};

export function CoProgress({ partnerName, youDoneToday, partnerDoneToday, onCheer, cheerSent, compact }: Props) {
    return (
        <div className="co-progress" data-compact={compact}>
            <div className="co-progress-dots" aria-hidden="true">
                <span className="co-dot" data-done={youDoneToday}><Icon name="check" size={10} /></span>
                <span className="co-progress-line" data-filled={youDoneToday && partnerDoneToday} />
                <span className="co-dot" data-done={partnerDoneToday}><Icon name="check" size={10} /></span>
            </div>
            <p className="co-progress-copy">{encouragement(youDoneToday, partnerDoneToday, partnerName)}</p>
            {onCheer && (
                <button type="button" className="co-cheer" onClick={onCheer} disabled={cheerSent} aria-label={`Cheer ${partnerName} on`} title={cheerSent ? "Cheer sent" : `Cheer ${partnerName} on`}>
                    <Icon name="heart" size={14} />
                </button>
            )}
        </div>
    );
}
