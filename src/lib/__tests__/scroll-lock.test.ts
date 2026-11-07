import { afterEach, describe, expect, it, vi } from "vitest";
import { lockScroll } from "@/lib/scroll-lock";

describe("lockScroll", () => {
    afterEach(() => vi.restoreAllMocks());

    it("pins the body at the current offset and restores it on release", () => {
        Object.defineProperty(window, "scrollY", { value: 240, configurable: true });
        const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
        const release = lockScroll();
        expect(document.body.style.position).toBe("fixed");
        expect(document.body.style.top).toBe("-240px");
        release();
        expect(document.body.style.position).toBe("");
        expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 240 }));
    });

    it("stays locked until the last nested sheet closes, and ignores double releases", () => {
        vi.spyOn(window, "scrollTo").mockImplementation(() => {});
        const outer = lockScroll();
        const inner = lockScroll();
        inner();
        inner();
        expect(document.body.style.position).toBe("fixed");
        outer();
        expect(document.body.style.position).toBe("");
    });
});
