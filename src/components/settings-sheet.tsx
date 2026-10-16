"use client";

import { useEffect, useRef, useState } from "react";
import { getAccount, registerAccount, signIn, signOut } from "@/lib/account-client";
import { ACCENT_ORDER, ACCENTS } from "@/lib/constants";
import { applyTheme } from "@/lib/theme";
import { installState, requestInstall, subscribeToInstall } from "@/lib/install";
import type { AccentName, AccountSummary, Appearance, AuditAction, DashboardSettings, StorageSummary, SupportStyle } from "@/lib/types";
import { Icon, type IconName } from "./icon";
import { Segmented } from "./segmented";
import { Sheet, SheetBody, SheetFooter, SheetHeader, useSheet } from "./sheet";

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

const SUPPORT_STYLES: Array<{ id: SupportStyle; label: string; example: string }> = [
    { id: "gentle", label: "Gentle", example: "“A missed day is information. Make the next step smaller.”" },
    { id: "direct", label: "Direct", example: "“Review the obstacle, reduce the next step, resume today.”" },
    { id: "reflective", label: "Reflective", example: "“Keep what the missed day taught you, then begin again.”" },
];

const statusDetails: Record<StorageSummary["syncStatus"], { icon: IconName; label: string }> = {
    local: { icon: "database", label: "Saved on this device" },
    syncing: { icon: "refresh", label: "Saving securely" },
    synced: { icon: "cloud", label: "Synced securely" },
    offline: { icon: "cloud-off", label: "Cloud unavailable, saved locally" },
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

const dateTime = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));

export function SettingsSheet(props: Props) {
    return (
        <Sheet onClose={props.onClose} labelledBy="settingsTitle" size="full">
            <SettingsBody {...props} />
        </Sheet>
    );
}

function SettingsBody({ settings, storage, onSave, onAccentChange, onAppearanceChange, onSync, onExport, onImport, onClearData, onAccountChange, snapshots, onLoadSnapshots, onRestoreSnapshot }: Props) {
    const { close } = useSheet();
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
                if (active) { setAccountAvailable(false); setGoogleAvailable(false); }
            })
            .finally(() => { if (active) setAccountLoading(false); });
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
        setBadgePermission(await Notification.requestPermission());
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
        <form onSubmit={(event) => { event.preventDefault(); onSave(buildSettings()); close(); }} className="flex min-h-0 flex-1 flex-col">
            <SheetHeader titleId="settingsTitle" title="Settings" closeLabel="Close settings" />
            <div className="settings-tabs">
                <Segmented
                    label="Settings sections"
                    role="tablist"
                    value={tab}
                    onChange={setTab}
                    options={[
                        { value: "appearance", label: "Appearance", icon: "palette", controls: "settings-appearance" },
                        { value: "personal", label: "You", icon: "user", controls: "settings-personal" },
                        { value: "data", label: "Data", icon: "database", controls: "settings-data" },
                    ]}
                />
            </div>

            <SheetBody className="settings">
                {tab === "appearance" && (
                    <section id="settings-appearance" role="tabpanel" className="settings-panel" aria-label="Appearance">
                        <div className="grid gap-3">
                            <span className="field-label">Mode</span>
                            <Segmented
                                label="Appearance mode"
                                value={appearance}
                                onChange={chooseAppearance}
                                options={[{ value: "system", label: "System", icon: "smartphone" }, { value: "light", label: "Light", icon: "sun" }, { value: "dark", label: "Dark", icon: "moon" }]}
                            />
                        </div>

                        <fieldset className="grid gap-3">
                            <legend className="field-label mb-3">Accent</legend>
                            <p className="field-hint -mt-1">Your accent gently tints the whole app, not just its buttons.</p>
                            <div className="accent-grid" role="radiogroup" aria-label="Accent color">
                                {ACCENT_ORDER.map((name) => {
                                    const config = ACCENTS[name];
                                    return (
                                        <button key={name} type="button" role="radio" aria-checked={accent === name} aria-label={config.label} onClick={() => chooseAccent(name)} className="accent-card" style={{ "--swatch": config.light.accent, "--swatch-dark": config.dark.accent } as React.CSSProperties}>
                                            <span className="accent-preview" aria-hidden="true"><i /><i /><i /></span>
                                            <span>{config.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </fieldset>

                        <label className="toggle-row">
                            <span><strong>Show the long-view chart</strong><small>Keep the six-month activity rhythm on Momentum.</small></span>
                            <input type="checkbox" className="switch" checked={showHistogram} onChange={(event) => setShowHistogram(event.target.checked)} />
                        </label>
                    </section>
                )}

                {tab === "personal" && (
                    <section id="settings-personal" role="tabpanel" className="settings-panel" aria-labelledby="profileTitle">
                        <div className="grid gap-4">
                            <div>
                                <h3 id="profileTitle" className="settings-heading">Your Echoe</h3>
                                <p className="field-hint">Your name and the direction you want this space to hold.</p>
                            </div>
                            <label className="grid gap-2">
                                <span className="field-label">Your name</span>
                                <input className="field" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={40} autoComplete="name" placeholder="The name Echoe should use" />
                            </label>
                            <label className="grid gap-2">
                                <span className="field-label">What are you building toward?</span>
                                <textarea className="field" rows={3} value={intention} onChange={(event) => setIntention(event.target.value)} maxLength={140} placeholder="A private intention, in your own words" />
                            </label>
                            <fieldset className="grid gap-2">
                                <legend className="field-label mb-2">How Echoe should encourage you</legend>
                                <div className="choice-list" role="radiogroup" aria-label="How Echoe should encourage you">
                                    {SUPPORT_STYLES.map((style) => (
                                        <button key={style.id} type="button" role="radio" aria-checked={supportStyle === style.id} className="choice" onClick={() => setSupportStyle(style.id)}>
                                            <span className="choice-radio" aria-hidden="true" />
                                            <span><strong>{style.label}</strong><small>{style.example}</small></span>
                                        </button>
                                    ))}
                                </div>
                            </fieldset>
                        </div>

                        <div className="grid gap-4 border-t border-[var(--color-line)] pt-6">
                            <div>
                                <h3 className="settings-heading">Your account</h3>
                                <p className="field-hint">Reconnect to the same paths and history on another browser.</p>
                            </div>
                            {accountLoading ? (
                                <div className="h-14 animate-pulse rounded-[var(--radius-md)] bg-[var(--color-panel)]" aria-label="Checking account" />
                            ) : account ? (
                                <div className="account-card">
                                    <span className="avatar-btn" aria-hidden="true">{account.displayName.charAt(0).toUpperCase()}</span>
                                    <div className="min-w-0 flex-1">
                                        <div className="font-semibold">{account.displayName}</div>
                                        <div className="truncate text-sm text-[var(--color-muted)]">{account.authProvider?.includes("google") ? account.email ?? "Google connected" : `@${account.handle}`}</div>
                                    </div>
                                    <button type="button" onClick={handleSignOut} disabled={accountBusy} className="btn btn-ghost btn-sm">Sign out</button>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {googleAvailable ? (
                                        <a href="/api/auth/google" onClick={() => onSave(buildSettings())} className="btn btn-primary btn-block">
                                            <Icon name="log-in" size={17} /> Continue with Google
                                        </a>
                                    ) : (
                                        <button type="button" disabled className="btn btn-secondary btn-block"><Icon name="cloud-off" size={16} /> Cloud sign-in unavailable</button>
                                    )}
                                    {!accountAvailable && <p className="field-hint">This deployment is local-only for now. Your profile and paths still save on this device.</p>}

                                    <details className="fold">
                                        <summary><Icon name="chevron-right" size={16} />Use a private handle instead</summary>
                                        <div className="mt-3 grid gap-3">
                                            <Segmented label="Account action" value={accountMode} onChange={(mode) => { setAccountMode(mode); setAccountError(""); }} options={[{ value: "register", label: "Create account" }, { value: "sign-in", label: "Sign in" }]} />
                                            <label className="grid gap-2">
                                                <span className="field-label">Private handle</span>
                                                <input className="field" value={handle} onChange={(event) => setHandle(event.target.value.toLowerCase())} minLength={3} maxLength={24} autoComplete="username" placeholder="your-handle" />
                                            </label>
                                            <label className="grid gap-2">
                                                <span className="field-label">Password</span>
                                                <input className="field" type="password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={128} autoComplete={accountMode === "register" ? "new-password" : "current-password"} placeholder="At least 8 characters" />
                                            </label>
                                            {accountError && <p className="field-error" role="alert">{accountError}</p>}
                                            <button type="button" disabled={accountBusy || !accountAvailable || !handle || !password || (accountMode === "register" && !displayName.trim())} onClick={submitAccount} className="btn btn-secondary">
                                                <Icon name={accountMode === "register" ? "database" : "log-in"} size={16} />
                                                {accountBusy ? "Please wait" : accountMode === "register" ? "Create my account" : "Sign in"}
                                            </button>
                                        </div>
                                    </details>
                                </div>
                            )}
                            {account && accountError && <p className="field-error" role="alert">{accountError}</p>}
                        </div>
                    </section>
                )}

                {tab === "data" && (
                    <section id="settings-data" role="tabpanel" className="settings-panel" aria-labelledby="storageTitle">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h3 id="storageTitle" className="settings-heading">Data and history</h3>
                                <p className="field-hint">Every change is saved locally first, then reconciled with your private cloud copy when reachable.</p>
                            </div>
                            <span className="pill pill-accent shrink-0"><Icon name={status.icon} size={12} /> {status.label}</span>
                        </div>

                        <dl className="stat-row">
                            <div><dt>Paths</dt><dd className="num">{storage.milestoneCount}</dd></div>
                            <div><dt>Check-ins</dt><dd className="num">{storage.checkInCount}</dd></div>
                            <div><dt>Snapshots</dt><dd className="num">{storage.historyCount}</dd></div>
                        </dl>

                        <div className="group">
                            <div className="group-row">
                                <Icon name="cloud" size={18} className="shrink-0 text-[var(--color-accent-ink)]" />
                                <div className="min-w-0 flex-1"><strong className="block text-sm">Cloud sync</strong><span className="block truncate text-xs text-[var(--color-muted)]">{storage.lastSyncedAt ? `Last synced ${dateTime(storage.lastSyncedAt)}` : storage.isOnline ? "Waiting for the first cloud sync" : "Will retry when this device reconnects"}</span></div>
                                <button type="button" onClick={() => void onSync()} disabled={!storage.isOnline || storage.syncStatus === "syncing"} className="btn btn-secondary btn-sm shrink-0"><Icon name="refresh" size={14} />Sync now</button>
                            </div>
                            <div className="group-row">
                                <Icon name="smartphone" size={18} className="shrink-0 text-[var(--color-accent-ink)]" />
                                <p className="m-0 min-w-0 flex-1 text-xs text-[var(--color-muted)]">{installation.installed ? "Echoe is installed as an app." : installation.isIos ? "On iPhone or iPad, install Echoe from Safari's Share menu with Add to Home Screen." : "Install Echoe for an app of its own that keeps working offline."}</p>
                                {installation.canPrompt && !installation.installed && <button type="button" onClick={() => void requestInstall()} className="btn btn-secondary btn-sm shrink-0">Install</button>}
                                {installation.installed && <span className="pill pill-accent shrink-0"><Icon name="check" size={11} />Installed</span>}
                            </div>
                            <div className="group-row">
                                <Icon name="bell" size={18} className="shrink-0 text-[var(--color-accent-ink)]" />
                                <p className="m-0 min-w-0 flex-1 text-xs text-[var(--color-muted)]">The app icon badge counts check-ins due and paths that need a decision, on devices that support it.</p>
                                {badgePermission === "default" && <button type="button" onClick={() => void enableBadge()} className="btn btn-secondary btn-sm shrink-0">Turn on</button>}
                                {badgePermission === "granted" && <span className="pill pill-accent shrink-0"><Icon name="check" size={11} />On</span>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button type="button" onClick={onExport} className="btn btn-secondary"><Icon name="download" size={16} /> Export</button>
                            <button type="button" onClick={() => fileInput.current?.click()} className="btn btn-secondary"><Icon name="upload" size={16} /> Import</button>
                            <input ref={fileInput} type="file" accept=".json,application/json" hidden onChange={(event) => { if (event.target.files?.[0]) { onImport(event.target.files[0]); event.target.value = ""; } }} />
                        </div>

                        {snapshots.length > 0 && (
                            <details className="fold">
                                <summary><Icon name="chevron-right" size={16} />Restore an earlier version</summary>
                                <p className="field-hint mt-2">Restoring saves a fresh snapshot too, so it can be undone.</p>
                                <ul className="history-list">
                                    {snapshots.slice(0, 10).map((snapshot) => (
                                        <li key={snapshot.seq} className="items-center">
                                            <span><strong>{actionLabels[snapshot.action] ?? snapshot.action}</strong><small>{dateTime(snapshot.createdAt)}</small></span>
                                            {confirmRestoreSeq === snapshot.seq ? (
                                                <span className="flex flex-row items-center gap-1">
                                                    <button type="button" onClick={() => setConfirmRestoreSeq(null)} className="btn btn-ghost btn-sm">Cancel</button>
                                                    <button type="button" disabled={restoring} onClick={async () => { setRestoring(true); await onRestoreSnapshot(snapshot.seq!); setRestoring(false); setConfirmRestoreSeq(null); }} className="btn btn-primary btn-sm">Restore</button>
                                                </span>
                                            ) : (
                                                <button type="button" onClick={() => setConfirmRestoreSeq(snapshot.seq ?? null)} className="btn btn-ghost btn-sm">Restore</button>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        )}

                        <div className="border-t border-[var(--color-line)] pt-5">
                            {!confirmClear ? (
                                <button type="button" onClick={() => setConfirmClear(true)} className="btn btn-ghost btn-sm text-[var(--color-danger)]"><Icon name="trash" size={15} /> Clear all data</button>
                            ) : (
                                <div className="danger-confirm" role="alert">
                                    <strong>Clear everything?</strong>
                                    <span>This permanently erases your paths and history here and in the cloud. Export a backup first if you might want it back.</span>
                                    <div className="flex gap-2">
                                        <button type="button" onClick={() => setConfirmClear(false)} className="btn btn-secondary btn-sm">Keep my data</button>
                                        <button type="button" onClick={async () => { await onClearData(); close(); }} className="btn btn-danger btn-sm">Clear all data</button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <p className="design-credit">Designed by <strong>Kikandi</strong></p>
                    </section>
                )}
            </SheetBody>

            <SheetFooter>
                <span className="spacer" />
                <button type="submit" className="btn btn-primary">{tab === "data" ? "Done" : "Save changes"}</button>
            </SheetFooter>
        </form>
    );
}
