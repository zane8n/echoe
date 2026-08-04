"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BgCanvas } from "@/components/bg-canvas";
import { CheckInSheet } from "@/components/check-in-sheet";
import { Confetti } from "@/components/confetti";
import { EventSheet } from "@/components/event-sheet";
import { EventsSection } from "@/components/events-section";
import { Header } from "@/components/header";
import { Icon } from "@/components/icon";
import { KbdModal } from "@/components/kbd-modal";
import { NotificationSheet } from "@/components/notification-sheet";
import { PathCarousel, pathStatus } from "@/components/path-carousel";
import { ProgressSheet } from "@/components/progress-sheet";
import { SettingsSheet } from "@/components/settings-sheet";
import { SwUpdate } from "@/components/sw-update";
import { TodayRhythm } from "@/components/today-rhythm";
import { Toast } from "@/components/toast";
import { WeeksGrid } from "@/components/weeks-grid";
import { useDashboardState } from "@/hooks/use-dashboard";
import { useKeyboard } from "@/hooks/use-keyboard";
import { THEMES } from "@/lib/constants";
import { getAuditLog } from "@/lib/local-db";
import { buildNotifications } from "@/lib/notifications";
import { applyTheme } from "@/lib/theme";
import type { DashboardState, EchoeNotification, HabitEntry, MilestoneEvent } from "@/lib/types";
import { isDashboardState, normalizeSettings, seedState } from "@/lib/utils";

type AppView = "home" | "paths" | "momentum";

export default function Home() {
    const {
        state, storageSummary, updateSettings, updateTheme, upsertEvent, deleteEvent, restoreEvent,
        checkInHabit, checkInProject, clearHabitCheckIn, logProjectEffort, updateProjectReadiness,
        markNotificationsRead, syncNow, importState, clearAllData, resetForAccountSwitch,
    } = useDashboardState();
    const [view, setView] = useState<AppView>("home");
    const [activeSheet, setActiveSheet] = useState<"event" | "settings" | null>(null);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [checkInEventId, setCheckInEventId] = useState<string | null>(null);
    const [progressEventId, setProgressEventId] = useState<string | null>(null);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [keyboardOpen, setKeyboardOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [undoEvent, setUndoEvent] = useState<MilestoneEvent | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [tick, setTick] = useState(0);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const checkInEvent = state?.events.find((event) => event.id === checkInEventId) ?? null;
    const progressEvent = state?.events.find((event) => event.id === progressEventId) ?? null;
    const notifications = useMemo(() => state ? buildNotifications(state.events, state.settings.profile) : [], [state]);
    const readIds = state?.settings.readNotificationIds ?? [];
    const unreadActionable = notifications.filter((item) => item.actionable && !readIds.includes(item.id));
    const focused = state?.events.find((event) => event.pinned) ?? state?.events[0];

    useEffect(() => {
        applyTheme(state?.settings.theme ?? "blue");
    }, [state?.settings.theme]);

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

    useEffect(() => {
        const url = new URL(window.location.href);
        const accountResult = url.searchParams.get("account");
        const authResult = url.searchParams.get("auth");
        const message = accountResult === "connected" ? "Google account connected" : accountResult === "switched" ? "Signed in with Google" : authResult === "failed" ? "Google sign-in could not be completed" : authResult === "unavailable" ? "Cloud sign-in is not available yet" : "";
        const timer = message ? window.setTimeout(() => showToast(message), 0) : null;
        if (url.searchParams.get("action") === "add") window.setTimeout(() => { setEditingEventId(null); setActiveSheet("event"); }, 0);
        if (accountResult || authResult || url.searchParams.get("action")) {
            url.searchParams.delete("account"); url.searchParams.delete("auth"); url.searchParams.delete("action");
            window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        }
        return () => { if (timer) window.clearTimeout(timer); };
    }, [showToast]);

    const openEventEditor = useCallback((id: string | null = null) => { setEditingEventId(id); setActiveSheet("event"); }, []);
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
            const legacy = candidate as DashboardState & { settings: DashboardState["settings"] & { showLifeGrid?: boolean } };
            importState({ ...seedState(), ...legacy, schemaVersion: 2, settings: normalizeSettings({ theme: THEMES[legacy.settings.theme] ? legacy.settings.theme : "blue", showActivityHistogram: legacy.settings.showActivityHistogram ?? legacy.settings.showLifeGrid ?? true, readNotificationIds: legacy.settings.readNotificationIds, profile: legacy.settings.profile }), updatedAt: new Date().toISOString() });
            showToast("Backup imported");
        } catch { showToast("That file is not a valid Echoe backup"); } };
        reader.readAsText(file);
    }, [importState, showToast]);
    const handleHabitCheckIn = useCallback((id: string, status: HabitEntry["status"] = "done", date?: string, note?: string) => { checkInHabit(id, status, date, note); showToast(status === "done" ? "Check-in recorded" : "Missed day recorded without judgement"); }, [checkInHabit, showToast]);
    const handleProjectCheckIn = useCallback((id: string) => { checkInProject(id); showToast("Project check-in recorded"); }, [checkInProject, showToast]);
    const handleClearCheckIn = useCallback((id: string, date: string) => { clearHabitCheckIn(id, date); showToast("Check-in cleared"); }, [clearHabitCheckIn, showToast]);
    const handleAccountChange = useCallback(async () => { await resetForAccountSwitch(); window.location.reload(); }, [resetForAccountSwitch]);
    const handleNotification = useCallback((notification: EchoeNotification) => {
        markNotificationsRead([notification.id]); setNotificationsOpen(false);
        if (!notification.eventId) { setView("home"); return; }
        const event = state?.events.find((item) => item.id === notification.eventId);
        if (notification.kind === "risk" && event?.project) setProgressEventId(event.id);
        else setView("home");
    }, [markNotificationsRead, state?.events]);

    useKeyboard({ Escape: () => { if (keyboardOpen) setKeyboardOpen(false); else if (notificationsOpen) setNotificationsOpen(false); else if (checkInEventId) setCheckInEventId(null); else if (progressEventId) setProgressEventId(null); else if (activeSheet) closeSheet(); else if (undoEvent) setUndoEvent(null); }, "?": () => setKeyboardOpen((open) => !open), n: () => openEventEditor(), N: () => openEventEditor(), s: openSettings, S: openSettings, "Ctrl+Z": handleUndo });

    if (!state) return <div className="grid min-h-[100dvh] place-items-center bg-[var(--color-bg)]"><div className="text-sm text-[var(--color-muted)] animate-pulse">Opening Echoe…</div></div>;

    return <div className="app-shell min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-ink)]" data-view={view}>
        <BgCanvas />
        <Header displayName={state.settings.profile.displayName} notificationCount={unreadActionable.length} onHome={() => setView("home")} onOpenNotifications={() => setNotificationsOpen(true)} onOpenSettings={openSettings} />

        {view === "home" && <main className="home-view relative z-10 mx-auto w-[min(100%,760px)]">
            <PathCarousel events={state.events} profile={state.settings.profile} onHabitCheckIn={(id) => handleHabitCheckIn(id)} onProjectCheckIn={handleProjectCheckIn} onOpenHistory={setCheckInEventId} onProgress={setProgressEventId} />
            <p className="home-status"><Icon name="sparkle" size={14} />{pathStatus(focused, state.settings.profile)}</p>
            <TodayRhythm tick={tick} />
        </main>}

        {view === "paths" && <main className="app-page relative z-10 mx-auto w-[min(calc(100%-40px),920px)]">
            <EventsSection events={state.events} onEdit={openEventEditor} onExport={handleExport} onCheckIn={(id) => handleHabitCheckIn(id)} onProjectCheckIn={handleProjectCheckIn} onOpenHistory={setCheckInEventId} onProgress={setProgressEventId} />
        </main>}

        {view === "momentum" && <main className="app-page momentum-page relative z-10 mx-auto w-[min(calc(100%-40px),920px)]">
            {state.events.length ? <WeeksGrid events={state.events} show={state.settings.showActivityHistogram} tick={tick} /> : <div className="empty-momentum"><Icon name="trending-up" size={22} /><h1>Momentum will gather here</h1><p>It grows from real check-ins and project updates.</p></div>}
            <p className="design-credit">Designed by <strong>Kikandi</strong></p>
        </main>}

        {activeSheet === "event" && <EventSheet key={editingEventId ?? "new"} eventId={editingEventId} events={state.events} onSave={upsertEvent} onDelete={handleDelete} onClose={closeSheet} />}
        {activeSheet === "settings" && <SettingsSheet settings={state.settings} storage={storageSummary} onSave={updateSettings} onThemeChange={updateTheme} onSync={syncNow} onExport={handleExport} onImport={handleImport} onClearData={clearAllData} onAccountChange={handleAccountChange} onClose={closeSheet} />}
        {checkInEvent?.habit && <CheckInSheet event={checkInEvent} onCheckIn={handleHabitCheckIn} onClear={handleClearCheckIn} onClose={() => setCheckInEventId(null)} />}
        {progressEvent?.project && <ProgressSheet event={progressEvent} onEffort={(id, hours, date, note) => { logProjectEffort(id, hours, date, note); showToast("Effort recorded"); }} onReadiness={(id, readiness, note) => { updateProjectReadiness(id, readiness, note); showToast("Readiness updated"); }} onClose={() => setProgressEventId(null)} />}
        {notificationsOpen && <NotificationSheet notifications={notifications} readIds={readIds} onMarkRead={markNotificationsRead} onSelect={handleNotification} onClose={() => setNotificationsOpen(false)} />}

        <nav className="mobile-nav" aria-label="Primary navigation">
            <button type="button" onClick={() => setView("paths")} aria-current={view === "paths" ? "page" : undefined}><Icon name="layers" size={20} /><span>Paths</span></button>
            <button type="button" onClick={() => openEventEditor()} aria-label="Add a path"><span className="mobile-add"><Icon name="plus" size={23} /></span><span>Add</span></button>
            <button type="button" onClick={() => setView("momentum")} aria-current={view === "momentum" ? "page" : undefined}><Icon name="trending-up" size={20} /><span>Momentum</span></button>
        </nav>
        <KbdModal open={keyboardOpen} onClose={() => setKeyboardOpen(false)} /><Toast message={toastMessage} undoEvent={undoEvent} onUndo={handleUndo} /><Confetti active={showConfetti} onDone={() => setShowConfetti(false)} /><SwUpdate />
    </div>;
}
