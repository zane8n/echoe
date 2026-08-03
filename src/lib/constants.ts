import type { AccentColor, ThemeConfig, ThemeName } from "./types";

export const LOCAL_DB_NAME = "echoe-core-v2";
export const LEGACY_STORAGE_KEYS = ["echoe.v1", "echo.dashboard.v1", "echoe.audit.v1"] as const;
export const STALE_DATA_RESET_KEY = "echoe.stale-data-cleared.v2";
export const DAY_MS = 86_400_000;

export const THEMES: Record<ThemeName, ThemeConfig> = {
    warm: { name: "warm", label: "Soft linen", bg: "#f7f7f3", surface: "#fcfcf9", ink: "#292c28", inkSoft: "#545a53", muted: "#7d847c", line: "rgba(56,66,58,0.13)", accent: "#8b9a7e", accentInk: "#22291f" },
    teal: { name: "teal", label: "Still water", bg: "#f3f7f6", surface: "#fbfcfc", ink: "#27312f", inkSoft: "#52615d", muted: "#7c8985", line: "rgba(54,77,71,0.13)", accent: "#7fa69d", accentInk: "#203b35" },
    blue: { name: "blue", label: "Morning mist", bg: "#f3f6f9", surface: "#fbfcfd", ink: "#29323b", inkSoft: "#52606e", muted: "#7d8995", line: "rgba(57,75,93,0.13)", accent: "#829db7", accentInk: "#1f3040" },
    cool: { name: "cool", label: "Silver air", bg: "#f5f6f7", surface: "#fcfcfd", ink: "#2d3237", inkSoft: "#596067", muted: "#838a91", line: "rgba(64,72,80,0.12)", accent: "#929ba3", accentInk: "#292f34" },
    earth: { name: "earth", label: "Soft clay", bg: "#f7f5f2", surface: "#fcfbf9", ink: "#312e2a", inkSoft: "#615b54", muted: "#898179", line: "rgba(78,68,59,0.12)", accent: "#a08f7f", accentInk: "#302720" },
    rose: { name: "rose", label: "Pressed petal", bg: "#f8f5f6", surface: "#fdfbfc", ink: "#332d30", inkSoft: "#64585d", muted: "#8d8186", line: "rgba(83,62,71,0.12)", accent: "#aa9098", accentInk: "#38282e" },
    ocean: { name: "ocean", label: "Rain glass", bg: "#f2f6f7", surface: "#fafcfc", ink: "#283237", inkSoft: "#526269", muted: "#7b8b92", line: "rgba(51,76,86,0.13)", accent: "#7897a4", accentInk: "#182e37" },
    glacier: { name: "glacier", label: "Pale sky", bg: "#f4f7f8", surface: "#fbfcfd", ink: "#2a3236", inkSoft: "#58646a", muted: "#818d92", line: "rgba(59,77,85,0.12)", accent: "#91a9b4", accentInk: "#253a43" },
};

export const THEME_ORDER: ThemeName[] = ["warm", "teal", "blue", "cool", "ocean", "glacier", "rose", "earth"];

export const COLOR_MAP: Record<AccentColor, { color: string; ink: string; glow: string }> = {
    amber: { color: "#bea477", ink: "#594629", glow: "rgba(190,164,119,0.14)" },
    coral: { color: "#ba9186", ink: "#5d3f38", glow: "rgba(186,145,134,0.14)" },
    teal: { color: "#7fa79e", ink: "#31524b", glow: "rgba(127,167,158,0.14)" },
    lavender: { color: "#9c97b2", ink: "#48435d", glow: "rgba(156,151,178,0.14)" },
    mint: { color: "#91aa93", ink: "#405542", glow: "rgba(145,170,147,0.14)" },
    sky: { color: "#86a5b5", ink: "#354f5d", glow: "rgba(134,165,181,0.14)" },
};

export const CONFETTI_COLORS = ["#bea477", "#ba9186", "#7fa79e", "#9c97b2", "#91aa93", "#86a5b5"];

export const KBD_SHORTCUTS = [
    { key: "N", description: "New milestone" },
    { key: "S", description: "Open settings" },
    { key: "Esc", description: "Close panel" },
    { key: "?", description: "Show shortcuts" },
    { key: "Ctrl+Z", description: "Undo delete" },
];
