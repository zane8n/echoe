"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { Icon } from "./icon";

interface SheetContextValue {
    close: () => void;
    dragHandlers: {
        onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
        onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
        onPointerUp: (event: React.PointerEvent<HTMLElement>) => void;
        onPointerCancel: (event: React.PointerEvent<HTMLElement>) => void;
    };
}

const SheetContext = createContext<SheetContextValue | null>(null);

/** Close the surrounding sheet with its exit animation. */
export function useSheet() {
    const context = useContext(SheetContext);
    if (!context) throw new Error("useSheet must be used inside a Sheet");
    return context;
}

const FOCUSABLE = "button:not([disabled]), [href], input:not([disabled]):not([type='hidden']), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";
const isDesktop = () => typeof window !== "undefined" && window.matchMedia("(min-width: 720px)").matches;
const prefersReducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface Props {
    onClose: () => void;
    label?: string;
    labelledBy?: string;
    size?: "sm" | "md" | "lg" | "full";
    hue?: string;
    className?: string;
    /** Element to focus on open. On touch screens it is only focused when focusOnTouch is set, so the keyboard doesn't jump up uninvited. */
    initialFocus?: React.RefObject<HTMLElement | null>;
    focusOnTouch?: boolean;
    children: React.ReactNode;
}

export function Sheet({ onClose, label, labelledBy, size = "md", hue, className = "", initialFocus, focusOnTouch = false, children }: Props) {
    const sheetRef = useRef<HTMLElement>(null);
    const backdropRef = useRef<HTMLDivElement>(null);
    const onCloseRef = useRef(onClose);
    const closing = useRef(false);
    const mounted = useRef(true);
    const drag = useRef<{ y: number; time: number; offset: number; active: boolean; id: number } | null>(null);

    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    useEffect(() => {
        mounted.current = true;
        const previous = document.activeElement as HTMLElement | null;
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const fine = window.matchMedia("(pointer: fine)").matches;
        const timer = window.setTimeout(() => {
            // Someone already reached into the sheet; don't pull focus out from under them.
            if (sheetRef.current?.contains(document.activeElement)) return;
            const target = initialFocus?.current && (fine || focusOnTouch) ? initialFocus.current : sheetRef.current;
            target?.focus({ preventScroll: true });
        }, 40);
        return () => {
            mounted.current = false;
            window.clearTimeout(timer);
            document.body.style.overflow = previousOverflow;
            if (previous && document.contains(previous)) previous.focus({ preventScroll: true });
        };
        // Focus is decided once, when the sheet opens.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const finish = useCallback(() => { if (mounted.current) onCloseRef.current(); }, []);

    const close = useCallback((fromOffset = 0) => {
        if (closing.current) return;
        closing.current = true;
        const sheet = sheetRef.current;
        if (!sheet || typeof sheet.animate !== "function" || prefersReducedMotion()) { finish(); return; }
        const desktop = isDesktop();
        const animation = sheet.animate(
            desktop
                ? [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "scale(.97) translateY(6px)" }]
                : [{ transform: `translateY(${fromOffset}px)` }, { transform: "translateY(100%)" }],
            { duration: desktop ? 150 : 240, easing: "cubic-bezier(.4, 0, 1, 1)", fill: "forwards" },
        );
        backdropRef.current?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: desktop ? 150 : 240, fill: "forwards" });
        animation.finished.then(finish, finish);
    }, [finish]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            close();
            return;
        }
        if (event.key !== "Tab") return;
        const focusable = Array.from(sheetRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable.at(-1)!;
        if (event.shiftKey && (document.activeElement === first || document.activeElement === sheetRef.current)) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    };

    // Drag the header down to dismiss, on phones. Interactive elements keep their taps.
    const dragHandlers = useMemo<SheetContextValue["dragHandlers"]>(() => ({
        onPointerDown: (event) => {
            if (isDesktop() || event.button !== 0 || (event.target as HTMLElement).closest("button, a, input, textarea, select")) return;
            drag.current = { y: event.clientY, time: performance.now(), offset: 0, active: false, id: event.pointerId };
        },
        onPointerMove: (event) => {
            const state = drag.current;
            const sheet = sheetRef.current;
            if (!state || !sheet) return;
            const delta = event.clientY - state.y;
            if (!state.active) {
                if (Math.abs(delta) < 6) return;
                state.active = true;
                sheet.dataset.dragging = "true";
                (event.currentTarget as HTMLElement).setPointerCapture?.(state.id);
            }
            // Resist upward drags so the sheet feels anchored, not stuck.
            state.offset = delta > 0 ? delta : delta * 0.18;
            sheet.style.transform = `translateY(${state.offset}px)`;
            if (backdropRef.current) backdropRef.current.style.opacity = String(Math.max(0.2, 1 - Math.max(0, state.offset) / (sheet.offsetHeight || 1)));
        },
        onPointerUp: () => {
            const state = drag.current;
            const sheet = sheetRef.current;
            drag.current = null;
            if (!state?.active || !sheet) return;
            const velocity = state.offset / Math.max(1, performance.now() - state.time);
            delete sheet.dataset.dragging;
            if (state.offset > Math.min(140, sheet.offsetHeight * 0.3) || velocity > 0.55) {
                close(state.offset);
                return;
            }
            sheet.style.transition = "transform 380ms cubic-bezier(.34, 1.36, .64, 1)";
            sheet.style.transform = "";
            if (backdropRef.current) { backdropRef.current.style.transition = "opacity 300ms"; backdropRef.current.style.opacity = ""; }
            window.setTimeout(() => { sheet.style.transition = ""; }, 400);
        },
        onPointerCancel: () => {
            const sheet = sheetRef.current;
            drag.current = null;
            if (!sheet) return;
            delete sheet.dataset.dragging;
            sheet.style.transform = "";
            if (backdropRef.current) backdropRef.current.style.opacity = "";
        },
    }), [close]);

    const value = useMemo(() => ({ close: () => close(), dragHandlers }), [close, dragHandlers]);

    return (
        <SheetContext.Provider value={value}>
            <div ref={backdropRef} className="acrylic-backdrop" onClick={() => close()} />
            <aside
                ref={sheetRef}
                className={`sheet acrylic-surface ${className}`}
                data-size={size}
                data-hue={hue}
                role="dialog"
                aria-modal="true"
                aria-label={labelledBy ? undefined : label}
                aria-labelledby={labelledBy}
                tabIndex={-1}
                onKeyDown={handleKeyDown}
                onAnimationEnd={(event) => { if (event.target === event.currentTarget) event.currentTarget.dataset.entered = "true"; }}
            >
                {children}
            </aside>
        </SheetContext.Provider>
    );
}

interface HeaderProps {
    title: React.ReactNode;
    titleId?: string;
    kicker?: React.ReactNode;
    description?: React.ReactNode;
    closeLabel?: string;
    actions?: React.ReactNode;
}

export function SheetHeader({ title, titleId, kicker, description, closeLabel = "Close", actions }: HeaderProps) {
    const { close, dragHandlers } = useSheet();
    return (
        <div className="sheet-drag" {...dragHandlers}>
            <span className="sheet-grabber" aria-hidden="true" />
            <header className="sheet-header">
                <div className="min-w-0">
                    {kicker && <div className="sheet-kicker">{kicker}</div>}
                    <h2 id={titleId}>{title}</h2>
                    {description && <p>{description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    {actions}
                    <button type="button" onClick={close} className="icon-btn" aria-label={closeLabel} title="Close">
                        <Icon name="x" size={20} />
                    </button>
                </div>
            </header>
        </div>
    );
}

export function SheetBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <div className={`sheet-body ${className}`}>{children}</div>;
}

export function SheetFooter({ children, className = "" }: { children: React.ReactNode; className?: string }) {
    return <footer className={`sheet-footer ${className}`}>{children}</footer>;
}
