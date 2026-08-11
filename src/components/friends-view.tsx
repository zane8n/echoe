"use client";

import { useEffect, useMemo, useState } from "react";
import { acceptInvite, checkInSharedPath, createInvite, removeFriend, revokeShare, sharePath } from "@/lib/social-client";
import type { FriendInvite, FriendRole, MilestoneEvent, SocialSnapshot } from "@/lib/types";
import { CoProgress } from "./co-progress";
import { Icon } from "./icon";

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

    // Derived rather than synced via effect: falls back to the first option until the
    // user makes an explicit choice, without an extra render pass.
    const friendId = friendIdOverride || snapshot.friends[0]?.id || "";
    const eventId = eventIdOverride || events[0]?.id || "";

    useEffect(() => {
        const url = new URL(window.location.href);
        const token = url.searchParams.get("friend_invite") || window.sessionStorage.getItem("echoe-friend-invite") || "";
        if (!token) return;
        const timer = window.setTimeout(() => setInviteToken(token), 0);
        window.sessionStorage.setItem("echoe-friend-invite", token);
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

    const sharedIds = useMemo(() => new Set(snapshot.sharedByMe.map((share) => `${share.eventId}:${share.person.id}`)), [snapshot.sharedByMe]);
    const selectedEvent = events.find((event) => event.id === eventId) ?? null;

    if (loading) return <section className="friends-view" aria-label="Loading friends"><div className="friends-skeleton" /><div className="friends-skeleton" /></section>;

    if (snapshot.mode === "local" || snapshot.accountRequired) return (
        <section className="friends-view friends-gate animate-soft-enter">
            <Icon name="users" size={25} />
            <h1>Private circles begin with an account</h1>
            <p>Your paths stay private until you create an invite and choose exactly what a friend can see.</p>
            {inviteToken && <p className="invite-waiting"><Icon name="user-plus" size={14} />Your invitation is waiting on this device.</p>}
            <button type="button" onClick={onOpenSettings} className="primary-button"><Icon name="log-in" size={16} />Open account settings</button>
        </section>
    );

    return <section className="friends-view animate-soft-enter">
        <header className="friends-heading">
            <div><div className="section-kicker"><Icon name="users" size={14} />Friends</div><h1>Your private circle</h1><p>No directory, suggestions, or searchable profiles. Connection only happens through an invite you choose to send.</p></div>
            <button type="button" onClick={() => void generateInvite()} disabled={busy === "invite"} className="primary-button"><Icon name="user-plus" size={16} />Invite</button>
        </header>

        {error && <p className="social-error" role="alert">{error}</p>}

        {snapshot.recentCheers.length > 0 && (
            <div className="cheer-banner" role="status">
                {snapshot.recentCheers.slice(0, 3).map((notice) => (
                    <p key={notice.id}><Icon name="heart" size={14} /><strong>{notice.fromDisplayName}</strong> cheered you on for <strong>{notice.eventName}</strong></p>
                ))}
            </div>
        )}

        {inviteToken && <div className="invite-strip"><span><strong>A private invitation is waiting</strong><small>Nothing is connected until you accept.</small></span><button type="button" onClick={() => void acceptPendingInvite()} disabled={busy === "accepting"} className="compact-button"><Icon name="user-plus" size={14} />Accept</button></div>}
        {invite && <div className="invite-strip"><span><strong>Private invite ready</strong><small>Single use, expires {new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(new Date(invite.expiresAt))}</small></span><button type="button" onClick={() => void shareInvite()} className="compact-button"><Icon name="share" size={14} />Share</button></div>}

        <section className="social-section" aria-labelledby="circleHeading">
            <div className="social-section-heading"><h2 id="circleHeading">Circle</h2><span>{snapshot.friends.length}</span></div>
            {snapshot.friends.length === 0 ? <p className="social-empty">Only accepted friends will appear here.</p> : <div className="friend-list">{snapshot.friends.map((friend) => <div className="friend-row" key={friend.id}><span className="friend-initial">{friend.displayName.slice(0, 1).toUpperCase()}</span><span><strong>{friend.displayName}</strong><small>@{friend.handle}</small></span>{confirmRemove === friend.id ? <span className="friend-confirm"><button type="button" className="quiet-button" onClick={() => setConfirmRemove(null)}>Keep</button><button type="button" className="quiet-button text-[var(--color-danger)]" disabled={busy === `remove:${friend.id}`} onClick={() => void perform(`remove:${friend.id}`, async () => { await removeFriend(friend.id); setConfirmRemove(null); })}>Remove</button></span> : <button type="button" className="icon-button" onClick={() => setConfirmRemove(friend.id)} aria-label={`Friend options for ${friend.displayName}`}><Icon name="more-horiz" size={16} /></button>}</div>)}</div>}
        </section>

        {snapshot.friends.length > 0 && events.length > 0 && <section className="social-section" aria-labelledby="shareHeading">
            <div className="social-section-heading"><h2 id="shareHeading">Share a path</h2><Icon name="share" size={15} /></div>
            <div className="share-builder">
                <label><span>Path</span><select className="field" value={eventId} onChange={(event) => setEventIdOverride(event.target.value)}>{events.map((event) => <option key={event.id} value={event.id}>{event.name}</option>)}</select></label>
                <label><span>Friend</span><select className="field" value={friendId} onChange={(event) => setFriendIdOverride(event.target.value)}>{snapshot.friends.map((friend) => <option key={friend.id} value={friend.id}>{friend.displayName}</option>)}</select></label>
                <div className="share-role" role="radiogroup" aria-label="Friend role"><button type="button" role="radio" aria-checked={mode === "spectator"} onClick={() => setMode("spectator")}><Icon name="eye" size={14} />Spectator</button><button type="button" role="radio" aria-checked={mode === "participant"} onClick={() => setMode("participant")}><Icon name="trophy" size={14} />Participant</button></div>
                {mode === "participant" && selectedEvent && (
                    <label className="editor-toggle">
                        <span><strong>Allow extra check-ins</strong><small>Let {selectedEvent.name} be checked in more than once a day while shared.</small></span>
                        <input type="checkbox" checked={Boolean(selectedEvent.allowExtraCheckIns)} onChange={(event) => onUpdateEvent({ ...selectedEvent, allowExtraCheckIns: event.target.checked })} className="theme-checkbox" />
                    </label>
                )}
                <button type="button" className="primary-button" disabled={busy === "share"} onClick={() => void submitShare()}>{sharedIds.has(`${eventId}:${friendId}`) ? "Update sharing" : "Share privately"}</button>
            </div>
        </section>}

        {snapshot.sharedWithMe.length > 0 && <section className="social-section" aria-labelledby="withMeHeading"><div className="social-section-heading"><h2 id="withMeHeading">Shared with you</h2><span>{snapshot.sharedWithMe.length}</span></div><div className="shared-list">{snapshot.sharedWithMe.map((share) => {
            const canCheckAgain = share.mode === "participant" && (share.allowExtraCheckIns || share.guestToday === 0);
            return <article className="shared-path" key={share.id}>
                <div className="shared-path-title"><span><small>{share.person.displayName} · {share.mode}</small><strong>{share.eventName}</strong></span>{share.mode === "participant" ? <Icon name="trophy" size={15} /> : <Icon name="eye" size={15} />}</div>
                {share.mode === "participant" && <CoProgress partnerName={share.person.displayName} youDoneToday={share.guestToday > 0} partnerDoneToday={share.ownerToday > 0} onCheer={() => void cheer(share.id)} cheerSent={cheeredIds.has(share.id)} />}
                {share.mode === "participant" && <button type="button" className="compact-button" disabled={!canCheckAgain || busy === `check:${share.id}`} onClick={() => void perform(`check:${share.id}`, () => checkInSharedPath(share.id), "Shared check-in recorded")}><Icon name="check" size={14} />{share.guestToday ? share.allowExtraCheckIns ? "Check in again" : "Checked in" : "Check in"}</button>}
            </article>;
        })}</div></section>}

        {snapshot.sharedByMe.length > 0 && <section className="social-section" aria-labelledby="byMeHeading"><div className="social-section-heading"><h2 id="byMeHeading">Visible to friends</h2><span>{snapshot.sharedByMe.length}</span></div><div className="shared-list">{snapshot.sharedByMe.map((share) => <article className="shared-path shared-path-owned" key={share.id}>
            <div className="shared-path-title"><span><small>{share.person.displayName} · {share.mode}</small><strong>{share.eventName}</strong></span>{confirmRevoke === share.id ? <span className="friend-confirm"><button type="button" className="quiet-button" onClick={() => setConfirmRevoke(null)}>Keep</button><button type="button" className="quiet-button text-[var(--color-danger)]" disabled={busy === `revoke:${share.id}`} onClick={() => void perform(`revoke:${share.id}`, async () => { await revokeShare(share.id); setConfirmRevoke(null); })}>Stop</button></span> : <button type="button" className="icon-button" aria-label={`Stop sharing ${share.eventName} with ${share.person.displayName}`} onClick={() => setConfirmRevoke(share.id)}><Icon name="x" size={15} /></button>}</div>
            {share.mode === "participant" && <CoProgress partnerName={share.person.displayName} youDoneToday={share.ownerToday > 0} partnerDoneToday={share.guestToday > 0} onCheer={() => void cheer(share.id)} cheerSent={cheeredIds.has(share.id)} />}
        </article>)}</div></section>}
    </section>;
}
