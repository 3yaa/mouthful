"use client";
import { type ReactNode } from "react";
import { Asterisk, Disc, Film, Leaf, Milestone } from "lucide-react";
import { AnimeFormat } from "@/types/show";
import { animeTitleLabel, titleCase } from "@/app/shows/utils/animeTitles";

// ─── words

export const rowName = (
	label: string | null | undefined,
	title: string,
	altTitle?: string | null,
) =>
	animeTitleLabel(label, {
		franchiseTitle: title,
		alternateTitle: altTitle,
		context: "entry",
	}) ?? titleCase(title);

export const kindOf = (format?: AnimeFormat) =>
	(format ?? "OVA").replace(/_/g, " ").toLowerCase();

// what cut is worth

export type Cut = {
	anilistId?: number | null;
	title?: string | null;
	format?: AnimeFormat;
	episode_count?: number | null;
	duration?: number | null;
};

// movie cut
export const runtimeOf = (cut: Cut) =>
	(cut.episode_count ?? 1) * (cut.duration ?? 0);

// an unaired part
export const sized = (slot: Pick<Cut, "episode_count" | "duration">) =>
	!!(slot.episode_count || slot.duration);

// ─── color

const NEUTRAL = "#71717a"; // zinc-500
export const INK = "#a1a1aa"; // zinc-400

export const mix = (hex: string, pct: number, base = "transparent") =>
	`color-mix(in srgb, ${hex} ${pct}%, ${base})`;

// anilist colors run dark against a near-black panel -- white lifts them to where they read
export const colorOf = (hex?: string | null) =>
	`color-mix(in srgb, white 18%, ${hex || NEUTRAL})`;

export type SlotState = "watched" | "current" | "ahead";

// ─── the highlight

export const HIGHLIGHT_X = {
	node: "-left-7",
	branch: "-left-3",
};

export const HIGHLIGHT_SHAPE =
	"absolute inset-y-0 right-0 rounded-l-full rounded-r-lg";

const SUBNODE_HIGHLIGHT_SHAPE = "absolute inset-y-0";

const RIM_FADE = "linear-gradient(to right, #000 0, #000 56%, transparent 92%)";

const SUBNODE_SHAPE_STYLE = {
	right: "0.5rem",
	borderTopLeftRadius: "0.875rem",
	borderBottomLeftRadius: "0.875rem",
	borderTopRightRadius: "0.5rem",
	borderBottomRightRadius: "0.5rem",
	backgroundColor: "rgba(255,255,255,0.006)",
} as const;

//

const restFill = (color: string, side = false) =>
	side
		? `linear-gradient(to left, ${mix(color, 4)}, ${mix(color, 1.4)} 55%, transparent 92%), linear-gradient(to left, rgba(255,255,255,0.018), rgba(255,255,255,0.007) 50%, transparent)`
		: `linear-gradient(to right, ${mix(color, 5.5)}, ${mix(color, 1.8)} 55%, transparent 92%), linear-gradient(to right, rgba(255,255,255,0.028), rgba(255,255,255,0.012) 50%, transparent)`;

export const hoverFill = (color: string) =>
	`linear-gradient(100deg, ${mix(color, 15)}, ${mix(color, 5)} 62%, transparent 93%), linear-gradient(to right, rgba(255,255,255,0.035) 48%, transparent 96%)`;

const currentFill = (color: string) =>
	`linear-gradient(100deg, ${mix(color, 24)}, ${mix(color, 10)} 55%, transparent 94%), linear-gradient(to right, rgba(255,255,255,0.055) 46%, transparent 97%)`;

// browsing, not standing
const viewFill = () =>
	"linear-gradient(260deg, rgba(255,255,255,0.11), rgba(255,255,255,0.042) 55%, rgba(255,255,255,0.018) 100%), linear-gradient(to left, rgba(255,255,255,0.05) 40%, rgba(255,255,255,0.022) 100%)";

// the show's own color
export const cursorBlade = (accent: string) => mix(accent, 90);

// the resting tint
export function RowWash({
	side,
	x,
	color,
	railColor,
	current,
	browsing,
}: {
	side: boolean;
	// which gutter the cap reaches into
	x: string;
	color: string;
	railColor: string;
	current: boolean;
	browsing: boolean;
}) {
	const shape = `pointer-events-none ${side ? SUBNODE_HIGHLIGHT_SHAPE : HIGHLIGHT_SHAPE} ${x}`;
	const box = side ? SUBNODE_SHAPE_STYLE : {};
	return (
		<>
			<span
				aria-hidden
				className={shape}
				style={{ ...box, backgroundImage: restFill(railColor, side) }}
			/>
			{current || browsing ? (
				<span
					key="mark"
					aria-hidden
					className={shape}
					style={{
						...box,
						background: current ? currentFill(color) : viewFill(),
						...(current
							? {
									border: `1px solid ${mix(color, 32)}`,
									maskImage: RIM_FADE,
									WebkitMaskImage: RIM_FADE,
								}
							: {}),
					}}
				/>
			) : (
				<span
					key="hover"
					aria-hidden
					className={`${shape} opacity-0 transition-opacity duration-300 group-hover:opacity-100`}
					style={{ ...box, background: hoverFill(color) }}
				/>
			)}
		</>
	);
}

// ─── thread

const branchTint = (lit: string | null) => lit ?? "rgba(255,255,255,0.16)";

const BRANCH_TOP = "-top-[0.4375rem]";
const BRANCH_RUN = "h-[1.4375rem]";

export const branchElbow = (x: string, lit: string | null) => (
	<span
		aria-hidden
		className={`pointer-events-none absolute ${x} ${BRANCH_TOP} ${BRANCH_RUN} w-4 rounded-bl-[0.3125rem] border-b border-l`}
		style={{ borderColor: branchTint(lit) }}
	/>
);

// the group's own vertical, one indent out
export const branchLink = (x: string, lit: string | null) => (
	<span
		aria-hidden
		className={`pointer-events-none absolute ${x} ${BRANCH_TOP} ${BRANCH_RUN} w-0 -translate-x-1/2 border-l`}
		// a straight run reads thinner than the elbow, having no horizontal foot
		style={{ borderColor: lit ?? "rgba(255,255,255,0.24)" }}
	/>
);

const SIDE_NODE: Partial<Record<AnimeFormat, typeof Leaf>> = {
	OVA: Disc,
	SPECIAL: Disc,
	ONA: Disc,
	TV_SHORT: Disc,
};

const TINT = {
	current: "rgba(255,255,255,0.95)",
	watched: "rgba(255,255,255,0.52)",
	ahead: "rgba(255,255,255,0.3)",
};

const passedRing = (color: string) => `inset 0 0 0 1px ${mix(color, 66)}`;
const passedBody = (color: string) =>
	`radial-gradient(circle, ${mix(color, 7)}, ${mix(color, 14)}), #151515`;
const passedGlyph = (color: string) =>
	`color-mix(in srgb, white 34%, ${color})`;

export function Bead({
	state,
	kind,
	format,
	accent,
	glow,
	className,
	dangerHover = false,
	danger = false,
}: {
	state: SlotState;
	kind: "part" | "side" | "film";
	format?: AnimeFormat;
	accent?: string;
	glow?: string;
	className: string;
	dangerHover?: boolean;
	danger?: boolean;
}) {
	const part = kind === "part";
	const Icon = part
		? Leaf
		: kind === "film"
			? Film
			: (SIDE_NODE[format ?? "OVA"] ?? Asterisk);
	const size = part
		? state === "current"
			? "0.8125rem"
			: "0.75rem"
		: "0.6875rem";
	const ahead = state === "ahead";
	const tint = accent ?? (glow ? passedGlyph(glow) : TINT[state]);
	return (
		<span
			className={`${className} flex h-5.5 w-5.5 items-center justify-center rounded-full neu-carved transition-[transform,filter,box-shadow] duration-300 group-hover:scale-110 group-hover:brightness-125 ${
				dangerHover
					? "group-hover/hide:shadow-[inset_0_0_10px_rgba(239,68,68,0.42)]"
					: ""
			} ${
				danger
					? "shadow-[inset_0_0_10px_rgba(239,68,68,0.42)] group-hover/restore:shadow-none"
					: ""
			}`}
			style={{
				background: glow ? passedBody(glow) : "#151515",
			}}
		>
			{(state === "current" || glow) && (
				<span
					aria-hidden
					className="absolute inset-0 rounded-full"
					style={{
						boxShadow: glow
							? passedRing(glow)
							: "inset 0 0 0 1px rgba(255,255,255,0.11)",
					}}
				/>
			)}
			<Icon
				aria-hidden
				strokeWidth={ahead ? 1.75 : 1.5}
				className={`relative transition-colors duration-200 ${
					dangerHover ? "group-hover/hide:text-red-400!" : ""
				} ${danger ? "group-hover/restore:text-(--bead-tint)!" : ""}`}
				style={{
					width: size,
					height: size,
					...(part ? { transform: "rotate(-45deg)" } : {}),
					...(danger
						? ({ "--bead-tint": tint } as React.CSSProperties)
						: {}),
					color: danger ? "#f87171" : tint,
					fill: "transparent",
				}}
			/>
		</span>
	);
}

// ─── the controls

// what the entry is worth to the rolled-up score
const WEIGHT_STEPS = 4;
const WEIGHT_ON = "rgba(255,255,255,0.34)";
const WEIGHT_OFF = "rgba(255,255,255,0.08)";

const shareLabel = (share: number) =>
	share > 0 && share < 0.005
		? "under 1% of the score"
		: `${Math.round(share * 100)}% of the score`;

export function Weight({ share, of }: { share: number; of: number }) {
	const label = shareLabel(share);
	const filled = Math.max(
		1,
		Math.ceil(Math.min(1, of > 0 ? share / of : 0) * WEIGHT_STEPS),
	);
	return (
		<span
			title={label}
			aria-label={label}
			className="flex h-2.25 items-end gap-px"
		>
			{Array.from({ length: WEIGHT_STEPS }, (_, at) => (
				<span
					key={at}
					className="w-0.75 rounded-[1px]"
					style={{
						height: `${((at + 1) / WEIGHT_STEPS) * 100}%`,
						background: at < filled ? WEIGHT_ON : WEIGHT_OFF,
					}}
				/>
			))}
		</span>
	);
}

// one slot holding both the weight and the control
export const Meta = ({
	value,
	action,
	pinned,
}: {
	value: React.ReactNode;
	action?: React.ReactNode;
	// the row you are on and the row you are looking at
	pinned?: boolean;
}) => (
	<span className="relative mr-1.5 flex h-5 w-7 shrink-0 items-center justify-end">
		{value && (!pinned || !action) && (
			<span
				className={`absolute inset-y-0 right-0.5 flex w-6 items-center justify-center transition-opacity duration-200 ${
					action ? "group-hover:opacity-0" : ""
				}`}
			>
				{value}
			</span>
		)}
		{action && (
			<span
				key={pinned ? "held" : "hover"}
				className={`absolute right-0.5 inset-y-0 flex items-center transition-opacity duration-200 ${
					pinned ? "" : "opacity-0 group-hover:opacity-100"
				}`}
			>
				{action}
			</span>
		)}
	</span>
);

//
export const onActivate = (act: () => void) => (event: React.KeyboardEvent) => {
	if (event.key !== "Enter" && event.key !== " ") return;
	event.preventDefault();
	act();
};

// takes node's own placement so bead sits plain inside it
export const HideNode = ({
	x,
	label,
	onHide,
	children,
}: {
	x: string;
	label: string;
	onHide: () => void;
	children: ReactNode;
}) => (
	<button
		type="button"
		title="Hide this"
		aria-label={`Hide ${label}`}
		onClick={(event) => {
			event.stopPropagation();
			onHide();
		}}
		className={`group/hide absolute ${x} top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full hover:cursor-pointer focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-red-400`}
	>
		{children}
	</button>
);

export const PlantButton = ({ onPlant }: { onPlant: () => void }) => (
	<button
		type="button"
		onClick={(event) => {
			event.stopPropagation();
			onPlant();
		}}
		title="Watch from here"
		className="group/plant flex h-6 w-6 items-center justify-center rounded-lg neu-carved hover:neu-carved-hi active:scale-95 transition-all duration-150 hover:cursor-pointer"
	>
		<Milestone
			className="w-3.5 h-3.5 text-emerald-600/90 group-hover/plant:text-emerald-500 transition-colors"
			strokeWidth={2.25}
		/>
	</button>
);
