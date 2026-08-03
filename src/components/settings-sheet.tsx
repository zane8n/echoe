"use client";

import { useRef, useState } from "react";
import { THEME_ORDER, THEMES } from "@/lib/constants";
import type { DashboardSettings, StorageSummary, ThemeName } from "@/lib/types";
import { Icon } from "./icon";

interface Props {
    settings: DashboardSettings;
    storage: StorageSummary;
    onSave: (settings: DashboardSettings) => void;
    onPreviewTheme: (theme: ThemeName) => void;
    onExport: () => void;
    onImport: (file: File) => void;
    onClearData: () => Promise<void>;
    onClose: () => void;
}

const statusDetails = {
    local: { icon: "database" as const, label: "Saved on this device" },
    syncing: { icon: "refresh" as const, label: "Syncing with Vercel" },
    synced: { icon: "cloud" as const, label: "Synced with Postgres" },
    offline: { icon: "cloud-off" as const, label: "Offline, saved locally" },
};

export function SettingsSheet({ settings, storage, onSave, onPreviewTheme, onExport, onImport, onClearData, onClose }: Props) {
    const [theme, setTheme] = useState<ThemeName>(settings.theme ?? "warm");
    const [showHistogram, setShowHistogram] = useState(settings.showActivityHistogram ?? true);
    const [confirmClear, setConfirmClear] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);

    const status = statusDetails[storage.syncStatus];
    const chooseTheme = (next: ThemeName) => {
        setTheme(next);
        onPreviewTheme(next);
    };

    return (
        <>
            <div className="fixed inset-0 z-60 acrylic-backdrop animate-fade-in" onClick={onClose} />
            <aside className="fixed inset-y-0 right-0 z-70 h-dvh w-[min(100%,500px)] overflow-y-auto acrylic-surface p-[clamp(22px,5vw,38px)] animate-slide-up" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
                <div className="mb-6 flex items-start justify-between gap-5 border-b border-[var(--color-line)] pb-5">
                    <div>
                        <div className="text-xs font-semibold uppercase text-[var(--color-accent-ink)]">Preferences</div>
                        <h2 id="settingsTitle" className="m-0 mt-1 font-[var(--font-display)] text-[34px] font-normal">Settings</h2>
                    </div>
                    <button onClick={onClose} className="icon-button" aria-label="Close settings" title="Close">
                        <Icon name="x" size={18} />
                    </button>
                </div>

                <form onSubmit={(event) => { event.preventDefault(); onSave({ theme, showActivityHistogram: showHistogram }); onClose(); }} className="grid gap-7">
                    <fieldset className="m-0 grid gap-3 border-0 p-0">
                        <legend className="mb-1 text-[13px] font-semibold text-[var(--color-ink-soft)]">App theme</legend>
                        <div className="grid grid-cols-2 gap-2 max-[390px]:grid-cols-1">
                            {THEME_ORDER.map((name) => {
                                const config = THEMES[name];
                                const active = theme === name;
                                return (
                                    <button
                                        key={name}
                                        type="button"
                                        onClick={() => chooseTheme(name)}
                                        className="flex min-h-[52px] items-center gap-3 rounded-[8px] border p-2.5 text-left transition-all duration-200"
                                        style={{
                                            borderColor: active ? config.accent : "var(--color-line)",
                                            background: active ? "var(--color-accent-soft)" : "var(--color-panel)",
                                            boxShadow: active ? `inset 0 0 0 1px ${config.accent}` : undefined,
                                        }}
                                        aria-pressed={active}
                                    >
                                        <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full border" style={{ background: config.bg, borderColor: config.line }}>
                                            <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full" style={{ background: config.accent }} />
                                        </span>
                                        <span className="text-sm font-semibold text-[var(--color-ink)]">{config.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="m-0 text-xs leading-relaxed text-[var(--color-muted)]">The app theme colors the full interface. Milestone palettes remain independent.</p>
                    </fieldset>

                    <label className="grid cursor-pointer grid-cols-[auto_1fr] items-start gap-3">
                        <input type="checkbox" checked={showHistogram} onChange={(event) => setShowHistogram(event.target.checked)} className="theme-checkbox mt-[3px]" />
                        <span className="grid gap-[2px]">
                            <strong className="text-sm font-semibold">Show activity histogram</strong>
                            <small className="text-xs leading-relaxed text-[var(--color-muted)]">Twelve calm, two-week clusters built from milestones and check-ins.</small>
                        </span>
                    </label>

                    <section className="border-t border-[var(--color-line)] pt-6" aria-labelledby="storageTitle">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 id="storageTitle" className="m-0 text-[13px] font-semibold text-[var(--color-ink-soft)]">Data and history</h3>
                                <p className="m-0 mt-1 text-xs leading-relaxed text-[var(--color-muted)]">Ordered records live in IndexedDB. Vercel sync activates automatically when <code>DATABASE_URL</code> is connected.</p>
                            </div>
                            <span className="status-pill shrink-0 bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]">
                                <Icon name={status.icon} size={12} /> {status.label}
                            </span>
                        </div>

                        <dl className="my-5 grid grid-cols-3 gap-2">
                            <div className="data-stat"><dt>Milestones</dt><dd>{storage.milestoneCount}</dd></div>
                            <div className="data-stat"><dt>Check-ins</dt><dd>{storage.checkInCount}</dd></div>
                            <div className="data-stat"><dt>Snapshots</dt><dd>{storage.historyCount}</dd></div>
                        </dl>

                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={onExport} className="secondary-button"><Icon name="download" size={15} /> Export</button>
                            <button type="button" onClick={() => fileInput.current?.click()} className="secondary-button"><Icon name="upload" size={15} /> Import</button>
                            <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={(event) => { if (event.target.files?.[0]) { onImport(event.target.files[0]); event.target.value = ""; } }} />
                        </div>

                        <div className="mt-5 border-t border-[var(--color-line)] pt-5">
                            {!confirmClear ? (
                                <button type="button" onClick={() => setConfirmClear(true)} className="quiet-button text-[var(--color-danger)]"><Icon name="trash" size={14} /> Clear all data</button>
                            ) : (
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)] p-3">
                                    <span className="text-xs text-[var(--color-ink-soft)]">This starts a fresh local and cloud history.</span>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setConfirmClear(false)} className="quiet-button">Cancel</button>
                                        <button type="button" onClick={async () => { await onClearData(); onClose(); }} className="quiet-button text-[var(--color-danger)]">Clear now</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    <div className="acrylic-actions sticky -bottom-[38px] border-t border-[var(--color-line)] pb-[38px] pt-5">
                        <button type="submit" className="primary-button w-full">Save settings</button>
                    </div>
                </form>
            </aside>
        </>
    );
}
