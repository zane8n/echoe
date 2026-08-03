import type { SVGProps } from "react";

export type IconName =
    | "settings" | "plus" | "download" | "pencil" | "x" | "trash" | "upload"
    | "sparkle" | "flame" | "clock" | "check" | "calendar" | "target"
    | "trending-up" | "layers" | "star" | "more-horiz" | "chevron-right";

const paths: Record<IconName, string> = {
    settings: "M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.16.36.25.75.25 1.15 0 .4.14.8.4 1.1.26.3.64.48 1.04.49H21v4h-.09a1.7 1.7 0 0 0-1.51-.74Z",
    plus: "M12 5v14M5 12h14",
    download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
    pencil: "M12 20h9 M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z",
    x: "M6 6l12 12M18 6 6 18",
    trash: "M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2",
    upload: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M17 8l-5-5-5 5 M12 3v12",
    sparkle: "M12 3l1.5 5.5L19 10l-5.5 1.5L12 17l-1.5-5.5L5 10l5.5-1.5z",
    flame: "M8.5 14.5A2.5 2.5 0 0 0 11 12a2.5 2.5 0 0 0 2.5 2.5A2.5 2.5 0 0 0 16 12c0-2-4-5-4-5s-4 3-4 5a2.5 2.5 0 0 0 .5 2.5z M12 22c4 0 7-3 7-7 0-5-7-11-7-11S5 10 5 15c0 4 3 7 7 7z",
    clock: "M12 6v6l4 2 M22 12A10 10 0 1 1 12 2a10 10 0 0 1 10 10z",
    check: "M20 6 9 17l-5-5",
    calendar: "M8 2v4 M16 2v4 M3 10h18 M21 12V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4 M12 14v6 M9 17h6",
    target: "M12 12m-10 0a10 10 0 1 0 20 0 10 10 0 1 0-20 0 M12 12m-6 0a6 6 0 1 0 12 0 6 6 0 1 0-12 0 M12 12m-2 0a2 2 0 1 0 4 0 2 2 0 1 0-4 0",
    "trending-up": "M22 7l-8 8-4-4-7 7 M16 7h6v6",
    layers: "M2 17l10 5 10-5 M2 12l10 5 10-5 M12 2 2 7l10 5 10-5-10-5z",
    star: "M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.56 5.82 22 7 14.14l-5-4.87 6.91-1.01z",
    "more-horiz": "M5 12h.01M12 12h.01M19 12h.01",
    "chevron-right": "M9 18l6-6-6-6",
};

interface Props extends SVGProps<SVGSVGElement> {
    name: IconName;
    size?: number;
}

export function Icon({ name, size = 18, ...props }: Props) {
    return (
        <svg
            viewBox="0 0 24 24"
            width={size}
            height={size}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            {...props}
        >
            <path d={paths[name]} />
        </svg>
    );
}
