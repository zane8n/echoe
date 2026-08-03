import type { AccentColor, ThemeConfig, ThemeName } from "./types";

export const STORAGE_KEY = "echoe.v1";
export const LEGACY_STORAGE_KEY = "echo.dashboard.v1";
export const DAY_MS = 86_400_000;

export const THEMES: Record<ThemeName, ThemeConfig> = {
    warm: { name: "warm", label: "Golden hour", bg: "#fdfaf5", surface: "#fefdfb", ink: "#2d2520", inkSoft: "#5c534a", muted: "#9a9186", line: "rgba(140,120,100,0.14)", accent: "#f0a04b", accentInk: "#7a4518" },
    cool: { name: "cool", label: "Sea glass", bg: "#f5f9fb", surface: "#fcfdfe", ink: "#1e2d33", inkSoft: "#4a5a62", muted: "#7d939c", line: "rgba(100,140,155,0.14)", accent: "#4dab93", accentInk: "#1d5243" },
    earth: { name: "earth", label: "Terracotta", bg: "#faf7f2", surface: "#fdfbf8", ink: "#2d2418", inkSoft: "#5c4e3a", muted: "#8a7a62", line: "rgba(130,110,80,0.14)", accent: "#c77d4e", accentInk: "#5c3418" },
    rose: { name: "rose", label: "Rose quartz", bg: "#fdf8f9", surface: "#fefcfc", ink: "#2d1e22", inkSoft: "#5c4248", muted: "#9a7c84", line: "rgba(150,110,120,0.14)", accent: "#d47888", accentInk: "#6b2d3a" },
    ocean: { name: "ocean", label: "Deep ocean", bg: "#f4f7fa", surface: "#fafcfd", ink: "#1a2730", inkSoft: "#3d5563", muted: "#6d8a9c", line: "rgba(80,120,150,0.14)", accent: "#3a8fa8", accentInk: "#194553" },
    glacier: { name: "glacier", label: "Glacier ice", bg: "#f6fafd", surface: "#fcfdfe", ink: "#1c2935", inkSoft: "#455669", muted: "#7e929f", line: "rgba(100,140,170,0.14)", accent: "#5b9ecf", accentInk: "#234b68" },
};

export const COLOR_MAP: Record<AccentColor, { color: string; ink: string; glow: string }> = {
    amber: { color: "#f0a04b", ink: "#7a4518", glow: "rgba(240,160,75,0.22)" },
    coral: { color: "#e8735a", ink: "#7a3022", glow: "rgba(232,115,90,0.22)" },
    teal: { color: "#4dab93", ink: "#1d5243", glow: "rgba(77,171,147,0.22)" },
    lavender: { color: "#9b8ec4", ink: "#423a61", glow: "rgba(155,142,196,0.22)" },
    mint: { color: "#7dbf8e", ink: "#2d5537", glow: "rgba(125,191,142,0.22)" },
    sky: { color: "#71b7d9", ink: "#294e61", glow: "rgba(113,183,217,0.22)" },
};

export const CONFETTI_COLORS = [
    "#f0a04b", "#e8735a", "#4dab93", "#9b8ec4", "#7dbf8e",
    "#71b7d9", "#f5c26b", "#e8977a", "#5ec4ad", "#b8aed6",
];

export const KBD_SHORTCUTS = [
    { key: "N", description: "New milestone" },
    { key: "S", description: "Open settings" },
    { key: "Esc", description: "Close panel" },
    { key: "?", description: "Show shortcuts" },
    { key: "Ctrl+Z", description: "Undo delete" },
];
