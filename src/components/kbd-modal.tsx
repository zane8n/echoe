"use client";

import { Icon } from "./icon";
import { KBD_SHORTCUTS } from "@/lib/constants";

interface Props {
    open: boolean;
    onClose: () => void;
}

export function KbdModal({ open, onClose }: Props) {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-95 grid place-items-center acrylic-backdrop animate-fade-in"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            role="dialog"
            aria-label="Keyboard shortcuts"
        >
            <div className="w-[min(calc(100%-48px),380px)] rounded-[var(--radius-md)] p-7 acrylic-surface animate-scale-in">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="m-0 text-[var(--text-xl)] font-semibold">Shortcuts</h3>
                    <button onClick={onClose} className="icon-button" aria-label="Close shortcuts" title="Close">
                        <Icon name="x" size={16} />
                    </button>
                </div>
                <ul className="m-0 mb-[22px] p-0 list-none grid gap-[10px]">
                    {KBD_SHORTCUTS.map(({ key, description }) => (
                        <li key={key} className="flex items-center gap-3 text-[var(--text-sm)] text-[var(--color-ink-soft)]">
                            <kbd className="inline-grid h-6 min-w-[26px] place-items-center rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-panel)] px-[7px] font-[var(--font-mono)] text-[11px] font-semibold text-[var(--color-ink)]">
                                {key}
                            </kbd>
                            {description}
                        </li>
                    ))}
                </ul>
                <button onClick={onClose} className="primary-button">
                    Close
                </button>
            </div>
        </div>
    );
}
