import { Loader2, LucideIcon } from "lucide-react";

// --- action buttons
const SOLID_TONE = {
	green: "hover:bg-green-600/20 hover:text-green-500",
	blue: "hover:bg-blue-600/20 hover:text-blue-400",
	red: "hover:bg-red-600/50 hover:text-red-300",
	purple: "hover:bg-purple-600/25 hover:text-purple-400",
} as const;

const GHOST_TONE = {
	emerald: "hover:bg-emerald-800/20 hover:text-emerald-400",
	blue: "hover:bg-blue-800/20 hover:text-blue-400",
	orange: "hover:bg-orange-700/20 hover:text-orange-400",
	red: "hover:bg-red-700/20 hover:text-red-500",
	purple: "hover:bg-purple-800/20 hover:text-purple-400",
} as const;

type SolidProps = {
	variant?: "solid";
	tone: keyof typeof SOLID_TONE;
	// the pills padding
	pad?: "p-1.5" | "p-1.5 px-2.5" | "py-1.5 px-2" | "py-1.5 px-5";
};

type GhostProps = {
	variant: "ghost";
	tone: keyof typeof GHOST_TONE;
	pad?: never;
};

type ActionBtnProps = (SolidProps | GhostProps) & {
	icon: LucideIcon;
	onClick: () => void;
	title: string;
	busy?: boolean;
};

export function ActionBtn({
	icon: Icon,
	onClick,
	title,
	busy = false,
	...rest
}: ActionBtnProps) {
	const ghost = rest.variant === "ghost";
	const size = ghost ? "w-4 h-4" : "w-5 h-5";
	const shape = ghost
		? `p-1.5 duration-200 bg-zinc-800/0 text-black/0 ${GHOST_TONE[rest.tone]}`
		: `${rest.pad ?? "p-1.5"} bg-zinc-800/50 ${
				busy ? "text-gray-300" : "text-gray-400"
			} ${busy ? "" : SOLID_TONE[rest.tone]}`;
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={busy}
			title={title}
			className={`rounded-lg transition-all ${
				busy ? "cursor-default" : "hover:cursor-pointer"
			} ${shape}`}
		>
			{busy ? (
				<Loader2 className={`${size} animate-spin`} />
			) : (
				<Icon className={size} />
			)}
		</button>
	);
}
