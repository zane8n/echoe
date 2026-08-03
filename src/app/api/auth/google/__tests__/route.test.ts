import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const database = vi.hoisted(() => ({
    configured: true,
    connectGoogleAccount: vi.fn(),
}));

vi.mock("@/lib/server-db", () => ({
    databaseConfigured: () => database.configured,
    connectGoogleAccount: database.connectGoogleAccount,
}));

vi.mock("@/lib/owner-session", () => ({
    getOwnerSession: async () => ({ ownerId: "123e4567-e89b-12d3-a456-426614174000", isNew: false }),
    ownerCookieValue: (ownerId: string) => `echoe-owner=${ownerId}; Path=/; HttpOnly`,
}));

vi.mock("next/headers", () => ({
    cookies: async () => ({
        get: (name: string) => ({
            value: name === "echoe-google-state" ? "known-state" : "known-verifier",
        }),
    }),
}));

import { GET as beginGoogleAuth } from "@/app/api/auth/google/route";
import { GET as finishGoogleAuth } from "@/app/api/auth/google/callback/route";

describe("Google OpenID Connect routes", () => {
    beforeEach(() => {
        process.env.GOOGLE_CLIENT_ID = "google-client-id";
        process.env.GOOGLE_CLIENT_SECRET = "google-client-secret";
        database.configured = true;
        database.connectGoogleAccount.mockResolvedValue({
            account: { displayName: "Kikandi", handle: "g-account", createdAt: "2026-08-03T08:00:00.000Z", authProvider: "google" },
            ownerId: "9d4d9402-300a-45ce-ae8f-732327b81fc0",
            switchedOwner: true,
        });
    });

    afterEach(() => {
        delete process.env.GOOGLE_CLIENT_ID;
        delete process.env.GOOGLE_CLIENT_SECRET;
        vi.unstubAllGlobals();
    });

    it("starts a code flow with state, PKCE, and server-side redirect URI", async () => {
        const response = await beginGoogleAuth(new Request("https://echoe.test/api/auth/google"));
        const location = new URL(response.headers.get("location") ?? "");

        expect(location.origin).toBe("https://accounts.google.com");
        expect(location.searchParams.get("client_id")).toBe("google-client-id");
        expect(location.searchParams.get("code_challenge_method")).toBe("S256");
        expect(location.searchParams.get("redirect_uri")).toBe("https://echoe.test/api/auth/google/callback");
        expect(response.headers.getSetCookie()).toHaveLength(2);
    });

    it("exchanges the code, reads verified user info, and switches to the stored owner", async () => {
        const fetchMock = vi.fn()
            .mockResolvedValueOnce(Response.json({ access_token: "access-token" }))
            .mockResolvedValueOnce(Response.json({
                sub: "google-subject",
                email: "kikandi@example.com",
                email_verified: true,
                name: "Kikandi",
            }));
        vi.stubGlobal("fetch", fetchMock);

        const response = await finishGoogleAuth(new Request("https://echoe.test/api/auth/google/callback?code=auth-code&state=known-state"));

        expect(database.connectGoogleAccount).toHaveBeenCalledWith(
            "123e4567-e89b-12d3-a456-426614174000",
            expect.objectContaining({ sub: "google-subject", email: "kikandi@example.com" }),
        );
        expect(response.headers.get("location")).toBe("https://echoe.test/?account=switched");
        expect(response.headers.getSetCookie().join(" ")).toContain("echoe-owner=9d4d9402-300a-45ce-ae8f-732327b81fc0");
    });

    it("fails closed when the OAuth state does not match", async () => {
        const response = await finishGoogleAuth(new Request("https://echoe.test/api/auth/google/callback?code=auth-code&state=wrong"));
        expect(response.headers.get("location")).toBe("https://echoe.test/?auth=failed");
        expect(database.connectGoogleAccount).not.toHaveBeenCalled();
    });
});
