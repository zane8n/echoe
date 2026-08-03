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
        <div className="fixed bottom-5 right-5 z-85 flex items-center gap-[14px] rounded-[8px] border border-[var(--color-line)] bg-[var(--color-panel-strong)] px-[18px] py-3 text-[13px] font-medium shadow-lg backdrop-blur-xl animate-slide-up">
            <span>Update available</span>
            <button
                onClick={() => {
                    setShow(false);
                    navigator.serviceWorker.getRegistration().then((reg) => {
                        reg?.waiting?.postMessage({ type: "SKIP_WAITING" });
                    });
                    window.location.reload();
                }}
                className="primary-button min-h-[40px] px-[13px]"
            >
                Refresh
            </button>
        </div>
    );
}
