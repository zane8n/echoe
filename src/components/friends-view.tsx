"use client";

import { useEffect, useMemo, useState } from "react";
import { acceptInvite, checkInSharedPath, createInvite, peekFriendDay, removeFriend, revokeShare, sharePath } from "@/lib/social-client";
import type { DailyTask, FriendInvite, FriendRole, MilestoneEvent, SocialSnapshot } from "@/lib/types";
import { CheckButton } from "./check-button";
import { CoProgress } from "./co-progress";
import { Icon } from "./icon";
import { Segmented } from "./segmented";

interface Props {
    events: MilestoneEvent[];
    social: SocialSnapshot;
    socialLoading: boolean;
    onRefreshSocial: () => Promise<void>;
    onCheer: (shareId: string) => Promise<void>;
    onSync: () => Promise<void> | void;
    onOpenSettings: () => void;
    onToast: (message: string) => void;
    onUpdateEvent: (event: MilestoneEvent) => void;
}

const initial = (name: string) => name.trim().charAt(0).toUpperCase() || "?";

export function FriendsView({ events, social: snapshot, socialLoading: loading, onRefreshSocial: refresh, onCheer, onSync, onOpenSettings, onToast, onUpdateEvent }: Props) {
    const [busy, setBusy] = useState("");
    const [error, setError] = useState("");
    const [invite, setInvite] = useState<FriendInvite | null>(null);
    const [inviteToken, setInviteToken] = useState("");
    const [friendIdOverride, setFriendIdOverride] = useState("");
    const [eventIdOverride, setEventIdOverride] = useState("");
    const [mode, setMode] = useState<FriendRole>("spectator");
    const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
    const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
    const [cheeredIds, setCheeredIds] = useState<Set<string>>(new Set());
    const [peekOpenId, setPeekOpenId] = useState<string | null>(null);
    const [peekTasks, setPeekTasks] = useState<Record<string, Array<Pick<DailyTask, "id" | "text" | "done" | "time">>>>({});
    const [peekLoading, setPeekLoading] = useState("");

    // Derived rather than synced via effect: falls back to the first option until the
    // user makes an explicit choice, without an extra render pass.
    const friendId = friendIdOverride || snapshot.friends[0]?.id || "";
    const eventId = eventIdOverride || events[0]?.id || "";

    useEffect(() => {
        const url = new URL(window.location.href);
        const token = url.searchParams.get("friend_invite") || window.sessionStorage.getItem("echoe-friend-invite") || "";
        const share = url.searchParams.get("share") ?? "";
        const timer = window.setTimeout(() => {
            if (token) setInviteToken(token);
            if (share) setEventIdOverride(share);
        }, 0);
        if (token) window.sessionStorage.setItem("echoe-friend-invite", token);
        return () => window.clearTimeout(timer);
    }, []);

    const acceptPendingInvite = async () => {
        if (!inviteToken) return;
        setBusy("accepting"); setError("");
        try {
            await acceptInvite(inviteToken);
            window.sessionStorage.removeItem("echoe-friend-invite");
            const url = new URL(window.location.href);
            url.searchParams.delete("friend_invite");
            window.history.replaceState(window.history.state ?? {}, "", `${url.pathname}${url.search}${url.hash}`);
            setInviteToken("");
            await refresh();
            onToast("Friend added privately");
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "Invite could not be accepted.");
        } finally {
            setBusy("");
        }
    };

    const generateInvite = async () => {
        setBusy("invite"); setError("");
        try { setInvite((await createInvite()).invite); }
        catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Invite could not be created."); }
        finally { setBusy(""); }
    };

    const shareInvite = async () => {
        if (!invite) return;
        if (navigator.share) {
            try { await navigator.share({ title: "Join me on Echoe", text: "A private Echoe friend invite", url: invite.url }); return; }
            catch { /* The system share sheet was dismissed. */ }
        }
        await navigator.clipboard.writeText(invite.url);
        onToast("Private invite copied");
    };

    const submitShare = async () => {
        if (!friendId || !eventId) return;
        setBusy("share"); setError("");
        try { await onSync(); await sharePath(friendId, eventId, mode); await refresh(); onToast("Path shared privately"); }
        catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Path could not be shared."); }
        finally { setBusy(""); }
    };

    const perform = async (key: string, action: () => Promise<unknown>, success?: string) => {
        setBusy(key); setError("");
        try {
            await action();
            await refresh();
            if (success) onToast(success);
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "That private action could not be completed.");
        } finally {
            setBusy("");
        }
    };

    const cheer = async (shareId: string) => {
        setCheeredIds((current) => new Set(current).add(shareId));
        await onCheer(shareId);
    };

    const togglePeek = async (friendPeekId: string) => {
        if (peekOpenId === friendPeekId) { setPeekOpenId(null); return; }
        setPeekOpenId(friendPeekId);
        if (peekTasks[friendPeekId]) return;
        setPeekLoading(friendPeekId);
        try {
            const { tasks } = await peekFriendDay(friendPeekId);
            setPeekTasks((current) => ({ ...current, [friendPeekId]: tasks ?? [] }));
        } catch (requestError) {
            setError(requestError instanceof Error ? requestError.message : "That friend's day could not be loaded.");
        } finally {
            setPeekLoading("");
        }
    };

    const sharedIds = useMemo(() => new Set(snapshot.sharedByMe.map((share) => `${share.eventId}:${share.person.id}`)), [snapshot.sharedByMe]);
    const selectedEvent = events.find((event) => event.id === eventId) ?? null;

    if (loading) return <section className="friends" aria-label="Loading friends"><div className="skeleton" /><div className="skeleton" /></section>;

    if (snapshot.mode === "local" || snapshot.accountRequired) return (
        <section className="friends">
            <header className="page-head"><div><h1>Friends</h1></div></header>
            <div className="group empty-state">
                <span className="friends-orbit" aria-hidden="true"><Icon name="users" size={24} /></span>
                <h2>Private circles begin with an account</h2>
                <p>Your paths stay private until you send an invite and choose exactly what a friend can see.</p>
                {inviteToken && <p className="invite-waiting"><Icon name="user-plus" size={14} />Your invitation is waiting on this device.</p>}
                <button type="button" onClick={onOpenSettings} className="btn btn-primary mt-3"><Icon name="log-in" size={17} />Open account settings</button>
            </div>
        </section>
    );

    return (
        <section className="friends">
            <header className="page-head">
                <div>
                    <h1>Friends</h1>
                    <p>No directory, suggestions, or searchable profiles. Connection only happens through an invite you choose to send.</p>
                </div>
                <button type="button" onClick={() => void generateInvite()} disabled={busy === "invite"} className="btn btn-primary btn-sm"><Icon name="user-plus" size={16} />Invite</button>
            </header>

            {error && <p className="notice-banner notice-danger" role="alert">{error}</p>}

            {snapshot.recentCheers.length > 0 && (
                <div className="notice-banner notice-cheer" role="status">
                    {snapshot.recentCheers.slice(0, 3).map((notice) => (
                        <p key={notice.id}><Icon name="heart" size={15} /><span><strong>{notice.fromDisplayName}</strong> cheered you on for <strong>{notice.eventName}</strong></span></p>
                    ))}
                </div>
            )}

            {inviteToken && <div className="invite-strip"><span><strong>A private invitation is waiting</strong><small>Nothing is connected until you accept.</small></span><button type="button" onClick={() => void acceptPendingInvite()} disabled={busy === "accepting"} className="btn btn-primary btn-sm"><Icon name="user-plus" size={15} />Accept</button></div>}
            {invite && <div className="invite-strip"><span><strong>Your private invite is ready</strong><small>Single use. Expires {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(invite.expiresAt))}.</small></span><button type="button" onClick={() => void shareInvite()} className="btn btn-primary btn-sm"><Icon name="share" size={15} />Send</button></div>}

            {snapshot.sharedWithMe.length > 0 && (
                <section className="section" aria-labelledby="withMeHeading">
                    <div className="section-head"><h2 id="withMeHeading">Shared with you</h2><span className="section-meta">{snapshot.sharedWithMe.length}</span></div>
                    <ul className="rhythm-list group">
                        {snapshot.sharedWithMe.map((share) => {
                            const participant = share.mode === "participant";
                            const canCheckAgain = participant && (share.allowExtraCheckIns || share.guestToday === 0);
                            return (
                                <li key={share.id} className="shared-row" data-hue={share.color ?? "teal"}>
                                    <div className="shared-row-main">
                                        <span className="shared-row-title"><small>{share.person.displayName}, {share.mode}</small><strong>{share.eventName}</strong></span>
                                        {participant
                                            ? <CheckButton done={share.guestToday > 0 && !share.allowExtraCheckIns} disabled={!canCheckAgain || busy === `check:${share.id}`} label={share.guestToday ? share.allowExtraCheckIns ? "Check in again" : "Checked in" : "Check in"} onToggle={() => void perform(`check:${share.id}`, () => checkInSharedPath(share.id), "Shared check-in recorded")} />
                                            : <span className="pill"><Icon name="eye" size={12} />Watching</span>}
                                    </div>
                                    {participant && <CoProgress partnerName={share.person.displayName} youDoneToday={share.guestToday > 0} partnerDoneToday={share.ownerToday > 0} onCheer={() => void cheer(share.id)} cheerSent={cheeredIds.has(share.id)} />}
                                </li>
                            );
                        })}
                    </ul>
                </section>
            )}

            <section className="section" aria-labelledby="circleHeading">
                <div className="section-head"><h2 id="circleHeading">Your circle</h2><span className="section-meta">{snapshot.friends.length}</span></div>
                {snapshot.friends.length === 0 ? <div className="group"><p className="social-empty">Only friends who accept your invite appear here.</p></div> : (
                    <ul className="rhythm-list group">
                        {snapshot.friends.map((friend) => (
                            <li key={friend.id}>
                                <div className="friend-row">
                                    <span className="avatar-btn" aria-hidden="true">{initial(friend.displayName)}</span>
                                    <span className="min-w-0 flex-1"><strong className="block truncate">{friend.displayName}</strong><small className="block truncate text-[var(--color-muted)]">@{friend.handle}</small></span>
                                    <button type="button" className="icon-btn" aria-pressed={peekOpenId === friend.id} onClick={() => void togglePeek(friend.id)} aria-label={`Peek at ${friend.displayName}'s day`} title="Peek at their day"><Icon name="eye" size={18} /></button>
                                    {confirmRemove === friend.id
                                        ? <span className="flex items-center gap-1"><button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmRemove(null)}>Keep</button><button type="button" className="btn btn-danger btn-sm" disabled={busy === `remove:${friend.id}`} onClick={() => void perform(`remove:${friend.id}`, async () => { await removeFriend(friend.id); setConfirmRemove(null); })}>Remove</button></span>
                                        : <button type="button" className="icon-btn" onClick={() => setConfirmRemove(friend.id)} aria-label={`Friend options for ${friend.displayName}`}><Icon name="more-horiz" size={18} /></button>}
                                </div>
                                {peekOpenId === friend.id && (
                                    <div className="friend-peek" aria-live="polite">
                                        {peekLoading === friend.id ? (
                                            <p>Loading their day…</p>
                                        ) : (peekTasks[friend.id]?.length ?? 0) === 0 ? (
                                            <p>Nothing on {friend.displayName.split(/\s+/)[0]}&apos;s plate today.</p>
                                        ) : (
                                            <ul>
                                                {peekTasks[friend.id]?.map((task) => (
                                                    <li key={task.id} data-done={task.done}>
                                                        <Icon name={task.done ? "check" : "clock"} size={13} />
                                                        <span>{task.text}</span>
                                                        {task.time && <span className="num">{task.time}</span>}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {snapshot.friends.length > 0 && events.length > 0 && (
                <section className="section" aria-labelledby="shareHeading">
                    <div className="section-head"><h2 id="shareHeading">Share a path</h2></div>
                    <div className="share-builder group">
                        <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
                            <label className="grid gap-2"><span className="field-label">Path</span><select className="field" value={eventId} onChange={(event) => setEventIdOverride(event.target.value)}>{events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}</select></label>
                            <label className="grid gap-2"><span className="field-label">Friend</span><select className="field" value={friendId} onChange={(event) => setFriendIdOverride(event.target.value)}>{snapshot.friends.map((friend) => <option key={friend.id} value={friend.id}>{friend.displayName}</option>)}</select></label>
                        </div>
                        <div className="grid gap-2">
                            <span className="field-label">They can</span>
                            <Segmented label="Friend role" value={mode} onChange={setMode} options={[{ value: "spectator", label: "Spectator", icon: "eye" }, { value: "participant", label: "Participant", icon: "trophy" }]} />
                            <p className="field-hint">{mode === "spectator" ? "See your pace on this path. They can't change anything." : "Check in alongside you, with their own record and a side-by-side view."}</p>
                        </div>
                        {mode === "participant" && selectedEvent && (
                            <label className="toggle-row">
                                <span><strong>Allow extra check-ins</strong><small>Let {selectedEvent.name} be checked in more than once a day while shared.</small></span>
                                <input type="checkbox" className="switch" checked={Boolean(selectedEvent.allowExtraCheckIns)} onChange={(event) => onUpdateEvent({ ...selectedEvent, allowExtraCheckIns: event.target.checked })} />
                            </label>
                        )}
                        <button type="button" className="btn btn-primary" disabled={busy === "share"} onClick={() => void submitShare()}>{sharedIds.has(`${eventId}:${friendId}`) ? "Update sharing" : "Share privately"}</button>
                    </div>
                </section>
            )}

            {snapshot.sharedByMe.length > 0 && (
                <section className="section" aria-labelledby="byMeHeading">
                    <div className="section-head"><h2 id="byMeHeading">Visible to friends</h2><span className="section-meta">{snapshot.sharedByMe.length}</span></div>
                    <ul className="rhythm-list group">
                        {snapshot.sharedByMe.map((share) => (
                            <li key={share.id} className="shared-row" data-hue={share.color ?? "teal"}>
                                <div className="shared-row-main">
                                    <span className="shared-row-title"><small>{share.person.displayName}, {share.mode}</small><strong>{share.eventName}</strong></span>
                                    {confirmRevoke === share.id
                                        ? <span className="flex items-center gap-1"><button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmRevoke(null)}>Keep</button><button type="button" className="btn btn-danger btn-sm" disabled={busy === `revoke:${share.id}`} onClick={() => void perform(`revoke:${share.id}`, async () => { await revokeShare(share.id); setConfirmRevoke(null); })}>Stop sharing</button></span>
                                        : <button type="button" className="icon-btn" aria-label={`Stop sharing ${share.eventName} with ${share.person.displayName}`} onClick={() => setConfirmRevoke(share.id)}><Icon name="x" size={17} /></button>}
                                </div>
                                {share.mode === "participant" && <CoProgress partnerName={share.person.displayName} youDoneToday={share.ownerToday > 0} partnerDoneToday={share.guestToday > 0} onCheer={() => void cheer(share.id)} cheerSent={cheeredIds.has(share.id)} />}
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </section>
    );
}
