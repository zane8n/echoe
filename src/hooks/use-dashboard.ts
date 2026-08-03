"use client";

import { useState, useEffect, useCallback } from "react";
import type { DashboardState, Achievement } from "@/lib/types";
import { STORAGE_KEY, LEGACY_STORAGE_KEY } from "@/lib/constants";
import { seedState, localDate } from "@/lib/utils";

const LOG_KEY = "echoe.audit.v1";

interface LogEntry { ts: string; op: string; detail: string; }
function appendLog(op: string, detail: string) {
    try {
        const logs: LogEntry[] = JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]");
        logs.push({ ts: new Date().toISOString(), op, detail });
        if (logs.length > 500) logs.splice(0, logs.length - 500);
        localStorage.setItem(LOG_KEY, JSON.stringify(logs));
    } catch { /* silent */ }
}

function loadState(): DashboardState {
    try {
        const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "");
        if (parsed?.events && parsed?.settings) return { achievements: parsed.achievements ?? [], ...parsed };
    } catch { /* */ }
    // migrate from v2
    try {
        const old = JSON.parse(localStorage.getItem(LEGACY_STORAGE_KEY) ?? "");
        if (old?.events && old?.settings) { localStorage.removeItem(LEGACY_STORAGE_KEY); return { ...old, achievements: old.achievements ?? [], settings: { theme: "warm", showLifeGrid: old.settings?.showLifeGrid ?? true } }; }
    } catch { /* */ }
    return seedState();
}

export function useDashboardState() {
    const [state, setState] = useState<DashboardState | null>(null);

    useEffect(() => { setState(loadState()); }, []);

    const persist = useCallback((s: DashboardState) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
        setState(s);
    }, []);

    const updateSettings = useCallback((settings: DashboardState["settings"]) => {
        setState((prev) => { if (!prev) return prev; const n = { ...prev, settings }; localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); return n; });
    }, []);

    const upsertEvent = useCallback((event: DashboardState["events"][number]) => {
        setState((prev) => {
            if (!prev) return prev;
            const events = [...prev.events];
            const idx = events.findIndex((e) => e.id === event.id);
            if (event.pinned) events.forEach((e) => (e.pinned = false));
            if (idx >= 0) events[idx] = event; else events.push(event);
            if (!events.some((e) => e.pinned) && events.length) events[0].pinned = true;
            const n = { ...prev, events }; localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); appendLog(idx >= 0 ? "edit" : "create", event.name); return n;
        });
    }, []);

    const deleteEvent = useCallback((id: string) => {
        let deleted: DashboardState["events"][number] | null = null;
        setState((prev) => {
            if (!prev) return prev;
            deleted = prev.events.find((e) => e.id === id) ?? null;
            const events = prev.events.filter((e) => e.id !== id);
            if (deleted?.pinned && events.length) events[0].pinned = true;
            const n = { ...prev, events }; localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); appendLog("delete", deleted?.name ?? id); return n;
        });
        return deleted;
    }, []);

    const restoreEvent = useCallback((event: DashboardState["events"][number]) => {
        setState((prev) => {
            if (!prev) return prev;
            const events = [...prev.events];
            if (event.pinned) events.forEach((e) => (e.pinned = false));
            events.push(event);
            if (!events.some((e) => e.pinned) && events.length) events[0].pinned = true;
            const n = { ...prev, events }; localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); return n;
        });
    }, []);

    const addAchievement = useCallback((label: string, icon: string) => {
        setState((prev) => {
            if (!prev) return prev;
            const achievement: Achievement = { id: crypto.randomUUID?.() ?? `${Date.now()}`, label, date: localDate(), icon };
            const n = { ...prev, achievements: [achievement, ...prev.achievements] };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); return n;
        });
    }, []);

    const checkInHabit = useCallback((eventId: string, status: "done" | "missed" = "done") => {
        setState((prev) => {
            if (!prev) return prev;
            const events = prev.events.map((e) => {
                if (e.id !== eventId || !e.habit) return e;
                const today = localDate();
                const existing = e.habit.entries.findIndex(en => en.date === today);
                const entries = [...e.habit.entries];
                if (existing >= 0) entries[existing] = { date: today, status };
                else entries.push({ date: today, status });
                return { ...e, habit: { ...e.habit, entries } };
            });
            const n = { ...prev, events }; localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); return n;
        });
    }, []);

    return { state, updateSettings, upsertEvent, deleteEvent, restoreEvent, addAchievement, checkInHabit };
}
