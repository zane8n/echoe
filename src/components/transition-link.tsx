"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useNavigation, type NavDirection } from "@/app/providers/navigation-provider";

type Props = Omit<ComponentProps<typeof Link>, "href"> & { href: string; direction?: NavDirection };

/** A Link that animates between pages with a view transition when the browser supports it. */
export function TransitionLink({ href, direction, onClick, ...props }: Props) {
    const navigation = useNavigation();
    return (
        <Link
            href={href}
            onClick={(event) => {
                onClick?.(event);
                if (!navigation || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                navigation.navigate(href, direction);
            }}
            {...props}
        />
    );
}
