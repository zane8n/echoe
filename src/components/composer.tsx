"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useDashboard, type EditorSeed } from "@/app/providers/dashboard-provider";
import { summarizePath } from "@/lib/path-view";
import { parseQuickInput, type QuickKind, type QuickParse } from "@/lib/quick-parse";
import { addDays, daysUntil, formatDate, localDate } from "@/lib/utils";
import { Icon, type IconName } from "./icon";
import { Sheet, useSheet } from "./sheet";

const KINDS: Array<{ id: QuickKind; label: string; icon: IconName }> = [
    { id: "task", label: "Task", icon: "list-checks" },
    { id: "habit", label: "Habit", icon: "repeat" },
    { id: "project", label: "Project", icon: "target" },
    { id: "countdown", label: "Countdown", icon: "hourglass" },
    { id: "ongoing", label: "Ongoing", icon: "history" },
];

const EXAMPLES = ["Read 20 pages daily", "Run 3x a week", "Dentist tomorrow 9:30", "Lisbon trip Nov 8", "Thesis 40h by Dec 1"];

const shortDate = (date: string) => formatDate(date, { weekday: "short", day: "numeric", month: "short", year: undefined });
const timesAWeek = (count: number) => count === 1 ? "once a week" : count === 2 ? "twice a week" : `${count} times a week`;

function describe(parsed: QuickParse): string {
    const today = localDate();
    switch (parsed.kind) {
        case "task":
            return `A task for ${parsed.date && parsed.date !== today ? shortDate(parsed.date) : "today"}${parsed.time ? ` at ${parsed.time}` : ""}.`;
        case "habit":
            return parsed.frequency === "weekly" ? `A habit, ${timesAWeek(parsed.targetPerPeriod ?? 1)}, starting this week.` : "A daily habit, starting today.";
        case "project": {
            const due = parsed.date ?? localDate(addDays(new Date(), 30));
            return `A project${parsed.plannedHours ? ` with a ${parsed.plannedHours}h budget` : ""}, due ${shortDate(due)}.`;
        }
        case "countdown": {
            if (!parsed.date) return "A countdown to 30 days from now. Add a date like “Nov 8” or “in 3 weeks”.";
            const days = daysUntil(parsed.date);
            return days > 0 ? `Counting down to ${shortDate(parsed.date)}, ${days} day${days === 1 ? "" : "s"} away.` : "Pick a date in the future to count down to.";
        }
        case "ongoing":
            return `Counting up since ${formatDate(parsed.start ?? today)}.`;
    }
}

function primaryLabel(parsed: QuickParse): string {
    if (parsed.kind === "task") return parsed.date && parsed.date !== localDate() ? `Plan for ${shortDate(parsed.date)}` : "Add to today";
    if (parsed.kind === "ongoing") return "Create ongoing path";
    return `Create ${parsed.kind}`;
}

const tokenIcon = (token: string): IconName => /\d:\d|am|pm|^at /i.test(token) ? "clock" : /week|day|daily|every/i.test(token) && !/^\d{4}|in \d|tomorrow|today/i.test(token) ? "repeat" : /\d\s*(h|hours?|hrs?)$/i.test(token) ? "timer" : /since/i.test(token) ? "history" : "calendar";

interface Item { id: string; group: string; label: string; detail?: string; icon: IconName; hue?: string; run: () => void }

export function Composer({ initialText, onClose }: { initialText: string; onClose: () => void }) {
    const inputRef = useRef<HTMLInputElement>(null);
    return (
        <Sheet onClose={onClose} label="Add anything" className="composer" initialFocus={inputRef} focusOnTouch>
            <ComposerBody initialText={initialText} inputRef={inputRef} />
        </Sheet>
    );
}

function ComposerBody({ initialText, inputRef }: { initialText: string; inputRef: React.RefObject<HTMLInputElement | null> }) {
    const { close, dragHandlers } = useSheet();
    const {
        state, createFromQuick, openEventEditor, openQuickStart, navigateTo, openSettings, updateAppearance, handleExport,
        setKeyboardOpen, setNotificationsOpen, toggleToday,
    } = useDashboard();
    const [text, setText] = useState(initialText);
    const [forced, setForced] = useState<QuickKind | null>(null);
    const [active, setActive] = useState(0);
    const listId = useId();
    const dark = typeof document !== "undefined" && document.documentElement.dataset.mode === "dark";

    const parsed = useMemo(() => parseQuickInput(text, new Date(), forced ?? undefined), [text, forced]);
    const query = text.trim().toLowerCase();

    // Keep the composer above the on-screen keyboard on phones.
    useEffect(() => {
        const viewport = window.visualViewport;
        if (!viewport) return;
        const update = () => {
            const keyboard = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
            document.documentElement.style.setProperty("--keyboard", `${keyboard}px`);
        };
        update();
        viewport.addEventListener("resize", update);
        viewport.addEventListener("scroll", update);
        return () => {
            viewport.removeEventListener("resize", update);
            viewport.removeEventListener("scroll", update);
            document.documentElement.style.removeProperty("--keyboard");
        };
    }, []);

    const create = () => {
        if (!parsed.name) return;
        const result = createFromQuick(parsed);
        if (result === "created") close();
    };

    const moreOptions = () => {
        const kind = parsed.kind === "task" ? "habit" : parsed.kind;
        const seed: EditorSeed = { kind, name: parsed.name || undefined, frequency: parsed.frequency, targetPerPeriod: parsed.targetPerPeriod, plannedHours: parsed.plannedHours, target: parsed.kind === "ongoing" ? undefined : parsed.date, start: parsed.start };
        openEventEditor(null, seed);
    };

    const items = useMemo<Item[]>(() => {
        const list: Item[] = [];
        if (parsed.name) {
            list.push({ id: "create", group: "Create", label: `${primaryLabel(parsed)}: ${parsed.name}`, detail: "Enter", icon: KINDS.find((kind) => kind.id === parsed.kind)?.icon ?? "plus", run: create });
        }
        if (query) {
            for (const event of state.events.filter((item) => item.name.toLowerCase().includes(query)).slice(0, 4)) {
                const summary = summarizePath(event);
                if (summary.checkable && !summary.doneToday && !summary.doneForPeriod) {
                    list.push({ id: `check-${event.id}`, group: "Your paths", label: `Check in to ${event.name}`, detail: summary.meta, icon: "check", hue: event.color, run: () => { toggleToday(event.id); close(); } });
                }
                list.push({ id: `open-${event.id}`, group: "Your paths", label: `Open ${event.name}`, detail: summary.kindLabel, icon: "open", hue: event.color, run: () => { close(); navigateTo(`/paths/${event.id}`); } });
            }
        }
        const commands: Item[] = [
            { id: "go-today", group: "Go to", label: "Today", icon: "home", run: () => { close(); navigateTo("/"); } },
            { id: "go-paths", group: "Go to", label: "Paths", icon: "layers", run: () => { close(); navigateTo("/paths"); } },
            { id: "go-momentum", group: "Go to", label: "Momentum", icon: "trending-up", run: () => { close(); navigateTo("/momentum"); } },
            { id: "go-friends", group: "Go to", label: "Friends", icon: "users", run: () => { close(); navigateTo("/friends"); } },
            { id: "new-habit", group: "More", label: "New habit with every option", icon: "repeat", run: () => openQuickStart("habit", "daily") },
            { id: "new-project", group: "More", label: "New project with every option", icon: "target", run: () => openQuickStart("project") },
            { id: "new-countdown", group: "More", label: "New countdown with every option", icon: "hourglass", run: () => openQuickStart("countdown") },
            { id: "notifications", group: "More", label: "Notifications", icon: "bell", run: () => { close(); setNotificationsOpen(true); } },
            { id: "settings", group: "More", label: "Settings", icon: "settings", run: () => { close(); openSettings(); } },
            { id: "theme", group: "More", label: dark ? "Switch to light mode" : "Switch to dark mode", icon: dark ? "sun" : "moon", run: () => { close(); updateAppearance(dark ? "light" : "dark"); } },
            { id: "export", group: "More", label: "Export a backup", icon: "download", run: () => { close(); void handleExport(); } },
            { id: "shortcuts", group: "More", label: "Keyboard shortcuts", icon: "keyboard", run: () => { close(); setKeyboardOpen(() => true); } },
        ];
        const words = query.split(/\s+/).filter(Boolean);
        const matching = query ? commands.filter((command) => words.every((word) => command.label.toLowerCase().includes(word) || command.group.toLowerCase().includes(word))) : commands.filter((command) => command.group === "Go to");
        return [...list, ...matching];
        // create closes over the latest parse; rebuilding on parse/query is enough.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [parsed, query, state.events, dark]);

    const activeIndex = Math.min(active, Math.max(0, items.length - 1));
    const activeItem = items[activeIndex];

    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "ArrowDown") { event.preventDefault(); setActive((activeIndex + 1) % Math.max(1, items.length)); }
        else if (event.key === "ArrowUp") { event.preventDefault(); setActive((activeIndex - 1 + items.length) % Math.max(1, items.length)); }
        else if (event.key === "Enter") {
            event.preventDefault();
            if ((event.metaKey || event.ctrlKey) && parsed.kind !== "task") moreOptions();
            else activeItem?.run();
        }
    };

    const groups = items.reduce<Array<{ name: string; items: Array<Item & { index: number }> }>>((all, item, index) => {
        const group = all.find((entry) => entry.name === item.group);
        if (group) group.items.push({ ...item, index });
        else all.push({ name: item.group, items: [{ ...item, index }] });
        return all;
    }, []);

    return (
        <>
            <div className="sheet-drag composer-top" {...dragHandlers}>
                <span className="sheet-grabber" aria-hidden="true" />
                <div className="composer-input">
                    <Icon name={query ? KINDS.find((kind) => kind.id === parsed.kind)?.icon ?? "plus" : "plus"} size={22} />
                    <input
                        ref={inputRef}
                        value={text}
                        onChange={(event) => { setText(event.target.value); setActive(0); }}
                        onKeyDown={onKeyDown}
                        placeholder="Add a task, habit, or date…"
                        aria-label="What would you like to add?"
                        role="combobox"
                        aria-expanded={items.length > 0}
                        aria-controls={listId}
                        aria-activedescendant={activeItem ? `${listId}-${activeItem.id}` : undefined}
                        autoComplete="off"
                        autoCapitalize="sentences"
                        enterKeyHint="done"
                        maxLength={120}
                    />
                    {text && <button type="button" className="icon-btn icon-btn-sm" aria-label="Clear" onClick={() => { setText(""); setForced(null); inputRef.current?.focus(); }}><Icon name="x" size={16} /></button>}
                </div>
            </div>

            <div className="composer-scroll">
                {parsed.name ? (
                    <div className="composer-understood">
                        <div className="composer-kinds" role="radiogroup" aria-label="Add as">
                            {KINDS.map((kind) => (
                                <button key={kind.id} type="button" role="radio" aria-checked={parsed.kind === kind.id} className="chip" onClick={() => { setForced(kind.id); inputRef.current?.focus(); }}>
                                    <Icon name={kind.icon} size={14} />{kind.label}
                                </button>
                            ))}
                        </div>
                        <p className="composer-preview">
                            {parsed.tokens.map((token) => <span key={token} className="composer-token"><Icon name={tokenIcon(token)} size={13} />{token}</span>)}
                            <span>{describe(parsed)}</span>
                        </p>
                    </div>
                ) : (
                    <div className="composer-examples">
                        <p>Write it the way you&apos;d say it. Echoe picks out the dates, times, and rhythms.</p>
                        <div>{EXAMPLES.map((example) => <button key={example} type="button" className="chip" onClick={() => { setText(example); setForced(null); setActive(0); inputRef.current?.focus(); }}>{example}</button>)}</div>
                    </div>
                )}

                <div id={listId} role="listbox" aria-label="Suggestions" className="composer-list">
                    {groups.map((group) => (
                        <div key={group.name} role="group" aria-label={group.name}>
                            <div className="composer-group" aria-hidden="true">{group.name}</div>
                            {group.items.map((item) => (
                                <div
                                    key={item.id}
                                    id={`${listId}-${item.id}`}
                                    role="option"
                                    aria-selected={item.index === activeIndex}
                                    className="composer-item"
                                    data-hue={item.hue}
                                    onPointerMove={() => { if (item.index !== activeIndex) setActive(item.index); }}
                                    onClick={item.run}
                                >
                                    <span className="composer-item-icon"><Icon name={item.icon} size={17} /></span>
                                    <span className="composer-item-label">{item.label}</span>
                                    {item.detail && <span className="composer-item-detail">{item.index === activeIndex && item.id === "create" ? <kbd><Icon name="enter" size={12} /></kbd> : item.detail}</span>}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>

            {parsed.name && (
                <footer className="sheet-footer composer-footer">
                    {parsed.kind !== "task" ? <button type="button" className="btn btn-ghost" onClick={moreOptions}>More options</button> : <span className="composer-hint">Tip: add “tomorrow” or “at 9” to plan it.</span>}
                    <span className="spacer" />
                    <button type="button" className="btn btn-primary" onClick={create}>{primaryLabel(parsed)}</button>
                </footer>
            )}
        </>
    );
}
