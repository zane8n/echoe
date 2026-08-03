"use client";

import { useState, useEffect } from "react";

export function SwUpdate() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (!("serviceWorker" in navigator)) return;

        navigator.serviceWorker.register("/sw.js").then((reg) => {
            reg.addEventListener("updatefound", () => {
                const newWorker = reg.installing;
                if (!newWorker) return;
                newWorker.addEventListener("statechange", () => {
                    if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                        setShow(true);
                    }
                });
            });
        }).catch(() => { });
    }, []);

    if (!show) return null;

    return (
        <div className="fixed z-85 bottom-5 right-5 flex items-center gap-[14px] px-[18px] py-3 border border-[var(--color-line)] rounded-[16px] text-[13px] font-medium animate-slide-up"
            style={{ background: "var(--color-canvas-solid)", boxShadow: "0 24px 70px rgba(54,50,42,0.08)" }}>
            <span>Update available</span>
            <button
                onClick={() => {
                    setShow(false);
                    navigator.serviceWorker.getRegistration().then((reg) => {
                        reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
                    });
                    window.location.reload();
                }}
                className="min-h-[40px] inline-flex items-center gap-2 px-[13px] rounded-[10px] border border-[var(--color-accent)] bg-[var(--color-accent)] text-white font-semibold text-sm cursor-pointer hover:brightness-105 active:brightness-95 transition-all duration-200 shadow-[0_2px_12px_rgba(240,160,75,0.28)]"
            >
                Refresh
            </button>
        </div>
    );
}
