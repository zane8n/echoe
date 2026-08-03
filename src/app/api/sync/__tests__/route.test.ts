import { beforeEach, describe, expect, it, vi } from "vitest";
import { dashboardState } from "@/test/fixtures";

const database = vi.hoisted(() => ({
    configured: true,
    read: vi.fn(),
    write: vi.fn(),
}));

vi.mock("@/lib/server-db", () => ({
    databaseConfigured: () => database.configured,
    readRemoteState: database.read,
    writeRemoteState: database.write,
}));

vi.mock("next/headers", () => ({
    cookies: async () => ({ get: () => ({ value: "123e4567-e89b-12d3-a456-426614174000" }) }),
    headers: async () => ({ get: (name: string) => name === "host" ? "echoe.test" : null }),
}));

import { GET, PUT } from "@/app/api/sync/route";

describe("Vercel sync route", () => {
    beforeEach(() => {
        database.configured = true;
        database.read.mockResolvedValue({ state: dashboardState, version: 3, updatedAt: dashboardState.updatedAt });
        database.write.mockResolvedValue({ state: dashboardState, version: 4, updatedAt: dashboardState.updatedAt });
    });

    it("reports local mode when the Vercel database is not connected", async () => {
        database.configured = false;
        const response = await GET();
        expect(response.status).toBe(503);
        await expect(response.json()).resolves.toMatchObject({ mode: "local", version: 0 });
    });

    it("returns the current ordered database version", async () => {
        const response = await GET();
        expect(response.status).toBe(200);
        await expect(response.json()).resolves.toMatchObject({ mode: "cloud", version: 3 });
    });

    it("validates and persists a state snapshot with its audit action", async () => {
        const request = new Request("https://echoe.test/api/sync", {
            method: "PUT",
            headers: { "content-type": "application/json", origin: "https://echoe.test" },
            body: JSON.stringify({ state: dashboardState, action: "check-in" }),
        });
        const response = await PUT(request);
        expect(response.status).toBe(200);
        expect(database.write).toHaveBeenCalledWith("123e4567-e89b-12d3-a456-426614174000", dashboardState, "check-in");
    });

    it("rejects malformed state before it reaches Postgres", async () => {
        const request = new Request("https://echoe.test/api/sync", {
            method: "PUT",
            headers: { "content-type": "application/json", origin: "https://echoe.test" },
            body: JSON.stringify({ state: { events: "nope" }, action: "edit" }),
        });
        const response = await PUT(request);
        expect(response.status).toBe(400);
        expect(database.write).not.toHaveBeenCalled();
    });
});
