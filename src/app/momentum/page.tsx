"use client";

import { Icon } from "@/components/icon";
import { MomentumOverview } from "@/components/momentum-overview";
import { QuickStart } from "@/components/quick-start";
import { WeeksGrid } from "@/components/weeks-grid";
import { useDashboard } from "../providers/dashboard-provider";

export default function MomentumPage() {
    const { state, tick } = useDashboard();

    return (
        <main className="app-page momentum-page relative z-10 mx-auto w-[min(calc(100%-40px),920px)]">
            {state.events.length > 0 && <MomentumOverview events={state.events} achievements={state.achievements} tick={tick} />}
            {state.events.length ? <WeeksGrid events={state.events} show={state.settings.showActivityHistogram} tick={tick} /> : <div className="empty-momentum"><Icon name="trending-up" size={22} /><h1>Momentum will gather here</h1><p>It grows from real check-ins and project updates.</p><QuickStart /></div>}
        </main>
    );
}
