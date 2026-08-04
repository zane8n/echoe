export type AccentColor = "amber" | "coral" | "teal" | "lavender" | "mint" | "sky";
export type ThemeName = "warm" | "teal" | "blue" | "cool" | "earth" | "rose" | "ocean" | "glacier";

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
    note?: string;
    recordedAt?: string;
}

export interface HabitConfig {
    frequency: "daily" | "weekly";
    entries: HabitEntry[];
    target: number;
}

export type MilestoneKind = "project" | "habit" | "ongoing";

export interface ProjectEntry {
    id: string;
    date: string;
    hours: number;
    readiness?: number;
    note?: string;
    recordedAt?: string;
}

export interface ProjectConfig {
    plannedHours: number;
    readiness: number;
    entries: ProjectEntry[];
    checkInFrequency?: "daily" | "weekly";
    checkIns?: HabitEntry[];
}

export interface MilestoneEvent {
    id: string;
    name: string;
    start: string;
    target: string;
    color: AccentColor;
    pinned: boolean;
    kind?: MilestoneKind;
    habit?: HabitConfig;
    project?: ProjectConfig;
    achievedAt?: string;
    isCountdown?: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface Achievement {
    id: string;
    label: string;
    date: string;
    icon: string;
}

export type SupportStyle = "gentle" | "direct" | "reflective";

export interface PersonalProfile {
    displayName: string;
    intention: string;
    supportStyle: SupportStyle;
    personalizedAt?: string;
}

export interface DashboardSettings {
    theme: ThemeName;
    showActivityHistogram: boolean;
    readNotificationIds: string[];
    profile: PersonalProfile;
}

export type NotificationKind = "check-in" | "risk" | "progress" | "encouragement";

export interface EchoeNotification {
    id: string;
    kind: NotificationKind;
    title: string;
    body: string;
    createdAt: string;
    actionable: boolean;
    eventId?: string;
}

export interface AccountSummary {
    displayName: string;
    handle: string;
    createdAt: string;
    authProvider?: "password" | "google" | "password+google";
    email?: string;
}

export interface DashboardState {
    schemaVersion: 2;
    events: MilestoneEvent[];
    achievements: Achievement[];
    settings: DashboardSettings;
    updatedAt: string;
}

export type AuditAction =
    | "bootstrap"
    | "create"
    | "edit"
    | "delete"
    | "restore"
    | "check-in"
    | "clear-check-in"
    | "progress"
    | "notification"
    | "settings"
    | "import"
    | "remote-pull";

export interface AuditEntry {
    seq?: number;
    id: string;
    occurredAt: string;
    action: AuditAction;
    entityId?: string;
    summary: string;
}

export interface StateSnapshot {
    seq?: number;
    createdAt: string;
    action: AuditAction;
    state: DashboardState;
}

export type SyncStatus = "local" | "syncing" | "synced" | "offline";

export interface StorageSummary {
    milestoneCount: number;
    checkInCount: number;
    historyCount: number;
    lastSavedAt: string | null;
    lastSyncedAt: string | null;
    isOnline: boolean;
    syncStatus: SyncStatus;
}

export type ProjectRisk = "on-track" | "watch" | "at-risk" | "complete";

export interface ProjectProgress {
    investedHours: number;
    plannedHours: number;
    remainingHours: number;
    readiness: number;
    effortPercent: number;
    elapsedPercent: number;
    overallPercent: number;
    requiredHoursPerWeek: number;
    risk: ProjectRisk;
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
