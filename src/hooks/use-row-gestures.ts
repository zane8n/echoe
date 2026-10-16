"use client";

import { useCallback, useEffect, useRef } from "react";

interface Options {
    onSwipeRight?: () => void;
    onSwipeLeft?: () => void;
    /** Opens a menu at the press point: a long touch, or a right-click. */
    onMenu?: (point: { x: number; y: number }) => void;
    leftKind?: "left" | "delete";
}

const THRESHOLD = 84;
const LONG_PRESS_MS = 460;

/**
 * Touch gestures for list rows: swipe sideways to act, press and hold for more.
 * Vertical scrolling stays with the browser (rows use touch-action: pan-y), and the
 * click that ends a gesture is swallowed so the row's link doesn't also open.
 */
export function useRowGestures({ onSwipeRight, onSwipeLeft, onMenu, leftKind = "left" }: Options) {
    const rowRef = useRef<HTMLElement | null>(null);
    const innerRef = useRef<HTMLElement | null>(null);
    const gesture = useRef<{ x: number; y: number; id: number; axis: "x" | "y" | null; dx: number; touch: boolean } | null>(null);
    const pressTimer = useRef<number | null>(null);
    const suppressClick = useRef(false);
    const menuOpenedAt = useRef(0);
    const options = useRef({ onSwipeRight, onSwipeLeft, onMenu, leftKind });
    useEffect(() => { options.current = { onSwipeRight, onSwipeLeft, onMenu, leftKind }; });

    const clearPress = () => { if (pressTimer.current) { window.clearTimeout(pressTimer.current); pressTimer.current = null; } };

    const settle = useCallback(() => {
        const row = rowRef.current;
        const inner = innerRef.current;
        if (!row || !inner) return;
        delete row.dataset.dragging;
        inner.style.transform = "";
        row.style.removeProperty("--reveal");
        window.setTimeout(() => { if (!row.dataset.dragging) delete row.dataset.swipe; }, 360);
    }, []);

    useEffect(() => () => clearPress(), []);

    const onPointerDown = (event: React.PointerEvent) => {
        if (event.button !== 0) return;
        const touch = event.pointerType !== "mouse";
        // Leave the screen edge to the system back gesture.
        if (touch && event.clientX <= 24) return;
        gesture.current = { x: event.clientX, y: event.clientY, id: event.pointerId, axis: null, dx: 0, touch };
        suppressClick.current = false;
        clearPress();
        if (touch && options.current.onMenu) {
            const point = { x: event.clientX, y: event.clientY };
            pressTimer.current = window.setTimeout(() => {
                pressTimer.current = null;
                if (gesture.current?.axis) return;
                suppressClick.current = true;
                gesture.current = null;
                try { navigator.vibrate?.(8); } catch { /* optional */ }
                menuOpenedAt.current = Date.now();
                options.current.onMenu?.(point);
            }, LONG_PRESS_MS);
        }
    };

    const onPointerMove = (event: React.PointerEvent) => {
        const state = gesture.current;
        const row = rowRef.current;
        const inner = innerRef.current;
        if (!state || !row || !inner || event.pointerId !== state.id) return;
        const dx = event.clientX - state.x;
        const dy = event.clientY - state.y;
        if (!state.axis) {
            if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
            clearPress();
            state.axis = Math.abs(dx) > Math.abs(dy) * 1.2 ? "x" : "y";
            if (state.axis === "x" && (!state.touch || (!options.current.onSwipeLeft && !options.current.onSwipeRight))) state.axis = "y";
            if (state.axis === "x") {
                row.dataset.dragging = "true";
                (event.currentTarget as HTMLElement).setPointerCapture?.(state.id);
            }
        }
        if (state.axis !== "x") return;
        let offset = dx;
        if ((dx > 0 && !options.current.onSwipeRight) || (dx < 0 && !options.current.onSwipeLeft)) offset = dx * 0.15;
        // Rubber-band past the trigger point.
        if (Math.abs(offset) > THRESHOLD) offset = Math.sign(offset) * (THRESHOLD + (Math.abs(offset) - THRESHOLD) * 0.35);
        state.dx = offset;
        row.dataset.swipe = offset > 0 ? "right" : options.current.leftKind;
        row.style.setProperty("--reveal", String(Math.min(1, Math.abs(offset) / THRESHOLD)));
        inner.style.transform = `translateX(${offset}px)`;
    };

    const onPointerUp = () => {
        clearPress();
        const state = gesture.current;
        gesture.current = null;
        if (!state || state.axis !== "x") return;
        suppressClick.current = true;
        const crossed = Math.abs(state.dx) >= THRESHOLD * 0.92;
        if (crossed && state.dx > 0) options.current.onSwipeRight?.();
        if (crossed && state.dx < 0) options.current.onSwipeLeft?.();
        settle();
    };

    const onPointerCancel = () => {
        clearPress();
        gesture.current = null;
        settle();
    };

    const onContextMenu = (event: React.MouseEvent) => {
        if (!options.current.onMenu) return;
        event.preventDefault();
        clearPress();
        // Android fires contextmenu after a long press we've already answered.
        if (Date.now() - menuOpenedAt.current < 900) return;
        gesture.current = null;
        menuOpenedAt.current = Date.now();
        options.current.onMenu({ x: event.clientX, y: event.clientY });
    };

    const onClickCapture = (event: React.MouseEvent) => {
        if (!suppressClick.current) return;
        suppressClick.current = false;
        event.preventDefault();
        event.stopPropagation();
    };

    return { rowRef, innerRef, handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onContextMenu, onClickCapture } };
}
