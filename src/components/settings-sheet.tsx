"use client";

import { useEffect, useRef, useState } from "react";
import { getAccount, registerAccount, signIn, signOut } from "@/lib/account-client";
import { ACCENT_ORDER, ACCENTS } from "@/lib/constants";
import { applyTheme } from "@/lib/theme";
import { installState, requestInstall, subscribeToInstall } from "@/lib/install";
import type { AccentName, AccountSummary, Appearance, AuditAction, DashboardSettings, StorageSummary, SupportStyle } from "@/lib/types";
import { Icon, type IconName } from "./icon";

type SnapshotSummary = { seq?: number; createdAt: string; action: AuditAction };

interface Props {
    settings: DashboardSettings;
    storage: StorageSummary;
    onSave: (settings: DashboardSettings) => void;
    onAccentChange: (accent: AccentName) => void;
    onAppearanceChange: (appearance: Appearance) => void;
    onSync: () => Promise<void> | void;
    onExport: () => void;
    onImport: (file: File) => void;
    onClearData: () => Promise<void>;
    onAccountChange: () => Promise<void>;
    onClose: () => void;
    snapshots: SnapshotSummary[];
    onLoadSnapshots: () => Promise<void>;
    onRestoreSnapshot: (seq: number) => Promise<void>;
}

type SettingsTab = "appearance" | "personal" | "data";

const tabs: Array<{ id: SettingsTab; label: string; icon: IconName }> = [
    { id: "appearance", label: "Appearance", icon: "palette" },
    { id: "personal", label: "You", icon: "user" },
    { id: "data", label: "Data", icon: "database" },
];

const appearanceOptions: Array<{ id: Appearance; label: string; icon: IconName }> = [
    { id: "system", label: "System", icon: "smartphone" },
    { id: "light", label: "Light", icon: "sun" },
    { id: "dark", label: "Dark", icon: "moon" },
];

const statusDetails = {
    local: { icon: "database" as const, label: "Saved on this device" },
    syncing: { icon: "refresh" as const, label: "Saving securely" },
    synced: { icon: "cloud" as const, label: "Synced securely" },
    offline: { icon: "cloud-off" as const, label: "Cloud unavailable, saved locally" },
};

const actionLabels: Partial<Record<AuditAction, string>> = {
    "check-in": "Check-in",
    "clear-check-in": "Cleared a check-in",
    create: "Created a path",
    edit: "Edited a path",
    delete: "Deleted a path",
    restore: "Restored a path",
    "restore-snapshot": "Restored from history",
    progress: "Logged progress",
    settings: "Changed settings",
    import: "Imported a backup",
    "remote-pull": "Synced from the cloud",
};

export function SettingsSheet({ settings, storage, onSave, onAccentChange, onAppearanceChange, onSync, onExport, onImport, onClearData, onAccountChange, onClose, snapshots, onLoadSnapshots, onRestoreSnapshot }: Props) {
    const [tab, setTab] = useState<SettingsTab>("appearance");
    const [confirmRestoreSeq, setConfirmRestoreSeq] = useState<number | null>(null);
    const [restoring, setRestoring] = useState(false);
    const [accent, setAccent] = useState<AccentName>(settings.accent ?? "blue");
    const [appearance, setAppearance] = useState<Appearance>(settings.appearance ?? "system");
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
    const [googleAvailable, setGoogleAvailable] = useState(false);
    const [accountError, setAccountError] = useState("");
    const [handle, setHandle] = useState("");
    const [password, setPassword] = useState("");
    const [badgePermission, setBadgePermission] = useState<NotificationPermission | "unsupported">("unsupported");
    const [installation, setInstallation] = useState(installState);
    const fileInput = useRef<HTMLInputElement>(null);
    const status = storage.isOnline ? statusDetails[storage.syncStatus] : { icon: "cloud-off" as const, label: "Device offline, changes queued" };

    const buildSettings = (selectedAccent = accent, selectedAppearance = appearance): DashboardSettings => ({
        accent: selectedAccent,
        appearance: selectedAppearance,
        showActivityHistogram: showHistogram,
        readNotificationIds: settings.readNotificationIds ?? [],
        profile: {
            displayName: displayName.trim(),
            intention: intention.trim(),
            supportStyle,
            personalizedAt: displayName.trim() ? settings.profile.personalizedAt ?? new Date().toISOString() : undefined,
        },
    });

    const chooseAccent = (next: AccentName) => {
        setAccent(next);
        applyTheme(next, appearance);
        onAccentChange(next);
    };

    const chooseAppearance = (next: Appearance) => {
        setAppearance(next);
        applyTheme(accent, next);
        onAppearanceChange(next);
    };

    useEffect(() => {
        let active = true;
        void getAccount()
            .then((response) => {
                if (!active) return;
                setAccountAvailable(response.mode === "cloud");
                setGoogleAvailable(response.googleAvailable === true);
                setAccount(response.account);
            })
            .catch(() => {
                if (active) {
                    setAccountAvailable(false);
                    setGoogleAvailable(false);
                }
            })
            .finally(() => {
                if (active) setAccountLoading(false);
            });
        return () => { active = false; };
    }, []);

    useEffect(() => subscribeToInstall(() => setInstallation(installState())), []);

    useEffect(() => {
        if (tab === "data") void onLoadSnapshots();
    }, [tab, onLoadSnapshots]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            if ("setAppBadge" in navigator && "Notification" in window) setBadgePermission(Notification.permission);
        }, 0);
        return () => window.clearTimeout(timer);
    }, []);

    const enableBadge = async () => {
        if (!("Notification" in window)) return;
        const permission = await Notification.requestPermission();
        setBadgePermission(permission);
    };

    const submitAccount = async () => {
        setAccountError("");
        setAccountBusy(true);
        try {
            if (accountMode === "register") {
                const response = await registerAccount(displayName.trim(), handle, password);
                if (response.mode !== "cloud" || !response.account) throw new Error("Cloud accounts are not available on this deployment yet.");
                setAccount(response.account);
                onSave(buildSettings());
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
            <aside className="sheet-surface fixed inset-y-0 right-0 z-70 flex h-dvh w-[min(100%,520px)] flex-col overflow-hidden acrylic-surface animate-slide-up" role="dialog" aria-modal="true" aria-labelledby="settingsTitle">
                <span className="sheet-grabber" aria-hidden="true" />
                <div className="shrink-0 px-[clamp(22px,5vw,38px)] pt-7">
                    <div className="flex items-start justify-between gap-5">
                        <div>
                            <h2 id="settingsTitle" className="m-0 text-[var(--text-xl)] font-semibold">Settings</h2>
                            <p className="m-0 mt-1 text-xs text-[var(--color-muted)]">A quieter Echoe, shaped around you.</p>
                        </div>
                        <button onClick={onClose} className="icon-button" aria-label="Close settings" title="Close">
                            <Icon name="x" size={18} />
                        </button>
                    </div>

                    <div className="mt-6 grid grid-cols-3 gap-1 border-b border-[var(--color-line)]" role="tablist" aria-label="Settings sections">
                        {tabs.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                role="tab"
                                aria-selected={tab === item.id}
                                aria-controls={`settings-${item.id}`}
                                onClick={() => setTab(item.id)}
                                className="settings-tab"
                            >
                                <Icon name={item.icon} size={15} /> {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                <form onSubmit={(event) => { event.preventDefault(); onSave(buildSettings()); onClose(); }} className="flex min-h-0 flex-1 flex-col">
                    <div className="min-h-0 flex-1 overflow-y-auto px-[clamp(22px,5vw,38px)] py-7">
                        {tab === "appearance" && (
                            <section id="settings-appearance" role="tabpanel" className="grid gap-7" aria-labelledby="appearanceTitle">
                                <div>
                                    <h3 id="appearanceTitle" className="m-0 text-sm font-semibold text-[var(--color-ink)]">Appearance</h3>
                                    <p className="m-0 mt-1 text-xs leading-relaxed text-[var(--color-muted)]">A neutral shell, tuned to one accent color.</p>
                                </div>

                                <fieldset className="m-0 grid gap-3 border-0 p-0">
                                    <legend className="text-[13px] font-semibold text-[var(--color-ink-soft)]">Mode</legend>
                                    <div className="settings-segment grid grid-cols-3 gap-1" role="radiogroup" aria-label="Appearance mode">
                                        {appearanceOptions.map((option) => (
                                            <button
                                                key={option.id}
                                                type="button"
                                                role="radio"
                                                aria-checked={appearance === option.id}
                                                onClick={() => chooseAppearance(option.id)}
                                            >
                                                <Icon name={option.icon} size={14} /> {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </fieldset>

                                <fieldset className="m-0 grid gap-3 border-0 p-0">
                                    <legend className="text-[13px] font-semibold text-[var(--color-ink-soft)]">Accent color</legend>
                                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Accent color">
                                        {ACCENT_ORDER.map((name) => {
                                            const config = ACCENTS[name];
                                            const active = accent === name;
                                            return (
                                                <button
                                                    key={name}
                                                    type="button"
                                                    role="radio"
                                                    aria-checked={active}
                                                    aria-label={config.label}
                                                    onClick={() => chooseAccent(name)}
                                                    className="accent-dot"
                                                    style={{ "--accent-dot": config.light.accent } as React.CSSProperties}
                                                >
                                                    {active && <Icon name="check" size={13} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </fieldset>

                                <label className="grid cursor-pointer grid-cols-[auto_1fr] items-start gap-3 border-t border-[var(--color-line)] pt-6">
                                    <input type="checkbox" checked={showHistogram} onChange={(event) => setShowHistogram(event.target.checked)} className="theme-checkbox mt-[3px]" />
                                    <span className="grid gap-[2px]">
                                        <strong className="text-sm font-semibold">Show activity rhythm</strong>
                                        <small className="text-xs leading-relaxed text-[var(--color-muted)]">Keep the quiet two-week activity clusters in Momentum.</small>
                                    </span>
                                </label>
                            </section>
                        )}

                        {tab === "personal" && (
                            <section id="settings-personal" role="tabpanel" className="grid gap-7" aria-labelledby="profileTitle">
                                <div className="grid gap-4">
                                    <div>
                                        <h3 id="profileTitle" className="m-0 text-sm font-semibold text-[var(--color-ink)]">Your Echoe</h3>
                                        <p className="m-0 mt-1 text-xs leading-relaxed text-[var(--color-muted)]">Give this space your name and the direction you want it to hold.</p>
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
                                </div>

                                <div className="grid gap-4 border-t border-[var(--color-line)] pt-6">
                                    <div>
                                        <h3 className="m-0 text-sm font-semibold text-[var(--color-ink)]">Your account</h3>
                                        <p className="m-0 mt-1 text-xs leading-relaxed text-[var(--color-muted)]">Reconnect to the same milestones and history on another browser.</p>
                                    </div>
                                    {accountLoading ? (
                                        <div className="h-12 animate-pulse rounded-[var(--radius-sm)] bg-[var(--color-panel)]" aria-label="Checking account" />
                                    ) : account ? (
                                        <div className="flex flex-wrap items-center justify-between gap-3 border-l-2 border-[var(--color-accent)] pl-4">
                                            <div>
                                                <div className="text-sm font-semibold text-[var(--color-ink)]">{account.displayName}</div>
                                                <div className="text-xs text-[var(--color-muted)]">{account.authProvider?.includes("google") ? account.email ?? "Google connected" : `@${account.handle}`}</div>
                                            </div>
                                            <button type="button" onClick={handleSignOut} disabled={accountBusy} className="quiet-button">Sign out</button>
                                        </div>
                                    ) : (
                                        <div className="grid gap-4">
                                            {googleAvailable ? (
                                                <a href="/api/auth/google" onClick={() => onSave(buildSettings())} className="primary-button w-full no-underline">
                                                    <Icon name="log-in" size={16} /> Continue with Google
                                                </a>
                                            ) : (
                                                <button type="button" disabled className="secondary-button w-full"><Icon name="cloud-off" size={15} /> Cloud sign-in unavailable</button>
                                            )}
                                            {!accountAvailable && <p className="m-0 text-xs text-[var(--color-muted)]">This deployment is currently local-only. Your profile and milestones still save on this device.</p>}

                                            <details className="account-details">
                                                <summary>Use a private handle instead</summary>
                                                <div className="mt-4 grid gap-3">
                                                    <div className="grid grid-cols-2 gap-2" aria-label="Account action">
                                                        <button type="button" className="secondary-button" aria-pressed={accountMode === "register"} onClick={() => { setAccountMode("register"); setAccountError(""); }}>Create account</button>
                                                        <button type="button" className="secondary-button" aria-pressed={accountMode === "sign-in"} onClick={() => { setAccountMode("sign-in"); setAccountError(""); }}>Sign in</button>
                                                    </div>
                                                    <label className="grid gap-2">
                                                        <span className="text-[13px] font-semibold text-[var(--color-ink-soft)]">Private handle</span>
                                                        <input className="field" value={handle} onChange={(event) => setHandle(event.target.value.toLowerCase())} minLength={3} maxLength={24} autoComplete="username" placeholder="your-handle" />
                                                    </label>
                                                    <label className="grid gap-2">
                                                        <span className="text-[13px] font-semibold text-[var(--color-ink-soft)]">Password</span>
                                                        <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={128} autoComplete={accountMode === "register" ? "new-password" : "current-password"} placeholder="At least 8 characters" />
                                                    </label>
                                                    {accountError && <p className="m-0 text-xs text-[var(--color-danger)]" role="alert">{accountError}</p>}
                                                    <button type="button" disabled={accountBusy || !accountAvailable || !handle || !password || (accountMode === "register" && !displayName.trim())} onClick={submitAccount} className="secondary-button">
                                                        <Icon name={accountMode === "register" ? "database" : "log-in"} size={15} />
                                                        {accountBusy ? "Please wait" : accountMode === "register" ? "Create my account" : "Sign in"}
                                                    </button>
                                                </div>
                                            </details>
                                        </div>
                                    )}
                                    {account && accountError && <p className="m-0 text-xs text-[var(--color-danger)]" role="alert">{accountError}</p>}
                                </div>
                            </section>
                        )}

                        {tab === "data" && (
                            <section id="settings-data" role="tabpanel" className="grid gap-6" aria-labelledby="storageTitle">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 id="storageTitle" className="m-0 text-sm font-semibold text-[var(--color-ink)]">Data and history</h3>
                                        <p className="m-0 mt-1 text-xs leading-relaxed text-[var(--color-muted)]">Every change is saved locally first, then reconciled with your private cloud copy when reachable.</p>
                                    </div>
                                    <span className="status-pill shrink-0 bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]">
                                        <Icon name={status.icon} size={12} /> {status.label}
                                    </span>
                                </div>

                                <dl className="m-0 grid grid-cols-3 gap-2">
                                    <div className="data-stat"><dt>Milestones</dt><dd>{storage.milestoneCount}</dd></div>
                                    <div className="data-stat"><dt>Check-ins</dt><dd>{storage.checkInCount}</dd></div>
                                    <div className="data-stat"><dt>Snapshots</dt><dd>{storage.historyCount}</dd></div>
                                </dl>

                                <div className="flex items-center justify-between gap-4 border-y border-[var(--color-line)] py-4">
                                    <div className="min-w-0"><strong className="block text-sm">Cloud sync</strong><span className="block truncate text-xs text-[var(--color-muted)]">{storage.lastSyncedAt ? `Last synced ${new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(storage.lastSyncedAt))}` : storage.isOnline ? "Waiting for the first cloud sync" : "Will retry when this device reconnects"}</span></div>
                                    <button type="button" onClick={() => void onSync()} disabled={!storage.isOnline || storage.syncStatus === "syncing"} className="compact-button shrink-0"><Icon name="refresh" size={14} />Sync now</button>
                                </div>

                                <div className="flex items-start justify-between gap-4 text-xs text-[var(--color-muted)]">
                                    <div className="flex items-start gap-3"><Icon name="smartphone" size={15} className="mt-0.5 shrink-0 text-[var(--color-accent-ink)]" /><p className="m-0">{installation.installed ? "Echoe is installed in standalone app mode." : installation.isIos ? "On iPhone or iPad, install Echoe from Safari's Share menu using Add to Home Screen." : "Install Echoe for standalone Android app access and a resilient offline shell."}</p></div>
                                    {installation.canPrompt && !installation.installed && <button type="button" onClick={() => void requestInstall()} className="compact-button shrink-0">Install</button>}
                                    {installation.installed && <span className="status-pill shrink-0 bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]"><Icon name="check" size={11} />Installed</span>}
                                </div>

                                <div className="flex items-start justify-between gap-4 text-xs text-[var(--color-muted)]">
                                    <div className="flex items-start gap-3"><Icon name="bell" size={15} className="mt-0.5 shrink-0 text-[var(--color-accent-ink)]" /><p className="m-0">App badges reflect unread check-ins and paths that need a decision on supported installed devices.</p></div>
                                    {badgePermission === "default" && <button type="button" onClick={() => void enableBadge()} className="compact-button shrink-0">Enable badge</button>}
                                    {badgePermission === "granted" && <span className="status-pill shrink-0 bg-[var(--color-accent-soft)] text-[var(--color-accent-ink)]"><Icon name="check" size={11} />Badge on</span>}
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                    <button type="button" onClick={onExport} className="secondary-button"><Icon name="download" size={15} /> Export</button>
                                    <button type="button" onClick={() => fileInput.current?.click()} className="secondary-button"><Icon name="upload" size={15} /> Import</button>
                                    <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={(event) => { if (event.target.files?.[0]) { onImport(event.target.files[0]); event.target.value = ""; } }} />
                                </div>

                                {snapshots.length > 0 && (
                                    <div className="border-t border-[var(--color-line)] pt-5">
                                        <strong className="block text-sm">History</strong>
                                        <p className="m-0 mt-1 text-xs text-[var(--color-muted)]">Restore an earlier point in time. Restoring saves a fresh snapshot too, so it can be undone.</p>
                                        <ul className="m-0 mt-3 grid list-none gap-2 p-0">
                                            {snapshots.slice(0, 10).map((snapshot) => (
                                                <li key={snapshot.seq} className="flex items-center justify-between gap-3 text-xs">
                                                    <span className="min-w-0 truncate text-[var(--color-ink-soft)]">
                                                        {actionLabels[snapshot.action] ?? snapshot.action} <span className="text-[var(--color-muted)]">· {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(snapshot.createdAt))}</span>
                                                    </span>
                                                    {confirmRestoreSeq === snapshot.seq ? (
                                                        <span className="flex shrink-0 items-center gap-2">
                                                            <button type="button" disabled={restoring} onClick={async () => { setRestoring(true); await onRestoreSnapshot(snapshot.seq!); setRestoring(false); setConfirmRestoreSeq(null); }} className="quiet-button text-[var(--color-accent-ink)]">Yes, restore</button>
                                                            <button type="button" onClick={() => setConfirmRestoreSeq(null)} className="quiet-button">Cancel</button>
                                                        </span>
                                                    ) : (
                                                        <button type="button" onClick={() => setConfirmRestoreSeq(snapshot.seq ?? null)} className="quiet-button shrink-0">Restore</button>
                                                    )}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="border-t border-[var(--color-line)] pt-5">
                                    {!confirmClear ? (
                                        <button type="button" onClick={() => setConfirmClear(true)} className="quiet-button text-[var(--color-danger)]"><Icon name="trash" size={14} /> Clear all data</button>
                                    ) : (
                                        <div className="grid gap-3 border-l-2 border-[var(--color-danger)] pl-4">
                                            <span className="text-xs text-[var(--color-ink-soft)]">This starts a fresh local and cloud history.</span>
                                            <div className="flex gap-2">
                                                <button type="button" onClick={() => setConfirmClear(false)} className="secondary-button">Cancel</button>
                                                <button type="button" onClick={async () => { await onClearData(); onClose(); }} className="secondary-button text-[var(--color-danger)]">Clear now</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <p className="m-0 border-t border-[var(--color-line)] pt-4 text-right text-[10px] text-[var(--color-muted)]">Designed by <strong className="text-[var(--color-accent-ink)]">Kikandi</strong></p>
                            </section>
                        )}
                    </div>

                    <div className="acrylic-actions shrink-0 border-t border-[var(--color-line)] px-[clamp(22px,5vw,38px)] py-4">
                        <button type="submit" className="primary-button w-full">{tab === "data" ? "Done" : "Save changes"}</button>
                    </div>
                </form>
            </aside>
        </>
    );
}
