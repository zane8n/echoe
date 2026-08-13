import { headers } from "next/headers";
import {
    acceptFriendInvite,
    checkInSharedPath,
    createFriendInvite,
    databaseConfigured,
    peekDailyTasks,
    readSocialSnapshot,
    removeFriend,
    revokePathShare,
    sendCheer,
    sharePath,
} from "@/lib/server-db";
import { getOwnerSession, withOwnerCookie } from "@/lib/owner-session";
import type { FriendRole } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ID_PATTERN = /^[0-9a-f-]{36}$/i;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,80}$/;

const sameOrigin = async (request: Request) => {
    const origin = request.headers.get("origin");
    if (!origin) return true;
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    return Boolean(host && new URL(origin).host === host);
};

const errorResponse = (error: unknown) => {
    const code = error instanceof Error ? error.message : "SOCIAL_REQUEST_FAILED";
    if (code === "ACCOUNT_REQUIRED") return Response.json({ error: "Sign in before connecting with friends." }, { status: 401 });
    if (code === "INVITE_INVALID") return Response.json({ error: "This invite is invalid, expired, or already used." }, { status: 410 });
    if (["PATH_NOT_FOUND", "FRIEND_REQUIRED", "PARTICIPANT_REQUIRED", "SHARE_NOT_FOUND"].includes(code)) {
        return Response.json({ error: "That private connection is no longer available." }, { status: 404 });
    }
    if (code === "CHEER_TOO_SOON") return Response.json({ error: "You already cheered them on recently — give it a little time." }, { status: 429 });
    return Response.json({ error: "The social request could not be completed." }, { status: 400 });
};

export async function GET(request: Request) {
    if (!databaseConfigured()) return Response.json({ mode: "local", accountRequired: true, friends: [], sharedByMe: [], sharedWithMe: [], recentCheers: [] }, { status: 503 });
    const { ownerId, isNew } = await getOwnerSession();
    const date = new URL(request.url).searchParams.get("date") ?? "";
    const snapshot = await readSocialSnapshot(ownerId, date);
    return withOwnerCookie(Response.json(snapshot), ownerId, isNew);
}

export async function POST(request: Request) {
    if (!databaseConfigured()) return Response.json({ error: "Private sharing needs cloud sync." }, { status: 503 });
    if (!(await sameOrigin(request))) return Response.json({ error: "Origin not allowed" }, { status: 403 });
    let payload: Record<string, unknown>;
    try {
        payload = await request.json() as Record<string, unknown>;
    } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { ownerId, isNew } = await getOwnerSession();
    const action = String(payload.action ?? "");
    try {
        if (action === "create-invite") {
            const invite = await createFriendInvite(ownerId, new URL(request.url).origin);
            return withOwnerCookie(Response.json({ invite }), ownerId, isNew);
        }
        if (action === "accept-invite") {
            const token = String(payload.token ?? "").trim();
            if (!TOKEN_PATTERN.test(token)) return Response.json({ error: "That invite format is not valid." }, { status: 400 });
            await acceptFriendInvite(ownerId, token);
        } else if (action === "remove-friend") {
            const friendId = String(payload.friendId ?? "");
            if (!ID_PATTERN.test(friendId)) return Response.json({ error: "Invalid friend." }, { status: 400 });
            await removeFriend(ownerId, friendId);
        } else if (action === "share-path") {
            const friendId = String(payload.friendId ?? "");
            const eventId = String(payload.eventId ?? "");
            const mode = String(payload.mode ?? "") as FriendRole;
            if (!ID_PATTERN.test(friendId) || !eventId || !["spectator", "participant"].includes(mode)) {
                return Response.json({ error: "Choose a friend, path, and role." }, { status: 400 });
            }
            await sharePath(ownerId, friendId, eventId, mode);
        } else if (action === "revoke-share") {
            const shareId = String(payload.shareId ?? "");
            if (!ID_PATTERN.test(shareId)) return Response.json({ error: "Invalid share." }, { status: 400 });
            await revokePathShare(ownerId, shareId);
        } else if (action === "check-in") {
            const shareId = String(payload.shareId ?? "");
            const date = String(payload.date ?? "");
            if (!ID_PATTERN.test(shareId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: "Invalid check-in." }, { status: 400 });
            const count = await checkInSharedPath(ownerId, shareId, date);
            return withOwnerCookie(Response.json({ ok: true, count }), ownerId, isNew);
        } else if (action === "cheer") {
            const shareId = String(payload.shareId ?? "");
            if (!ID_PATTERN.test(shareId)) return Response.json({ error: "Invalid share." }, { status: 400 });
            await sendCheer(ownerId, shareId);
        } else if (action === "peek-day") {
            const friendId = String(payload.friendId ?? "");
            const date = String(payload.date ?? "");
            if (!ID_PATTERN.test(friendId) || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ error: "Invalid peek request." }, { status: 400 });
            const tasks = await peekDailyTasks(ownerId, friendId, date);
            return withOwnerCookie(Response.json({ tasks }), ownerId, isNew);
        } else {
            return Response.json({ error: "Unsupported social action." }, { status: 400 });
        }
        return withOwnerCookie(Response.json({ ok: true }), ownerId, isNew);
    } catch (error) {
        return errorResponse(error);
    }
}
