import type { AccentColor, ThemeConfig, ThemeName } from "./types";

export const LOCAL_DB_NAME = "echoe-core-v2";
export const LEGACY_STORAGE_KEYS = ["echoe.v1", "echo.dashboard.v1", "echoe.audit.v1"] as const;
export const STALE_DATA_RESET_KEY = "echoe.stale-data-cleared.v2";
export const DAY_MS = 86_400_000;

// Each theme carries a hand-tuned dark variant derived from the light one (same hue,
// inverted lightness), with `muted`/`inkSoft`/`accentInk` re-checked to clear WCAG AA
// (4.5:1) against both `bg` and `surface` in that mode. `onAccent` is the text color for
// content sitting on the solid `accent` fill (e.g. primary buttons) — kept separate from
// `accentInk` (which sits on the neutral bg/surface) since dark mode needs opposite tones
// for those two roles even though light mode's happened to match.
export const THEMES: Record<ThemeName, ThemeConfig> = {
    warm: {
        name: "warm", label: "Clear light",
        light: { bg: "#fffdf8", surface: "#ffffff", ink: "#202522", inkSoft: "#4e5751", muted: "#6e7770", line: "rgba(42,58,48,0.12)", accent: "#f0a45d", accentInk: "#57300d", onAccent: "#57300d" },
        dark: { bg: "#1c211e", surface: "#282e2b", ink: "#f5f2ea", inkSoft: "#aab5af", muted: "#87978e", line: "rgba(245,242,234,0.14)", accent: "#f6b476", accentInk: "#f5c598", onAccent: "#57300d" },
    },
    teal: {
        name: "teal", label: "Fresh teal",
        light: { bg: "#f4fffc", surface: "#ffffff", ink: "#172824", inkSoft: "#46625b", muted: "#637870", line: "rgba(29,91,75,0.13)", accent: "#45bea2", accentInk: "#0d5143", onAccent: "#0d5143" },
        dark: { bg: "#162723", surface: "#203731", ink: "#eaf5f2", inkSoft: "#97c3b9", muted: "#6dab9d", line: "rgba(234,245,242,0.14)", accent: "#57cab0", accentInk: "#ace2d5", onAccent: "#0d5143" },
    },
    blue: {
        name: "blue", label: "Open blue",
        light: { bg: "#f5f9ff", surface: "#ffffff", ink: "#172434", inkSoft: "#465b72", muted: "#637488", line: "rgba(40,84,133,0.13)", accent: "#6aa9ef", accentInk: "#153f70", onAccent: "#153f70" },
        dark: { bg: "#161e27", surface: "#202a37", ink: "#eaeff5", inkSoft: "#97b1d1", muted: "#6e93bf", line: "rgba(234,239,245,0.14)", accent: "#83b9f5", accentInk: "#9ac5f4", onAccent: "#153f70" },
    },
    cool: {
        name: "cool", label: "Bright air",
        light: { bg: "#f8fafc", surface: "#ffffff", ink: "#20262c", inkSoft: "#505c67", muted: "#69747e", line: "rgba(54,67,79,0.12)", accent: "#9caab8", accentInk: "#35414d", onAccent: "#35414d" },
        dark: { bg: "#1a1f23", surface: "#252b32", ink: "#eaf0f5", inkSoft: "#a5b1bd", muted: "#8394a4", line: "rgba(234,240,245,0.14)", accent: "#abb9c8", accentInk: "#bec7d0", onAccent: "#35414d" },
    },
    earth: {
        name: "earth", label: "Sunlit clay",
        light: { bg: "#fffaf5", surface: "#ffffff", ink: "#2a231f", inkSoft: "#63564d", muted: "#7f7167", line: "rgba(92,65,46,0.12)", accent: "#dea276", accentInk: "#633817", onAccent: "#633817" },
        dark: { bg: "#231d1a", surface: "#322a25", ink: "#f5f0ea", inkSoft: "#bdaea5", muted: "#a38f82", line: "rgba(245,240,234,0.14)", accent: "#e7b28c", accentInk: "#e9c2a5", onAccent: "#633817" },
    },
    rose: {
        name: "rose", label: "Soft bloom",
        light: { bg: "#fff7fa", surface: "#ffffff", ink: "#2d2025", inkSoft: "#67515b", muted: "#856c76", line: "rgba(103,53,73,0.12)", accent: "#e7a0b3", accentInk: "#6a2940", onAccent: "#6a2940" },
        dark: { bg: "#24191d", surface: "#33242a", ink: "#f5eaee", inkSoft: "#bfa6af", muted: "#a88593", line: "rgba(245,234,238,0.14)", accent: "#eba3b6", accentInk: "#e8a5b7", onAccent: "#6a2940" },
    },
    ocean: {
        name: "ocean", label: "Clear coast",
        light: { bg: "#f3fcff", surface: "#ffffff", ink: "#17282e", inkSoft: "#45636d", muted: "#61767e", line: "rgba(31,91,111,0.13)", accent: "#58b9d3", accentInk: "#164d5d", onAccent: "#164d5d" },
        dark: { bg: "#162327", surface: "#203137", ink: "#eaf2f5", inkSoft: "#94bbca", muted: "#669fb3", line: "rgba(234,242,245,0.14)", accent: "#6dc5dd", accentInk: "#a6dae8", onAccent: "#164d5d" },
    },
    glacier: {
        name: "glacier", label: "Blue glass",
        light: { bg: "#f6fbff", surface: "#ffffff", ink: "#19262d", inkSoft: "#4b606b", muted: "#64757e", line: "rgba(47,93,117,0.12)", accent: "#87bfe4", accentInk: "#244d68", onAccent: "#244d68" },
        dark: { bg: "#162127", surface: "#202f37", ink: "#eaf0f5", inkSoft: "#9bb8c8", muted: "#7099b0", line: "rgba(234,240,245,0.14)", accent: "#9ecdec", accentInk: "#a3ceea", onAccent: "#244d68" },
    },
};

export const THEME_ORDER: ThemeName[] = ["blue", "glacier", "ocean", "teal", "cool", "warm", "rose", "earth"];

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
