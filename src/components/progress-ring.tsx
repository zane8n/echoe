interface Props {
    percent: number;
    size?: number;
    strokeWidth?: number;
    color: string;
    trackColor?: string;
    children?: React.ReactNode;
}

export function ProgressRing({ percent, size = 64, strokeWidth = 5, color, trackColor = "var(--color-line)", children }: Props) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const clamped = Math.max(0, Math.min(100, percent));
    const offset = circumference * (1 - clamped / 100);
    return (
        <div className="progress-ring" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
                <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    transform={`rotate(-90 ${size / 2} ${size / 2})`}
                    className="progress-ring-arc"
                />
            </svg>
            {children && <div className="progress-ring-content">{children}</div>}
        </div>
    );
}
