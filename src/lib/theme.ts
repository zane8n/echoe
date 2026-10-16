import { ACCENTS, THEME_COLOR } from "./constants";
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

// Only the accent hue is written here; globals.css derives the tinted neutral shell from it
// per mode, so switching accents recolours the whole app rather than just its buttons.
function paint(root: HTMLElement, accentName: AccentName, appearance: Appearance): void {
    const accent = ACCENTS[accentName] ?? ACCENTS.blue;
    const dark = resolveDark(appearance);
    const variant = dark ? accent.dark : accent.light;
    root.dataset.accent = accent.name;
    root.dataset.mode = dark ? "dark" : "light";
    root.style.setProperty("--accent", variant.accent);
    root.style.setProperty("--accent-ink", variant.ink);
    root.style.setProperty("--accent-fill", variant.fill);
    root.style.setProperty("--on-accent", variant.onFill);
    root.style.colorScheme = dark ? "dark" : "light";
    if (typeof document !== "undefined" && root === document.documentElement) {
        for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) meta.content = dark ? THEME_COLOR.dark : THEME_COLOR.light;
    }
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
