import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FriendsView } from "@/components/friends-view";
import { habitMilestone } from "@/test/fixtures";

const social = vi.hoisted(() => ({
    get: vi.fn(),
    create: vi.fn(),
    accept: vi.fn(),
    remove: vi.fn(),
    share: vi.fn(),
    revoke: vi.fn(),
    checkIn: vi.fn(),
}));

vi.mock("@/lib/social-client", () => ({
    getSocialSnapshot: social.get,
    createInvite: social.create,
    acceptInvite: social.accept,
    removeFriend: social.remove,
    sharePath: social.share,
    revokeShare: social.revoke,
    checkInSharedPath: social.checkIn,
}));

const friend = { id: "friend-1", displayName: "Amina", handle: "amina", friendsSince: "2026-08-01T00:00:00.000Z" };
const participant = { id: "share-1", eventId: "remote-1", eventName: "Morning run", eventKind: "habit" as const, color: "teal" as const, role: "guest" as const, mode: "participant" as const, allowExtraCheckIns: false, person: friend, ownerToday: 1, guestToday: 0, ownerTotal: 8, guestTotal: 7, createdAt: "2026-08-02T00:00:00.000Z" };

describe("Friends view", () => {
    beforeEach(() => {
        window.history.replaceState({}, "", "/");
        window.sessionStorage.clear();
        social.get.mockResolvedValue({ mode: "cloud", accountRequired: false, friends: [friend], sharedByMe: [], sharedWithMe: [participant] });
        social.accept.mockResolvedValue({ ok: true });
        social.share.mockResolvedValue({ ok: true });
        social.checkIn.mockResolvedValue({ ok: true, count: 1 });
    });

    it("explains the non-discoverable privacy model and role controls", async () => {
        render(<FriendsView events={[habitMilestone]} onSync={vi.fn()} onOpenSettings={vi.fn()} onToast={vi.fn()} />);
        expect(await screen.findByText(/no directory, suggestions, or searchable profiles/i)).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: /spectator/i })).toHaveAttribute("aria-checked", "true");
        expect(screen.getByRole("radio", { name: /participant/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Check in" })).toBeInTheDocument();
    });

    it("shares a selected path only with an accepted friend", async () => {
        const user = userEvent.setup();
        render(<FriendsView events={[habitMilestone]} onSync={vi.fn()} onOpenSettings={vi.fn()} onToast={vi.fn()} />);
        await screen.findByText("Your private circle");
        await user.click(screen.getByRole("radio", { name: /participant/i }));
        await user.click(screen.getByRole("button", { name: "Share privately" }));
        expect(social.share).toHaveBeenCalledWith("friend-1", "habit-1", "participant");
    });

    it("requires explicit consent before accepting an invite link", async () => {
        const user = userEvent.setup();
        window.history.replaceState({}, "", "/?friend_invite=private_invite_token_1234567890");
        render(<FriendsView events={[habitMilestone]} onSync={vi.fn()} onOpenSettings={vi.fn()} onToast={vi.fn()} />);
        const accept = await screen.findByRole("button", { name: /accept/i });
        expect(social.accept).not.toHaveBeenCalled();
        await user.click(accept);
        expect(social.accept).toHaveBeenCalledWith("private_invite_token_1234567890");
    });
});
