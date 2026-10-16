"use client";

import { usePathname } from "next/navigation";
import { AppChrome } from "@/components/app-chrome";
import { CheckInSheet } from "@/components/check-in-sheet";
import { Composer } from "@/components/composer";
import { EchoBurst } from "@/components/echo-burst";
import { EventSheet } from "@/components/event-sheet";
import { KbdModal } from "@/components/kbd-modal";
import { NotificationSheet } from "@/components/notification-sheet";
import { ProgressSheet } from "@/components/progress-sheet";
import { SettingsSheet } from "@/components/settings-sheet";
import { SwUpdate } from "@/components/sw-update";
import { Toast } from "@/components/toast";
import { useKeyboard } from "@/hooks/use-keyboard";
import { useScrollChrome } from "@/hooks/use-scroll-chrome";
import { DashboardProvider, useDashboard } from "./providers/dashboard-provider";
import { NavigationProvider, TAB_PATHS } from "./providers/navigation-provider";

function Shell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { scrolled, compact } = useScrollChrome(pathname);
    const {
        state, storageSummary, checkInEventId, progressEventId, activeSheet, editingEventId, editorSeed, notificationsOpen, keyboardOpen, composer,
        toast, celebration, notifications, readIds, unreadActionable,
        setCheckInEventId, setProgressEventId, setNotificationsOpen, setKeyboardOpen, openComposer, closeComposer, dismissToast, clearCelebration,
        openSettings, closeSheet, handleUndo, handleDelete, navigateTo,
        handleHabitCheckIn, handleClearCheckIn, handleNotification, markNotificationsRead,
        upsertEvent, updateSettings, updateAccent, updateAppearance, syncNow, handleExport, handleImport, clearAllData, handleAccountChange,
        logProjectEffort, updateProjectReadiness,
        snapshots, loadSnapshots, restoreSnapshot,
    } = useDashboard();

    const checkInEvent = state.events.find((event) => event.id === checkInEventId) ?? null;
    const progressEvent = state.events.find((event) => event.id === progressEventId) ?? null;
    const overlayOpen = Boolean(activeSheet || checkInEvent || progressEvent || notificationsOpen || keyboardOpen || composer.open);

    const goToTab = (index: number) => () => { if (!overlayOpen) navigateTo(TAB_PATHS[index]); };
    useKeyboard({
        Escape: () => {
            if (keyboardOpen) setKeyboardOpen(() => false);
            else if (composer.open) closeComposer();
            else if (notificationsOpen) setNotificationsOpen(false);
            else if (checkInEventId) setCheckInEventId(null);
            else if (progressEventId) setProgressEventId(null);
            else if (activeSheet) closeSheet();
            else if (toast) dismissToast();
        },
        "Mod+k": () => { if (composer.open) closeComposer(); else if (!activeSheet) openComposer(); },
        "Mod+z": handleUndo,
        "/": () => { if (!overlayOpen) openComposer(); },
        n: () => { if (!overlayOpen) openComposer(); },
        N: () => { if (!overlayOpen) openComposer(); },
        s: () => { if (!overlayOpen) openSettings(); },
        S: () => { if (!overlayOpen) openSettings(); },
        "?": () => setKeyboardOpen((open) => !open),
        "1": goToTab(0),
        "2": goToTab(1),
        "3": goToTab(2),
        "4": goToTab(3),
    });

    return (
        <div className="app-shell" data-compact={compact}>
            <AppChrome
                displayName={state.settings.profile.displayName}
                notificationCount={unreadActionable.length}
                scrolled={scrolled}
                composerOpen={composer.open}
                onOpenComposer={() => (composer.open ? closeComposer() : openComposer())}
                onOpenNotifications={() => setNotificationsOpen(true)}
                onOpenSettings={openSettings}
            />

            {children}

            {composer.open && <Composer key="composer" initialText={composer.text} onClose={closeComposer} />}
            {activeSheet === "event" && <EventSheet key={editingEventId ?? "new"} eventId={editingEventId} events={state.events} onSave={upsertEvent} onDelete={handleDelete} onClose={closeSheet} seed={editorSeed} />}
            {activeSheet === "settings" && <SettingsSheet settings={state.settings} storage={storageSummary} onSave={updateSettings} onAccentChange={updateAccent} onAppearanceChange={updateAppearance} onSync={syncNow} onExport={handleExport} onImport={handleImport} onClearData={clearAllData} onAccountChange={handleAccountChange} onClose={closeSheet} snapshots={snapshots} onLoadSnapshots={loadSnapshots} onRestoreSnapshot={restoreSnapshot} />}
            {checkInEvent?.habit && <CheckInSheet event={checkInEvent} supportStyle={state.settings.profile.supportStyle} onCheckIn={handleHabitCheckIn} onClear={handleClearCheckIn} onClose={() => setCheckInEventId(null)} />}
            {progressEvent?.project && <ProgressSheet event={progressEvent} onEffort={logProjectEffort} onReadiness={updateProjectReadiness} onClose={() => setProgressEventId(null)} />}
            {notificationsOpen && <NotificationSheet notifications={notifications} readIds={readIds} onMarkRead={markNotificationsRead} onSelect={handleNotification} onClose={() => setNotificationsOpen(false)} />}

            <KbdModal open={keyboardOpen} onClose={() => setKeyboardOpen(() => false)} />
            <Toast toast={toast} onDismiss={dismissToast} />
            <EchoBurst celebration={celebration} onDone={clearCelebration} />
            <SwUpdate />
        </div>
    );
}

export function AppShell({ children }: { children: React.ReactNode }) {
    return (
        <NavigationProvider>
            <DashboardProvider>
                <Shell>{children}</Shell>
            </DashboardProvider>
        </NavigationProvider>
    );
}
