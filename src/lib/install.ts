"use client";

interface InstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

let deferredPrompt: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

const notify = () => listeners.forEach((listener) => listener());

if (typeof window !== "undefined") {
    window.addEventListener("beforeinstallprompt", (event) => {
        event.preventDefault();
        deferredPrompt = event as InstallPromptEvent;
        notify();
    });
    window.addEventListener("appinstalled", () => {
        deferredPrompt = null;
        notify();
    });
}

export const subscribeToInstall = (listener: () => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
};

export const installState = () => {
    if (typeof window === "undefined") return { installed: false, canPrompt: false, isIos: false };
    const installed = window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    return { installed, canPrompt: Boolean(deferredPrompt), isIos };
};

export const requestInstall = async () => {
    if (!deferredPrompt) return false;
    const prompt = deferredPrompt;
    await prompt.prompt();
    const choice = await prompt.userChoice;
    if (choice.outcome === "accepted") deferredPrompt = null;
    notify();
    return choice.outcome === "accepted";
};
