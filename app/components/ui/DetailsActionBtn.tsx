import { Loader2, LucideIcon } from "lucide-react";

// --- action buttons
const GLASS_TONE = {
	white: "hover:text-white",
	green: "hover:text-emerald-400",
	red: "hover:text-red-400",
} as const;

const GLASS =
	"rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.4)] backdrop-blur-sm transition-[color,background-color] duration-150";

// add/reload
export const glassBtn = ({
	on = false,
	tone = "white",
}: { on?: boolean; tone?: keyof typeof GLASS_TONE } = {}) =>
	`${GLASS} hover:cursor-pointer ${
		on
			? "bg-white/20 text-white"
			: `bg-black/35 text-white/60 hover:bg-black/55 ${GLASS_TONE[tone]}`
	}`;

const GHOST_TONE = {
	emerald: "hover:text-emerald-400",
	blue: "hover:text-blue-400",
	orange: "hover:text-orange-400",
	red: "hover:text-red-400",
	purple: "hover:text-purple-400",
} as const;

type GlassProps = {
	variant?: "glass";
	tone: keyof typeof GLASS_TONE;
	wide?: boolean;
};

type GhostProps = {
	variant: "ghost";
	tone: keyof typeof GHOST_TONE;
	wide?: never;
};

type ActionBtnProps = (GlassProps | GhostProps) & {
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
		? // unseen until hovered
			`rounded-full p-1.5 text-transparent transition-[color,background-color,box-shadow] duration-200 hover:bg-black/55 hover:shadow-[0_2px_8px_rgba(0,0,0,0.4)] hover:backdrop-blur-sm ${GHOST_TONE[rest.tone]} ${
				busy ? "cursor-default" : "hover:cursor-pointer"
			}`
		: `${rest.wide ? "py-1.5 px-5" : "p-1.5"} ${
				busy
					? `${GLASS} cursor-default bg-black/35 text-white/80`
					: glassBtn({ tone: rest.tone })
			}`;
	return (
		<button
			type="button"
			onClick={onClick}
			disabled={busy}
			title={title}
			className={shape}
		>
			{busy ? (
				<Loader2 className={`${size} animate-spin`} />
			) : (
				<Icon className={size} />
			)}
		</button>
	);
}
