"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useDashboardState } from "@/hooks/use-dashboard";
import { ACCENT_ORDER, LEGACY_THEME_TO_ACCENT, STREAK_MILESTONES } from "@/lib/constants";
import { getAuditLog } from "@/lib/local-db";
import { buildNotifications } from "@/lib/notifications";
import { getSocialSnapshot, sendCheer } from "@/lib/social-client";
import { applyTheme } from "@/lib/theme";
import type { AuditAction, DailyTask, DashboardState, EchoeNotification, HabitEntry, MilestoneEvent, MilestoneKind, SocialSnapshot, StorageSummary } from "@/lib/types";
import { habitStreak, isBlockedExtraCheckIn, isDashboardState, localDate, normalizeSettings, seedState } from "@/lib/utils";

type SnapshotSummary = { seq?: number; createdAt: string; action: AuditAction };

const EMPTY_SOCIAL: SocialSnapshot = { mode: "local", accountRequired: true, friends: [], sharedByMe: [], sharedWithMe: [], recentCheers: [] };

interface DashboardContextValue {
    state: DashboardState;
    storageSummary: StorageSummary;
    tick: number;
    notifications: EchoeNotification[];
    readIds: string[];
    unreadActionable: EchoeNotification[];
    activeSheet: "event" | "settings" | null;
    editingEventId: string | null;
    quickStartSeed: { kind: MilestoneKind; frequency?: "daily" | "weekly" } | null;
    checkInEventId: string | null;
    progressEventId: string | null;
    notificationsOpen: boolean;
    keyboardOpen: boolean;
    toastMessage: string;
    undoEvent: MilestoneEvent | null;
    showConfetti: boolean;
    social: SocialSnapshot;
    socialLoading: boolean;
    refreshSocial: () => Promise<void>;
    cheerShare: (shareId: string) => Promise<void>;
    setCheckInEventId: (id: string | null) => void;
    setProgressEventId: (id: string | null) => void;
    setNotificationsOpen: (open: boolean) => void;
    setKeyboardOpen: (open: (open: boolean) => boolean) => void;
    setShowConfetti: (show: boolean) => void;
    showToast: (message: string) => void;
    openEventEditor: (id?: string | null) => void;
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
    updateProjectReadiness: ReturnType<typeof useDashboardState>["updateProjectReadiness"];
    logProjectEffort: ReturnType<typeof useDashboardState>["logProjectEffort"];
    markNotificationsRead: ReturnType<typeof useDashboardState>["markNotificationsRead"];
    clearAllData: ReturnType<typeof useDashboardState>["clearAllData"];
    snapshots: SnapshotSummary[];
    loadSnapshots: () => Promise<void>;
    restoreSnapshot: (seq: number) => Promise<void>;
    todaysTasks: DailyTask[];
    handleAddDailyTask: (text: string, time?: string) => void;
    toggleDailyTask: ReturnType<typeof useDashboardState>["toggleDailyTask"];
    updateDailyTask: ReturnType<typeof useDashboardState>["updateDailyTask"];
    handleDeleteDailyTask: (id: string) => void;
    handleDelete: (id: string) => void;
    handleUndo: () => void;
    handleExport: () => Promise<void>;
    handleImport: (file: File) => void;
    handleHabitCheckIn: (id: string, status?: HabitEntry["status"], date?: string, note?: string) => void;
    handleProjectCheckIn: (id: string) => void;
    handleClearCheckIn: (id: string, date: string) => void;
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
    const router = useRouter();
    const {
        state, storageSummary, updateSettings, updateAccent, updateAppearance, upsertEvent: rawUpsertEvent, deleteEvent, restoreEvent,
        addAchievement, checkInHabit, checkInProject, clearHabitCheckIn, logProjectEffort, updateProjectReadiness,
        markNotificationsRead, syncNow, importState, clearAllData, resetForAccountSwitch,
        listSnapshots, restoreSnapshot: restoreSnapshotState,
        addDailyTask, toggleDailyTask, updateDailyTask, deleteDailyTask,
    } = useDashboardState();

    const [snapshots, setSnapshots] = useState<SnapshotSummary[]>([]);
    const [activeSheet, setActiveSheet] = useState<"event" | "settings" | null>(null);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [quickStartSeed, setQuickStartSeed] = useState<{ kind: MilestoneKind; frequency?: "daily" | "weekly" } | null>(null);
    const [checkInEventId, setCheckInEventId] = useState<string | null>(null);
    const [progressEventId, setProgressEventId] = useState<string | null>(null);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [keyboardOpen, setKeyboardOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [undoEvent, setUndoEvent] = useState<MilestoneEvent | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [tick, setTick] = useState(0);
    const [social, setSocial] = useState<SocialSnapshot>(EMPTY_SOCIAL);
    const [socialLoading, setSocialLoading] = useState(true);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const navigatedWithinApp = useRef(false);

    const notifications = useMemo(() => state ? buildNotifications(state.events, state.settings.profile) : [], [state]);
    const readIds = state?.settings.readNotificationIds ?? [];
    const unreadActionable = notifications.filter((item) => item.actionable && !readIds.includes(item.id));
    const todaysTasks = useMemo(() => {
        const today = localDate();
        return (state?.dailyTasks ?? [])
            .filter((task) => task.date === today)
            .sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99") || a.createdAt.localeCompare(b.createdAt));
    }, [state?.dailyTasks]);

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

    const showToast = useCallback((message: string) => {
        setToastMessage(message);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastMessage(""), 2400);
    }, []);

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
            showToast("Cheer sent");
            await refreshSocial();
        } catch (error) {
            showToast(error instanceof Error ? error.message : "That cheer could not be sent.");
        }
    }, [refreshSocial, showToast]);

    const upsertEvent = useCallback((event: MilestoneEvent) => {
        const previouslyPinned = state?.events.find((item) => item.pinned && item.id !== event.id);
        rawUpsertEvent(event);
        if (event.pinned && previouslyPinned) showToast(`${event.name} is now in focus`);
    }, [rawUpsertEvent, showToast, state?.events]);

    // Redirect a legacy `?friend_invite=` link (from before real routes existed) to /friends.
    useEffect(() => {
        const url = new URL(window.location.href);
        const token = url.searchParams.get("friend_invite");
        if (token && window.location.pathname !== "/friends") {
            navigatedWithinApp.current = true;
            router.replace(`/friends?friend_invite=${encodeURIComponent(token)}`);
        }
    }, [router]);

    useEffect(() => {
        const url = new URL(window.location.href);
        const accountResult = url.searchParams.get("account");
        const authResult = url.searchParams.get("auth");
        const message = accountResult === "connected" ? "Google account connected" : accountResult === "switched" ? "Signed in with Google" : authResult === "failed" ? "Google sign-in could not be completed" : authResult === "unavailable" ? "Cloud sign-in is not available yet" : "";
        const timer = message ? window.setTimeout(() => showToast(message), 0) : null;
        if (url.searchParams.get("action") === "add") window.setTimeout(() => { setEditingEventId(null); setActiveSheet("event"); }, 0);
        if (accountResult || authResult || url.searchParams.get("action")) {
            url.searchParams.delete("account"); url.searchParams.delete("auth"); url.searchParams.delete("action");
            window.history.replaceState(window.history.state ?? {}, "", `${url.pathname}${url.search}${url.hash}`);
        }
        return () => { if (timer) window.clearTimeout(timer); };
    }, [showToast]);

    const navigateTo = useCallback((path: string) => {
        navigatedWithinApp.current = true;
        router.push(path);
    }, [router]);

    const goBack = useCallback(() => {
        if (navigatedWithinApp.current) router.back();
        else router.push("/");
    }, [router]);

    useEffect(() => {
        const standalone = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
        if (!standalone || activeSheet || checkInEventId || progressEventId || notificationsOpen) return;
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
    }, [activeSheet, checkInEventId, goBack, notificationsOpen, progressEventId]);

    const openEventEditor = useCallback((id: string | null = null) => { setEditingEventId(id); setQuickStartSeed(null); setActiveSheet("event"); }, []);
    const openQuickStart = useCallback((kind: MilestoneKind, frequency?: "daily" | "weekly") => {
        setEditingEventId(null);
        setQuickStartSeed({ kind, frequency });
        setActiveSheet("event");
    }, []);
    const openSettings = useCallback(() => setActiveSheet("settings"), []);
    const closeSheet = useCallback(() => { setActiveSheet(null); setEditingEventId(null); }, []);
    const handleDelete = useCallback((id: string) => {
        const deleted = deleteEvent(id); if (!deleted) return;
        setUndoEvent(deleted); if (undoTimer.current) clearTimeout(undoTimer.current);
        undoTimer.current = setTimeout(() => setUndoEvent(null), 8000);
    }, [deleteEvent]);
    const handleUndo = useCallback(() => { if (!undoEvent) return; restoreEvent(undoEvent); setUndoEvent(null); showToast("Milestone restored"); }, [restoreEvent, showToast, undoEvent]);
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
    const handleHabitCheckIn = useCallback((id: string, status: HabitEntry["status"] = "done", date?: string, note?: string) => {
        const event = state?.events.find((item) => item.id === id);
        if (event?.habit && status === "done") {
            const checkInDate = date ?? localDate();
            if (isBlockedExtraCheckIn(event.habit, checkInDate, event.allowExtraCheckIns)) {
                showToast("This week's target is already met — turn on extra check-ins to log more.");
                return;
            }
            const previousStreak = habitStreak(event);
            const nextEntries = event.habit.entries.filter((entry) => entry.date !== checkInDate);
            nextEntries.push({ date: checkInDate, status: "done" });
            const nextStreak = habitStreak({ ...event, habit: { ...event.habit, entries: nextEntries } });
            if (nextStreak > previousStreak && STREAK_MILESTONES.includes(nextStreak)) {
                const unit = event.habit.frequency === "weekly" ? (nextStreak === 1 ? "week" : "weeks") : (nextStreak === 1 ? "day" : "days");
                addAchievement(`${nextStreak} ${unit} on ${event.name}`, "trophy");
                setShowConfetti(true);
            }
        }
        checkInHabit(id, status, date, note);
        showToast(status === "done" ? "Check-in recorded" : "Missed day recorded without judgement");
    }, [addAchievement, checkInHabit, showToast, state?.events]);
    const handleProjectCheckIn = useCallback((id: string) => { checkInProject(id); showToast("Project check-in recorded"); }, [checkInProject, showToast]);
    const handleClearCheckIn = useCallback((id: string, date: string) => { clearHabitCheckIn(id, date); showToast("Check-in cleared"); }, [clearHabitCheckIn, showToast]);
    const handleAddDailyTask = useCallback((text: string, time?: string) => { addDailyTask(text, time); showToast("Added to My Day"); }, [addDailyTask, showToast]);
    const handleDeleteDailyTask = useCallback((id: string) => { deleteDailyTask(id); showToast("Removed from My Day"); }, [deleteDailyTask, showToast]);
    const handleAccountChange = useCallback(async () => { await resetForAccountSwitch(); window.location.reload(); }, [resetForAccountSwitch]);
    const handleNotification = useCallback((notification: EchoeNotification) => {
        markNotificationsRead([notification.id]); setNotificationsOpen(false);
        if (!notification.eventId) { navigateTo("/"); return; }
        const event = state?.events.find((item) => item.id === notification.eventId);
        if (notification.kind === "risk" && event?.project) setProgressEventId(event.id);
        else navigateTo(`/paths/${event?.id ?? ""}`);
    }, [markNotificationsRead, navigateTo, state?.events]);

    if (!state) {
        return <div className="grid min-h-[100dvh] place-items-center bg-[var(--color-bg)]"><div className="text-sm text-[var(--color-muted)] animate-pulse">Opening Echoe…</div></div>;
    }

    const value: DashboardContextValue = {
        state, storageSummary, tick, notifications, readIds, unreadActionable,
        activeSheet, editingEventId, quickStartSeed, checkInEventId, progressEventId, notificationsOpen, keyboardOpen, toastMessage, undoEvent, showConfetti,
        social, socialLoading, refreshSocial, cheerShare,
        setCheckInEventId, setProgressEventId, setNotificationsOpen, setKeyboardOpen, setShowConfetti,
        showToast, openEventEditor, openQuickStart, openSettings, closeSheet, goBack, navigateTo,
        updateSettings, updateAccent, updateAppearance, upsertEvent, syncNow, updateProjectReadiness, logProjectEffort, markNotificationsRead, clearAllData,
        snapshots, loadSnapshots, restoreSnapshot,
        todaysTasks, handleAddDailyTask, toggleDailyTask, updateDailyTask, handleDeleteDailyTask,
        handleDelete, handleUndo, handleExport, handleImport, handleHabitCheckIn, handleProjectCheckIn, handleClearCheckIn, handleAccountChange, handleNotification,
    };

    return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}
