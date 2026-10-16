"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "./icon";

export interface MenuAction {
    label: string;
    icon?: IconName;
    onSelect: () => void;
    tone?: "danger";
    separatorBefore?: boolean;
}

interface Props {
    x: number;
    y: number;
    title?: string;
    actions: MenuAction[];
    onClose: () => void;
}

/** A small floating menu at a point, used for long-press and right-click shortcuts. */
export function ActionMenu({ x, y, title, actions, onClose }: Props) {
    const menuRef = useRef<HTMLDivElement>(null);
    const openedAt = useRef(0);
    const onCloseRef = useRef(onClose);
    const [position, setPosition] = useState({ left: x, top: y, origin: "top left" });

    useLayoutEffect(() => {
        const menu = menuRef.current;
        if (!menu) return;
        const { width, height } = menu.getBoundingClientRect();
        const margin = 12;
        const flipX = x + width > window.innerWidth - margin;
        const flipY = y + height > window.innerHeight - margin;
        setPosition({
            left: Math.max(margin, flipX ? x - width : x),
            top: Math.max(margin, flipY ? y - height : y),
            origin: `${flipY ? "bottom" : "top"} ${flipX ? "right" : "left"}`,
        });
    }, [x, y]);

    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    useEffect(() => {
        openedAt.current = Date.now();
        const previous = document.activeElement as HTMLElement | null;
        menuRef.current?.querySelector<HTMLElement>("[role='menuitem']")?.focus({ preventScroll: true });
        const close = () => onCloseRef.current();
        window.addEventListener("resize", close);
        window.addEventListener("scroll", close, { passive: true, capture: true });
        return () => {
            window.removeEventListener("resize", close);
            window.removeEventListener("scroll", close, { capture: true });
            previous?.focus?.({ preventScroll: true });
        };
    }, []);

    const onKeyDown = (event: React.KeyboardEvent) => {
        const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("[role='menuitem']") ?? []);
        const index = items.indexOf(document.activeElement as HTMLElement);
        if (event.key === "Escape" || event.key === "Tab") { event.preventDefault(); event.stopPropagation(); onClose(); }
        if (event.key === "ArrowDown") { event.preventDefault(); items[(index + 1) % items.length]?.focus(); }
        if (event.key === "ArrowUp") { event.preventDefault(); items[(index - 1 + items.length) % items.length]?.focus(); }
    };

    return createPortal(
        <div className="menu-layer" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }} onContextMenu={(event) => {
            event.preventDefault();
            // A long press ends with the browser's own contextmenu landing here; that isn't a dismissal.
            if (Date.now() - openedAt.current > 700) onClose();
        }}>
            <div ref={menuRef} className="menu" role="menu" aria-label={title ?? "Actions"} style={{ left: position.left, top: position.top, "--origin": position.origin } as React.CSSProperties} onKeyDown={onKeyDown}>
                {title && <div className="menu-title" aria-hidden="true">{title}</div>}
                {actions.map((action) => (
                    <div key={action.label}>
                        {action.separatorBefore && <div className="menu-sep" role="separator" />}
                        <button type="button" role="menuitem" className="menu-item" data-tone={action.tone} onClick={() => { onClose(); action.onSelect(); }}>
                            {action.icon && <Icon name={action.icon} size={18} />}
                            {action.label}
                        </button>
                    </div>
                ))}
            </div>
        </div>,
        document.body,
    );
}
