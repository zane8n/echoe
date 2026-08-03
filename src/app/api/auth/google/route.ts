import { createHash, randomBytes } from "node:crypto";
import { databaseConfigured } from "@/lib/server-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const STATE_COOKIE = "echoe-google-state";
const VERIFIER_COOKIE = "echoe-google-verifier";

const oauthCookie = (name: string, value: string) =>
    `${name}=${value}; Path=/api/auth/google/callback; HttpOnly; SameSite=Lax; Max-Age=600${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;

export async function GET(request: Request) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!databaseConfigured() || !clientId || !process.env.GOOGLE_CLIENT_SECRET) {
        return Response.redirect(new URL("/?auth=unavailable", request.url));
    }

    const state = randomBytes(24).toString("base64url");
    const verifier = randomBytes(48).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const redirectUri = new URL("/api/auth/google/callback", request.url).toString();
    const authorizationUrl = new URL(AUTH_ENDPOINT);
    authorizationUrl.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid profile email",
        state,
        code_challenge: challenge,
        code_challenge_method: "S256",
        prompt: "select_account",
    }).toString();

    const response = new Response(null, { status: 302, headers: { location: authorizationUrl.toString() } });
    response.headers.append("Set-Cookie", oauthCookie(STATE_COOKIE, state));
    response.headers.append("Set-Cookie", oauthCookie(VERIFIER_COOKIE, verifier));
    return response;
}
