"use client";

import { useEffect, useRef, useState } from "react";
import { getAccount, registerAccount, signIn, signOut } from "@/lib/account-client";
import { THEME_ORDER, THEMES } from "@/lib/constants";
import type { AccountSummary, DashboardSettings, StorageSummary, SupportStyle, ThemeName } from "@/lib/types";
import { Icon } from "./icon";

interface Props {
    settings: DashboardSettings;
    storage: StorageSummary;
    onSave: (settings: DashboardSettings) => void;
    onPreviewTheme: (theme: ThemeName) => void;
    onExport: () => void;
    onImport: (file: File) => void;
    onClearData: () => Promise<void>;
    onAccountChange: () => Promise<void>;
    onClose: () => void;
}

const statusDetails = {
    local: { icon: "database" as const, label: "Saved on this device" },
    syncing: { icon: "refresh" as const, label: "Syncing with Vercel" },
    synced: { icon: "cloud" as const, label: "Synced with Postgres" },
    offline: { icon: "cloud-off" as const, label: "Offline, saved locally" },
};

export function SettingsSheet({ settings, storage, onSave, onPreviewTheme, onExport, onImport, onClearData, onAccountChange, onClose }: Props) {
    const [theme, setTheme] = useState<ThemeName>(settings.theme ?? "warm");
    const [showHistogram, setShowHistogram] = useState(settings.showActivityHistogram ?? true);
    const [displayName, setDisplayName] = useState(settings.profile.displayName);
    const [intention, setIntention] = useState(settings.profile.intention);
    const [supportStyle, setSupportStyle] = useState<SupportStyle>(settings.profile.supportStyle);
    const [confirmClear, setConfirmClear] = useState(false);
    const [account, setAccount] = useState<AccountSummary | null>(null);
    const [accountMode, setAccountMode] = useState<"register" | "sign-in">("register");
    const [accountLoading, setAccountLoading] = useState(true);
    const [accountBusy, setAccountBusy] = useState(false);
    const [accountAvailable, setAccountAvailable] = useState(true);
    const [accountError, setAccountError] = useState("");
    const [handle, setHandle] = useState("");
    const [password, setPassword] = useState("");
    const fileInput = useRef<HTMLInputElement>(null);

    const status = statusDetails[storage.syncStatus];
    const chooseTheme = (next: ThemeName) => {
        setTheme(next);
        onPreviewTheme(next);
    };

    const nextSettings = (): DashboardSettings => ({
        theme,
        showActivityHistogram: showHistogram,
        profile: {
            displayName: displayName.trim(),
            intention: intention.trim(),
            supportStyle,
            personalizedAt: displayName.trim() ? settings.profile.personalizedAt ?? new Date().toISOString() : undefined,
        },
    });

    useEffect(() => {
        let active = true;
        void getAccount()
            .then((response) => {
                if (!active) return;
                setAccountAvailable(response.mode === "cloud");
                setAccount(response.account);
            })
            .catch(() => {
                if (active) setAccountAvailable(false);
            })
            .finally(() => {
                if (active) setAccountLoading(false);
            });
        return () => { active = false; };
    }, []);

    const submitAccount = async () => {
        setAccountError("");
        setAccountBusy(true);
        try {
            if (accountMode === "register") {
                const response = await registerAccount(displayName.trim(), handle, password);
                if (response.mode !== "cloud" || !response.account) throw new Error("Connect the Vercel database before creating an account.");
                setAccount(response.account);
                onSave(nextSettings());
                setPassword("");
            } else {
                const response = await signIn(handle, password);
                if (!response.account) throw new Error("Unable to sign in.");
                await onAccountChange();
            }
        } catch (error) {
            setAccountError(error instanceof Error ? error.message : "Account request failed.");
        } finally {
            setAccountBusy(false);
        }
    };

    const handleSignOut = async () => {
        setAccountBusy(true);
        setAccountError("");
        try {
            await signOut();
            await onAccountChange();
        } catch (error) {
            setAccountError(error instanceof Error ? error.message : "Unable to sign out.");
            setAccountBusy(false);
        }
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

                <form onSubmit={(event) => { event.preventDefault(); onSave(nextSettings()); onClose(); }} className="grid gap-7">
                    <section className="grid gap-4" aria-labelledby="profileTitle">
                        <div>
                            <h3 id="profileTitle" className="m-0 text-[13px] font-semibold text-[var(--color-ink-soft)]">Your Echoe</h3>
                            <p className="m-0 mt-1 text-xs leading-relaxed text-[var(--color-muted)]">Give this space your name and the direction you want it to quietly hold.</p>
                        </div>
                        <label className="grid gap-2">
                            <span className="text-[13px] font-semibold text-[var(--color-ink-soft)]">Your name</span>
                            <input className="field" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={40} autoComplete="name" placeholder="The name Echoe should use" />
                        </label>
                        <label className="grid gap-2">
                            <span className="text-[13px] font-semibold text-[var(--color-ink-soft)]">What are you building toward?</span>
                            <textarea className="field min-h-[84px] resize-y" value={intention} onChange={(event) => setIntention(event.target.value)} maxLength={140} placeholder="A private intention, in your own words" />
                        </label>
                        <label className="grid gap-2">
                            <span className="text-[13px] font-semibold text-[var(--color-ink-soft)]">How Echoe should encourage you</span>
                            <select className="field" value={supportStyle} onChange={(event) => setSupportStyle(event.target.value as SupportStyle)}>
                                <option value="gentle">Gentle and steady</option>
                                <option value="direct">Clear and practical</option>
                                <option value="reflective">Reflective and thoughtful</option>
                            </select>
                        </label>
                    </section>

                    <section className="grid gap-4 border-t border-[var(--color-line)] pt-6" aria-labelledby="accountTitle">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 id="accountTitle" className="m-0 text-[13px] font-semibold text-[var(--color-ink-soft)]">Permanence</h3>
                                <p className="m-0 mt-1 text-xs leading-relaxed text-[var(--color-muted)]">A private account reconnects this Echoe to you across browsers.</p>
                            </div>
                            {account && <span className="status-pill shrink-0 bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]"><Icon name="check" size={12} /> @{account.handle}</span>}
                        </div>

                        {accountLoading ? (
                            <div className="h-12 animate-pulse rounded-[8px] bg-[var(--color-accent-soft)]" aria-label="Checking account" />
                        ) : account ? (
                            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[8px] border border-[var(--color-line)] bg-[var(--color-panel)] p-3">
                                <div>
                                    <div className="text-sm font-semibold text-[var(--color-ink)]">Registered as {account.displayName}</div>
                                    <div className="text-xs text-[var(--color-muted)]">Your cloud history stays attached to this account.</div>
                                </div>
                                <button type="button" onClick={handleSignOut} disabled={accountBusy} className="quiet-button">Sign out</button>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                <div className="grid grid-cols-2 gap-2" aria-label="Account action">
                                    <button type="button" className="secondary-button" aria-pressed={accountMode === "register"} onClick={() => { setAccountMode("register"); setAccountError(""); }}>Create account</button>
                                    <button type="button" className="secondary-button" aria-pressed={accountMode === "sign-in"} onClick={() => { setAccountMode("sign-in"); setAccountError(""); }}>Sign in</button>
                                </div>
                                {!accountAvailable && <p className="m-0 text-xs text-[var(--color-muted)]">Cloud accounts become available when <code>DATABASE_URL</code> is connected on Vercel. Your profile still saves on this device.</p>}
                                <label className="grid gap-2">
                                    <span className="text-[13px] font-semibold text-[var(--color-ink-soft)]">Private handle</span>
                                    <input className="field" value={handle} onChange={(event) => setHandle(event.target.value.toLowerCase())} minLength={3} maxLength={24} autoComplete="username" placeholder="your-handle" />
                                </label>
                                <label className="grid gap-2">
                                    <span className="text-[13px] font-semibold text-[var(--color-ink-soft)]">Password</span>
                                    <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={128} autoComplete={accountMode === "register" ? "new-password" : "current-password"} placeholder="At least 8 characters" />
                                </label>
                                {accountError && <p className="m-0 text-xs text-[var(--color-danger)]" role="alert">{accountError}</p>}
                                <button type="button" disabled={accountBusy || !handle || !password || (accountMode === "register" && !displayName.trim())} onClick={submitAccount} className="secondary-button">
                                    <Icon name={accountMode === "register" ? "database" : "cloud"} size={15} />
                                    {accountBusy ? "Please wait" : accountMode === "register" ? "Create my account" : "Sign in to my Echoe"}
                                </button>
                                {accountMode === "register" && <p className="m-0 text-xs text-[var(--color-muted)]">No email is collected. Keep your handle and password somewhere safe.</p>}
                            </div>
                        )}
                        {account && accountError && <p className="m-0 text-xs text-[var(--color-danger)]" role="alert">{accountError}</p>}
                    </section>

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
