import type { AuditAction, DashboardState } from "./types";

interface SyncResponse {
    mode: "local" | "cloud";
    state: DashboardState | null;
    version: number;
    updatedAt?: string;
}

export async function pullRemoteState(): Promise<SyncResponse> {
    const response = await fetch("/api/sync", { method: "GET", cache: "no-store", credentials: "same-origin" });
    if (response.status === 503) return { mode: "local", state: null, version: 0 };
    if (!response.ok) throw new Error(`Sync pull failed with ${response.status}`);
    return response.json() as Promise<SyncResponse>;
}

export async function pushRemoteState(state: DashboardState, action: AuditAction): Promise<SyncResponse> {
    const response = await fetch("/api/sync", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ state, action }),
    });
    if (response.status === 503) return { mode: "local", state: null, version: 0 };
    if (!response.ok) throw new Error(`Sync push failed with ${response.status}`);
    return response.json() as Promise<SyncResponse>;
}
