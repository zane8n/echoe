"use client";

import { useEffect, useRef } from "react";

type Handler = (event: KeyboardEvent) => void;

/**
 * Global shortcuts. Keys are matched by KeyboardEvent.key ("n", "?", "1"), "Escape",
 * or "Mod+<key>" for ⌘ on macOS and Ctrl elsewhere. Plain keys are ignored while
 * typing; Mod shortcuts still work in fields, except Mod+Z which belongs to the field.
 */
export function useKeyboard(handlers: Record<string, Handler>, enabled = true) {
    const handlersRef = useRef(handlers);
    useEffect(() => { handlersRef.current = handlers; }, [handlers]);

    useEffect(() => {
        if (!enabled) return;
        const onKeyDown = (event: KeyboardEvent) => {
            const current = handlersRef.current;
            const active = document.activeElement as HTMLElement | null;
            const tag = (active?.tagName ?? "").toLowerCase();
            const typing = tag === "input" || tag === "textarea" || tag === "select" || active?.isContentEditable === true;

            if (event.key === "Escape") {
                current.Escape?.(event);
                return;
            }
            if (event.metaKey || event.ctrlKey) {
                const key = event.key.toLowerCase();
                const handler = current[`Mod+${key}`];
                if (!handler || (key === "z" && typing)) return;
                event.preventDefault();
                handler(event);
                return;
            }
            if (typing || event.altKey) return;
            const handler = current[event.key];
            if (!handler) return;
            event.preventDefault();
            handler(event);
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [enabled]);
}
