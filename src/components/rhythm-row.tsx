"use client";

import { useState } from "react";
import type { Origin } from "@/app/providers/dashboard-provider";
import { useRowGestures } from "@/hooks/use-row-gestures";
import type { HabitEntry } from "@/lib/types";
import { ActionMenu, type MenuAction } from "./action-menu";
import { BeatStrip } from "./beat-strip";
import { CheckButton } from "./check-button";
import { Icon } from "./icon";
import { TransitionLink } from "./transition-link";

export interface RhythmRowProps {
    hue: string;
    title: string;
    meta: React.ReactNode;
    href?: string;
    entries?: Array<Pick<HabitEntry, "date" | "status">>;
    done: boolean;
    progress?: { done: number; target: number };
    checkLabel: string;
    onToggle: (origin: Origin) => void;
    onSwipeLeft?: () => void;
    swipeLeftLabel?: string;
    menu?: MenuAction[];
    featured?: boolean;
    insight?: string;
    footer?: React.ReactNode;
    /** Shared element name, so the title can glide into the detail page. */
    transitionName?: string;
}

export function RhythmRow({ hue, title, meta, href, entries, done, progress, checkLabel, onToggle, onSwipeLeft, swipeLeftLabel = "Missed", menu, featured, insight, footer, transitionName }: RhythmRowProps) {
    const [menuAt, setMenuAt] = useState<{ x: number; y: number } | null>(null);
    const { rowRef, innerRef, handlers } = useRowGestures({
        onSwipeRight: () => {
            const rect = innerRef.current?.querySelector(".check")?.getBoundingClientRect();
            onToggle(rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: window.innerWidth - 40, y: window.innerHeight / 2 });
        },
        onSwipeLeft,
        onMenu: menu?.length ? setMenuAt : undefined,
    });

    const titleContent = <strong style={transitionName ? { viewTransitionName: transitionName } : undefined}>{title}</strong>;
    const body = (
        <>
            <span className="rhythm-title">
                {titleContent}
                {featured && <span className="focus-tag"><Icon name="pin" size={12} />Focus</span>}
            </span>
            <span className="rhythm-meta">
                <span>{meta}</span>
                {entries && <BeatStrip entries={entries} days={featured ? 21 : 10} size={featured ? "md" : "sm"} />}
            </span>
            {insight && <span className="rhythm-insight">{insight}</span>}
        </>
    );

    return (
        <li ref={rowRef as React.RefObject<HTMLLIElement>} className="rhythm-row" data-hue={hue} data-done={done} data-featured={featured || undefined} {...handlers}>
            <div className="swipe-reveal" aria-hidden="true">
                <span><Icon name={done ? "undo" : "check"} size={18} />{done ? "Undo" : "Done"}</span>
                <span>{swipeLeftLabel}<Icon name="minus" size={18} /></span>
            </div>
            <div ref={innerRef as React.RefObject<HTMLDivElement>} className="rhythm-row-inner">
                {href
                    ? <TransitionLink href={href} className="rhythm-link" draggable={false}>{body}</TransitionLink>
                    : <div className="rhythm-link">{body}</div>}
                {menu?.length ? (
                    <button type="button" className="icon-btn icon-btn-sm rhythm-more" aria-label={`More for ${title}`} onClick={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setMenuAt({ x: rect.right, y: rect.bottom + 4 }); }}>
                        <Icon name="more-horiz" size={18} />
                    </button>
                ) : null}
                <CheckButton done={done} progress={progress} label={checkLabel} onToggle={onToggle} size={featured ? "lg" : "md"} />
            </div>
            {footer && <div className="rhythm-footer">{footer}</div>}
            {menuAt && menu && <ActionMenu x={menuAt.x} y={menuAt.y} title={title} actions={menu} onClose={() => setMenuAt(null)} />}
        </li>
    );
}
