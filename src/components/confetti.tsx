"use client";

import { useEffect, useState, useCallback } from "react";

interface Props {
    active: boolean;
    onDone: () => void;
}

const COLORS = ["#f0a04b", "#e8735a", "#4dab93", "#9b8ec4", "#7dbf8e", "#71b7d9", "#f5c26b", "#e8977a", "#5ec4ad", "#b8aed6"];

interface Piece {
    id: number;
    left: string;
    top: string;
    duration: string;
    spin: string;
    color: string;
    delay: string;
    width: number;
    height: number;
}

export function Confetti({ active, onDone }: Props) {
    const [pieces, setPieces] = useState<Piece[]>([]);

    const fire = useCallback(() => {
        const arr: Piece[] = [];
        for (let i = 0; i < 60; i++) {
            arr.push({
                id: i,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * -20}%`,
                duration: `${2 + Math.random() * 2.6}s`,
                spin: `${360 + Math.random() * 720}deg`,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
                delay: `${Math.random() * 0.4}s`,
                width: 6 + Math.random() * 10,
                height: 8 + Math.random() * 14,
            });
        }
        setPieces(arr);
    }, []);

    useEffect(() => {
        if (active) {
            fire();
            const t = setTimeout(() => {
                setPieces([]);
                onDone();
            }, 3500);
            return () => clearTimeout(t);
        }
    }, [active, fire, onDone]);

    if (!active && pieces.length === 0) return null;

    return (
        <div aria-hidden="true" className="fixed inset-0 z-100 pointer-events-none overflow-hidden">
            {pieces.map((p) => (
                <div
                    key={p.id}
                    className="absolute rounded-[2px]"
                    style={{
                        left: p.left,
                        top: p.top,
                        width: `${p.width}px`,
                        height: `${p.height}px`,
                        background: p.color,
                        animation: `confetti-fall ${p.duration} cubic-bezier(0.16, 1, 0.3, 1) forwards`,
                        animationDelay: p.delay,
                        animationName: "confetti-fall",
                        // @ts-expect-error custom property
                        "--spin": p.spin,
                    }}
                />
            ))}
            <style jsx>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20vh) rotate(0deg) scale(1); opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translateY(110vh) rotate(var(--spin, 720deg)) scale(0.3); opacity: 0; }
        }
      `}</style>
        </div>
    );
}
