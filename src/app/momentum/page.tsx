"use client";

import { Icon } from "@/components/icon";
import { MomentumOverview } from "@/components/momentum-overview";
import { TimeSection } from "@/components/time-section";
import { WeeksGrid } from "@/components/weeks-grid";
import { useDashboard } from "../providers/dashboard-provider";

export default function MomentumPage() {
    const { state, tick, openComposer } = useDashboard();

    return (
        <main className="page momentum">
            {state.events.length > 0 ? (
                <>
                    <MomentumOverview events={state.events} achievements={state.achievements} tick={tick} />
                    <WeeksGrid events={state.events} show={state.settings.showActivityHistogram} tick={tick} />
                </>
            ) : (
                <>
                    <header className="page-head"><div><h1>Momentum</h1><p>Your rhythm, read back to you.</p></div></header>
                    <div className="group empty-state">
                        <Icon name="trending-up" size={24} />
                        <h2>Momentum gathers here</h2>
                        <p>It grows from real check-ins and project updates. Add a path and this page starts to fill in.</p>
                        <button type="button" className="btn btn-primary mt-3" onClick={() => openComposer()}><Icon name="plus" size={17} />Add a path</button>
                    </div>
                </>
            )}
            <TimeSection tick={tick} />
        </main>
    );
}
