import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import {
    AccountConflictError,
    authenticateAccount,
    databaseConfigured,
    readAccount,
    registerAccount,
} from "@/lib/server-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OWNER_COOKIE = "echoe-owner";
const HANDLE_PATTERN = /^[a-z0-9][a-z0-9_-]{2,23}$/;

const getOwner = async () => {
    const jar = await cookies();
    const existing = jar.get(OWNER_COOKIE)?.value;
    const valid = existing && /^[0-9a-f-]{36}$/i.test(existing);
    return { ownerId: valid ? existing : randomUUID(), isNew: !valid };
};

const cookieValue = (ownerId: string, maxAge = 31_536_000) =>
    `${OWNER_COOKIE}=${ownerId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;

const withOwnerCookie = (response: Response, ownerId: string, shouldSet: boolean) => {
    if (shouldSet) response.headers.append("Set-Cookie", cookieValue(ownerId));
    return response;
};

const sameOrigin = async (request: Request) => {
    const origin = request.headers.get("origin");
    if (!origin) return true;
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    return Boolean(host && new URL(origin).host === host);
};

const normalizedHandle = (value: unknown) => String(value ?? "").trim().toLowerCase();

export async function GET() {
    if (!databaseConfigured()) return Response.json({ mode: "local", account: null }, { status: 503 });
    const { ownerId, isNew } = await getOwner();
    const account = await readAccount(ownerId);
    return withOwnerCookie(Response.json({ mode: "cloud", account }), ownerId, isNew);
}

export async function POST(request: Request) {
    if (!databaseConfigured()) return Response.json({ mode: "local", account: null }, { status: 503 });
    if (!(await sameOrigin(request))) return Response.json({ error: "Origin not allowed" }, { status: 403 });

    let payload: Record<string, unknown>;
    try {
        payload = await request.json() as Record<string, unknown>;
    } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (payload.action === "sign-out") {
        const response = Response.json({ mode: "cloud", account: null });
        response.headers.append("Set-Cookie", cookieValue("", 0));
        return response;
    }

    const handle = normalizedHandle(payload.handle);
    const password = String(payload.password ?? "");
    if (!HANDLE_PATTERN.test(handle)) {
        return Response.json({ error: "Use 3-24 lowercase letters, numbers, hyphens, or underscores." }, { status: 400 });
    }
    if (password.length < 8 || password.length > 128) {
        return Response.json({ error: "Use a password between 8 and 128 characters." }, { status: 400 });
    }

    if (payload.action === "sign-in") {
        const account = await authenticateAccount(handle, password);
        if (!account) return Response.json({ error: "That handle or password did not match." }, { status: 401 });
        const { ownerId, ...summary } = account;
        return withOwnerCookie(Response.json({ mode: "cloud", account: summary }), ownerId, true);
    }

    if (payload.action !== "register") return Response.json({ error: "Unsupported account action" }, { status: 400 });
    const displayName = String(payload.displayName ?? "").trim();
    if (!displayName || displayName.length > 40) {
        return Response.json({ error: "Add the name you want Echoe to use." }, { status: 400 });
    }

    const { ownerId, isNew } = await getOwner();
    try {
        const account = await registerAccount(ownerId, displayName, handle, password);
        return withOwnerCookie(Response.json({ mode: "cloud", account }), ownerId, isNew);
    } catch (error) {
        if (error instanceof AccountConflictError) return Response.json({ error: error.message }, { status: 409 });
        throw error;
    }
}
