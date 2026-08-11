"use client";

import { useDashboard } from "@/app/providers/dashboard-provider";
import { Icon } from "./icon";

export function QuickStart() {
    const { openQuickStart } = useDashboard();

    return (
        <div className="quick-start">
            <button type="button" className="secondary-button" onClick={() => openQuickStart("habit", "daily")}><Icon name="flame" size={14} /> Daily habit</button>
            <button type="button" className="secondary-button" onClick={() => openQuickStart("habit", "weekly")}><Icon name="flame" size={14} /> Weekly habit</button>
            <button type="button" className="secondary-button" onClick={() => openQuickStart("project")}><Icon name="target" size={14} /> Project</button>
        </div>
    );
}
