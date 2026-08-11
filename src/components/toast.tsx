"use client";

import type { MilestoneEvent } from "@/lib/types";

interface Props {
    message: string;
    undoEvent: MilestoneEvent | null;
    onUndo: () => void;
}

export function Toast({ message, undoEvent, onUndo }: Props) {
    return (
        <div className="fixed z-90 left-1/2 bottom-6 -translate-x-1/2 flex flex-col items-center gap-[10px] pointer-events-none">
            {undoEvent && (
                <div className="pointer-events-auto flex min-w-[220px] max-w-[calc(100vw-32px)] items-center gap-4 rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] px-[18px] py-[11px] text-[var(--color-ink)] shadow-[var(--shadow-md)] animate-slide-up">
                    <span className="text-[var(--text-sm)]">&quot;{undoEvent.name}&quot; archived</span>
                    <button
                        onClick={onUndo}
                        className="quiet-button text-[var(--color-accent-ink)]"
                    >
                        Undo
                    </button>
                </div>
            )}
            {message && (
                <div
                    className="pointer-events-auto min-w-[220px] max-w-[calc(100vw-32px)] rounded-[var(--radius-sm)] border border-[var(--color-line)] bg-[var(--color-surface)] px-[18px] py-[11px] text-center text-[var(--text-sm)] text-[var(--color-ink)] shadow-[var(--shadow-md)] animate-slide-up"
                    role="status"
                    aria-atomic="true"
                >
                    {message}
                </div>
            )}
        </div>
    );
}
