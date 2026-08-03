"use client";

import { useEffect } from "react";
import { CONFETTI_COLORS } from "@/lib/constants";

interface Props { active: boolean; onDone: () => void; }

const fraction = (seed: number) => {
    const value = Math.sin(seed * 12.9898) * 43758.5453;
    return value - Math.floor(value);
};

export function Confetti({ active, onDone }: Props) {
    useEffect(() => {
        if (!active) return;
        const timer = setTimeout(onDone, 3500);
        return () => clearTimeout(timer);
    }, [active, onDone]);

    if (!active) return null;
    const pieces = Array.from({ length: 60 }, (_, index) => ({
        id: index,
        left: `${fraction(index + 1) * 100}%`,
        top: `${fraction(index + 101) * -20}%`,
        duration: `${2 + fraction(index + 201) * 2.6}s`,
        spin: `${360 + fraction(index + 301) * 720}deg`,
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        delay: `${fraction(index + 401) * 0.4}s`,
        width: 6 + fraction(index + 501) * 10,
        height: 8 + fraction(index + 601) * 14,
    }));

    return (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-100 overflow-hidden">
            {pieces.map((piece) => (
                <span
                    key={piece.id}
                    className="absolute rounded-[2px]"
                    style={{
                        left: piece.left,
                        top: piece.top,
                        width: `${piece.width}px`,
                        height: `${piece.height}px`,
                        background: piece.color,
                        animation: `confetti-fall ${piece.duration} cubic-bezier(0.16, 1, 0.3, 1) ${piece.delay} forwards`,
                        "--spin": piece.spin,
                    } as React.CSSProperties}
                />
            ))}
        </div>
    );
}
