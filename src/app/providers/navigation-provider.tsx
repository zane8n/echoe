"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";

export type NavDirection = "forward" | "back" | "tab-left" | "tab-right" | "fade";

export const TAB_PATHS = ["/", "/paths", "/momentum", "/friends"] as const;

const clean = (href: string) => href.split(/[?#]/)[0] || "/";
const depth = (href: string) => clean(href).split("/").filter(Boolean).length;

/** Which top-level tab a path belongs to, or -1. */
export function tabIndexOf(href: string): number {
    const path = clean(href);
    if (path === "/") return 0;
    return TAB_PATHS.findIndex((tab, index) => index > 0 && (path === tab || path.startsWith(`${tab}/`)));
}

/** Spatial model: deeper pages push in from the right, tabs slide by their order. */
export function directionFor(from: string, to: string): NavDirection {
    const a = depth(from);
    const b = depth(to);
    if (b > a) return "forward";
    if (b < a) return "back";
    const i = tabIndexOf(from);
    const j = tabIndexOf(to);
    if (i >= 0 && j >= 0 && i !== j) return j > i ? "tab-right" : "tab-left";
    return "fade";
}

interface NavigationValue {
    navigate: (href: string, direction?: NavDirection) => void;
    back: () => void;
    replace: (href: string) => void;
}

const NavigationContext = createContext<NavigationValue | null>(null);

/** Null outside the app shell (isolated component tests), where links behave as plain links. */
export const useNavigation = () => useContext(NavigationContext);

type TransitionDocument = Document & { startViewTransition?: (update: () => Promise<void>) => { finished: Promise<void> } };

export function NavigationProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const pending = useRef<(() => void) | null>(null);
    const navigatedWithinApp = useRef(false);

    // The new route has committed; let the view transition snapshot it.
    useEffect(() => {
        const resolve = pending.current;
        pending.current = null;
        resolve?.();
    }, [pathname]);

    const transition = useCallback((direction: NavDirection, update: () => void) => {
        const doc = document as TransitionDocument;
        if (!doc.startViewTransition || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
            update();
            return;
        }
        const root = document.documentElement;
        root.dataset.nav = direction;
        const viewTransition = doc.startViewTransition(() => new Promise<void>((resolve) => {
            // Never hold the screen frozen for long if a route is slow to arrive.
            const timer = window.setTimeout(resolve, 450);
            pending.current = () => { window.clearTimeout(timer); resolve(); };
            update();
        }));
        viewTransition.finished.finally(() => { if (root.dataset.nav === direction) delete root.dataset.nav; });
    }, []);

    const navigate = useCallback((href: string, direction?: NavDirection) => {
        navigatedWithinApp.current = true;
        if (clean(href) === pathname && !href.includes("?")) return;
        transition(direction ?? directionFor(pathname, href), () => router.push(href));
    }, [pathname, router, transition]);

    const back = useCallback(() => {
        if (navigatedWithinApp.current && window.history.length > 1) {
            transition("back", () => router.back());
            return;
        }
        const segments = clean(pathname).split("/").filter(Boolean);
        const parent = segments.length > 1 ? `/${segments.slice(0, -1).join("/")}` : "/";
        navigatedWithinApp.current = true;
        transition("back", () => router.push(parent));
    }, [pathname, router, transition]);

    const replace = useCallback((href: string) => {
        navigatedWithinApp.current = true;
        router.replace(href);
    }, [router]);

    const value = useMemo(() => ({ navigate, back, replace }), [navigate, back, replace]);
    return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}
