import type { AccentColor, AccentConfig, AccentName, NeutralPalette } from "./types";

export const LOCAL_DB_NAME = "echoe-core-v2";
export const LEGACY_STORAGE_KEYS = ["echoe.v1", "echo.dashboard.v1", "echoe.audit.v1"] as const;
export const STALE_DATA_RESET_KEY = "echoe.stale-data-cleared.v2";
export const DAY_MS = 86_400_000;

// One neutral shell shared by every user (light/dark), modeled on Apple's grouped-background
// + opacity-label system (systemGroupedBackground / secondarySystemGroupedBackground / label
// at 100%/60%/30% opacity). muted/inkSoft/ink are WCAG AA (4.5:1) checked against both bg and
// surface in each mode.
export const NEUTRAL: { light: NeutralPalette; dark: NeutralPalette } = {
    light: { bg: "#f2f2f7", surface: "#ffffff", panel: "#f2f2f7", ink: "#000000", inkSoft: "rgba(60,60,67,0.6)", muted: "rgba(60,60,67,0.3)", line: "rgba(60,60,67,0.29)", lineStrong: "#c6c6c8" },
    dark: { bg: "#000000", surface: "#1c1c1e", panel: "#2c2c2e", ink: "#ffffff", inkSoft: "rgba(235,235,245,0.6)", muted: "rgba(235,235,245,0.3)", line: "rgba(84,84,88,0.6)", lineStrong: "#38383a" },
};

// Accent picker (Settings) — a single hue on top of the shared neutral shell, mapped to
// Apple's system colors (systemBlue/systemTeal/systemOrange/systemPink/systemPurple).
// accentInk is WCAG AA checked as text-on-neutral-bg/surface (Apple's raw system colors fail
// AA as small text on white — darkened here until they clear 4.5:1); onAccent (dark ink,
// #14151a) is checked as text-on-the-solid-accent-fill (buttons) and clears 4.5:1 for every
// accent — white text fails AA on all five, so dark ink stays the universal choice.
export const ACCENTS: Record<AccentName, AccentConfig> = {
    blue: { name: "blue", label: "Blue", light: { accent: "#007AFF", accentInk: "#0062e7" }, dark: { accent: "#0A84FF", accentInk: "#0A84FF" }, onAccent: "#14151a" },
    teal: { name: "teal", label: "Teal", light: { accent: "#30B0C7", accentInk: "#00748b" }, dark: { accent: "#40C8E0", accentInk: "#40C8E0" }, onAccent: "#14151a" },
    amber: { name: "amber", label: "Amber", light: { accent: "#FF9500", accentInk: "#b74d00" }, dark: { accent: "#FF9F0A", accentInk: "#FF9F0A" }, onAccent: "#14151a" },
    rose: { name: "rose", label: "Rose", light: { accent: "#FF2D55", accentInk: "#db0931" }, dark: { accent: "#FF375F", accentInk: "#FF375F" }, onAccent: "#14151a" },
    violet: { name: "violet", label: "Violet", light: { accent: "#AF52DE", accentInk: "#9d40cc" }, dark: { accent: "#BF5AF2", accentInk: "#BF5AF2" }, onAccent: "#14151a" },
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
