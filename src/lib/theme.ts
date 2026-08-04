import { THEMES } from "./constants";
import type { ThemeName } from "./types";

const properties = {
    "--bg": "bg",
    "--surface": "surface",
    "--ink": "ink",
    "--ink-soft": "inkSoft",
    "--muted": "muted",
    "--line": "line",
    "--accent": "accent",
    "--accent-ink": "accentInk",
} as const;

export function applyTheme(themeName: ThemeName, root?: HTMLElement): void {
    const target = root ?? (typeof document === "undefined" ? undefined : document.documentElement);
    if (!target) return;
    const theme = THEMES[themeName] ?? THEMES.blue;
    target.dataset.theme = theme.name;
    for (const [property, key] of Object.entries(properties)) target.style.setProperty(property, theme[key]);
    target.style.colorScheme = "light";
}
