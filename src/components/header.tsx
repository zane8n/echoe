"use client";

import { Icon } from "./icon";

interface Props { onAddEvent: () => void; onOpenSettings: () => void; }

export function Header({ onAddEvent, onOpenSettings }: Props) {
    const today = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }).format(new Date());

    return (
        <header className="acrylic-header sticky top-0 z-30 border-b border-[var(--color-line)]">
            <div className="w-[min(calc(100%-40px),1120px)] mx-auto h-16 flex items-center justify-between gap-4">
                <a href="#top" className="inline-flex items-center gap-2.5 text-lg font-semibold text-[var(--color-ink)] no-underline" aria-label="Echoe home">
                    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--color-accent)] animate-breathe" />
                    <span className="hover:text-[var(--color-accent)] transition-colors duration-300">Echoe</span>
                </a>
                <div className="hidden text-[13px] text-[var(--color-muted)] sm:block" aria-live="polite">{today}</div>
                <nav className="flex items-center gap-1.5" aria-label="Application actions">
                    <button onClick={onOpenSettings} className="icon-button" aria-label="Settings" title="Settings">
                        <Icon name="settings" size={17} />
                    </button>
                    <button onClick={onAddEvent} className="primary-button h-9 min-h-9 px-3.5 text-[13px]">
                        <Icon name="plus" size={16} />
                        <span className="hidden sm:inline">Add</span>
                    </button>
                </nav>
            </div>
        </header>
    );
}
