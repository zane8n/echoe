import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
    configured: true,
    read: vi.fn(),
    createInvite: vi.fn(),
    acceptInvite: vi.fn(),
    removeFriend: vi.fn(),
    sharePath: vi.fn(),
    revokeShare: vi.fn(),
    checkIn: vi.fn(),
    cheer: vi.fn(),
}));

vi.mock("@/lib/server-db", () => ({
    databaseConfigured: () => database.configured,
    readSocialSnapshot: database.read,
    createFriendInvite: database.createInvite,
    acceptFriendInvite: database.acceptInvite,
    removeFriend: database.removeFriend,
    sharePath: database.sharePath,
    revokePathShare: database.revokeShare,
    checkInSharedPath: database.checkIn,
    sendCheer: database.cheer,
}));

vi.mock("next/headers", () => ({
    cookies: async () => ({ get: () => ({ value: "123e4567-e89b-12d3-a456-426614174000" }) }),
    headers: async () => ({ get: (name: string) => name === "host" ? "echoe.test" : null }),
}));

import { GET, POST } from "@/app/api/social/route";

const ownerId = "123e4567-e89b-12d3-a456-426614174000";
const friendId = "9d4d9402-300a-45ce-ae8f-732327b81fc0";
const shareId = "40cd26a1-8cf2-42ab-a564-fb3ca8ee8e55";
const post = (body: Record<string, unknown>) => new Request("https://echoe.test/api/social", { method: "POST", headers: { "content-type": "application/json", origin: "https://echoe.test" }, body: JSON.stringify(body) });

describe("private social route", () => {
    beforeEach(() => {
        database.configured = true;
        database.read.mockResolvedValue({ mode: "cloud", accountRequired: false, friends: [], sharedByMe: [], sharedWithMe: [], recentCheers: [] });
        database.createInvite.mockResolvedValue({ token: "a".repeat(32), url: "https://echoe.test/?friend_invite=private", expiresAt: "2026-08-11T00:00:00.000Z" });
        database.checkIn.mockResolvedValue(2);
        database.cheer.mockResolvedValue(undefined);
    });

    it("returns only the current owner's private social snapshot", async () => {
        const response = await GET(new Request("https://echoe.test/api/social?date=2026-08-04"));
        expect(response.status).toBe(200);
        expect(database.read).toHaveBeenCalledWith(ownerId, "2026-08-04");
        await expect(response.json()).resolves.toMatchObject({ friends: [], accountRequired: false });
    });

    it("creates capability invites without a user lookup endpoint", async () => {
        const response = await POST(post({ action: "create-invite" }));
        expect(response.status).toBe(200);
        expect(database.createInvite).toHaveBeenCalledWith(ownerId, "https://echoe.test");
        await expect(response.json()).resolves.toHaveProperty("invite.token");
    });

    it("accepts a valid private invite and rejects malformed tokens", async () => {
        const token = "private_invite_token_1234567890";
        expect((await POST(post({ action: "accept-invite", token }))).status).toBe(200);
        expect(database.acceptInvite).toHaveBeenCalledWith(ownerId, token);
        expect((await POST(post({ action: "accept-invite", token: "short" }))).status).toBe(400);
    });

    it("validates explicit friendship sharing roles", async () => {
        const response = await POST(post({ action: "share-path", friendId, eventId: "path-1", mode: "participant" }));
        expect(response.status).toBe(200);
        expect(database.sharePath).toHaveBeenCalledWith(ownerId, friendId, "path-1", "participant");
        expect((await POST(post({ action: "share-path", friendId, eventId: "path-1", mode: "public" }))).status).toBe(400);
    });

    it("records participant check-ins through the share rather than private path state", async () => {
        const response = await POST(post({ action: "check-in", shareId, date: "2026-08-04" }));
        expect(database.checkIn).toHaveBeenCalledWith(ownerId, shareId, "2026-08-04");
        await expect(response.json()).resolves.toMatchObject({ ok: true, count: 2 });
    });

    it("sends a cheer for a valid share and rejects a malformed one", async () => {
        const response = await POST(post({ action: "cheer", shareId }));
        expect(response.status).toBe(200);
        expect(database.cheer).toHaveBeenCalledWith(ownerId, shareId);
        expect((await POST(post({ action: "cheer", shareId: "not-a-uuid" }))).status).toBe(400);
    });

    it("surfaces a friendly error when cheering too soon", async () => {
        database.cheer.mockRejectedValueOnce(new Error("CHEER_TOO_SOON"));
        const response = await POST(post({ action: "cheer", shareId }));
        expect(response.status).toBe(429);
    });
});
