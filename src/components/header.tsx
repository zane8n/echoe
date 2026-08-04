"use client";

import { Icon } from "./icon";

interface Props { displayName?: string; notificationCount: number; onHome: () => void; onOpenNotifications: () => void; onOpenSettings: () => void; }

export function Header({ displayName, notificationCount, onHome, onOpenNotifications, onOpenSettings }: Props) {
    const today = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }).format(new Date());
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const firstName = displayName?.trim().split(/\s+/)[0];

    return (
        <header className="acrylic-header sticky top-0 z-30 border-b border-[var(--color-line)]">
            <div className="w-[min(calc(100%-40px),920px)] mx-auto h-16 flex items-center justify-between gap-4">
                <button type="button" onClick={onHome} className="inline-flex items-center gap-2.5 border-0 bg-transparent p-0 text-lg font-semibold text-[var(--color-ink)]" aria-label="Echoe home">
                    <span className="echo-orb" aria-hidden="true" />
                    <span className="hover:text-[var(--color-accent)] transition-colors duration-300">Echoe</span>
                </button>
                <div className="hidden text-center text-[13px] text-[var(--color-muted)] sm:block" aria-live="polite">
                    {firstName ? <><span className="font-semibold text-[var(--color-accent-ink)]">{greeting}, {firstName}</span><span className="mx-2 text-[var(--color-line-strong)]">/</span></> : null}{today}
                </div>
                <nav className="flex items-center gap-1.5" aria-label="Application actions">
                    <button onClick={onOpenNotifications} className="icon-button relative" aria-label={`Notifications${notificationCount ? `, ${notificationCount} unread` : ""}`} title="Notifications">
                        <Icon name="bell" size={17} />
                        {notificationCount > 0 && <span className="notification-count">{notificationCount > 9 ? "9+" : notificationCount}</span>}
                    </button>
                    <button onClick={onOpenSettings} className="icon-button" aria-label="Settings" title={firstName ? `Settings for ${firstName}` : "Settings"}>
                        <Icon name="settings" size={17} />
                    </button>
                </nav>
            </div>
        </header>
    );
}
