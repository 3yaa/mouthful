import { useMemo, useRef, useState } from "react";
import { statusLabel } from "@/utils/formattingUtils";

const statusColors: Record<string, { bg: string; shadow: string }> = {
	Watching: {
		bg: "linear-gradient(180deg, color-mix(in srgb, var(--color-rose-dusk) 52%, transparent) 0%, color-mix(in srgb, var(--color-rose-dusk) 42%, transparent) 100%)",
		shadow: "inset 0 1px 0 color-mix(in srgb, var(--color-rose-dusk-lit) 9%, transparent), inset 0 -1px 0 rgba(0,0,0,0.14)",
	},
	Reading: {
		bg: "linear-gradient(180deg, color-mix(in srgb, var(--color-rose-dusk) 52%, transparent) 0%, color-mix(in srgb, var(--color-rose-dusk) 42%, transparent) 100%)",
		shadow: "inset 0 1px 0 color-mix(in srgb, var(--color-rose-dusk-lit) 9%, transparent), inset 0 -1px 0 rgba(0,0,0,0.14)",
	},
	"Want to Watch": {
		bg: "linear-gradient(180deg, rgba(37, 99, 235, 0.45) 0%, rgba(37, 99, 235, 0.37) 100%)",
		shadow: "inset 0 1px 0 rgba(96, 165, 250, 0.05), inset 0 -1px 0 rgba(0,0,0,0.14)",
	},
	"Want to Read": {
		bg: "linear-gradient(180deg, rgba(37, 99, 235, 0.37) 0%, rgba(37, 99, 235, 0.30) 100%)",
		shadow: "inset 0 1px 0 rgba(96, 165, 250, 0.05), inset 0 -1px 0 rgba(0,0,0,0.14)",
	},
	Playing: {
		bg: "linear-gradient(180deg, rgba(37, 99, 235, 0.37) 0%, rgba(37, 99, 235, 0.30) 100%)",
		shadow: "inset 0 1px 0 rgba(96, 165, 250, 0.05), inset 0 -1px 0 rgba(0,0,0,0.14)",
	},
	Completed: {
		bg: "linear-gradient(180deg, rgba(16, 185, 129, 0.37) 0%, rgba(16, 185, 129, 0.30) 100%)",
		shadow: "inset 0 1px 0 rgba(52, 211, 153, 0.05), inset 0 -1px 0 rgba(0,0,0,0.14)",
	},
	Dropped: {
		bg: "linear-gradient(180deg, rgba(239, 68, 68, 0.28) 0%, rgba(239, 68, 68, 0.21) 100%)",
		shadow: "inset 0 1px 0 rgba(252, 129, 129, 0.03), inset 0 -1px 0 rgba(0,0,0,0.14)",
	},
};

const defaultColor = {
	bg: "linear-gradient(180deg, rgba(82, 82, 91, 0.28) 0%, rgba(82, 82, 91, 0.21) 100%)",
	shadow: "inset 0 1px 0 rgba(255,255,255,0.02), inset 0 -1px 0 rgba(0,0,0,0.14)",
};

const TRACK_LIP = [
	"inset 0 1px 2px rgba(0,0,0,0.55)",
	"inset 0 -1px 0 rgba(255,255,255,0.05)",
	"inset 1px 0 0 rgba(0,0,0,0.35)",
	"inset -1px 0 0 rgba(0,0,0,0.35)",
].join(", ");

const statusOrder = [
	"Watching",
	"Reading",
	"Want to Watch",
	"Want to Read",
	"Playing",
	"Completed",
	"Dropped",
];

const ENTER_DELAY = 100; // ms debounce before showing hover label
const LEAVE_DELAY = 30; // ms grace period for crossing between segments

export function StatsBar({
	data,
	avgScore,
}: {
	data: Record<string, number>;
	avgScore?: number;
}) {
	const [hoveredStatus, setHoveredStatus] = useState<string | null>(null);
	// the last band hovered, which the label keeps reading while it fades back out
	const shown = useRef<string | null>(null);
	if (hoveredStatus) shown.current = hoveredStatus;
	const shownStatus = shown.current;
	const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleEnter = (status: string) => {
		if (leaveTimer.current) {
			clearTimeout(leaveTimer.current);
			leaveTimer.current = null;
		}
		if (enterTimer.current) {
			clearTimeout(enterTimer.current);
		}
		// if already hovering a segment, switch immediately
		if (hoveredStatus) {
			setHoveredStatus(status);
			enterTimer.current = null;
		} else {
			enterTimer.current = setTimeout(() => {
				setHoveredStatus(status);
				enterTimer.current = null;
			}, ENTER_DELAY);
		}
	};

	const handleLeave = () => {
		if (enterTimer.current) {
			clearTimeout(enterTimer.current);
			enterTimer.current = null;
		}
		leaveTimer.current = setTimeout(() => {
			setHoveredStatus(null);
			leaveTimer.current = null;
		}, LEAVE_DELAY);
	};

	const { entries, total } = useMemo(() => {
		const entries = Object.entries(data).sort(
			(a, b) =>
				(statusOrder.indexOf(a[0]) === -1
					? 99
					: statusOrder.indexOf(a[0])) -
				(statusOrder.indexOf(b[0]) === -1
					? 99
					: statusOrder.indexOf(b[0])),
		);
		const total = entries.reduce((sum, [, count]) => sum + count, 0);
		return { entries, total };
	}, [data]);

	if (total === 0) return null;

	return (
		<div className="w-full space-y-2 select-none">
			{/* HOW MANY | HOW GOOD  */}
			<div className="relative h-4 text-[0.9375rem]">
				<div
					className={`absolute inset-0 flex items-center justify-between transition-[opacity,transform] duration-200 ease-out ${
						hoveredStatus
							? "-translate-y-0.5 opacity-0"
							: "translate-y-0 opacity-100"
					}`}
				>
					<span className="pl-0.5 text-zinc-400">
						<span className="font-medium">Total: </span>
						<span className="font-bold text-zinc-300/85 tabular-nums">
							{total}
						</span>
					</span>
					{avgScore != null && (
						<span className="pr-1 font-bold text-zinc-300/85 tabular-nums">
							{avgScore.toFixed(1)}
						</span>
					)}
				</div>
				<div
					className={`absolute inset-0 flex items-center justify-center font-bold text-zinc-400 transition-[opacity,transform] duration-200 ease-out ${
						hoveredStatus
							? "translate-y-0 opacity-100"
							: "translate-y-0.5 opacity-0"
					}`}
				>
					{/* the label outlives the hover by one fade */}
					{shownStatus && (
						<span>
							{statusLabel(shownStatus)}: {data[shownStatus]}
						</span>
					)}
				</div>
			</div>
			{/* THE SPLIT */}
			<div className="relative flex h-5.5 w-full overflow-hidden rounded-md neu-carved">
				{entries.map(([status, count], i) => {
					const pct = (count / total) * 100;
					if (pct === 0) return null;
					const color = statusColors[status] ?? defaultColor;
					const isRead = hoveredStatus === status;
					return (
						<div
							key={status}
							className="h-full transition-[opacity,filter] duration-200 ease-out"
							style={{
								width: `${pct}%`,
								background: color.bg,
								boxShadow: color.shadow,
								opacity: hoveredStatus && !isRead ? 0.4 : 1,
								filter: isRead ? "brightness(1.2)" : undefined,
								borderRight:
									i === entries.length - 1
										? undefined
										: "1.5px solid rgba(0, 0, 0, 0.6)",
							}}
							onMouseEnter={() => handleEnter(status)}
							onMouseLeave={handleLeave}
						/>
					);
				})}
				<span
					aria-hidden
					className="pointer-events-none absolute inset-0 rounded-md"
					style={{ boxShadow: TRACK_LIP }}
				/>
			</div>
		</div>
	);
}
