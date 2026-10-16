"use client";

import { useEffect } from "react";
import type { CelebrationState } from "@/app/providers/dashboard-provider";

interface Props { celebration: CelebrationState | null; onDone: () => void }

const fraction = (seed: number) => {
    const value = Math.sin(seed * 12.9898) * 43758.5453;
    return value - Math.floor(value);
};

/** Concentric echoes from the point you tapped; bigger moments ripple across the whole screen. */
export function EchoBurst({ celebration, onDone }: Props) {
    useEffect(() => {
        if (!celebration) return;
        const timer = window.setTimeout(onDone, celebration.big ? 1900 : 1200);
        return () => window.clearTimeout(timer);
    }, [celebration, onDone]);

    if (!celebration) return null;
    const { x, y, big, hue, id } = celebration;
    const reach = big ? Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y)) / 12 : 4;
    const rings = big ? 4 : 2;
    const sparks = big ? 14 : 0;
    return (
        <div key={id} className="echo-layer" data-big={big} data-hue={hue} aria-hidden="true">
            {Array.from({ length: rings }, (_, index) => (
                <span key={`ring-${index}`} className="echo-ring" style={{ left: x, top: y, animationDelay: `${index * 170}ms`, "--to": reach * (1 - index * 0.12) } as React.CSSProperties} />
            ))}
            {Array.from({ length: sparks }, (_, index) => {
                const angle = (index / sparks) * Math.PI * 2 + fraction(index + id) * 0.4;
                const distance = 70 + fraction(index * 7 + id) * 110;
                return <span key={`spark-${index}`} className="echo-spark" style={{ left: x, top: y, animationDelay: `${60 + fraction(index + 3) * 120}ms`, "--dx": `${Math.cos(angle) * distance}px`, "--dy": `${Math.sin(angle) * distance}px` } as React.CSSProperties} />;
            })}
        </div>
    );
}
