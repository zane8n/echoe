import { THEMES } from "./constants";
import type { ThemeName, ThemeVariant } from "./types";

const properties: Record<string, keyof ThemeVariant> = {
    "--bg": "bg",
    "--surface": "surface",
    "--ink": "ink",
    "--ink-soft": "inkSoft",
    "--muted": "muted",
    "--line": "line",
    "--accent": "accent",
    "--accent-ink": "accentInk",
    "--on-accent": "onAccent",
};

let media: MediaQueryList | null = null;
let activeTheme: ThemeName = "blue";
let activeRoot: HTMLElement | undefined;

function paint(root: HTMLElement, themeName: ThemeName): void {
    const theme = THEMES[themeName] ?? THEMES.blue;
    const dark = media?.matches ?? false;
    const variant = dark ? theme.dark : theme.light;
    root.dataset.theme = theme.name;
    root.dataset.mode = dark ? "dark" : "light";
    for (const [property, key] of Object.entries(properties)) root.style.setProperty(property, variant[key]);
    root.style.colorScheme = dark ? "dark" : "light";
}

export function applyTheme(themeName: ThemeName, root?: HTMLElement): void {
    const target = root ?? (typeof document === "undefined" ? undefined : document.documentElement);
    if (!target) return;
    activeTheme = themeName;
    activeRoot = target;
    if (typeof window !== "undefined" && !media) {
        media = window.matchMedia("(prefers-color-scheme: dark)");
        media.addEventListener("change", () => { if (activeRoot) paint(activeRoot, activeTheme); });
    }
    paint(target, themeName);
}
