"use client";

import { Icon } from "./icon";
import type { ThemeConfig } from "@/lib/types";

interface Props { onAddEvent: () => void; onOpenSettings: () => void; theme: ThemeConfig; }

export function Header({ onAddEvent, onOpenSettings, theme }: Props) {
    const today = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }).format(new Date());

    return (
        <header className="sticky top-0 z-30 border-b border-[var(--color-line)]"
            style={{ background: "var(--color-surface)", backdropFilter: "blur(20px) saturate(140%)", WebkitBackdropFilter: "blur(20px) saturate(140%)" }}>
            <div className="w-[min(calc(100%-40px),1120px)] mx-auto h-16 flex items-center justify-between gap-4">
                <a href="#top" className="inline-flex items-center gap-2.5 text-[var(--color-ink)] font-semibold text-lg no-underline tracking-tight" aria-label="Echoe home">
                    <span aria-hidden="true" className="w-2 h-2 rounded-full animate-breathe" style={{ background: theme.accent }} />
                    <span className="hover:text-[var(--color-accent)] transition-colors duration-300">Echoe</span>
                </a>
                <div className="hidden sm:block text-[var(--color-muted)] text-[13px] tracking-[0.02em]" aria-live="polite">{today}</div>
                <nav className="flex items-center gap-1.5" aria-label="Application actions">
                    <button onClick={onOpenSettings} className="w-9 h-9 grid place-items-center bg-transparent border-0 rounded-xl cursor-pointer text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-accent)]/10 transition-all duration-200" aria-label="Settings">
                        <Icon name="settings" size={17} />
                    </button>
                    <button onClick={onAddEvent} className="h-9 inline-flex items-center gap-1.5 px-3.5 rounded-xl text-white font-semibold text-[13px] cursor-pointer border-0 hover:brightness-105 active:brightness-95 transition-all duration-200"
                        style={{ background: theme.accent, boxShadow: `0 2px 12px ${theme.accent}44` }}>
                        <Icon name="plus" size={16} />
                        <span className="hidden sm:inline">Add</span>
                    </button>
                </nav>
            </div>
        </header>
    );
}
