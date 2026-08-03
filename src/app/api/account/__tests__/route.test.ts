import { beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
    configured: true,
    readAccount: vi.fn(),
    registerAccount: vi.fn(),
    authenticateAccount: vi.fn(),
}));

vi.mock("@/lib/server-db", () => ({
    AccountConflictError: class AccountConflictError extends Error {},
    databaseConfigured: () => database.configured,
    readAccount: database.readAccount,
    registerAccount: database.registerAccount,
    authenticateAccount: database.authenticateAccount,
}));

vi.mock("next/headers", () => ({
    cookies: async () => ({ get: () => ({ value: "123e4567-e89b-12d3-a456-426614174000" }) }),
    headers: async () => ({ get: (name: string) => name === "host" ? "echoe.test" : null }),
}));

import { GET, POST } from "@/app/api/account/route";

const account = {
    displayName: "Kikandi",
    handle: "kikandi",
    createdAt: "2026-08-03T08:00:00.000Z",
};

const post = (body: Record<string, unknown>) => new Request("https://echoe.test/api/account", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://echoe.test" },
    body: JSON.stringify(body),
});

describe("personal account route", () => {
    beforeEach(() => {
        database.configured = true;
        database.readAccount.mockResolvedValue(account);
        database.registerAccount.mockResolvedValue(account);
        database.authenticateAccount.mockResolvedValue({ ...account, ownerId: "9d4d9402-300a-45ce-ae8f-732327b81fc0" });
    });

    it("reports the account attached to the private owner session", async () => {
        const response = await GET();
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({ mode: "cloud", account: { handle: "kikandi" } });
    });

    it("registers the current Echoe owner with a normalized handle", async () => {
        const response = await POST(post({ action: "register", displayName: "Kikandi", handle: "Kikandi", password: "long-enough-password" }));
        expect(response.status).toBe(200);
        expect(database.registerAccount).toHaveBeenCalledWith(
            "123e4567-e89b-12d3-a456-426614174000",
            "Kikandi",
            "kikandi",
            "long-enough-password",
        );
    });

    it("signs in without exposing the internal owner id", async () => {
        const response = await POST(post({ action: "sign-in", handle: "kikandi", password: "long-enough-password" }));
        const payload = await response.json();
        expect(response.status).toBe(200);
        expect(payload.account).toEqual(account);
        expect(response.headers.get("set-cookie")).toContain("echoe-owner=9d4d9402-300a-45ce-ae8f-732327b81fc0");
    });

    it("rejects weak credentials before querying the account store", async () => {
        const response = await POST(post({ action: "register", displayName: "Kikandi", handle: "no", password: "short" }));
        expect(response.status).toBe(400);
        expect(database.registerAccount).not.toHaveBeenCalled();
    });
});
