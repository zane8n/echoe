import type { AccentColor, AccentConfig, AccentName, NeutralPalette } from "./types";

export const LOCAL_DB_NAME = "echoe-core-v2";
export const LEGACY_STORAGE_KEYS = ["echoe.v1", "echo.dashboard.v1", "echoe.audit.v1"] as const;
export const STALE_DATA_RESET_KEY = "echoe.stale-data-cleared.v2";
export const DAY_MS = 86_400_000;

// One neutral shell shared by every user (light/dark), independent of accent color.
// muted/inkSoft/ink are WCAG AA (4.5:1) checked against both bg and surface in each mode.
export const NEUTRAL: { light: NeutralPalette; dark: NeutralPalette } = {
    light: { bg: "#fbfbfc", surface: "#ffffff", panel: "#f4f5f7", ink: "#14151a", inkSoft: "#4b4e58", muted: "#6f7280", line: "#e4e5ea", lineStrong: "#cdcfd6" },
    dark: { bg: "#0b0c0f", surface: "#131417", panel: "#1a1b1f", ink: "#f3f4f6", inkSoft: "#b4b7c1", muted: "#8b8e99", line: "#24262c", lineStrong: "#34363d" },
};

// Accent picker (Settings) — a single hue on top of the shared neutral shell.
// accentInk is WCAG AA checked as text-on-neutral-bg/surface; onAccent (dark ink, #14151a)
// is checked as text-on-the-solid-accent-fill (buttons) and clears 4.5:1 for every accent.
export const ACCENTS: Record<AccentName, AccentConfig> = {
    blue: { name: "blue", label: "Blue", light: { accent: "#3b82f6", accentInk: "#196cf4" }, dark: { accent: "#3b82f6", accentInk: "#3b82f6" }, onAccent: "#14151a" },
    teal: { name: "teal", label: "Teal", light: { accent: "#14b8a6", accentInk: "#0e8174" }, dark: { accent: "#14b8a6", accentInk: "#14b8a6" }, onAccent: "#14151a" },
    amber: { name: "amber", label: "Amber", light: { accent: "#f59e0b", accentInk: "#a06707" }, dark: { accent: "#f59e0b", accentInk: "#f59e0b" }, onAccent: "#14151a" },
    rose: { name: "rose", label: "Rose", light: { accent: "#f43f5e", accentInk: "#e60d32" }, dark: { accent: "#f43f5e", accentInk: "#f43f5e" }, onAccent: "#14151a" },
    violet: { name: "violet", label: "Violet", light: { accent: "#8b5cf6", accentInk: "#8452f5" }, dark: { accent: "#8b5cf6", accentInk: "#8e61f6" }, onAccent: "#14151a" },
};

export const ACCENT_ORDER: AccentName[] = ["blue", "teal", "amber", "rose", "violet"];

// Best-effort mapping from the pre-redesign 8-theme palette names to the new 5-accent
// picker, used only when migrating old local IDB records or importing an old backup file.
export const LEGACY_THEME_TO_ACCENT: Record<string, AccentName> = {
    warm: "amber", teal: "teal", blue: "blue", cool: "blue",
    earth: "amber", rose: "rose", ocean: "teal", glacier: "blue",
};

export const COLOR_MAP: Record<AccentColor, { color: string; ink: string; glow: string }> = {
    amber: { color: "#f1b45e", ink: "#6a4109", glow: "rgba(241,180,94,0.14)" },
    coral: { color: "#ed967f", ink: "#713426", glow: "rgba(237,150,127,0.14)" },
    teal: { color: "#55bea5", ink: "#155448", glow: "rgba(85,190,165,0.14)" },
    lavender: { color: "#aaa0e0", ink: "#4d4478", glow: "rgba(170,160,224,0.14)" },
    mint: { color: "#87c995", ink: "#315f3b", glow: "rgba(135,201,149,0.14)" },
    sky: { color: "#76b8e5", ink: "#285675", glow: "rgba(118,184,229,0.14)" },
};

export const CONFETTI_COLORS = ["#f1b45e", "#ed967f", "#55bea5", "#aaa0e0", "#87c995", "#76b8e5"];

export const STREAK_MILESTONES = [7, 14, 30, 50, 100, 200, 365];

export const KBD_SHORTCUTS = [
    { key: "N", description: "New milestone" },
    { key: "S", description: "Open settings" },
    { key: "Esc", description: "Close panel" },
    { key: "?", description: "Show shortcuts" },
    { key: "Ctrl+Z", description: "Undo delete" },
];
