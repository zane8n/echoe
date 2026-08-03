"use client";

import { useEffect, useRef } from "react";

export function BgCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: 0.5, y: 0.5 });
  const lines = useRef<{ ax: number; ay: number; bx: number; by: number; phase: number; speed: number }[]>([]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Generate abstract lines/arcs
    const count = 18;
    lines.current = Array.from({ length: count }, () => ({
      ax: Math.random(), ay: Math.random(),
      bx: Math.random(), by: Math.random(),
      phase: Math.random() * Math.PI * 2,
      speed: 0.0003 + Math.random() * 0.0008,
    }));

    const onMove = (e: MouseEvent | Touch) => {
      mouse.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", (e) => onMove(e.touches[0]), { passive: true });

    let raf = 0;
    const draw = () => {
      const w = canvas.width = window.innerWidth;
      const h = canvas.height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const mx = mouse.current.x;
      const my = mouse.current.y;

      lines.current.forEach((l) => {
        l.phase += l.speed;

        // Bezier control points sway with cursor
        const cx = (l.ax + mx * 0.6 + Math.sin(l.phase) * 0.25) * w;
        const cy = (l.ay + my * 0.6 + Math.cos(l.phase * 1.3) * 0.25) * h;
        const ex = (l.bx + mx * 0.4 + Math.cos(l.phase * 0.7) * 0.2) * w;
        const ey = (l.by + my * 0.4 + Math.sin(l.phase * 0.9) * 0.2) * h;

        ctx.strokeStyle = "rgba(140,130,120,0.10)";
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(l.ax * w, l.ay * h);
        ctx.quadraticCurveTo(cx, cy, ex, ey);
        ctx.stroke();

        // Soft glow point at cursor-influenced intersection
        const gx = l.ax * w + (mx - 0.5) * 120;
        const gy = l.ay * h + (my - 0.5) * 120;
        const grd = ctx.createRadialGradient(gx, gy, 0, gx, gy, 60);
        grd.addColorStop(0, "rgba(180,160,140,0.06)");
        grd.addColorStop(1, "rgba(180,160,140,0)");
        ctx.fillStyle = grd;
        ctx.fillRect(gx - 60, gy - 60, 120, 120);
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("mousemove", onMove); };
  }, []);

  return <canvas ref={ref} className="bg-canvas" aria-hidden="true" />;
}
