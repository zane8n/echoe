"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { tabIndexOf } from "@/app/providers/navigation-provider";
import { Icon, type IconName } from "./icon";
import { TransitionLink } from "./transition-link";

const TABS: Array<{ href: string; label: string; icon: IconName }> = [
    { href: "/", label: "Today", icon: "home" },
    { href: "/paths", label: "Paths", icon: "layers" },
    { href: "/momentum", label: "Momentum", icon: "trending-up" },
    { href: "/friends", label: "Friends", icon: "users" },
];

interface Props {
    displayName?: string;
    notificationCount: number;
    scrolled: boolean;
    composerOpen: boolean;
    onOpenComposer: () => void;
    onOpenNotifications: () => void;
    onOpenSettings: () => void;
}

export function AppChrome({ displayName, notificationCount, scrolled, composerOpen, onOpenComposer, onOpenNotifications, onOpenSettings }: Props) {
    const pathname = usePathname();
    const active = tabIndexOf(pathname);
    const initial = displayName?.trim().charAt(0).toUpperCase();
    const [modKey, setModKey] = useState("Ctrl K");

    useEffect(() => {
        const mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
        const timer = window.setTimeout(() => setModKey(mac ? "⌘K" : "Ctrl K"), 0);
        return () => window.clearTimeout(timer);
    }, []);

    return (
        <header className="topbar" data-scrolled={scrolled}>
            <div className="topbar-inner">
                <TransitionLink href="/" className="brand" aria-label="Echoe home">
                    <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
                    Echoe
                </TransitionLink>

                <nav className="tabbar" aria-label="Primary navigation" data-active={active} style={{ "--tab-index": Math.max(0, active) } as React.CSSProperties}>
                    <span className="tab-thumb" aria-hidden="true" />
                    {TABS.map((tab, index) => (
                        <TransitionLink key={tab.href} href={tab.href} className="tab" aria-current={active === index ? "page" : undefined}>
                            <Icon name={tab.icon} size={21} strokeWidth={active === index ? 2.1 : 1.75} />
                            <span className="tab-label">{tab.label}</span>
                        </TransitionLink>
                    ))}
                </nav>

                <button type="button" className="fab" onClick={onOpenComposer} aria-label="New" aria-haspopup="dialog" aria-expanded={composerOpen} title={`Add anything (${modKey})`}>
                    <Icon name="plus" size={24} strokeWidth={2.2} />
                    <span className="fab-label">New</span>
                    <kbd>{modKey}</kbd>
                </button>

                <div className="topbar-actions">
                    <button type="button" onClick={onOpenNotifications} className="icon-btn relative" aria-label={`Notifications${notificationCount ? `, ${notificationCount} unread` : ""}`} title="Notifications">
                        <Icon name="bell" size={20} />
                        {notificationCount > 0 && <span className="badge-dot">{notificationCount > 9 ? "9+" : notificationCount}</span>}
                    </button>
                    <button type="button" onClick={onOpenSettings} className="avatar-btn" aria-label="Settings" title={displayName ? `${displayName}: settings` : "Settings"}>
                        {initial || <Icon name="user" size={18} />}
                    </button>
                </div>
            </div>
        </header>
    );
}
