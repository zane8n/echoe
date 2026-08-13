import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FriendsView } from "@/components/friends-view";
import type { SocialSnapshot } from "@/lib/types";
import { habitMilestone } from "@/test/fixtures";

const social = vi.hoisted(() => ({
    create: vi.fn(),
    accept: vi.fn(),
    remove: vi.fn(),
    share: vi.fn(),
    revoke: vi.fn(),
    checkIn: vi.fn(),
    peek: vi.fn().mockResolvedValue({ tasks: [] }),
}));

vi.mock("@/lib/social-client", () => ({
    createInvite: social.create,
    acceptInvite: social.accept,
    removeFriend: social.remove,
    sharePath: social.share,
    revokeShare: social.revoke,
    checkInSharedPath: social.checkIn,
    peekFriendDay: social.peek,
}));

const friend = { id: "friend-1", displayName: "Amina", handle: "amina", friendsSince: "2026-08-01T00:00:00.000Z" };
const participant = { id: "share-1", eventId: "remote-1", eventName: "Morning run", eventKind: "habit" as const, color: "teal" as const, role: "guest" as const, mode: "participant" as const, allowExtraCheckIns: false, person: friend, ownerToday: 1, guestToday: 0, ownerTotal: 8, guestTotal: 7, target: "2026-09-01", createdAt: "2026-08-02T00:00:00.000Z" };
const snapshot: SocialSnapshot = { mode: "cloud", accountRequired: false, friends: [friend], sharedByMe: [], sharedWithMe: [participant], recentCheers: [] };

const renderView = (overrides: Partial<Parameters<typeof FriendsView>[0]> = {}) => render(
    <FriendsView
        events={[habitMilestone]}
        social={snapshot}
        socialLoading={false}
        onRefreshSocial={vi.fn()}
        onCheer={vi.fn()}
        onSync={vi.fn()}
        onOpenSettings={vi.fn()}
        onToast={vi.fn()}
        onUpdateEvent={vi.fn()}
        {...overrides}
    />,
);

describe("Friends view", () => {
    beforeEach(() => {
        window.history.replaceState({}, "", "/");
        window.sessionStorage.clear();
        social.accept.mockResolvedValue({ ok: true });
        social.share.mockResolvedValue({ ok: true });
        social.checkIn.mockResolvedValue({ ok: true, count: 1 });
    });

    it("explains the non-discoverable privacy model and role controls", async () => {
        renderView();
        expect(await screen.findByText(/no directory, suggestions, or searchable profiles/i)).toBeInTheDocument();
        expect(screen.getByRole("radio", { name: /spectator/i })).toHaveAttribute("aria-checked", "true");
        expect(screen.getByRole("radio", { name: /participant/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Check in" })).toBeInTheDocument();
    });

    it("shares a selected path only with an accepted friend", async () => {
        const user = userEvent.setup();
        renderView();
        await screen.findByText("Your private circle");
        await user.click(screen.getByRole("radio", { name: /participant/i }));
        await user.click(screen.getByRole("button", { name: "Share privately" }));
        expect(social.share).toHaveBeenCalledWith("friend-1", "habit-1", "participant");
    });

    it("requires explicit consent before accepting an invite link", async () => {
        const user = userEvent.setup();
        window.history.replaceState({}, "", "/?friend_invite=private_invite_token_1234567890");
        renderView();
        const accept = await screen.findByRole("button", { name: /accept/i });
        expect(social.accept).not.toHaveBeenCalled();
        await user.click(accept);
        expect(social.accept).toHaveBeenCalledWith("private_invite_token_1234567890");
    });

    it("shows co-encouragement progress and a cheer action for a shared participant path", async () => {
        const onCheer = vi.fn().mockResolvedValue(undefined);
        renderView({ onCheer });
        const user = userEvent.setup();
        expect(await screen.findByText(/already checked in — your turn/i)).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: /cheer amina on/i }));
        expect(onCheer).toHaveBeenCalledWith("share-1");
    });
});
