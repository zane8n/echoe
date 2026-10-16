"use client";

import { useEffect, useState } from "react";

/**
 * scrolled: the page has moved off the top (the top bar gains its backdrop).
 * compact: the reader is heading down the page, so the bottom bar can step aside.
 */
export function useScrollChrome(resetKey: string) {
    const [scrolled, setScrolled] = useState(false);
    const [compact, setCompact] = useState(false);

    useEffect(() => {
        let last = window.scrollY;
        let frame = 0;
        const update = () => {
            frame = 0;
            const y = window.scrollY;
            const delta = y - last;
            setScrolled(y > 4);
            if (y < 80) setCompact(false);
            else if (delta > 6) setCompact(true);
            else if (delta < -6) setCompact(false);
            if (Math.abs(delta) > 6 || y < 80) last = y;
        };
        const onScroll = () => { if (!frame) frame = window.requestAnimationFrame(update); };
        const reset = window.setTimeout(() => { setCompact(false); setScrolled(window.scrollY > 4); }, 0);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            window.clearTimeout(reset);
            window.removeEventListener("scroll", onScroll);
            if (frame) window.cancelAnimationFrame(frame);
        };
    }, [resetKey]);

    return { scrolled, compact };
}
