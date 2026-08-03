import type { AccountSummary } from "./types";

interface AccountResponse {
    mode: "local" | "cloud";
    account: AccountSummary | null;
    error?: string;
}

const readResponse = async (response: Response): Promise<AccountResponse> => {
    const payload = await response.json() as AccountResponse;
    if (!response.ok && response.status !== 503) throw new Error(payload.error || "Account request failed.");
    return response.status === 503 ? { mode: "local", account: null } : payload;
};

export const getAccount = async (): Promise<AccountResponse> =>
    readResponse(await fetch("/api/account", { cache: "no-store", credentials: "same-origin" }));

export const registerAccount = async (displayName: string, handle: string, password: string): Promise<AccountResponse> =>
    readResponse(await fetch("/api/account", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "register", displayName, handle, password }),
    }));

export const signIn = async (handle: string, password: string): Promise<AccountResponse> =>
    readResponse(await fetch("/api/account", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "sign-in", handle, password }),
    }));

export const signOut = async (): Promise<void> => {
    await readResponse(await fetch("/api/account", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "sign-out" }),
    }));
};
