"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BgCanvas } from "@/components/bg-canvas";
import { CheckInSheet } from "@/components/check-in-sheet";
import { Confetti } from "@/components/confetti";
import { EventSheet } from "@/components/event-sheet";
import { EventsSection } from "@/components/events-section";
import { FocusSection } from "@/components/focus-section";
import { Header } from "@/components/header";
import { KbdModal } from "@/components/kbd-modal";
import { ProgressSheet } from "@/components/progress-sheet";
import { SettingsSheet } from "@/components/settings-sheet";
import { SwUpdate } from "@/components/sw-update";
import { TimeSection } from "@/components/time-section";
import { Toast } from "@/components/toast";
import { WeeksGrid } from "@/components/weeks-grid";
import { useDashboardState } from "@/hooks/use-dashboard";
import { useKeyboard } from "@/hooks/use-keyboard";
import { THEMES } from "@/lib/constants";
import { getAuditLog } from "@/lib/local-db";
import type { DashboardState, HabitEntry, MilestoneEvent, ThemeConfig } from "@/lib/types";
import { isDashboardState, localDate, normalizeSettings, projectProgress, seedState } from "@/lib/utils";
import { Icon } from "@/components/icon";

export default function Home() {
    const {
        state,
        storageSummary,
        updateSettings,
        updateTheme,
        upsertEvent,
        deleteEvent,
        restoreEvent,
        checkInHabit,
        clearHabitCheckIn,
        logProjectProgress,
        syncNow,
        importState,
        clearAllData,
        resetForAccountSwitch,
    } = useDashboardState();
    const [activeSheet, setActiveSheet] = useState<"event" | "settings" | null>(null);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [checkInEventId, setCheckInEventId] = useState<string | null>(null);
    const [progressEventId, setProgressEventId] = useState<string | null>(null);
    const [keyboardOpen, setKeyboardOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [undoEvent, setUndoEvent] = useState<MilestoneEvent | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [tick, setTick] = useState(0);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const themeName = state?.settings.theme ?? "warm";
    const theme: ThemeConfig = useMemo(() => THEMES[themeName] ?? THEMES.warm, [themeName]);
    const checkInEvent = state?.events.find((event) => event.id === checkInEventId) ?? null;
    const progressEvent = state?.events.find((event) => event.id === progressEventId) ?? null;

    useEffect(() => {
        const updateClock = () => setTick(Date.now());
        const initial = setTimeout(updateClock, 0);
        const interval = setInterval(updateClock, 60_000);
        return () => {
            clearTimeout(initial);
            clearInterval(interval);
        };
    }, []);

    const showToast = useCallback((message: string) => {
        setToastMessage(message);
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToastMessage(""), 2400);
    }, []);
    useEffect(() => {
        const url = new URL(window.location.href);
        const accountResult = url.searchParams.get("account");
        const authResult = url.searchParams.get("auth");
        const message = accountResult === "connected"
            ? "Google account connected"
            : accountResult === "switched"
                ? "Signed in with Google"
                : authResult === "failed"
                    ? "Google sign-in could not be completed"
                    : authResult === "unavailable"
                        ? "Cloud sign-in is not available yet"
                        : "";
        const timer = message ? window.setTimeout(() => showToast(message), 0) : null;
        if (accountResult || authResult) {
            url.searchParams.delete("account");
            url.searchParams.delete("auth");
            window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        }
        if (url.searchParams.get("action") === "add") {
            window.setTimeout(() => {
                setEditingEventId(null);
                setActiveSheet("event");
            }, 0);
            url.searchParams.delete("action");
            window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
        }
        return () => { if (timer) window.clearTimeout(timer); };
    }, [showToast]);
    const openEventEditor = useCallback((id: string | null = null) => {
        setEditingEventId(id);
        setActiveSheet("event");
    }, []);
    const openSettings = useCallback(() => setActiveSheet("settings"), []);
    const closeSheet = useCallback(() => {
        setActiveSheet(null);
        setEditingEventId(null);
    }, []);

    useEffect(() => {
        if (!state) return;
        const today = localDate();
        const habitsDue = state.events.filter((event) => event.habit && !event.habit.entries.some((entry) => entry.date === today && entry.status === "done")).length;
        const projectsAtRisk = state.events.filter((event) => event.project && projectProgress(event).risk === "at-risk").length;
        const badgeNavigator = navigator as Navigator & { setAppBadge?: (count?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
        const attention = habitsDue + projectsAtRisk;
        if (attention > 0) void badgeNavigator.setAppBadge?.(attention).catch(() => undefined);
        else void badgeNavigator.clearAppBadge?.().catch(() => undefined);
    }, [state]);
    const handleDelete = useCallback((id: string) => {
        const deleted = deleteEvent(id);
        if (!deleted) return;
        setUndoEvent(deleted);
        if (undoTimer.current) clearTimeout(undoTimer.current);
        undoTimer.current = setTimeout(() => setUndoEvent(null), 8000);
    }, [deleteEvent]);
    const handleUndo = useCallback(() => {
        if (!undoEvent) return;
        restoreEvent(undoEvent);
        setUndoEvent(null);
        showToast("Milestone restored");
    }, [restoreEvent, showToast, undoEvent]);
    const handleExport = useCallback(async () => {
        if (!state) return;
        const audit = await getAuditLog(500);
        const backup = { format: "echoe-backup-v2", exportedAt: new Date().toISOString(), state, audit };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `echoe-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        showToast("Backup and history exported");
    }, [showToast, state]);
    const handleImport = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(reader.result as string) as { state?: unknown } | DashboardState;
                const candidate = "state" in parsed ? parsed.state : parsed;
                if (!isDashboardState(candidate)) throw new Error("Invalid backup");
                const legacy = candidate as DashboardState & { settings: DashboardState["settings"] & { showLifeGrid?: boolean } };
                importState({
                    ...seedState(),
                    ...legacy,
                    schemaVersion: 2,
                    settings: normalizeSettings({
                        theme: THEMES[legacy.settings.theme] ? legacy.settings.theme : "warm",
                        showActivityHistogram: legacy.settings.showActivityHistogram ?? legacy.settings.showLifeGrid ?? true,
                        profile: legacy.settings.profile,
                    }),
                    updatedAt: new Date().toISOString(),
                });
                showToast("Backup imported");
            } catch {
                showToast("That file is not a valid Echoe backup");
            }
        };
        reader.readAsText(file);
    }, [importState, showToast]);
    const handleCheckIn = useCallback((id: string, status: HabitEntry["status"] = "done", date?: string, note?: string) => {
        checkInHabit(id, status, date, note);
        showToast(status === "done" ? "Check-in recorded" : "Missed day recorded without judgement");
    }, [checkInHabit, showToast]);
    const handleClearCheckIn = useCallback((id: string, date: string) => {
        clearHabitCheckIn(id, date);
        showToast("Check-in cleared");
    }, [clearHabitCheckIn, showToast]);
    const handleAccountChange = useCallback(async () => {
        await resetForAccountSwitch();
        window.location.reload();
    }, [resetForAccountSwitch]);

    useKeyboard({
        Escape: () => {
            if (keyboardOpen) setKeyboardOpen(false);
            else if (checkInEventId) setCheckInEventId(null);
            else if (progressEventId) setProgressEventId(null);
            else if (activeSheet) closeSheet();
            else if (undoEvent) setUndoEvent(null);
        },
        "?": () => setKeyboardOpen((open) => !open),
        n: () => openEventEditor(),
        N: () => openEventEditor(),
        s: openSettings,
        S: openSettings,
        "Ctrl+Z": handleUndo,
    });

    if (!state) {
        return <div className="grid min-h-screen place-items-center bg-[var(--color-bg)]"><div className="text-sm text-[var(--color-muted)] animate-pulse">Opening Echoe…</div></div>;
    }

    const themeStyle = {
        "--bg": theme.bg,
        "--surface": theme.surface,
        "--ink": theme.ink,
        "--ink-soft": theme.inkSoft,
        "--muted": theme.muted,
        "--line": theme.line,
        "--accent": theme.accent,
        "--accent-ink": theme.accentInk,
    } as React.CSSProperties;

    return (
        <div className="app-shell min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]" style={themeStyle}>
            <BgCanvas />
            <Header displayName={state.settings.profile.displayName} onAddEvent={() => openEventEditor()} onOpenSettings={openSettings} />
            <main className="relative z-10 mx-auto w-[min(calc(100%-40px),920px)] pt-[clamp(28px,5vw,54px)]">
                <EventsSection
                    events={state.events}
                    onEdit={openEventEditor}
                    onExport={handleExport}
                    onCheckIn={(id) => handleCheckIn(id, "done")}
                    onOpenHistory={setCheckInEventId}
                    onProgress={setProgressEventId}
                />
                {state.events.length > 0 && <FocusSection
                    events={state.events}
                    tick={tick}
                    onEdit={openEventEditor}
                    onConfetti={() => setShowConfetti(true)}
                    onCheckIn={(id) => handleCheckIn(id, "done")}
                    onMiss={(id) => handleCheckIn(id, "missed")}
                    onOpenHistory={setCheckInEventId}
                    onProgress={setProgressEventId}
                    profile={state.settings.profile}
                />}
                <WeeksGrid events={state.events} show={state.settings.showActivityHistogram} tick={tick} />
                <details className="dashboard-fold mt-6">
                    <summary><span><Icon name="clock" size={15} />Today&apos;s rhythm</span><Icon name="chevron-right" size={15} /></summary>
                    <TimeSection tick={tick} />
                </details>
                <footer className="mt-[84px] flex flex-wrap justify-between gap-5 border-t border-[var(--color-line)] pb-9 pt-7 text-xs text-[var(--color-muted)]">
                    <span>{state.settings.profile.displayName ? `${state.settings.profile.displayName}'s Echoe` : "Your Echoe"} is {storageSummary.syncStatus === "synced" ? "synced securely" : storageSummary.isOnline ? "stored on this device" : "available offline"}</span>
                    <span>Designed by <span className="font-semibold text-[var(--color-accent-ink)]">Kikandi</span></span>
                </footer>
            </main>

            {activeSheet === "event" && <EventSheet key={editingEventId ?? "new"} eventId={editingEventId} events={state.events} onSave={upsertEvent} onDelete={handleDelete} onClose={closeSheet} />}
            {activeSheet === "settings" && (
                <SettingsSheet
                    settings={state.settings}
                    storage={storageSummary}
                    onSave={updateSettings}
                    onThemeChange={updateTheme}
                    onSync={syncNow}
                    onExport={handleExport}
                    onImport={handleImport}
                    onClearData={clearAllData}
                    onAccountChange={handleAccountChange}
                    onClose={closeSheet}
                />
            )}
            {checkInEvent?.habit && (
                <CheckInSheet
                    event={checkInEvent}
                    onCheckIn={handleCheckIn}
                    onClear={handleClearCheckIn}
                    onClose={() => setCheckInEventId(null)}
                />
            )}
            {progressEvent?.project && <ProgressSheet event={progressEvent} onLog={(id, hours, readiness, date, note) => { logProjectProgress(id, hours, readiness, date, note); showToast("Project progress recorded"); }} onClose={() => setProgressEventId(null)} />}
            <nav className="mobile-nav" aria-label="Primary navigation">
                <a href="#paths"><Icon name="layers" size={19} /><span>Paths</span></a>
                <button type="button" onClick={() => openEventEditor()} aria-label="Add a path"><span className="mobile-add"><Icon name="plus" size={21} /></span><span>Add</span></button>
                <a href="#momentum"><Icon name="trending-up" size={19} /><span>Momentum</span></a>
                <button type="button" onClick={openSettings}><Icon name="settings" size={19} /><span>You</span></button>
            </nav>
            <KbdModal open={keyboardOpen} onClose={() => setKeyboardOpen(false)} />
            <Toast message={toastMessage} undoEvent={undoEvent} onUndo={handleUndo} />
            <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />
            <SwUpdate />
        </div>
    );
}
