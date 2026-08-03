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
import { SettingsSheet } from "@/components/settings-sheet";
import { SwUpdate } from "@/components/sw-update";
import { TimeSection } from "@/components/time-section";
import { Toast } from "@/components/toast";
import { WeeksGrid } from "@/components/weeks-grid";
import { useDashboardState } from "@/hooks/use-dashboard";
import { useKeyboard } from "@/hooks/use-keyboard";
import { THEMES } from "@/lib/constants";
import { getAuditLog } from "@/lib/local-db";
import type { DashboardState, HabitEntry, MilestoneEvent, ThemeConfig, ThemeName } from "@/lib/types";
import { isDashboardState, seedState } from "@/lib/utils";

export default function Home() {
    const {
        state,
        storageSummary,
        updateSettings,
        upsertEvent,
        deleteEvent,
        restoreEvent,
        checkInHabit,
        clearHabitCheckIn,
        importState,
        clearAllData,
    } = useDashboardState();
    const [activeSheet, setActiveSheet] = useState<"event" | "settings" | null>(null);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [checkInEventId, setCheckInEventId] = useState<string | null>(null);
    const [previewTheme, setPreviewTheme] = useState<ThemeName | null>(null);
    const [keyboardOpen, setKeyboardOpen] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [undoEvent, setUndoEvent] = useState<MilestoneEvent | null>(null);
    const [showConfetti, setShowConfetti] = useState(false);
    const [tick, setTick] = useState(0);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const themeName = previewTheme ?? state?.settings.theme ?? "warm";
    const theme: ThemeConfig = useMemo(() => THEMES[themeName] ?? THEMES.warm, [themeName]);
    const checkInEvent = state?.events.find((event) => event.id === checkInEventId) ?? null;

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
    const openEventEditor = useCallback((id: string | null = null) => {
        setEditingEventId(id);
        setActiveSheet("event");
    }, []);
    const openSettings = useCallback(() => setActiveSheet("settings"), []);
    const closeSheet = useCallback(() => {
        setActiveSheet(null);
        setEditingEventId(null);
        setPreviewTheme(null);
    }, []);
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
                    settings: {
                        theme: THEMES[legacy.settings.theme] ? legacy.settings.theme : "warm",
                        showActivityHistogram: legacy.settings.showActivityHistogram ?? legacy.settings.showLifeGrid ?? true,
                    },
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

    useKeyboard({
        Escape: () => {
            if (keyboardOpen) setKeyboardOpen(false);
            else if (checkInEventId) setCheckInEventId(null);
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
            <Header onAddEvent={() => openEventEditor()} onOpenSettings={openSettings} />
            <main className="relative z-10 mx-auto w-[min(calc(100%-40px),1120px)] pt-[clamp(42px,7vw,82px)]">
                <FocusSection
                    events={state.events}
                    tick={tick}
                    onEdit={openEventEditor}
                    onConfetti={() => setShowConfetti(true)}
                    onCheckIn={(id) => handleCheckIn(id, "done")}
                    onMiss={(id) => handleCheckIn(id, "missed")}
                    onOpenHistory={setCheckInEventId}
                />
                <TimeSection tick={tick} />
                <EventsSection
                    events={state.events}
                    onEdit={openEventEditor}
                    onExport={handleExport}
                    onCheckIn={(id) => handleCheckIn(id, "done")}
                    onOpenHistory={setCheckInEventId}
                />
                <WeeksGrid events={state.events} show={state.settings.showActivityHistogram} tick={tick} />
                <footer className="mt-[84px] flex flex-wrap justify-between gap-5 border-t border-[var(--color-line)] pb-9 pt-7 text-xs text-[var(--color-muted)]">
                    <span>{storageSummary.syncStatus === "synced" ? "Local-first, backed by your Vercel database" : "Local-first, stored in this browser"}</span>
                    <span>Designed by <span className="font-semibold text-[var(--color-accent-ink)]">Kikandi</span></span>
                </footer>
            </main>

            {activeSheet === "event" && <EventSheet eventId={editingEventId} events={state.events} onSave={upsertEvent} onDelete={handleDelete} onClose={closeSheet} />}
            {activeSheet === "settings" && (
                <SettingsSheet
                    settings={state.settings}
                    storage={storageSummary}
                    onSave={updateSettings}
                    onPreviewTheme={setPreviewTheme}
                    onExport={handleExport}
                    onImport={handleImport}
                    onClearData={clearAllData}
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
            <KbdModal open={keyboardOpen} onClose={() => setKeyboardOpen(false)} />
            <Toast message={toastMessage} undoEvent={undoEvent} onUndo={handleUndo} />
            <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />
            <SwUpdate />
        </div>
    );
}
