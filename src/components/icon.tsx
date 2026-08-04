import type { ComponentProps } from "react";
import {
    CalendarDays,
    Bell,
    Check,
    ChevronRight,
    CircleX,
    Clock3,
    Cloud,
    CloudOff,
    Database,
    Download,
    Flower2,
    Flame,
    History,
    Leaf,
    Layers3,
    MoreHorizontal,
    Mountain,
    Palette,
    Pencil,
    Plus,
    RefreshCw,
    LogIn,
    Settings,
    Sparkles,
    Star,
    Snowflake,
    SunMedium,
    Target,
    Trash2,
    TrendingUp,
    Upload,
    UserRound,
    Waves,
    X,
    type LucideIcon,
} from "lucide-react";

export type IconName =
    | "settings" | "plus" | "download" | "pencil" | "x" | "trash" | "upload"
    | "sparkle" | "flame" | "clock" | "check" | "calendar" | "target"
    | "trending-up" | "layers" | "star" | "more-horiz" | "chevron-right"
    | "database" | "cloud" | "cloud-off" | "history" | "refresh" | "missed"
    | "flower" | "leaf" | "mountain" | "palette" | "snowflake" | "sun"
    | "user" | "waves" | "log-in" | "bell";

const icons: Record<IconName, LucideIcon> = {
    settings: Settings,
    plus: Plus,
    download: Download,
    pencil: Pencil,
    x: X,
    trash: Trash2,
    upload: Upload,
    sparkle: Sparkles,
    flame: Flame,
    clock: Clock3,
    check: Check,
    calendar: CalendarDays,
    target: Target,
    "trending-up": TrendingUp,
    layers: Layers3,
    star: Star,
    "more-horiz": MoreHorizontal,
    "chevron-right": ChevronRight,
    database: Database,
    cloud: Cloud,
    "cloud-off": CloudOff,
    history: History,
    refresh: RefreshCw,
    missed: CircleX,
    flower: Flower2,
    leaf: Leaf,
    mountain: Mountain,
    palette: Palette,
    snowflake: Snowflake,
    sun: SunMedium,
    user: UserRound,
    waves: Waves,
    "log-in": LogIn,
    bell: Bell,
};

interface Props extends Omit<ComponentProps<LucideIcon>, "ref"> {
    name: IconName;
    size?: number;
}

export function Icon({ name, size = 18, strokeWidth = 1.8, ...props }: Props) {
    const Component = icons[name];
    return <Component aria-hidden="true" size={size} strokeWidth={strokeWidth} {...props} />;
}
