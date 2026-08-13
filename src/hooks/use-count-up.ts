"use client";

import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function useCountUp(target: number, duration = 600): number {
    const [value, setValue] = useState(target);
    const fromRef = useRef(target);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        const from = fromRef.current;
        if (from === target || prefersReducedMotion()) {
            fromRef.current = target;
            setValue(target);
            return;
        }
        const start = performance.now();
        const tick = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - t, 3);
            setValue(from + (target - from) * eased);
            if (t < 1) {
                rafRef.current = requestAnimationFrame(tick);
            } else {
                fromRef.current = target;
            }
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current); };
    }, [target, duration]);

    return value;
}
