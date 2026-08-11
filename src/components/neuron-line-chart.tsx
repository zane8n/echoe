"use client";

import type { CSSProperties } from "react";

interface Props {
    values: number[];
    titles: string[];
    ariaLabel: string;
    compact?: boolean;
}

interface Point { x: number; y: number; }

const smoothPath = (points: Point[]) => {
    if (!points.length) return "";
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let index = 0; index < points.length - 1; index += 1) {
        const p0 = points[index - 1] ?? points[index];
        const p1 = points[index];
        const p2 = points[index + 1];
        const p3 = points[index + 2] ?? p2;
        const control1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
        const control2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
        path += ` C ${control1.x} ${control1.y}, ${control2.x} ${control2.y}, ${p2.x} ${p2.y}`;
    }
    return path;
};

export function NeuronLineChart({ values, titles, ariaLabel, compact = false }: Props) {
    const width = 720;
    const height = compact ? 112 : 180;
    const padX = 18;
    const padY = compact ? 16 : 24;
    const maximum = Math.max(1, ...values);
    const baseline = height - padY;
    const points = values.map((value, index) => ({
        x: padX + (index * (width - padX * 2)) / Math.max(1, values.length - 1),
        y: baseline - (value / maximum) * (height - padY * 2),
    }));
    const line = smoothPath(points);
    const area = points.length ? `${line} L ${points.at(-1)?.x ?? padX} ${baseline} L ${points[0].x} ${baseline} Z` : "";

    return <div className="neuron-chart" data-compact={compact}>
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" role="img" aria-label={ariaLabel}>
            <path className="neuron-chart-area" d={area} />
            <path className="neuron-chart-line" d={line} />
        </svg>
        {points.map((point, index) => {
            const title = titles[index] ?? `${values[index]} activity points`;
            const position = { "--node-x": `${(point.x / width) * 100}%`, "--node-y": `${(point.y / height) * 100}%` } as CSSProperties;
            return <span key={`${point.x}:${index}`} className="neuron-node" style={position} title={title} aria-hidden="true">
                <span className="neuron-node-halo" data-compact={compact} />
                <span className="neuron-node-core" data-empty={values[index] === 0} />
            </span>;
        })}
    </div>;
}
