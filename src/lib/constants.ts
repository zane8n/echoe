import type { AccentColor, ThemeConfig, ThemeName } from "./types";

export const LOCAL_DB_NAME = "echoe-core-v2";
export const LEGACY_STORAGE_KEYS = ["echoe.v1", "echo.dashboard.v1", "echoe.audit.v1"] as const;
export const STALE_DATA_RESET_KEY = "echoe.stale-data-cleared.v2";
export const DAY_MS = 86_400_000;

export const THEMES: Record<ThemeName, ThemeConfig> = {
    warm: { name: "warm", label: "Clear light", bg: "#fffdf8", surface: "#ffffff", ink: "#202522", inkSoft: "#4e5751", muted: "#778079", line: "rgba(42,58,48,0.12)", accent: "#f0a45d", accentInk: "#57300d" },
    teal: { name: "teal", label: "Fresh teal", bg: "#f4fffc", surface: "#ffffff", ink: "#172824", inkSoft: "#46625b", muted: "#718980", line: "rgba(29,91,75,0.13)", accent: "#45bea2", accentInk: "#0d5143" },
    blue: { name: "blue", label: "Open blue", bg: "#f5f9ff", surface: "#ffffff", ink: "#172434", inkSoft: "#465b72", muted: "#74869a", line: "rgba(40,84,133,0.13)", accent: "#6aa9ef", accentInk: "#153f70" },
    cool: { name: "cool", label: "Bright air", bg: "#f8fafc", surface: "#ffffff", ink: "#20262c", inkSoft: "#505c67", muted: "#7a8690", line: "rgba(54,67,79,0.12)", accent: "#9caab8", accentInk: "#35414d" },
    earth: { name: "earth", label: "Sunlit clay", bg: "#fffaf5", surface: "#ffffff", ink: "#2a231f", inkSoft: "#63564d", muted: "#8a7b70", line: "rgba(92,65,46,0.12)", accent: "#dea276", accentInk: "#633817" },
    rose: { name: "rose", label: "Soft bloom", bg: "#fff7fa", surface: "#ffffff", ink: "#2d2025", inkSoft: "#67515b", muted: "#907680", line: "rgba(103,53,73,0.12)", accent: "#e7a0b3", accentInk: "#6a2940" },
    ocean: { name: "ocean", label: "Clear coast", bg: "#f3fcff", surface: "#ffffff", ink: "#17282e", inkSoft: "#45636d", muted: "#718992", line: "rgba(31,91,111,0.13)", accent: "#58b9d3", accentInk: "#164d5d" },
    glacier: { name: "glacier", label: "Blue glass", bg: "#f6fbff", surface: "#ffffff", ink: "#19262d", inkSoft: "#4b606b", muted: "#778a93", line: "rgba(47,93,117,0.12)", accent: "#87bfe4", accentInk: "#244d68" },
};

export const THEME_ORDER: ThemeName[] = ["warm", "teal", "blue", "cool", "ocean", "glacier", "rose", "earth"];

export const COLOR_MAP: Record<AccentColor, { color: string; ink: string; glow: string }> = {
    amber: { color: "#f1b45e", ink: "#6a4109", glow: "rgba(241,180,94,0.14)" },
    coral: { color: "#ed967f", ink: "#713426", glow: "rgba(237,150,127,0.14)" },
    teal: { color: "#55bea5", ink: "#155448", glow: "rgba(85,190,165,0.14)" },
    lavender: { color: "#aaa0e0", ink: "#4d4478", glow: "rgba(170,160,224,0.14)" },
    mint: { color: "#87c995", ink: "#315f3b", glow: "rgba(135,201,149,0.14)" },
    sky: { color: "#76b8e5", ink: "#285675", glow: "rgba(118,184,229,0.14)" },
};

export const CONFETTI_COLORS = ["#f1b45e", "#ed967f", "#55bea5", "#aaa0e0", "#87c995", "#76b8e5"];

export const KBD_SHORTCUTS = [
    { key: "N", description: "New milestone" },
    { key: "S", description: "Open settings" },
    { key: "Esc", description: "Close panel" },
    { key: "?", description: "Show shortcuts" },
    { key: "Ctrl+Z", description: "Undo delete" },
];
