"use client";

import { Icon, type IconName } from "./icon";

interface Option<T extends string> { value: T; label: string; icon?: IconName; controls?: string }

interface Props<T extends string> {
    label: string;
    value: T;
    onChange: (value: T) => void;
    options: Array<Option<T>>;
    /** radiogroup for a choice, tablist when it switches panels. */
    role?: "radiogroup" | "tablist";
    className?: string;
}

/** A segmented control whose thumb slides to the chosen option. */
export function Segmented<T extends string>({ label, value, onChange, options, role = "radiogroup", className = "" }: Props<T>) {
    const index = Math.max(0, options.findIndex((option) => option.value === value));
    const tabs = role === "tablist";
    return (
        <div className={`seg ${className}`} role={role} aria-label={label} style={{ "--count": options.length, "--index": index } as React.CSSProperties}>
            <span className="seg-thumb" aria-hidden="true" />
            {options.map((option) => {
                const selected = option.value === value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        role={tabs ? "tab" : "radio"}
                        aria-selected={tabs ? selected : undefined}
                        aria-checked={tabs ? undefined : selected}
                        aria-controls={option.controls}
                        onClick={() => onChange(option.value)}
                    >
                        {option.icon && <Icon name={option.icon} size={15} />}
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
}
