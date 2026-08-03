import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";

export const OWNER_COOKIE = "echoe-owner";

const validOwnerId = (value?: string) => Boolean(value && /^[0-9a-f-]{36}$/i.test(value));

export const ownerCookieValue = (ownerId: string, maxAge = 31_536_000) =>
    `${OWNER_COOKIE}=${ownerId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;

export const getOwnerSession = async () => {
    const jar = await cookies();
    const existing = jar.get(OWNER_COOKIE)?.value;
    return {
        ownerId: validOwnerId(existing) ? existing as string : randomUUID(),
        isNew: !validOwnerId(existing),
    };
};

export const withOwnerCookie = (response: Response, ownerId: string, shouldSet: boolean) => {
    if (shouldSet) response.headers.append("Set-Cookie", ownerCookieValue(ownerId));
    return response;
};
