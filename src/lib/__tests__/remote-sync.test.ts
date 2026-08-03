import { afterEach, describe, expect, it, vi } from "vitest";
import { pullRemoteState, pushRemoteState } from "@/lib/remote-sync";
import { dashboardState } from "@/test/fixtures";

describe("Vercel sync client", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("falls back cleanly when DATABASE_URL is not configured", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ mode: "local" }), { status: 503 })));
        await expect(pullRemoteState()).resolves.toEqual({ mode: "local", state: null, version: 0 });
    });

    it("pushes versioned state and its audit action to the same-origin route", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ mode: "cloud", state: dashboardState, version: 4 }), { status: 200 }));
        vi.stubGlobal("fetch", fetchMock);
        const result = await pushRemoteState(dashboardState, "check-in");

        expect(result.version).toBe(4);
        expect(fetchMock).toHaveBeenCalledWith("/api/sync", expect.objectContaining({ method: "PUT", credentials: "same-origin" }));
        const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
        expect(body).toMatchObject({ action: "check-in", state: { schemaVersion: 2 } });
    });
});
