"use client";

import { useState, useRef, useEffect } from "react";
import { Icon } from "./icon";
import { THEMES } from "@/lib/constants";
import type { DashboardSettings, ThemeName } from "@/lib/types";

interface Props { settings: DashboardSettings; onSave: (s: DashboardSettings) => void; onExport: () => void; onImport: (f: File) => void; onClose: () => void; }

const themeNames: ThemeName[] = ["warm", "cool", "earth", "rose", "ocean", "glacier"];

export function SettingsSheet({ settings, onSave, onExport, onImport, onClose }: Props) {
    const [theme, setTheme] = useState<ThemeName>(settings.theme ?? "warm");
    const [showGrid, setShowGrid] = useState(settings.showLifeGrid ?? true);
    const fileInput = useRef<HTMLInputElement>(null);

    useEffect(() => { setTheme(settings.theme ?? "warm"); setShowGrid(settings.showLifeGrid ?? true); }, [settings]);

    return (
        <>
            <div className="fixed inset-0 z-60 acrylic-backdrop animate-fade-in" onClick={onClose} />
            <aside className="fixed inset-y-0 right-0 z-70 w-[min(100%,480px)] h-dvh overflow-y-auto p-[clamp(20px,4vw,36px)] acrylic-surface animate-slide-up" role="dialog" aria-modal="true" aria-labelledby="st">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <div className="text-[var(--color-muted)] text-xs font-semibold tracking-[0.14em] uppercase">Preferences</div>
                        <h2 id="st" className="text-[32px] font-[var(--font-display)] font-normal m-0 mt-1">Settings</h2>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-xl bg-transparent border-0 cursor-pointer text-[var(--color-muted)] hover:text-[var(--color-ink)] hover:bg-[var(--color-accent)]/10 transition-all duration-200">
                        <Icon name="x" size={18} />
                    </button>
                </div>

                <form onSubmit={e => { e.preventDefault(); onSave({ theme, showLifeGrid: showGrid }); onClose(); }} className="grid gap-6">
                    {/* Theme picker */}
                    <fieldset className="grid gap-3 m-0 p-0 border-0">
                        <legend className="text-[var(--color-ink-soft)] text-[13px] font-semibold mb-1">Theme</legend>
                        <div className="grid grid-cols-2 gap-2">
                            {themeNames.map(t => {
                                const cfg = THEMES[t];
                                const active = theme === t;
                                return (
                                    <button key={t} type="button" onClick={() => setTheme(t)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 text-left ${active ? "border-[var(--color-accent)]" : "border-[var(--color-line)] hover:border-[var(--color-line-strong)]"}`}>
                                        <span className="w-7 h-7 rounded-full flex-shrink-0" style={{ background: `linear-gradient(135deg, ${cfg.accent}, ${cfg.accent}88)` }} />
                                        <span className="text-sm font-medium text-[var(--color-ink)]">{cfg.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </fieldset>

                    <label className="grid grid-cols-[auto_1fr] gap-3 items-start cursor-pointer">
                        <input type="checkbox" checked={showGrid} onChange={e => setShowGrid(e.target.checked)} className="w-[18px] h-[18px] mt-[3px] accent-[var(--color-accent)]" />
                        <span className="grid gap-[2px]"><strong className="text-sm font-semibold">Show time histogram</strong><small className="text-[var(--color-muted)] text-xs">Visual overview of your milestone activity.</small></span>
                    </label>

                    <hr className="border-0 border-t border-[var(--color-line)]" />
                    <div className="grid gap-2">
                        <span className="text-[var(--color-ink-soft)] text-[13px] font-semibold">Data</span>
                        <small className="text-[var(--color-muted)] text-xs">Export or restore your data.</small>
                    </div>
                    <div className="flex gap-2">
                        <button type="button" onClick={onExport} className="flex-1 min-h-[42px] inline-flex items-center justify-center gap-2 px-4 rounded-xl border border-[var(--color-line)] bg-white/50 text-[13px] font-semibold cursor-pointer hover:border-[var(--color-line-strong)] transition-all"><Icon name="download" size={15} /> Export</button>
                        <button type="button" onClick={() => fileInput.current?.click()} className="flex-1 min-h-[42px] inline-flex items-center justify-center gap-2 px-4 rounded-xl border border-[var(--color-line)] bg-white/50 text-[13px] font-semibold cursor-pointer hover:border-[var(--color-line-strong)] transition-all"><Icon name="upload" size={15} /> Import</button>
                        <input ref={fileInput} type="file" accept=".json" hidden onChange={e => { if (e.target.files?.[0]) { onImport(e.target.files[0]); e.target.value = ""; } }} />
                    </div>

                    <button type="submit" className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 rounded-xl bg-[var(--color-accent)] text-white font-semibold text-sm cursor-pointer border-0 hover:brightness-105 active:brightness-95 transition-all duration-200 mt-2">Save</button>
                </form>
            </aside>
        </>
    );
}
