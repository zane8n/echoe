"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useDashboardState } from "@/hooks/use-dashboard";
import { ACCENT_ORDER, LEGACY_THEME_TO_ACCENT, PATH_COLORS, STREAK_MILESTONES } from "@/lib/constants";
import { getAuditLog } from "@/lib/local-db";
import { buildNotifications } from "@/lib/notifications";
import type { QuickParse } from "@/lib/quick-parse";
import { checkInSharedPath, getSocialSnapshot, sendCheer } from "@/lib/social-client";
import { applyTheme } from "@/lib/theme";
import type { AccentColor, AuditAction, DailyTask, DashboardState, EchoeNotification, HabitEntry, MilestoneEvent, MilestoneKind, SocialSnapshot, StorageSummary } from "@/lib/types";
import { addDays, formatDate, habitStreak, isBlockedExtraCheckIn, isCheckedInForPeriod, isDashboardState, localDate, normalizeSettings, parseDate, seedState } from "@/lib/utils";
import { useNavigation } from "./navigation-provider";

type SnapshotSummary = { seq?: number; createdAt: string; action: AuditAction };
export type Origin = { x: number; y: number };

export interface EditorSeed {
    kind: MilestoneKind;
    frequency?: "daily" | "weekly";
    name?: string;
    start?: string;
    target?: string;
    targetPerPeriod?: number;
    plannedHours?: number;
}

export interface ToastAction { label: string; run: () => void }
export interface ToastState { id: number; message: string; action?: ToastAction }
export interface CelebrationState { id: number; x: number; y: number; hue: AccentColor | "accent" | "shared"; big: boolean }

const EMPTY_SOCIAL: SocialSnapshot = { mode: "local", accountRequired: true, friends: [], sharedByMe: [], sharedWithMe: [], recentCheers: [] };

const vibrate = (pattern: number | number[]) => {
    try { navigator.vibrate?.(pattern); } catch { /* Haptics are a nicety; some browsers refuse them. */ }
};

const shortDate = (date: string) => formatDate(date, { weekday: "short", day: "numeric", month: "short", year: undefined });

interface DashboardContextValue {
    state: DashboardState;
    storageSummary: StorageSummary;
    tick: number;
    notifications: EchoeNotification[];
    readIds: string[];
    unreadActionable: EchoeNotification[];
    activeSheet: "event" | "settings" | null;
    editingEventId: string | null;
    editorSeed: EditorSeed | null;
    checkInEventId: string | null;
    progressEventId: string | null;
    notificationsOpen: boolean;
    keyboardOpen: boolean;
    composer: { open: boolean; text: string };
    toast: ToastState | null;
    celebration: CelebrationState | null;
    social: SocialSnapshot;
    socialLoading: boolean;
    refreshSocial: () => Promise<void>;
    cheerShare: (shareId: string) => Promise<void>;
    checkInShare: (shareId: string, origin?: Origin) => Promise<void>;
    setCheckInEventId: (id: string | null) => void;
    setProgressEventId: (id: string | null) => void;
    setNotificationsOpen: (open: boolean) => void;
    setKeyboardOpen: (open: (open: boolean) => boolean) => void;
    openComposer: (text?: string) => void;
    closeComposer: () => void;
    showToast: (message: string, action?: ToastAction) => void;
    dismissToast: () => void;
    celebrate: (origin?: Origin, hue?: AccentColor | "accent" | "shared", big?: boolean) => void;
    clearCelebration: () => void;
    openEventEditor: (id?: string | null, seed?: EditorSeed | null) => void;
    openQuickStart: (kind: MilestoneKind, frequency?: "daily" | "weekly") => void;
    openSettings: () => void;
    closeSheet: () => void;
    goBack: () => void;
    navigateTo: (path: string) => void;
    updateSettings: ReturnType<typeof useDashboardState>["updateSettings"];
    updateAccent: ReturnType<typeof useDashboardState>["updateAccent"];
    updateAppearance: ReturnType<typeof useDashboardState>["updateAppearance"];
    upsertEvent: ReturnType<typeof useDashboardState>["upsertEvent"];
    syncNow: ReturnType<typeof useDashboardState>["syncNow"];
    updateProjectReadiness: (id: string, readiness: number, note?: string) => void;
    logProjectEffort: (id: string, hours: number, date?: string, note?: string) => void;
    markNotificationsRead: ReturnType<typeof useDashboardState>["markNotificationsRead"];
    clearAllData: ReturnType<typeof useDashboardState>["clearAllData"];
    snapshots: SnapshotSummary[];
    loadSnapshots: () => Promise<void>;
    restoreSnapshot: (seq: number) => Promise<void>;
    todaysTasks: DailyTask[];
    laterTasks: DailyTask[];
    handleAddDailyTask: (text: string, time?: string, date?: string) => void;
    toggleDailyTask: (id: string) => void;
    updateDailyTask: ReturnType<typeof useDashboardState>["updateDailyTask"];
    handleDeleteDailyTask: (id: string) => void;
    handleDelete: (id: string) => void;
    handleUndo: () => void;
    handleExport: () => Promise<void>;
    handleImport: (file: File) => void;
    handleHabitCheckIn: (id: string, status?: HabitEntry["status"], date?: string, note?: string, origin?: Origin) => void;
    handleProjectCheckIn: (id: string) => void;
    handleClearCheckIn: (id: string, date: string) => void;
    toggleToday: (id: string, origin?: Origin) => void;
    recordEntry: (id: string, status: HabitEntry["status"], date: string, note?: string) => void;
    clearEntry: (id: string, date: string) => void;
    togglePin: (id: string) => void;
    createFromQuick: (parsed: QuickParse) => "created" | "needs-editor";
    handleAccountChange: () => Promise<void>;
    handleNotification: (notification: EchoeNotification) => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard(): DashboardContextValue {
    const ctx = useContext(DashboardContext);
    if (!ctx) throw new Error("useDashboard must be used within DashboardProvider");
    return ctx;
}

export function DashboardProvider({ children }: { children: React.ReactNode }) {
    const navigation = useNavigation();
    const {
        state, storageSummary, updateSettings, updateAccent, updateAppearance, upsertEvent: rawUpsertEvent, deleteEvent, restoreEvent,
        addAchievement, checkInHabit, checkInProject, clearHabitCheckIn, clearProjectCheckIn, logProjectEffort: rawLogEffort, removeProjectEntry, updateProjectReadiness: rawUpdateReadiness,
        markNotificationsRead, syncNow, importState, clearAllData, resetForAccountSwitch,
        listSnapshots, restoreSnapshot: restoreSnapshotState,
        addDailyTask, toggleDailyTask: rawToggleTask, updateDailyTask, deleteDailyTask, restoreDailyTask,
    } = useDashboardState();

    const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
    const [activeSheet, setActiveSheet] = useState<"event" | "settings" | null>(null);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [editorSeed, setEditorSeed] = useState<EditorSeed | null>(null);
    const [checkInEventId, setCheckInEventId] = useState<string | null>(null);
    const [progressEventId, setProgressEventId] = useState<string | null>(null);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [keyboardOpen, setKeyboardOpen] = useState(false);
    const [composer, setComposer] = useState({ open: false, text: "" });
    const [toast, setToast] = useState<ToastState | null>(null);
    const [celebration, setCelebration] = useState<CelebrationState | null>(null);
    const [tick, setTick] = useState(0);
    const [social, setSocial] = useState<SocialSnapshot>(EMPTY_SOCIAL);
    const [socialLoading, setSocialLoading] = useState(true);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const toastSeq = useRef(0);
    const undoRef = useRef<(() => void) | null>(null);

    const notifications = useMemo(() => state ? buildNotifications(state.events, state.settings.profile) : [], [state]);
    const readIds = state?.settings.readNotificationIds ?? [];
    const unreadActionable = notifications.filter((item) => item.actionable && !readIds.includes(item.id));
    const today = tick ? localDate(new Date(tick)) : localDate();
    const todaysTasks = useMemo(() => (state?.dailyTasks ?? [])
        .filter((task) => task.date === today)
        .sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99") || a.createdAt.localeCompare(b.createdAt)), [state?.dailyTasks, today]);
    const laterTasks = useMemo(() => (state?.dailyTasks ?? [])
        .filter((task) => task.date > today)
        .sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "99:99").localeCompare(b.time ?? "99:99")), [state?.dailyTasks, today]);

    useEffect(() => {
        applyTheme(state?.settings.accent ?? "blue", state?.settings.appearance ?? "system");
    }, [state?.settings.accent, state?.settings.appearance]);

    useEffect(() => {
        const updateClock = () => setTick(Date.now());
        const initial = window.setTimeout(updateClock, 0);
        const interval = window.setInterval(updateClock, 60_000);
        return () => { window.clearTimeout(initial); window.clearInterval(interval); };
    }, []);

    useEffect(() => {
        const badgeNavigator = navigator as Navigator & { setAppBadge?: (count?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
        if (unreadActionable.length > 0) void badgeNavigator.setAppBadge?.(unreadActionable.length).catch(() => undefined);
        else void badgeNavigator.clearAppBadge?.().catch(() => undefined);
    }, [unreadActionable.length]);

    const dismissToast = useCallback(() => {
        setToast(null);
        undoRef.current = null;
    }, []);

    const showToast = useCallback((message: string, action?: ToastAction) => {
        const id = ++toastSeq.current;
        setToast({ id, message, action });
        undoRef.current = action?.label === "Undo" ? action.run : null;
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => {
            setToast((current) => current?.id === id ? null : current);
            if (toastSeq.current === id) undoRef.current = null;
        }, action ? 5200 : 2600);
    }, []);

    const celebrate = useCallback((origin?: Origin, hue: AccentColor | "accent" | "shared" = "accent", big = false) => {
        const x = origin?.x ?? window.innerWidth / 2;
        const y = origin?.y ?? window.innerHeight / 2;
        setCelebration({ id: Date.now(), x, y, hue, big });
    }, []);
    const clearCelebration = useCallback(() => setCelebration(null), []);

    const loadSnapshots = useCallback(async () => {
        setSnapshots(await listSnapshots());
    }, [listSnapshots]);
    const restoreSnapshot = useCallback(async (seq: number) => {
        await restoreSnapshotState(seq);
        await loadSnapshots();
        showToast("Snapshot restored");
    }, [loadSnapshots, restoreSnapshotState, showToast]);

    const refreshSocial = useCallback(async () => {
        try {
            const next = await getSocialSnapshot();
            setSocial(next);
        } catch {
            // Private sharing is optional infrastructure — a failed refresh just keeps the last known snapshot.
        } finally {
            setSocialLoading(false);
        }
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => { void refreshSocial(); }, 0);
        const interval = window.setInterval(() => { void refreshSocial(); }, 5 * 60_000);
        return () => { window.clearTimeout(timer); window.clearInterval(interval); };
    }, [refreshSocial]);

    const cheerShare = useCallback(async (shareId: string) => {
        try {
            await sendCheer(shareId);
            vibrate(10);
            showToast("Cheer sent");
            await refreshSocial();
        } catch (error) {
            showToast(error instanceof Error ? error.message : "That cheer could not be sent.");
        }
    }, [refreshSocial, showToast]);

    const checkInShare = useCallback(async (shareId: string, origin?: Origin) => {
        const share = social.sharedWithMe.find((item) => item.id === shareId);
        // Optimistic: the friend's path shows done immediately; the server is the source of truth on refresh.
        setSocial((current) => ({ ...current, sharedWithMe: current.sharedWithMe.map((item) => item.id === shareId ? { ...item, guestToday: item.guestToday + 1, guestTotal: item.guestTotal + 1 } : item) }));
        vibrate(12);
        if (origin) celebrate(origin, "shared");
        try {
            await checkInSharedPath(shareId);
            showToast(share ? `Checked in with ${share.person.displayName}` : "Shared check-in recorded");
        } catch (error) {
            showToast(error instanceof Error ? error.message : "That shared check-in could not be saved.");
        } finally {
            await refreshSocial();
        }
    }, [celebrate, refreshSocial, showToast, social.sharedWithMe]);

    const upsertEvent = useCallback((event: MilestoneEvent) => {
        const previouslyPinned = state?.events.find((item) => item.pinned && item.id !== event.id);
        rawUpsertEvent(event);
        if (event.pinned && previouslyPinned) showToast(`${event.name} is now in focus`);
    }, [rawUpsertEvent, showToast, state?.events]);

    // Redirect a legacy `?friend_invite=` link (from before real routes existed) to /friends.
    useEffect(() => {
        const url = new URL(window.location.href);
        const token = url.searchParams.get("friend_invite");
        if (token && window.location.pathname !== "/friends") navigation?.replace(`/friends?friend_invite=${encodeURIComponent(token)}`);
    }, [navigation]);

    useEffect(() => {
        const url = new URL(window.location.href);
        const accountResult = url.searchParams.get("account");
        const authResult = url.searchParams.get("auth");
        const message = accountResult === "connected" ? "Google account connected" : accountResult === "switched" ? "Signed in with Google" : authResult === "failed" ? "Google sign-in could not be completed" : authResult === "unavailable" ? "Cloud sign-in is not available yet" : "";
        const timer = message ? window.setTimeout(() => showToast(message), 0) : null;
        if (url.searchParams.get("action") === "add") window.setTimeout(() => setComposer({ open: true, text: "" }), 0);
        if (accountResult || authResult || url.searchParams.get("action") || url.searchParams.get("source")) {
            for (const key of ["account", "auth", "action", "source"]) url.searchParams.delete(key);
            window.history.replaceState(window.history.state ?? {}, "", `${url.pathname}${url.search}${url.hash}`);
        }
        return () => { if (timer) window.clearTimeout(timer); };
    }, [showToast]);

    const navigateTo = useCallback((path: string) => navigation?.navigate(path), [navigation]);
    const goBack = useCallback(() => navigation?.back(), [navigation]);

    useEffect(() => {
        const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
        if (!standalone || activeSheet || checkInEventId || progressEventId || notificationsOpen || composer.open) return;
        let start: { x: number; y: number } | null = null;
        const onTouchStart = (event: TouchEvent) => {
            const touch = event.touches[0];
            start = touch && touch.clientX <= 24 ? { x: touch.clientX, y: touch.clientY } : null;
        };
        const onTouchEnd = (event: TouchEvent) => {
            if (!start) return;
            const touch = event.changedTouches[0];
            const deltaX = touch.clientX - start.x;
            const deltaY = Math.abs(touch.clientY - start.y);
            start = null;
            if (deltaX > 72 && deltaY < 52 && window.location.pathname !== "/") goBack();
        };
        document.addEventListener("touchstart", onTouchStart, { passive: true });
        document.addEventListener("touchend", onTouchEnd, { passive: true });
        return () => { document.removeEventListener("touchstart", onTouchStart); document.removeEventListener("touchend", onTouchEnd); };
    }, [activeSheet, checkInEventId, composer.open, goBack, notificationsOpen, progressEventId]);

    const openEventEditor = useCallback((id: string | null = null, seed: EditorSeed | null = null) => {
        setComposer((current) => current.open ? { open: false, text: "" } : current);
        setEditingEventId(id);
        setEditorSeed(seed);
        setActiveSheet("event");
    }, []);
    const openQuickStart = useCallback((kind: MilestoneKind, frequency?: "daily" | "weekly") => openEventEditor(null, { kind, frequency }), [openEventEditor]);
    const openSettings = useCallback(() => setActiveSheet("settings"), []);
    const closeSheet = useCallback(() => { setActiveSheet(null); setEditingEventId(null); setEditorSeed(null); }, []);
    const openComposer = useCallback((text = "") => setComposer({ open: true, text }), []);
    const closeComposer = useCallback(() => setComposer({ open: false, text: "" }), []);

    const handleDelete = useCallback((id: string) => {
        const deleted = deleteEvent(id);
        if (!deleted) return;
        if (checkInEventId === id) setCheckInEventId(null);
        if (progressEventId === id) setProgressEventId(null);
        if (editingEventId === id) { setActiveSheet(null); setEditingEventId(null); }
        showToast(`“${deleted.name}” archived`, { label: "Undo", run: () => { restoreEvent(deleted); showToast(`${deleted.name} restored`); } });
    }, [checkInEventId, deleteEvent, editingEventId, progressEventId, restoreEvent, showToast]);

    const handleUndo = useCallback(() => {
        const run = undoRef.current;
        if (!run) return;
        undoRef.current = null;
        setToast(null);
        run();
    }, []);

    const handleExport = useCallback(async () => {
        if (!state) return;
        const audit = await getAuditLog(500);
        const blob = new Blob([JSON.stringify({ format: "echoe-backup-v2", exportedAt: new Date().toISOString(), state, audit }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `echoe-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(url);
        showToast("Backup and history exported");
    }, [showToast, state]);

    const handleImport = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = () => { try {
            const parsed = JSON.parse(reader.result as string) as { state?: unknown } | DashboardState;
            const candidate = "state" in parsed ? parsed.state : parsed;
            if (!isDashboardState(candidate)) throw new Error("Invalid backup");
            const legacy = candidate as DashboardState & { settings: DashboardState["settings"] & { showLifeGrid?: boolean; theme?: string } };
            const legacyAccent = LEGACY_THEME_TO_ACCENT[legacy.settings.theme ?? ""];
            importState({
                ...seedState(),
                ...legacy,
                schemaVersion: 2,
                settings: normalizeSettings({
                    accent: ACCENT_ORDER.includes(legacy.settings.accent) ? legacy.settings.accent : legacyAccent,
                    appearance: legacy.settings.appearance,
                    showActivityHistogram: legacy.settings.showActivityHistogram ?? legacy.settings.showLifeGrid ?? true,
                    readNotificationIds: legacy.settings.readNotificationIds,
                    profile: legacy.settings.profile,
                }),
                updatedAt: new Date().toISOString(),
            });
            showToast("Backup imported");
        } catch { showToast("That file is not a valid Echoe backup"); } };
        reader.readAsText(file);
    }, [importState, showToast]);

    const handleHabitCheckIn = useCallback((id: string, status: HabitEntry["status"] = "done", date?: string, note?: string, origin?: Origin) => {
        const event = state?.events.find((item) => item.id === id);
        if (!event?.habit) return;
        const checkInDate = date ?? localDate();
        const previous = event.habit.entries.find((entry) => entry.date === checkInDate);
        if (status === "done" && isBlockedExtraCheckIn(event.habit, checkInDate, event.allowExtraCheckIns)) {
            showToast("This week's target is already met. Turn on extra check-ins to log more.");
            return;
        }
        let milestone: string | null = null;
        if (status === "done") {
            const previousStreak = habitStreak(event);
            const nextEntries = event.habit.entries.filter((entry) => entry.date !== checkInDate);
            nextEntries.push({ date: checkInDate, status: "done" });
            const nextStreak = habitStreak({ ...event, habit: { ...event.habit, entries: nextEntries } });
            if (nextStreak > previousStreak && STREAK_MILESTONES.includes(nextStreak)) {
                const unit = event.habit.frequency === "weekly" ? "weeks" : "days";
                milestone = `${nextStreak} ${unit} on ${event.name}`;
                addAchievement(milestone, "trophy");
            }
            vibrate(milestone ? [12, 60, 18] : 12);
            if (milestone) celebrate(origin, event.color, true);
        }
        checkInHabit(id, status, checkInDate, note);
        const undo = () => previous ? checkInHabit(id, previous.status, checkInDate, previous.note) : clearHabitCheckIn(id, checkInDate);
        const message = milestone
            ? `${milestone}. Saved to achievements.`
            : status === "done"
                ? checkInDate === localDate() ? `${event.name} checked in` : `${event.name} checked in for ${shortDate(checkInDate)}`
                : "Missed day noted, without judgement";
        showToast(message, { label: "Undo", run: undo });
    }, [addAchievement, celebrate, checkInHabit, clearHabitCheckIn, showToast, state?.events]);

    const handleProjectCheckIn = useCallback((id: string) => {
        const event = state?.events.find((item) => item.id === id);
        const date = localDate();
        checkInProject(id, "done", date);
        vibrate(12);
        showToast(event ? `${event.name} checked in` : "Project check-in recorded", { label: "Undo", run: () => clearProjectCheckIn(id, date) });
    }, [checkInProject, clearProjectCheckIn, showToast, state?.events]);

    const handleClearCheckIn = useCallback((id: string, date: string) => {
        const previous = state?.events.find((item) => item.id === id)?.habit?.entries.find((entry) => entry.date === date);
        clearHabitCheckIn(id, date);
        showToast("Check-in cleared", previous ? { label: "Undo", run: () => checkInHabit(id, previous.status, date, previous.note) } : undefined);
    }, [checkInHabit, clearHabitCheckIn, showToast, state?.events]);

    // Record or correct any day, for habits and project check-ins alike.
    const recordEntry = useCallback((id: string, status: HabitEntry["status"], date: string, note?: string) => {
        const event = state?.events.find((item) => item.id === id);
        if (event?.habit) { handleHabitCheckIn(id, status, date, note); return; }
        if (!event?.project) return;
        const previous = event.project.checkIns?.find((entry) => entry.date === date);
        checkInProject(id, status, date, note);
        if (status === "done") vibrate(12);
        showToast(status === "done" ? `${event.name} checked in for ${shortDate(date)}` : "Missed day noted, without judgement", {
            label: "Undo",
            run: () => previous ? checkInProject(id, previous.status, date, previous.note) : clearProjectCheckIn(id, date),
        });
    }, [checkInProject, clearProjectCheckIn, handleHabitCheckIn, showToast, state?.events]);

    const clearEntry = useCallback((id: string, date: string) => {
        const event = state?.events.find((item) => item.id === id);
        if (event?.habit) { handleClearCheckIn(id, date); return; }
        const previous = event?.project?.checkIns?.find((entry) => entry.date === date);
        clearProjectCheckIn(id, date);
        showToast("Check-in cleared", previous ? { label: "Undo", run: () => checkInProject(id, previous.status, date, previous.note) } : undefined);
    }, [checkInProject, clearProjectCheckIn, handleClearCheckIn, showToast, state?.events]);

    // One tap on a check button: complete today, or take today back if it's already done.
    const toggleToday = useCallback((id: string, origin?: Origin) => {
        const event = state?.events.find((item) => item.id === id);
        if (!event) return;
        const date = localDate();
        if (event.habit) {
            const entry = event.habit.entries.find((item) => item.date === date);
            if (entry?.status === "done") {
                clearHabitCheckIn(id, date);
                showToast(`Today's check-in for ${event.name} cleared`, { label: "Undo", run: () => checkInHabit(id, "done", date, entry.note) });
                return;
            }
            handleHabitCheckIn(id, "done", date, undefined, origin);
            return;
        }
        if (event.project) {
            const checkIns = event.project.checkIns ?? [];
            const entry = checkIns.find((item) => item.date === date);
            if (entry?.status === "done") {
                clearProjectCheckIn(id, date);
                showToast(`Today's check-in for ${event.name} cleared`, { label: "Undo", run: () => checkInProject(id, "done", date, entry.note) });
                return;
            }
            if ((event.project.checkInFrequency ?? "daily") === "weekly" && isCheckedInForPeriod("weekly", checkIns, date)) {
                showToast(`${event.name} is already checked in this week`);
                return;
            }
            handleProjectCheckIn(id);
        }
    }, [checkInHabit, checkInProject, clearHabitCheckIn, clearProjectCheckIn, handleHabitCheckIn, handleProjectCheckIn, showToast, state?.events]);

    // One path is always in focus, so focusing is the only direction; the previous one steps back.
    const togglePin = useCallback((id: string) => {
        const event = state?.events.find((item) => item.id === id);
        if (event && !event.pinned) upsertEvent({ ...event, pinned: true });
    }, [state?.events, upsertEvent]);

    const logProjectEffort = useCallback((id: string, hours: number, date = localDate(), note?: string) => {
        const entryId = rawLogEffort(id, hours, date, note);
        const label = hours < 1 ? `${Math.round(hours * 60)} minutes` : `${hours}h`;
        showToast(`${label} of effort logged`, entryId ? { label: "Undo", run: () => removeProjectEntry(id, entryId) } : undefined);
    }, [rawLogEffort, removeProjectEntry, showToast]);

    const updateProjectReadiness = useCallback((id: string, readiness: number, note?: string) => {
        rawUpdateReadiness(id, readiness, note);
        showToast(`Readiness set to ${Math.round(readiness)}%`);
    }, [rawUpdateReadiness, showToast]);

    const handleAddDailyTask = useCallback((text: string, time?: string, date?: string) => {
        const day = date ?? localDate();
        const id = addDailyTask(text, time, day);
        if (!id) return;
        showToast(day === localDate() ? "Added to today" : `Planned for ${shortDate(day)}`, { label: "Undo", run: () => deleteDailyTask(id) });
    }, [addDailyTask, deleteDailyTask, showToast]);

    const toggleDailyTask = useCallback((id: string) => {
        const task = state?.dailyTasks.find((item) => item.id === id);
        if (task && !task.done) vibrate(8);
        rawToggleTask(id);
    }, [rawToggleTask, state?.dailyTasks]);

    const handleDeleteDailyTask = useCallback((id: string) => {
        const task = state?.dailyTasks.find((item) => item.id === id);
        deleteDailyTask(id);
        showToast("Task removed", task ? { label: "Undo", run: () => restoreDailyTask(task) } : undefined);
    }, [deleteDailyTask, restoreDailyTask, showToast, state?.dailyTasks]);

    const createFromQuick = useCallback((parsed: QuickParse): "created" | "needs-editor" => {
        if (!state || !parsed.name.trim()) return "needs-editor";
        if (parsed.kind === "task") {
            handleAddDailyTask(parsed.name, parsed.time, parsed.date);
            return "created";
        }
        const todayDate = localDate();
        const start = parsed.kind === "ongoing" ? parsed.start ?? todayDate : todayDate;
        const target = parsed.kind === "ongoing" ? "" : parsed.date ?? localDate(addDays(new Date(), 30));
        const seed: EditorSeed = { kind: parsed.kind, name: parsed.name, start, target, frequency: parsed.frequency, targetPerPeriod: parsed.targetPerPeriod, plannedHours: parsed.plannedHours };
        // A target on or before today can't be counted toward; let the full editor explain.
        if (parsed.kind !== "ongoing" && (parseDate(target)?.getTime() ?? 0) <= (parseDate(start)?.getTime() ?? 0)) {
            openEventEditor(null, seed);
            return "needs-editor";
        }
        const usage = new Map(PATH_COLORS.map((color) => [color, 0]));
        for (const event of state.events) usage.set(event.color, (usage.get(event.color) ?? 0) + 1);
        const color = [...PATH_COLORS].sort((a, b) => (usage.get(a) ?? 0) - (usage.get(b) ?? 0))[0];
        const event: MilestoneEvent = {
            id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
            name: parsed.name,
            start,
            target,
            color,
            pinned: state.events.length === 0,
            kind: parsed.kind,
            isCountdown: false,
            allowExtraCheckIns: false,
            habit: parsed.kind === "habit" ? { frequency: parsed.frequency ?? "daily", targetPerPeriod: parsed.frequency === "weekly" ? parsed.targetPerPeriod ?? 1 : undefined, entries: [] } : undefined,
            project: parsed.kind === "project" ? { plannedHours: parsed.plannedHours ?? 40, readiness: 0, entries: [], checkInFrequency: "daily", checkIns: [] } : undefined,
        };
        rawUpsertEvent(event);
        vibrate(10);
        showToast(`${event.name} created`, { label: "Edit", run: () => openEventEditor(event.id) });
        return "created";
    }, [handleAddDailyTask, openEventEditor, rawUpsertEvent, showToast, state]);

    const handleAccountChange = useCallback(async () => { await resetForAccountSwitch(); window.location.reload(); }, [resetForAccountSwitch]);
    const handleNotification = useCallback((notification: EchoeNotification) => {
        markNotificationsRead([notification.id]); setNotificationsOpen(false);
        if (!notification.eventId) { navigateTo("/"); return; }
        const event = state?.events.find((item) => item.id === notification.eventId);
        if (notification.kind === "risk" && event?.project) setProgressEventId(event.id);
        else navigateTo(`/paths/${event?.id ?? ""}`);
    }, [markNotificationsRead, navigateTo, state?.events]);

    if (!state) {
        return <div className="boot" role="status"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><span>Opening Echoe…</span></div>;
    }

    const value: DashboardContextValue = {
        state, storageSummary, tick, notifications, readIds, unreadActionable,
        activeSheet, editingEventId, editorSeed, checkInEventId, progressEventId, notificationsOpen, keyboardOpen, composer, toast, celebration,
        social, socialLoading, refreshSocial, cheerShare, checkInShare,
        setCheckInEventId, setProgressEventId, setNotificationsOpen, setKeyboardOpen, openComposer, closeComposer,
        showToast, dismissToast, celebrate, clearCelebration,
        openEventEditor, openQuickStart, openSettings, closeSheet, goBack, navigateTo,
        updateSettings, updateAccent, updateAppearance, upsertEvent, syncNow, updateProjectReadiness, logProjectEffort, markNotificationsRead, clearAllData,
        snapshots, loadSnapshots, restoreSnapshot,
        todaysTasks, laterTasks, handleAddDailyTask, toggleDailyTask, updateDailyTask, handleDeleteDailyTask,
        handleDelete, handleUndo, handleExport, handleImport, handleHabitCheckIn, handleProjectCheckIn, handleClearCheckIn, toggleToday, recordEntry, clearEntry, togglePin, createFromQuick,
        handleAccountChange, handleNotification,
    };

    return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}
