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
                <div className="flex items-center gap-4 min-w-[220px] max-w-[calc(100vw-32px)] px-[18px] py-[11px] border border-[var(--color-line)] rounded-[10px] pointer-events-auto animate-slide-up"
                    style={{ background: "rgba(32,35,31,0.92)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 18px 50px rgba(35,34,31,0.2)" }}>
                    <span className="text-[#fbfaf7] text-[13px]">"{undoEvent.name}" removed</span>
                    <button
                        onClick={onUndo}
                        className="min-h-[34px] p-0 border-0 border-b border-transparent bg-transparent text-[#b7c8b1] text-sm font-semibold cursor-pointer hover:text-[#d4e0cf] hover:border-[#b7c8b1] transition-all duration-180"
                    >
                        Undo
                    </button>
                </div>
            )}
            {message && (
                <div
                    className="min-w-[220px] max-w-[calc(100vw-32px)] px-[18px] py-[11px] border border-[var(--color-line)] rounded-[10px] text-[#fbfaf7] text-[13px] text-center pointer-events-auto animate-slide-up"
                    style={{ background: "rgba(32,35,31,0.92)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", boxShadow: "0 18px 50px rgba(35,34,31,0.2)" }}
                    role="status"
                    aria-atomic="true"
                >
                    {message}
                </div>
            )}
        </div>
    );
}
