"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BgCanvas } from "@/components/bg-canvas";
import { CheckInSheet } from "@/components/check-in-sheet";
import { Confetti } from "@/components/confetti";
import { EventSheet } from "@/components/event-sheet";
import { Header } from "@/components/header";
import { Icon } from "@/components/icon";
import { KbdModal } from "@/components/kbd-modal";
import { NotificationSheet } from "@/components/notification-sheet";
import { ProgressSheet } from "@/components/progress-sheet";
import { SettingsSheet } from "@/components/settings-sheet";
import { SwUpdate } from "@/components/sw-update";
import { Toast } from "@/components/toast";
import { useKeyboard } from "@/hooks/use-keyboard";
import { DashboardProvider, useDashboard } from "./providers/dashboard-provider";

function Shell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const {
        state, storageSummary, checkInEventId, progressEventId, activeSheet, editingEventId, quickStartSeed, notificationsOpen, keyboardOpen,
        toastMessage, undoEvent, showConfetti, notifications, readIds, unreadActionable,
        setCheckInEventId, setProgressEventId, setNotificationsOpen, setKeyboardOpen, setShowConfetti,
        openEventEditor, openSettings, closeSheet, handleUndo, handleDelete,
        handleHabitCheckIn, handleClearCheckIn, handleNotification, markNotificationsRead,
        upsertEvent, updateSettings, updateAccent, updateAppearance, syncNow, handleExport, handleImport, clearAllData, handleAccountChange,
        logProjectEffort, updateProjectReadiness, showToast,
        snapshots, loadSnapshots, restoreSnapshot,
    } = useDashboard();

    const checkInEvent = state.events.find((event) => event.id === checkInEventId) ?? null;
    const progressEvent = state.events.find((event) => event.id === progressEventId) ?? null;

    useKeyboard({
        Escape: () => { if (keyboardOpen) setKeyboardOpen(() => false); else if (notificationsOpen) setNotificationsOpen(false); else if (checkInEventId) setCheckInEventId(null); else if (progressEventId) setProgressEventId(null); else if (activeSheet) closeSheet(); else if (undoEvent) handleUndo(); },
        "?": () => setKeyboardOpen((open) => !open),
        n: () => openEventEditor(),
        N: () => openEventEditor(),
        s: openSettings,
        S: openSettings,
        "Ctrl+Z": handleUndo,
    });

    return <div className="app-shell min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-ink)]" data-view={pathname === "/" ? "home" : "other"}>
        <BgCanvas />
        <Header displayName={state.settings.profile.displayName} notificationCount={unreadActionable.length} onOpenNotifications={() => setNotificationsOpen(true)} onOpenSettings={openSettings} />

        {children}

        {activeSheet === "event" && <EventSheet key={editingEventId ?? "new"} eventId={editingEventId} events={state.events} onSave={upsertEvent} onDelete={handleDelete} onClose={closeSheet} seed={quickStartSeed} />}
        {activeSheet === "settings" && <SettingsSheet settings={state.settings} storage={storageSummary} onSave={updateSettings} onAccentChange={updateAccent} onAppearanceChange={updateAppearance} onSync={syncNow} onExport={handleExport} onImport={handleImport} onClearData={clearAllData} onAccountChange={handleAccountChange} onClose={closeSheet} snapshots={snapshots} onLoadSnapshots={loadSnapshots} onRestoreSnapshot={restoreSnapshot} />}
        {checkInEvent?.habit && <CheckInSheet event={checkInEvent} onCheckIn={handleHabitCheckIn} onClear={handleClearCheckIn} onClose={() => setCheckInEventId(null)} />}
        {progressEvent?.project && <ProgressSheet event={progressEvent} onEffort={(id, hours, date, note) => { logProjectEffort(id, hours, date, note); showToast("Effort recorded"); }} onReadiness={(id, readiness, note) => { updateProjectReadiness(id, readiness, note); showToast("Readiness updated"); }} onClose={() => setProgressEventId(null)} />}
        {notificationsOpen && <NotificationSheet notifications={notifications} readIds={readIds} onMarkRead={markNotificationsRead} onSelect={handleNotification} onClose={() => setNotificationsOpen(false)} />}

        <nav className="mobile-nav" aria-label="Primary navigation">
            <Link href="/" aria-current={pathname === "/" ? "page" : undefined}><Icon name="home" size={19} /><span>Home</span></Link>
            <Link href="/paths" aria-current={pathname === "/paths" ? "page" : undefined}><Icon name="layers" size={19} /><span>Paths</span></Link>
            <Link href="/my-day" aria-current={pathname === "/my-day" ? "page" : undefined}><Icon name="list-checks" size={19} /><span>My Day</span></Link>
            <button type="button" onClick={() => openEventEditor()} aria-label="Add a path"><span className="mobile-add"><Icon name="plus" size={23} /></span><span>Add</span></button>
            <Link href="/momentum" aria-current={pathname === "/momentum" ? "page" : undefined}><Icon name="trending-up" size={19} /><span>Momentum</span></Link>
            <Link href="/friends" aria-current={pathname === "/friends" ? "page" : undefined}><Icon name="users" size={19} /><span>Friends</span></Link>
        </nav>
        <KbdModal open={keyboardOpen} onClose={() => setKeyboardOpen(() => false)} /><Toast message={toastMessage} undoEvent={undoEvent} onUndo={handleUndo} /><Confetti active={showConfetti} onDone={() => setShowConfetti(false)} /><SwUpdate />
    </div>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <DashboardProvider>
            <Shell>{children}</Shell>
        </DashboardProvider>
    );
}
