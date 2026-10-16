"use client";

import { useEffect, useRef, useState } from "react";
import type { Origin } from "@/app/providers/dashboard-provider";

interface Props {
    done: boolean;
    label: string;
    onToggle: (origin: Origin) => void;
    /** Weekly targets above one draw as segments around the ring. */
    progress?: { done: number; target: number };
    size?: "md" | "lg";
    disabled?: boolean;
}

const SIZE = 46;
const RADIUS = 21;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function CheckButton({ done, label, onToggle, progress, size = "md", disabled }: Props) {
    const [ripples, setRipples] = useState<number[]>([]);
    const wasDone = useRef(done);

    // Echo outward only on the transition into done, whatever caused it.
    useEffect(() => {
        if (done && !wasDone.current) {
            const id = Date.now();
            const timer = window.setTimeout(() => setRipples((current) => [...current, id]), 0);
            const cleanup = window.setTimeout(() => setRipples((current) => current.filter((item) => item !== id)), 1000);
            wasDone.current = done;
            return () => { window.clearTimeout(timer); window.clearTimeout(cleanup); };
        }
        wasDone.current = done;
    }, [done]);

    const segments = progress && progress.target > 1 ? progress.target : 1;
    const gap = segments > 1 ? 7 : 0;
    const segment = CIRCUMFERENCE / segments - gap;

    return (
        <button
            type="button"
            className={`check ${size === "lg" ? "check-lg" : ""}`}
            aria-pressed={done}
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={(event) => {
                const rect = event.currentTarget.getBoundingClientRect();
                onToggle({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
            }}
        >
            <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
                <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} className="check-bg" />
                {Array.from({ length: segments }, (_, index) => (
                    <circle
                        key={index}
                        cx={SIZE / 2}
                        cy={SIZE / 2}
                        r={RADIUS}
                        className={progress && index < progress.done ? "check-seg" : "check-track"}
                        strokeDasharray={segments > 1 ? `${segment} ${CIRCUMFERENCE - segment}` : undefined}
                        transform={`rotate(${-90 + (360 / segments) * index + (segments > 1 ? (gap / CIRCUMFERENCE) * 180 : 0)} ${SIZE / 2} ${SIZE / 2})`}
                    />
                ))}
                <path d="M16 23.5l5 5L30 19" className="check-hint" />
                <circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} className="check-fill" />
                <path d="M15 23.5l5.5 5.5L31.5 18" className="check-tick" />
            </svg>
            {progress && progress.target > 1 && <span className="check-count" aria-hidden="true">{progress.done}</span>}
            {ripples.map((id) => <span key={id} aria-hidden="true"><span className="check-ripple" /><span className="check-ripple" /></span>)}
        </button>
    );
}
