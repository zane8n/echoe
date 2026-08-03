"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useDashboardState } from "@/hooks/use-dashboard";
import { useKeyboard } from "@/hooks/use-keyboard";
import { THEMES } from "@/lib/constants";
import type { MilestoneEvent, ThemeConfig } from "@/lib/types";
import { Header } from "@/components/header";
import { FocusSection } from "@/components/focus-section";
import { TimeSection } from "@/components/time-section";
import { EventsSection } from "@/components/events-section";
import { WeeksGrid } from "@/components/weeks-grid";
import { EventSheet } from "@/components/event-sheet";
import { SettingsSheet } from "@/components/settings-sheet";
import { KbdModal } from "@/components/kbd-modal";
import { Toast } from "@/components/toast";
import { Confetti } from "@/components/confetti";
import { SwUpdate } from "@/components/sw-update";
import { BgCanvas } from "@/components/bg-canvas";

export default function Home() {
  const { state, updateSettings, upsertEvent, deleteEvent, restoreEvent, checkInHabit } = useDashboardState();
  const [activeSheet, setActiveSheet] = useState<"event" | "settings" | null>(null);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [kbdOpen, setKbdOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [undoEvent, setUndoEvent] = useState<MilestoneEvent | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [tick, setTick] = useState(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const undoTimer = useRef<ReturnType<typeof setTimeout>>();

  const theme: ThemeConfig = useMemo(() => THEMES[state?.settings?.theme ?? "warm"] ?? THEMES.warm, [state?.settings?.theme]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const showToast = useCallback((msg: string) => { setToastMsg(msg); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToastMsg(""), 2400); }, []);
  const openEventEditor = useCallback((id: string | null = null) => { setEditingEventId(id); setActiveSheet("event"); }, []);
  const closeSheet = useCallback(() => { setActiveSheet(null); setEditingEventId(null); }, []);
  const handleDelete = useCallback((id: string) => { const d = deleteEvent(id); if (d) { setUndoEvent(d); clearTimeout(undoTimer.current); undoTimer.current = setTimeout(() => setUndoEvent(null), 8000); } }, [deleteEvent]);
  const handleUndo = useCallback(() => { if (undoEvent) { restoreEvent(undoEvent); setUndoEvent(null); showToast("Restored"); } }, [undoEvent, restoreEvent, showToast]);
  const handleExport = useCallback(() => { if (!state) return; const b = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = `echoe-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(u); showToast("Backup exported"); }, [state, showToast]);
  const handleImport = useCallback((file: File) => { const r = new FileReader(); r.onload = () => { try { const d = JSON.parse(r.result as string); if (d?.events && d?.settings) { localStorage.setItem("echoe.v1", JSON.stringify({ ...d, achievements: d.achievements ?? [] })); window.location.reload(); } else throw new Error("Invalid"); } catch { showToast("Invalid backup"); } }; r.readAsText(file); }, [showToast]);
  const triggerConfetti = useCallback(() => setShowConfetti(true), []);
  const handleCheckIn = useCallback((id: string) => checkInHabit(id, "done"), [checkInHabit]);
  const handleMiss = useCallback((id: string) => checkInHabit(id, "missed"), [checkInHabit]);

  useKeyboard({
    Escape: () => { if (kbdOpen) setKbdOpen(false); else if (activeSheet) closeSheet(); else if (undoEvent) setUndoEvent(null); },
    "?": () => setKbdOpen(p => !p),
    n: () => openEventEditor(), N: () => openEventEditor(),
    s: () => setActiveSheet("settings"), S: () => setActiveSheet("settings"),
    "Ctrl+Z": () => { if (undoEvent) handleUndo(); },
  });

  if (!state) return <div className="min-h-screen flex items-center justify-center"><div className="text-[var(--color-muted)] text-sm animate-pulse">Loading…</div></div>;

  return (
    <div style={{ "--bg": theme.bg, "--surface": theme.surface, "--ink": theme.ink, "--ink-soft": theme.inkSoft, "--muted": theme.muted, "--line": theme.line, "--accent": theme.accent, "--accent-ink": theme.accentInk } as React.CSSProperties}>
      <BgCanvas />
      <Header onAddEvent={() => openEventEditor()} onOpenSettings={() => setActiveSheet("settings")} theme={theme} />
      <main className="w-[min(calc(100%-40px),1120px)] mx-auto pt-[clamp(42px,7vw,82px)]">
        <FocusSection events={state.events} tick={tick} onEdit={id => openEventEditor(id)} onConfetti={triggerConfetti} onCheckIn={handleCheckIn} onMiss={handleMiss} />
        <TimeSection tick={tick} />
        <EventsSection events={state.events} onEdit={id => openEventEditor(id)} onExport={handleExport} tick={tick} />
        <WeeksGrid events={state.events} show={state.settings.showLifeGrid} tick={tick} />
        <footer className="mt-[84px] pt-7 pb-9 border-t border-[var(--color-line)] flex justify-between gap-5 text-[var(--color-muted)] text-xs flex-wrap">
          <span>Private by design · Everything stays on this device</span>
          <span>Designed by <span className="font-semibold text-[var(--color-accent)]">Kikandi</span></span>
        </footer>
      </main>
      {activeSheet === "event" && <EventSheet eventId={editingEventId} events={state.events} onSave={upsertEvent} onDelete={handleDelete} onClose={closeSheet} />}
      {activeSheet === "settings" && <SettingsSheet settings={state.settings} onSave={updateSettings} onExport={handleExport} onImport={handleImport} onClose={closeSheet} />}
      <KbdModal open={kbdOpen} onClose={() => setKbdOpen(false)} />
      <Toast message={toastMsg} undoEvent={undoEvent} onUndo={handleUndo} />
      <Confetti active={showConfetti} onDone={() => setShowConfetti(false)} />
      <SwUpdate />
    </div>
  );
}

