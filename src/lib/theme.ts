import { ACCENTS, NEUTRAL } from "./constants";
import type { AccentName, Appearance } from "./types";

let media: MediaQueryList | null = null;
let activeAccent: AccentName = "blue";
let activeAppearance: Appearance = "system";
let activeRoot: HTMLElement | undefined;

function resolveDark(appearance: Appearance): boolean {
    if (appearance === "dark") return true;
    if (appearance === "light") return false;
    return media?.matches ?? false;
}

function paint(root: HTMLElement, accentName: AccentName, appearance: Appearance): void {
    const accent = ACCENTS[accentName] ?? ACCENTS.blue;
    const dark = resolveDark(appearance);
    const neutral = dark ? NEUTRAL.dark : NEUTRAL.light;
    const accentVariant = dark ? accent.dark : accent.light;
    root.dataset.accent = accent.name;
    root.dataset.mode = dark ? "dark" : "light";
    root.style.setProperty("--bg", neutral.bg);
    root.style.setProperty("--surface", neutral.surface);
    root.style.setProperty("--panel", neutral.panel);
    root.style.setProperty("--ink", neutral.ink);
    root.style.setProperty("--ink-soft", neutral.inkSoft);
    root.style.setProperty("--muted", neutral.muted);
    root.style.setProperty("--line", neutral.line);
    root.style.setProperty("--line-strong", neutral.lineStrong);
    root.style.setProperty("--accent", accentVariant.accent);
    root.style.setProperty("--accent-ink", accentVariant.accentInk);
    root.style.setProperty("--on-accent", accent.onAccent);
    root.style.colorScheme = dark ? "dark" : "light";
}

export function applyTheme(accent: AccentName, appearance: Appearance, root?: HTMLElement): void {
    const target = root ?? (typeof document === "undefined" ? undefined : document.documentElement);
    if (!target) return;
    activeAccent = accent;
    activeAppearance = appearance;
    activeRoot = target;
    if (typeof window !== "undefined" && !media) {
        media = window.matchMedia("(prefers-color-scheme: dark)");
        media.addEventListener("change", () => {
            if (activeRoot && activeAppearance === "system") paint(activeRoot, activeAccent, activeAppearance);
        });
    }
    paint(target, accent, appearance);
}
