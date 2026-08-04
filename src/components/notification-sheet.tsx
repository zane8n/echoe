"use client";

import type { EchoeNotification } from "@/lib/types";
import { Icon } from "./icon";

interface Props {
    notifications: EchoeNotification[];
    readIds: string[];
    onMarkRead: (ids: string[]) => void;
    onSelect: (notification: EchoeNotification) => void;
    onClose: () => void;
}

export function NotificationSheet({ notifications, readIds, onMarkRead, onSelect, onClose }: Props) {
    const unread = notifications.filter((item) => !readIds.includes(item.id));
    return <><div className="fixed inset-0 z-60 acrylic-backdrop animate-fade-in" onClick={onClose} /><aside className="sheet-surface fixed inset-y-0 right-0 z-70 h-dvh w-[min(100%,440px)] overflow-y-auto acrylic-surface px-[clamp(20px,5vw,36px)] py-6 animate-slide-up" role="dialog" aria-modal="true" aria-label="Notifications">
        <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] pb-5"><div><div className="text-xs font-semibold uppercase text-[var(--color-accent-ink)]">Echoes</div><h2 className="m-0 mt-1 font-[var(--font-display)] text-[30px] font-normal">Notifications</h2></div><button className="icon-button" onClick={onClose} aria-label="Close notifications"><Icon name="x" /></button></div>
        {unread.length > 0 && <button type="button" className="quiet-button my-3 ml-auto" onClick={() => onMarkRead(unread.map((item) => item.id))}>Mark all read</button>}
        <div className="notification-list">{notifications.map((item) => { const isRead = readIds.includes(item.id); return <button type="button" key={item.id} className="notification-item" data-read={isRead} onClick={() => onSelect(item)}><span className="notification-dot" data-actionable={item.actionable} /><span><strong>{item.title}</strong><small>{item.body}</small></span>{item.eventId && <Icon name="chevron-right" size={15} />}</button>; })}</div>
    </aside></>;
}
