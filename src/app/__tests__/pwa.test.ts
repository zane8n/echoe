import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Echoe mobile web app shell", () => {
    it("ships an installable, portrait-first iOS-compatible manifest", () => {
        const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
        expect(manifest).toMatchObject({ id: "/", scope: "/", display: "standalone", orientation: "portrait-primary" });
        expect(manifest.icons).toEqual(expect.arrayContaining([expect.objectContaining({ src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" })]));
        expect(manifest.shortcuts).toEqual(expect.arrayContaining([expect.objectContaining({ url: "/?action=add" })]));
    });

    it("keeps the offline shell and iPhone safe-area navigation available", () => {
        const serviceWorker = readFileSync("public/sw.js", "utf8");
        const css = readFileSync("src/app/globals.css", "utf8");
        const app = readFileSync("src/app/page.tsx", "utf8");
        expect(serviceWorker).toContain('"/apple-touch-icon.png"');
        expect(serviceWorker).toContain("request.mode === \"navigate\"");
        expect(css).toContain("env(safe-area-inset-bottom)");
        expect(css).toContain(".mobile-nav");
        expect(css).toContain(".sheet-surface");
        expect(app).toContain("setAppBadge");
    });
});
