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
            <div className="w-[min(calc(100%-48px),380px)] p-7 acrylic-surface rounded-[24px] animate-scale-in">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="m-0 font-[var(--font-display)] text-2xl font-normal">Shortcuts</h3>
                    <button onClick={onClose} className="w-[38px] h-[38px] grid place-items-center bg-transparent border border-transparent rounded-[10px] cursor-pointer hover:bg-white/50 hover:border-[var(--color-line)] transition-all duration-180">
                        <Icon name="x" size={16} />
                    </button>
                </div>
                <ul className="m-0 mb-[22px] p-0 list-none grid gap-[10px]">
                    {KBD_SHORTCUTS.map(({ key, description }) => (
                        <li key={key} className="flex items-center gap-3 text-sm text-[var(--color-ink-soft)]">
                            <kbd className="inline-grid place-items-center min-w-[26px] h-6 px-[7px] border border-[var(--color-line-strong)] rounded-[5px] bg-white/60 font-[var(--font-ui)] text-[11px] font-semibold text-[var(--color-ink)]"
                                style={{ boxShadow: "0 1px 0 var(--color-line-strong)" }}>
                                {key}
                            </kbd>
                            {description}
                        </li>
                    ))}
                </ul>
                <button onClick={onClose} className="min-h-[42px] inline-flex items-center justify-center px-4 rounded-[10px] bg-[var(--color-accent)] text-white font-semibold text-sm cursor-pointer border-0 hover:brightness-105 transition-all duration-200">
                    Close
                </button>
            </div>
        </div>
    );
}
