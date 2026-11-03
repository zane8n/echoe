"use client";

import { useId, useState } from "react";
import type { Anticipation } from "@/lib/anticipation";
import { Icon } from "./icon";

const HORIZON = 112;
// The sun climbs from just peeking over the horizon to high in the sky as the day nears.
const sunAt = (rise: number) => ({ x: 150 + rise * 32, y: HORIZON + 14 - rise * 84 });
const STARS = [[38, 22], [74, 46], [112, 16], [236, 30], [276, 58], [318, 20], [200, 12]] as const;

/** A countdown drawn as a sunrise: today's sun, and a faint outline of where it'll be tomorrow. */
export function Dawn({ look, name }: { look: Anticipation; name: string }) {
    const id = useId();
    const [counting, setCounting] = useState(false);
    const ahead = look.days >= 1;
    const sun = sunAt(look.rise);
    const next = sunAt(look.riseTomorrow);
    // Long waits move the sun a pixel a day; keep tomorrow's outline visibly a step higher.
    const ghost = { x: next.x, y: Math.min(next.y, sun.y - 8) };
    const sleeps = `${look.sleeps} ${look.sleeps === 1 ? "sleep" : "sleeps"}`;

    return (
        <section className="dawn" style={{ "--rise": look.rise } as React.CSSProperties} data-day={look.days === 0 || undefined} aria-label={`${name}: ${look.when}, ${look.date}`}>
            <svg className="dawn-scene" viewBox="0 0 360 150" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
                <defs>
                    <radialGradient id={`${id}-glow`}>
                        <stop offset="0" className="dawn-glow-core" />
                        <stop offset="1" className="dawn-glow-edge" />
                    </radialGradient>
                </defs>
                {STARS.map(([x, y]) => <circle key={`${x}-${y}`} className="dawn-star" cx={x} cy={y} r={1.3} />)}
                <g className="dawn-climb">
                    <circle cx={sun.x} cy={sun.y} r={88} fill={`url(#${id}-glow)`} />
                    {look.days === 0 && (
                        <g className="dawn-rays" style={{ transformOrigin: `${sun.x}px ${sun.y}px` }}>
                            {Array.from({ length: 12 }, (_, index) => {
                                const angle = (index / 12) * Math.PI * 2;
                                return <line key={index} x1={sun.x + Math.cos(angle) * 28} y1={sun.y + Math.sin(angle) * 28} x2={sun.x + Math.cos(angle) * 38} y2={sun.y + Math.sin(angle) * 38} />;
                            })}
                        </g>
                    )}
                    <circle className="dawn-sun" cx={sun.x} cy={sun.y} r={20} />
                </g>
                {ahead && (
                    <g className="dawn-ghost">
                        <circle cx={ghost.x} cy={ghost.y} r={20} />
                        <text x={ghost.x + 27} y={ghost.y + 4}>tomorrow</text>
                    </g>
                )}
                <path className="dawn-ground" d={`M0 ${HORIZON - 4} C 54 ${HORIZON - 16}, 104 ${HORIZON - 10}, 160 ${HORIZON} S 288 ${HORIZON - 18}, 360 ${HORIZON - 6} V150 H0 Z`} />
            </svg>

            <div className="dawn-copy">
                {ahead ? (
                    <button type="button" className="dawn-when" aria-pressed={counting} onClick={() => setCounting(!counting)} title={counting ? "Back to the gentle view" : "Count the sleeps"}>
                        <strong>{counting ? sleeps : look.when}</strong>
                        <span>{counting ? `until ${look.date}` : look.date}<Icon name="moon" size={13} /></span>
                    </button>
                ) : (
                    <div className="dawn-when">
                        <strong>{look.when}</strong>
                        <span>{look.date}</span>
                    </div>
                )}
                <p className="dawn-line"><Icon name={ahead ? "sunrise" : "sparkle"} size={17} />{look.line}</p>
            </div>
        </section>
    );
}

/** The compact version for rows and tiles: a filling bar with a faint step for tomorrow. */
export function DawnBar({ percent, tomorrow }: { percent: number; tomorrow?: number }) {
    return (
        <span className="dawn-bar" aria-hidden="true" style={{ "--p": `${percent}%`, "--t": `${tomorrow ?? percent}%` } as React.CSSProperties}>
            {tomorrow !== undefined && percent < 100 && <span className="dawn-bar-ahead" />}
            <span className="dawn-bar-fill" />
            <span className="dawn-bar-sun" />
        </span>
    );
}
