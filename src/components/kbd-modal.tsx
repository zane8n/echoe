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
            className="fixed inset-0 z-95 grid place-items-center animate-fade-in"
            style={{ background: "rgba(33,34,31,0.3)", backdropFilter: "blur(6px)", WebkitBackdropFilter: "blur(6px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            role="dialog"
            aria-label="Keyboard shortcuts"
        >
            <div className="w-[min(calc(100%-48px),380px)] p-7 border border-[var(--color-line)] rounded-[24px] animate-scale-in"
                style={{ background: "var(--color-canvas-solid)", boxShadow: "0 24px 70px rgba(54,50,42,0.08), 0 0 0 1px rgba(0,0,0,0.03)" }}>
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
                <button onClick={onClose} className="min-h-[42px] inline-flex items-center justify-center px-4 rounded-[10px] border border-[var(--color-line)] bg-white/50 font-semibold text-sm cursor-pointer hover:border-[var(--color-line-strong)] transition-all duration-180">
                    Close
                </button>
            </div>
        </div>
    );
}
