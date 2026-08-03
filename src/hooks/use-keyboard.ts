"use client";

import { useEffect, useCallback } from "react";

type Handler = (e: KeyboardEvent) => void;

export function useKeyboard(handlers: Record<string, Handler>, enabled = true) {
    const handleKey = useCallback(
        (e: KeyboardEvent) => {
            if (!enabled) return;
            const tag = (document.activeElement?.tagName ?? "").toLowerCase();
            const isInput = tag === "input" || tag === "textarea" || tag === "select" || document.activeElement?.getAttribute("contenteditable") === "true";

            // Escape always fires
            if (e.key === "Escape" && handlers["Escape"]) {
                handlers["Escape"](e);
                return;
            }

            if (isInput) return;

            for (const [key, handler] of Object.entries(handlers)) {
                if (key === "Escape") continue;
                if (key === "Ctrl+Z" && (e.ctrlKey || e.metaKey) && e.key === "z") {
                    e.preventDefault();
                    handler(e);
                    return;
                }
                if (e.key === key && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    e.preventDefault();
                    handler(e);
                    return;
                }
            }
        },
        [handlers, enabled],
    );

    useEffect(() => {
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [handleKey]);
}
