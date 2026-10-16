"use client";

import { KBD_SHORTCUTS } from "@/lib/constants";
import { Sheet, SheetBody, SheetHeader } from "./sheet";

interface Props {
    open: boolean;
    onClose: () => void;
}

export function KbdModal({ open, onClose }: Props) {
    if (!open) return null;
    return (
        <Sheet onClose={onClose} label="Keyboard shortcuts" size="sm">
            <SheetHeader title="Keyboard shortcuts" closeLabel="Close shortcuts" />
            <SheetBody>
                <ul className="shortcut-list">
                    {KBD_SHORTCUTS.map(({ key, description }) => (
                        <li key={key}><span>{description}</span><kbd>{key}</kbd></li>
                    ))}
                </ul>
            </SheetBody>
        </Sheet>
    );
}
