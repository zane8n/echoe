"use client";

import { useMemo, useState } from "react";
import { summarizePath } from "@/lib/path-view";
import type { HabitEntry, MilestoneEvent, SupportStyle } from "@/lib/types";
import { habitInsight, localDate } from "@/lib/utils";
import { BeatStrip } from "./beat-strip";
import { DayEditor } from "./day-editor";
import { HeatCalendar } from "./heat-calendar";
import { Icon } from "./icon";
import { Sheet, SheetBody, SheetHeader } from "./sheet";

interface Props {
    event: MilestoneEvent;
    supportStyle?: SupportStyle;
    onCheckIn: (eventId: string, status: HabitEntry["status"], date: string, note?: string) => void;
    onClear: (eventId: string, date: string) => void;
    onClose: () => void;
}

export function CheckInSheet({ event, supportStyle, onCheckIn, onClear, onClose }: Props) {
    const [selectedDate, setSelectedDate] = useState(localDate());
    const entries = useMemo(() => event.habit?.entries ?? [], [event.habit?.entries]);
    const selectedEntry = entries.find((entry) => entry.date === selectedDate);
    const summary = summarizePath(event);

    return (
        <Sheet onClose={onClose} labelledBy="checkInTitle" hue={event.color}>
            <SheetHeader
                titleId="checkInTitle"
                title={event.name}
                kicker={<><Icon name="calendar" size={15} />History and notes</>}
                description={summary.meta}
                closeLabel="Close check-in history"
            />
            <SheetBody>
                <div className="mb-4 flex justify-end"><BeatStrip entries={entries} days={21} size="md" /></div>
                <HeatCalendar entries={entries} weeks={5} start={event.start} layout="calendar" selected={selectedDate} onSelect={setSelectedDate} label="Habit check-in calendar" />
                <DayEditor
                    key={selectedDate}
                    date={selectedDate}
                    entry={selectedEntry}
                    onSave={(status, note) => onCheckIn(event.id, status, selectedDate, note)}
                    onClear={() => onClear(event.id, selectedDate)}
                />
                <p className="insight-note"><Icon name="sparkle" size={16} />{habitInsight(event, supportStyle)}</p>
            </SheetBody>
        </Sheet>
    );
}
