"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
    clearEchoeDatabase,
    commitDashboardState,
    getStorageSummary,
    initializeLocalDatabase,
    loadDashboardState,
    resetLocalDatabaseForAccountSwitch,
    setRemoteVersion,
} from "@/lib/local-db";
import { pullRemoteState, pushRemoteState } from "@/lib/remote-sync";
import { localDate, seedState } from "@/lib/utils";
import type {
    Achievement,
    AuditAction,
    DashboardState,
    HabitEntry,
    MilestoneEvent,
    StorageSummary,
    SyncStatus,
} from "@/lib/types";

const EMPTY_SUMMARY: StorageSummary = {
    milestoneCount: 0,
    checkInCount: 0,
    historyCount: 0,
    lastSavedAt: null,
    lastSyncedAt: null,
    isOnline: typeof navigator === "undefined" ? true : navigator.onLine,
    syncStatus: "local",
};

const createId = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function useDashboardState() {
    const [state, setState] = useState<DashboardState | null>(null);
    const [storageSummary, setStorageSummary] = useState<StorageSummary>(EMPTY_SUMMARY);
    const stateRef = useRef<DashboardState | null>(null);
    const queueRef = useRef<Promise<void>>(Promise.resolve());
    const channelRef = useRef<BroadcastChannel | null>(null);

    const publishState = useCallback((next: DashboardState) => {
        stateRef.current = next;
        setState(next);
    }, []);

    const refreshSummary = useCallback(async (syncStatus: SyncStatus) => {
        const summary = await getStorageSummary(syncStatus);
        setStorageSummary(summary);
    }, []);

    useEffect(() => {
        let active = true;

        const bootstrap = async () => {
            try {
                const accountResult = typeof window === "undefined"
                    ? null
                    : new URLSearchParams(window.location.search).get("account");
                const forceRemoteAccount = accountResult === "switched";
                await initializeLocalDatabase();
                let localState = await loadDashboardState();
                if (!active) return;
                publishState(localState);
                await refreshSummary("local");

                setStorageSummary((current) => ({ ...current, syncStatus: "syncing" }));
                const remote = await pullRemoteState();
                if (!active) return;

                if (remote.mode === "local") {
                    await refreshSummary("local");
                    return;
                }

                const remoteTime = Date.parse(remote.updatedAt ?? remote.state?.updatedAt ?? "");
                const localTime = Date.parse(localState.updatedAt);
                const localIsPristine = localState.events.length === 0
                    && localState.achievements.length === 0
                    && !localState.settings.profile.displayName;
                if (remote.state && (forceRemoteAccount || localIsPristine || (Number.isFinite(remoteTime) && remoteTime > localTime))) {
                    localState = await commitDashboardState(remote.state, "remote-pull", "Loaded newer data from the Vercel database");
                    publishState(localState);
                } else {
                    const saved = await pushRemoteState(localState, "bootstrap");
                    if (saved.version) await setRemoteVersion(saved.version);
                }
                if (remote.version) await setRemoteVersion(remote.version);
                await refreshSummary("synced");
            } catch {
                if (!active) return;
                if (!stateRef.current) {
                    const fallback = seedState();
                    publishState(fallback);
                }
                setStorageSummary((current) => ({ ...current, syncStatus: "offline" }));
            }
        };

        void bootstrap();

        if (typeof BroadcastChannel !== "undefined") {
            channelRef.current = new BroadcastChannel("echoe-state-v2");
            channelRef.current.onmessage = () => {
                void loadDashboardState().then((next) => {
                    if (active && next.updatedAt !== stateRef.current?.updatedAt) publishState(next);
                });
            };
        }

        return () => {
            active = false;
            channelRef.current?.close();
            channelRef.current = null;
        };
    }, [publishState, refreshSummary]);

    const enqueueCommit = useCallback((
        next: DashboardState,
        action: AuditAction,
        summary: string,
        entityId?: string,
    ) => {
        publishState(next);
        queueRef.current = queueRef.current.then(async () => {
            const saved = await commitDashboardState(next, action, summary, entityId);
            if (stateRef.current?.updatedAt === next.updatedAt) publishState(saved);
            channelRef.current?.postMessage({ updatedAt: saved.updatedAt });
            await refreshSummary("syncing");
            try {
                const remote = await pushRemoteState(saved, action);
                if (remote.mode === "cloud") {
                    await setRemoteVersion(remote.version);
                    await refreshSummary("synced");
                } else {
                    await refreshSummary("local");
                }
            } catch {
                await refreshSummary("offline");
            }
        }).catch(() => {
            setStorageSummary((current) => ({ ...current, syncStatus: "offline" }));
        });
    }, [publishState, refreshSummary]);

    const updateSettings = useCallback((settings: DashboardState["settings"]) => {
        const current = stateRef.current;
        if (!current) return;
        const next = { ...current, settings, updatedAt: new Date().toISOString() };
        enqueueCommit(next, "settings", `Changed the app theme to ${settings.theme}`);
    }, [enqueueCommit]);

    const updateTheme = useCallback((theme: DashboardState["settings"]["theme"]) => {
        const current = stateRef.current;
        if (!current || current.settings.theme === theme) return;
        const now = new Date().toISOString();
        enqueueCommit({
            ...current,
            settings: { ...current.settings, theme },
            updatedAt: now,
        }, "settings", `Changed the app theme to ${theme}`);
    }, [enqueueCommit]);

    const upsertEvent = useCallback((event: MilestoneEvent) => {
        const current = stateRef.current;
        if (!current) return;
        const now = new Date().toISOString();
        const events = current.events.map((item) => event.pinned ? { ...item, pinned: false } : item);
        const index = events.findIndex((item) => item.id === event.id);
        const nextEvent = {
            ...event,
            createdAt: event.createdAt ?? (index >= 0 ? events[index].createdAt : now),
            updatedAt: now,
        };
        if (index >= 0) events[index] = nextEvent;
        else events.push(nextEvent);
        if (!events.some((item) => item.pinned) && events.length) events[0] = { ...events[0], pinned: true };
        const next = { ...current, events, updatedAt: now };
        enqueueCommit(next, index >= 0 ? "edit" : "create", `${index >= 0 ? "Updated" : "Created"} ${event.name}`, event.id);
    }, [enqueueCommit]);

    const deleteEvent = useCallback((id: string) => {
        const current = stateRef.current;
        if (!current) return null;
        const deleted = current.events.find((event) => event.id === id) ?? null;
        if (!deleted) return null;
        const events = current.events.filter((event) => event.id !== id);
        if (deleted.pinned && events.length) events[0] = { ...events[0], pinned: true, updatedAt: new Date().toISOString() };
        const next = { ...current, events, updatedAt: new Date().toISOString() };
        enqueueCommit(next, "delete", `Archived ${deleted.name}`, id);
        return deleted;
    }, [enqueueCommit]);

    const restoreEvent = useCallback((event: MilestoneEvent) => {
        const current = stateRef.current;
        if (!current) return;
        const events = event.pinned ? current.events.map((item) => ({ ...item, pinned: false })) : [...current.events];
        events.push({ ...event, updatedAt: new Date().toISOString() });
        const next = { ...current, events, updatedAt: new Date().toISOString() };
        enqueueCommit(next, "restore", `Restored ${event.name}`, event.id);
    }, [enqueueCommit]);

    const addAchievement = useCallback((label: string, icon: string) => {
        const current = stateRef.current;
        if (!current) return;
        const achievement: Achievement = { id: createId(), label, date: localDate(), icon };
        const next = { ...current, achievements: [achievement, ...current.achievements], updatedAt: new Date().toISOString() };
        enqueueCommit(next, "edit", `Recorded achievement: ${label}`, achievement.id);
    }, [enqueueCommit]);

    const checkInHabit = useCallback((
        eventId: string,
        status: HabitEntry["status"],
        date = localDate(),
        note?: string,
    ) => {
        const current = stateRef.current;
        if (!current) return;
        const now = new Date().toISOString();
        const events = current.events.map((event) => {
            if (event.id !== eventId || !event.habit) return event;
            const entries = event.habit.entries.filter((entry) => entry.date !== date);
            entries.push({ date, status, note: note?.trim() || undefined, recordedAt: now });
            entries.sort((a, b) => a.date.localeCompare(b.date));
            return { ...event, updatedAt: now, habit: { ...event.habit, entries } };
        });
        const next = { ...current, events, updatedAt: now };
        enqueueCommit(next, "check-in", `Marked ${date} as ${status}`, eventId);
    }, [enqueueCommit]);

    const clearHabitCheckIn = useCallback((eventId: string, date: string) => {
        const current = stateRef.current;
        if (!current) return;
        const now = new Date().toISOString();
        const events = current.events.map((event) => event.id === eventId && event.habit
            ? { ...event, updatedAt: now, habit: { ...event.habit, entries: event.habit.entries.filter((entry) => entry.date !== date) } }
            : event);
        enqueueCommit({ ...current, events, updatedAt: now }, "clear-check-in", `Cleared the check-in for ${date}`, eventId);
    }, [enqueueCommit]);

    const checkInProject = useCallback((
        eventId: string,
        status: HabitEntry["status"] = "done",
        date = localDate(),
        note?: string,
    ) => {
        const current = stateRef.current;
        if (!current) return;
        const now = new Date().toISOString();
        const events = current.events.map((event) => {
            if (event.id !== eventId || !event.project) return event;
            const checkIns = (event.project.checkIns ?? []).filter((entry) => entry.date !== date);
            checkIns.push({ date, status, note: note?.trim() || undefined, recordedAt: now });
            checkIns.sort((a, b) => a.date.localeCompare(b.date));
            return { ...event, updatedAt: now, project: { ...event.project, checkIns } };
        });
        enqueueCommit({ ...current, events, updatedAt: now }, "check-in", `Checked in to project on ${date}`, eventId);
    }, [enqueueCommit]);

    const logProjectEffort = useCallback((
        eventId: string,
        hours: number,
        date = localDate(),
        note?: string,
    ) => {
        const current = stateRef.current;
        if (!current) return;
        const now = new Date().toISOString();
        const events = current.events.map((event) => {
            if (event.id !== eventId || !event.project) return event;
            const entry = {
                id: createId(),
                date,
                hours: Math.max(0, Math.round(hours * 10) / 10),
                note: note?.trim() || undefined,
                recordedAt: now,
            };
            return {
                ...event,
                updatedAt: now,
                project: {
                    ...event.project,
                    entries: [...event.project.entries, entry].sort((a, b) => (a.date.localeCompare(b.date) || (a.recordedAt ?? "").localeCompare(b.recordedAt ?? ""))),
                },
            };
        });
        enqueueCommit({ ...current, events, updatedAt: now }, "progress", `Logged ${hours} hours of project effort`, eventId);
    }, [enqueueCommit]);

    const updateProjectReadiness = useCallback((eventId: string, readiness: number, note?: string) => {
        const current = stateRef.current;
        if (!current) return;
        const now = new Date().toISOString();
        const normalized = Math.max(0, Math.min(100, Math.round(readiness)));
        const events = current.events.map((event) => {
            if (event.id !== eventId || !event.project) return event;
            const entry = { id: createId(), date: localDate(), hours: 0, readiness: normalized, note: note?.trim() || undefined, recordedAt: now };
            return { ...event, updatedAt: now, project: { ...event.project, readiness: normalized, entries: [...event.project.entries, entry] } };
        });
        enqueueCommit({ ...current, events, updatedAt: now }, "progress", `Updated project readiness to ${normalized}%`, eventId);
    }, [enqueueCommit]);

    const markNotificationsRead = useCallback((ids: string[]) => {
        const current = stateRef.current;
        if (!current || ids.length === 0) return;
        const readNotificationIds = [...new Set([...current.settings.readNotificationIds, ...ids])].slice(-300);
        const now = new Date().toISOString();
        enqueueCommit({ ...current, settings: { ...current.settings, readNotificationIds }, updatedAt: now }, "notification", "Read Echoe notifications");
    }, [enqueueCommit]);

    const syncNow = useCallback(async () => {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
            await refreshSummary("offline");
            return;
        }
        await queueRef.current;
        const current = stateRef.current;
        if (!current) return;
        setStorageSummary((summary) => ({ ...summary, isOnline: true, syncStatus: "syncing" }));
        try {
            const remote = await pullRemoteState();
            if (remote.mode === "local") {
                await refreshSummary("local");
                return;
            }
            const remoteTime = Date.parse(remote.updatedAt ?? remote.state?.updatedAt ?? "");
            const localTime = Date.parse(current.updatedAt);
            if (remote.state && Number.isFinite(remoteTime) && remoteTime > localTime) {
                const saved = await commitDashboardState(remote.state, "remote-pull", "Reconciled newer cloud data after reconnecting");
                publishState(saved);
                if (remote.version) await setRemoteVersion(remote.version);
            } else {
                const saved = await pushRemoteState(current, "bootstrap");
                if (saved.version) await setRemoteVersion(saved.version);
            }
            await refreshSummary("synced");
        } catch {
            await refreshSummary("offline");
        }
    }, [publishState, refreshSummary]);

    useEffect(() => {
        const handleOnline = () => { void syncNow(); };
        const handleOffline = () => { void refreshSummary("offline"); };
        const handleVisible = () => {
            if (document.visibilityState === "visible" && navigator.onLine) void syncNow();
        };
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        document.addEventListener("visibilitychange", handleVisible);
        return () => {
            window.removeEventListener("online", handleOnline);
            window.removeEventListener("offline", handleOffline);
            document.removeEventListener("visibilitychange", handleVisible);
        };
    }, [refreshSummary, syncNow]);

    const importState = useCallback((incoming: DashboardState) => {
        const now = new Date().toISOString();
        const next: DashboardState = { ...incoming, schemaVersion: 2, updatedAt: now };
        enqueueCommit(next, "import", "Imported an Echoe backup");
    }, [enqueueCommit]);

    const clearAllData = useCallback(async () => {
        const next = await clearEchoeDatabase();
        publishState(next);
        channelRef.current?.postMessage({ updatedAt: next.updatedAt });
        await refreshSummary("syncing");
        try {
            const remote = await pushRemoteState(next, "bootstrap");
            await refreshSummary(remote.mode === "cloud" ? "synced" : "local");
        } catch {
            await refreshSummary("offline");
        }
    }, [publishState, refreshSummary]);

    const resetForAccountSwitch = useCallback(async () => {
        await queueRef.current;
        await resetLocalDatabaseForAccountSwitch();
    }, []);

    return {
        state,
        storageSummary,
        updateSettings,
        updateTheme,
        upsertEvent,
        deleteEvent,
        restoreEvent,
        addAchievement,
        checkInHabit,
        checkInProject,
        clearHabitCheckIn,
        logProjectEffort,
        updateProjectReadiness,
        markNotificationsRead,
        syncNow,
        importState,
        clearAllData,
        resetForAccountSwitch,
    };
}
