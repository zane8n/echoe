"use client";

import type { EchoeNotification, NotificationKind } from "@/lib/types";
import { Icon, type IconName } from "./icon";
import { Sheet, SheetBody, SheetHeader } from "./sheet";

interface Props {
    notifications: EchoeNotification[];
    readIds: string[];
    onMarkRead: (ids: string[]) => void;
    onSelect: (notification: EchoeNotification) => void;
    onClose: () => void;
}

const KIND_ICON: Record<NotificationKind, IconName> = { "check-in": "check", risk: "target", progress: "sparkle", encouragement: "heart" };

export function NotificationSheet({ notifications, readIds, onMarkRead, onSelect, onClose }: Props) {
    const unread = notifications.filter((item) => !readIds.includes(item.id));
    return (
        <Sheet onClose={onClose} label="Notifications" size="sm">
            <SheetHeader
                title="Notifications"
                description={unread.length ? `${unread.length} new` : "You're all caught up."}
                closeLabel="Close notifications"
                actions={unread.length > 0 ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => onMarkRead(unread.map((item) => item.id))}>Mark all read</button> : null}
            />
            <SheetBody>
                <div className="notice-list">
                    {notifications.map((item) => {
                        const isRead = readIds.includes(item.id);
                        return (
                            <button type="button" key={item.id} className="notice" data-read={isRead} data-kind={item.kind} onClick={() => onSelect(item)}>
                                <span className="notice-icon"><Icon name={KIND_ICON[item.kind]} size={17} /></span>
                                <span className="notice-copy"><strong>{item.title}</strong><small>{item.body}</small></span>
                                {!isRead && item.actionable && <span className="notice-dot" aria-label="Unread" />}
                            </button>
                        );
                    })}
                </div>
            </SheetBody>
        </Sheet>
    );
}
