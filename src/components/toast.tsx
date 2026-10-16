"use client";

import type { ToastState } from "@/app/providers/dashboard-provider";

interface Props {
    toast: ToastState | null;
    onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: Props) {
    return (
        <div className="toast-region" aria-live="polite">
            {toast && (
                <div key={toast.id} className="toast" role="status" aria-atomic="true">
                    <span>{toast.message}</span>
                    {toast.action && (
                        <button type="button" onClick={() => { const run = toast.action!.run; onDismiss(); run(); }}>
                            {toast.action.label}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
