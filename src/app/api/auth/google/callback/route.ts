import { cookies } from "next/headers";
import { connectGoogleAccount, databaseConfigured, type GoogleProfile } from "@/lib/server-db";
import { getOwnerSession, ownerCookieValue } from "@/lib/owner-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo";
const STATE_COOKIE = "echoe-google-state";
const VERIFIER_COOKIE = "echoe-google-verifier";

const expiredCookie = (name: string) =>
    `${name}=; Path=/api/auth/google/callback; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;

const finish = (request: Request, result: string, ownerId?: string) => {
    const response = new Response(null, {
        status: 302,
        headers: { location: new URL(`/?${result}`, request.url).toString() },
    });
    response.headers.append("Set-Cookie", expiredCookie(STATE_COOKIE));
    response.headers.append("Set-Cookie", expiredCookie(VERIFIER_COOKIE));
    if (ownerId) response.headers.append("Set-Cookie", ownerCookieValue(ownerId));
    return response;
};

export async function GET(request: Request) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    if (!databaseConfigured() || !clientId || !clientSecret) return finish(request, "auth=unavailable");

    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const jar = await cookies();
    const expectedState = jar.get(STATE_COOKIE)?.value;
    const verifier = jar.get(VERIFIER_COOKIE)?.value;
    if (!code || !state || !expectedState || state !== expectedState || !verifier || url.searchParams.has("error")) {
        return finish(request, "auth=failed");
    }

    try {
        const redirectUri = new URL("/api/auth/google/callback", request.url).toString();
        const tokenResponse = await fetch(TOKEN_ENDPOINT, {
            method: "POST",
            headers: { "content-type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
                code_verifier: verifier,
            }),
            cache: "no-store",
        });
        if (!tokenResponse.ok) return finish(request, "auth=failed");
        const token = await tokenResponse.json() as { access_token?: string };
        if (!token.access_token) return finish(request, "auth=failed");

        const profileResponse = await fetch(USERINFO_ENDPOINT, {
            headers: { authorization: `Bearer ${token.access_token}` },
            cache: "no-store",
        });
        if (!profileResponse.ok) return finish(request, "auth=failed");
        const profile = await profileResponse.json() as GoogleProfile & { email_verified?: boolean };
        if (!profile.sub || !profile.email || !profile.name || profile.email_verified !== true) {
            return finish(request, "auth=failed");
        }

        const current = await getOwnerSession();
        const connected = await connectGoogleAccount(current.ownerId, profile);
        return finish(
            request,
            connected.switchedOwner ? "account=switched" : "account=connected",
            connected.ownerId,
        );
    } catch {
        return finish(request, "auth=failed");
    }
}
