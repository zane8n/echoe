import type { DailyTask, FriendInvite, FriendRole, SocialSnapshot } from "./types";
import { localDate } from "./utils";

const EMPTY_SOCIAL: SocialSnapshot = {
    mode: "local",
    accountRequired: true,
    friends: [],
    sharedByMe: [],
    sharedWithMe: [],
    recentCheers: [],
};

const readPayload = async <T>(response: Response): Promise<T> => {
    const payload = await response.json() as T & { error?: string };
    if (!response.ok) {
        if (response.status === 503) return EMPTY_SOCIAL as T;
        throw new Error(payload.error || "Private sharing is temporarily unavailable.");
    }
    return payload;
};

const mutate = <T = { ok: true }>(body: Record<string, unknown>) =>
    fetch("/api/social", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
    }).then((response) => readPayload<T>(response));

export const getSocialSnapshot = () =>
    fetch(`/api/social?date=${localDate()}`, { cache: "no-store", credentials: "same-origin" })
        .then((response) => readPayload<SocialSnapshot>(response));

export const createInvite = () => mutate<{ invite: FriendInvite }>({ action: "create-invite" });
export const acceptInvite = (token: string) => mutate({ action: "accept-invite", token });
export const removeFriend = (friendId: string) => mutate({ action: "remove-friend", friendId });
export const sharePath = (friendId: string, eventId: string, mode: FriendRole) => mutate({ action: "share-path", friendId, eventId, mode });
export const revokeShare = (shareId: string) => mutate({ action: "revoke-share", shareId });
export const checkInSharedPath = (shareId: string) => mutate<{ ok: true; count: number }>({ action: "check-in", shareId, date: localDate() });
export const sendCheer = (shareId: string) => mutate({ action: "cheer", shareId });
export const peekFriendDay = (friendId: string) => mutate<{ tasks: Array<Pick<DailyTask, "id" | "text" | "done" | "time">> }>({ action: "peek-day", friendId, date: localDate() });
