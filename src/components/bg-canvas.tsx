"use client";

import { useEffect, useRef } from "react";

interface Line {
    ax: number;
    ay: number;
    bx: number;
    by: number;
    phase: number;
    speed: number;
}

const colorChannels = (value: string) => {
    const hex = value.trim().replace("#", "");
    if (!/^[0-9a-f]{6}$/i.test(hex)) return "77, 171, 147";
    return `${parseInt(hex.slice(0, 2), 16)}, ${parseInt(hex.slice(2, 4), 16)}, ${parseInt(hex.slice(4, 6), 16)}`;
};

export function BgCanvas() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const pointer = useRef({ x: 0.5, y: 0.5 });

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas?.getContext("2d");
        if (!canvas || !context) return;

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const lines: Line[] = Array.from({ length: 16 }, () => ({
            ax: Math.random(),
            ay: Math.random(),
            bx: Math.random(),
            by: Math.random(),
            phase: Math.random() * Math.PI * 2,
            speed: 0.001 + Math.random() * 0.0015,
        }));

        let needsResize = true;
        let channels = colorChannels(getComputedStyle(canvas).getPropertyValue("--accent"));
        const onPointerMove = (event: PointerEvent) => {
            pointer.current = { x: event.clientX / window.innerWidth, y: event.clientY / window.innerHeight };
        };
        const onResize = () => { needsResize = true; };
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener("resize", onResize, { passive: true });
        const themeObserver = new MutationObserver(() => {
            channels = colorChannels(getComputedStyle(canvas).getPropertyValue("--accent"));
        });
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-mode"] });

        let frame = 0;
        let lastDraw = 0;
        let active = true;
        const draw = (timestamp = 0) => {
            if (!active || document.hidden) { frame = 0; return; }
            if (!reducedMotion && timestamp - lastDraw < 32) { frame = requestAnimationFrame(draw); return; }
            lastDraw = timestamp;
            const width = window.innerWidth;
            const height = window.innerHeight;
            const ratio = Math.min(window.devicePixelRatio || 1, 2);
            if (needsResize) {
                canvas.width = width * ratio;
                canvas.height = height * ratio;
                canvas.style.width = `${width}px`;
                canvas.style.height = `${height}px`;
                needsResize = false;
            }
            context.setTransform(ratio, 0, 0, ratio, 0, 0);
            context.clearRect(0, 0, width, height);

            const { x: pointerX, y: pointerY } = pointer.current;
            for (const line of lines) {
                if (!reducedMotion) line.phase += line.speed;
                const startX = line.ax * width;
                const startY = line.ay * height;
                const endX = line.bx * width;
                const endY = line.by * height;
                const controlX = ((line.ax + line.bx) / 2) * width + (pointerX - 0.5) * 80 + Math.sin(line.phase) * 55;
                const controlY = ((line.ay + line.by) / 2) * height + (pointerY - 0.5) * 80 + Math.cos(line.phase * 1.2) * 55;

                context.strokeStyle = `rgba(${channels}, 0.09)`;
                context.lineWidth = 0.65;
                context.beginPath();
                context.moveTo(startX, startY);
                context.quadraticCurveTo(controlX, controlY, endX, endY);
                context.stroke();

                context.fillStyle = `rgba(${channels}, 0.11)`;
                context.beginPath();
                context.arc(controlX, controlY, 1.2, 0, Math.PI * 2);
                context.fill();
            }

            if (!reducedMotion) frame = requestAnimationFrame(draw);
        };

        const onVisibility = () => {
            if (!document.hidden && !frame && !reducedMotion) frame = requestAnimationFrame(draw);
        };
        document.addEventListener("visibilitychange", onVisibility);

        draw();
        return () => {
            active = false;
            cancelAnimationFrame(frame);
            window.removeEventListener("pointermove", onPointerMove);
            window.removeEventListener("resize", onResize);
            document.removeEventListener("visibilitychange", onVisibility);
            themeObserver.disconnect();
        };
    }, []);

    return <canvas ref={canvasRef} className="bg-canvas" aria-hidden="true" />;
}
