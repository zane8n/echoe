export type AccentColor = "amber" | "coral" | "teal" | "lavender" | "mint" | "sky";
export type ThemeName = "warm" | "cool" | "earth" | "rose" | "ocean" | "glacier";

export interface ThemeConfig {
    name: ThemeName;
    label: string;
    bg: string;
    surface: string;
    ink: string;
    inkSoft: string;
    muted: string;
    line: string;
    accent: string;
    accentInk: string;
}

export interface HabitEntry {
    date: string;
    status: "done" | "missed";
}

export interface HabitConfig {
    frequency: "daily" | "weekly";
    entries: HabitEntry[];
    target: number;
}

export interface MilestoneEvent {
    id: string;
    name: string;
    start: string;
    target: string;
    color: AccentColor;
    pinned: boolean;
    habit?: HabitConfig;
    achievedAt?: string;
    /** if true, this is a countdown-style milestone (time-remaining focused) */
    isCountdown?: boolean;
}

export interface Achievement {
    id: string;
    label: string;
    date: string;
    icon: string;
}

export interface DashboardSettings {
    theme: ThemeName;
    showLifeGrid: boolean;
}

export interface DashboardState {
    events: MilestoneEvent[];
    achievements: Achievement[];
    settings: DashboardSettings;
}

export interface RemainingDisplay {
    value: number | string;
    unit: string;
}

export interface TimeSpent {
    days: number;
    weeks: number;
    months: number;
    percent: number;
}

export interface HabitStats {
    streak: number;
    done: number;
    missed: number;
    total: number;
    rate: number;
}
months: number;
percent: number;
}
