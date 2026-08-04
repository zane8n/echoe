"use client";

import { useEffect, useCallback, useRef } from "react";

type Handler = (e: KeyboardEvent) => void;

export function useKeyboard(handlers: Record<string, Handler>, enabled = true) {
    const handlersRef = useRef(handlers);
    useEffect(() => { handlersRef.current = handlers; }, [handlers]);
    const handleKey = useCallback(
        (e: KeyboardEvent) => {
            if (!enabled) return;
            const currentHandlers = handlersRef.current;
            const tag = (document.activeElement?.tagName ?? "").toLowerCase();
            const isInput = tag === "input" || tag === "textarea" || tag === "select" || document.activeElement?.getAttribute("contenteditable") === "true";

            // Escape always fires
            if (e.key === "Escape" && currentHandlers["Escape"]) {
                currentHandlers["Escape"](e);
                return;
            }

            if (isInput) return;

            for (const [key, handler] of Object.entries(currentHandlers)) {
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
        [enabled],
    );

    useEffect(() => {
        document.addEventListener("keydown", handleKey);
        return () => document.removeEventListener("keydown", handleKey);
    }, [handleKey]);
}
