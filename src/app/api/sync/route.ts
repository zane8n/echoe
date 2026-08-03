import { randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { databaseConfigured, readRemoteState, writeRemoteState } from "@/lib/server-db";
import { isDashboardState } from "@/lib/utils";
import type { AuditAction } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OWNER_COOKIE = "echoe-owner";
const ALLOWED_ACTIONS = new Set<AuditAction>([
    "bootstrap", "create", "edit", "delete", "restore", "check-in",
    "clear-check-in", "settings", "import", "remote-pull",
]);

const getOwner = async () => {
    const jar = await cookies();
    const existing = jar.get(OWNER_COOKIE)?.value;
    return { ownerId: existing && /^[0-9a-f-]{36}$/i.test(existing) ? existing : randomUUID(), isNew: !existing };
};

const withOwnerCookie = (response: Response, ownerId: string, isNew: boolean) => {
    if (isNew) {
        response.headers.append(
            "Set-Cookie",
            `${OWNER_COOKIE}=${ownerId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=31536000${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
        );
    }
    return response;
};

const sameOrigin = async (request: Request) => {
    const origin = request.headers.get("origin");
    if (!origin) return true;
    const requestHeaders = await headers();
    const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
    return Boolean(host && new URL(origin).host === host);
};

export async function GET() {
    if (!databaseConfigured()) {
        return Response.json({ mode: "local", state: null, version: 0 }, { status: 503 });
    }
    const { ownerId, isNew } = await getOwner();
    const record = await readRemoteState(ownerId);
    return withOwnerCookie(Response.json({ mode: "cloud", ...record }), ownerId, isNew);
}

export async function PUT(request: Request) {
    if (!databaseConfigured()) {
        return Response.json({ mode: "local", state: null, version: 0 }, { status: 503 });
    }
    if (!(await sameOrigin(request))) return Response.json({ error: "Origin not allowed" }, { status: 403 });

    let payload: unknown;
    try {
        payload = await request.json();
    } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const candidate = payload as { state?: unknown; action?: AuditAction };
    if (!isDashboardState(candidate.state)) return Response.json({ error: "Invalid Echoe state" }, { status: 400 });
    const action = candidate.action && ALLOWED_ACTIONS.has(candidate.action) ? candidate.action : "edit";

    const { ownerId, isNew } = await getOwner();
    const record = await writeRemoteState(ownerId, candidate.state, action);
    return withOwnerCookie(Response.json({ mode: "cloud", ...record }), ownerId, isNew);
}
