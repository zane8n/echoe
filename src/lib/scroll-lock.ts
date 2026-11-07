/**
 * Locks page scrolling while a sheet is open.
 *
 * iOS Safari ignores `overflow: hidden` on <body>, so the page behind a sheet kept scrolling
 * and rubber-banding under the user's finger. Pinning the body with `position: fixed` at the
 * current offset is the reliable lock; the offset is restored on release so the page doesn't
 * jump to the top. Locks nest (a sheet opened from a sheet), and only the last release unpins.
 */
let depth = 0;
let savedY = 0;

export function lockScroll(): () => void {
    if (typeof document === "undefined") return () => {};
    const body = document.body;
    if (depth === 0) {
        savedY = window.scrollY;
        body.style.position = "fixed";
        body.style.top = `-${savedY}px`;
        body.style.left = "0";
        body.style.right = "0";
        body.style.width = "100%";
        body.style.overflow = "hidden";
        body.dataset.scrollLocked = "true";
    }
    depth += 1;
    let released = false;
    return () => {
        if (released) return;
        released = true;
        depth = Math.max(0, depth - 1);
        if (depth > 0) return;
        for (const property of ["position", "top", "left", "right", "width", "overflow"] as const) body.style[property] = "";
        delete body.dataset.scrollLocked;
        window.scrollTo({ top: savedY, behavior: "instant" as ScrollBehavior });
    };
}
