import type { AccentColor, AccentConfig, AccentName } from "./types";

export const LOCAL_DB_NAME = "echoe-core-v2";
export const LEGACY_STORAGE_KEYS = ["echoe.v1", "echo.dashboard.v1", "echoe.audit.v1"] as const;
export const STALE_DATA_RESET_KEY = "echoe.stale-data-cleared.v2";
export const DAY_MS = 86_400_000;

// Each accent paints the whole shell: neutrals are tinted toward it in CSS (globals.css), so
// these values only carry the hue itself. ink is text-on-background and clears WCAG AA (4.5:1)
// against the tinted backgrounds; fill is the solid button colour and clears AA against onFill.
export const ACCENTS: Record<AccentName, AccentConfig> = {
    blue: { name: "blue", label: "Blue", light: { accent: "#3a6ff7", ink: "#2457d6", fill: "#2457d6", onFill: "#ffffff" }, dark: { accent: "#6e96ff", ink: "#8eadff", fill: "#7c9fff", onFill: "#0d0e12" } },
    teal: { name: "teal", label: "Teal", light: { accent: "#14a39a", ink: "#0b766f", fill: "#0b766f", onFill: "#ffffff" }, dark: { accent: "#2dd4bf", ink: "#5ee0ce", fill: "#3ad8c4", onFill: "#0d0e12" } },
    amber: { name: "amber", label: "Amber", light: { accent: "#e8930c", ink: "#a45a00", fill: "#a45a00", onFill: "#ffffff" }, dark: { accent: "#f5a524", ink: "#fbbf4a", fill: "#f7b13a", onFill: "#0d0e12" } },
    rose: { name: "rose", label: "Rose", light: { accent: "#f0436a", ink: "#c9254d", fill: "#c9254d", onFill: "#ffffff" }, dark: { accent: "#ff6b8a", ink: "#ff8fa6", fill: "#ff7d97", onFill: "#0d0e12" } },
    violet: { name: "violet", label: "Violet", light: { accent: "#8e5cf6", ink: "#7240db", fill: "#7240db", onFill: "#ffffff" }, dark: { accent: "#a98bff", ink: "#bda6ff", fill: "#b298ff", onFill: "#0d0e12" } },
};

// Browser chrome colours that sit closest to the tinted backgrounds.
export const THEME_COLOR = { light: "#f2f3f7", dark: "#101115" } as const;

export const ACCENT_ORDER: AccentName[] = ["blue", "teal", "amber", "rose", "violet"];

// Best-effort mapping from the pre-redesign 8-theme palette names to the new 5-accent
// picker, used only when migrating old local IDB records or importing an old backup file.
export const LEGACY_THEME_TO_ACCENT: Record<string, AccentName> = {
    warm: "amber", teal: "teal", blue: "blue", cool: "blue",
    earth: "amber", rose: "rose", ocean: "teal", glacier: "blue",
};

// Path hues live in globals.css as data-hue custom properties, so they follow light and dark mode.
export const PATH_COLORS: AccentColor[] = ["amber", "coral", "teal", "lavender", "mint", "sky"];

export const STREAK_MILESTONES = [7, 14, 30, 50, 100, 200, 365];

export const KBD_SHORTCUTS = [
    { key: "⌘K", description: "Add anything, or search and jump" },
    { key: "N", description: "Add something new" },
    { key: "1–4", description: "Today, Paths, Momentum, Friends" },
    { key: "S", description: "Open settings" },
    { key: "Esc", description: "Close panel" },
    { key: "?", description: "Show shortcuts" },
    { key: "Ctrl+Z", description: "Undo the last change" },
];
