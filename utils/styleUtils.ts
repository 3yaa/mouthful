import { MediaStatus } from "@/types/media";
import { Tier } from "@/lib/tierConfig";

// ─── colour helpers
export const mix = (color: string, pct: number) =>
	`color-mix(in srgb, ${color} ${pct}%, transparent)`;
export const bloomIn = (color: string) =>
	`radial-gradient(circle, transparent 25%, ${mix(color, 5)} 48%, ${mix(
		color,
		14,
	)} 74%, ${mix(color, 26)} 100%)`;

// listing border | poster border | actor modal, studio modal, discover shows
export const getStatusBorderColor = (status: MediaStatus) => {
	switch (status) {
		case "Completed":
			return "border-emerald-500/50";
		case "Dropped":
			return "border-red-500/40";
		// movie && show
		case "Want to Watch":
			return "border-blue-500/50";
		// show && manga
		case "Watching":
		case "Reading":
			return "border-rose-dusk-vivid/80";
		// book
		case "Want to Read":
			return "border-blue-500/50";
		// game
		case "Playing":
			return "border-blue-500/50";
		default:
			return "border-zinc-600/40";
	}
};

// anime rail | rating rails | statusBezel
export const getStatusAccent = (status: Partial<MediaStatus>) => {
	switch (status) {
		case "Completed":
			// emerald-500
			return "#10b981";
		case "Dropped":
			// red-500
			return "#ef4444";
		case "Watching":
		case "Reading":
			// the dusk rose
			return "var(--color-rose-dusk)";
		case "Want to Watch":
		case "Want to Read":
		case "Playing":
			// blue-500
			return "#3b82f6";
		default:
			// zinc-600
			return "#52525b";
	}
};

// score battler | statusBezel
export const accentBezel = (
	accent: string,
	strength = 44,
	toward:
		| "top right"
		| "top left"
		| "bottom right"
		| "bottom left"
		| "top"
		| "bottom"
		| "left"
		| "right" = "top right",
	bothEnds = false,
) => {
	const lit = mix(accent, strength);
	return bothEnds
		? `linear-gradient(to ${toward}, ${lit}, transparent 42%, transparent 58%, ${lit})`
		: `linear-gradient(to ${toward}, transparent 58%, ${lit})`;
};

// the rose goes grubby at the others' dilution -- carries more of itself
const BEZEL_WEIGHT: Partial<Record<MediaStatus, number>> = {
	Watching: 1.5,
	Reading: 1.5,
};

// details card | score battler | anime rail
export const statusBezel = (
	status: Partial<MediaStatus>,
	strength = 44,
	toward: Parameters<typeof accentBezel>[2] = "top right",
	bothEnds = false,
) =>
	accentBezel(
		getStatusAccent(status),
		Math.min(100, strength * (BEZEL_WEIGHT[status as MediaStatus] ?? 1)),
		toward,
		bothEnds,
	);

// edit progress -- season/episode/chapter numbers and their underlines
export const getStatusTextColor = (status: MediaStatus) => {
	switch (status) {
		case "Completed":
			return "text-emerald-500/80";
		case "Watching":
		case "Reading":
			return "text-rose-dusk-lit/90";
		case "Want to Watch":
		case "Want to Read":
			return "text-blue-500/85";
		case "Dropped":
			return "text-red-500/75";
		default:
			return "text-zinc-500";
	}
};

// progress bars | mobile status pill
export const getStatusBg = (status: Partial<MediaStatus>) => {
	switch (status) {
		case "Completed":
			return "bg-emerald-500/50";
		case "Dropped":
			return "bg-red-500/40";
		// movie && show
		case "Want to Watch":
			return "bg-blue-600/60";
		// show && manga
		case "Watching":
		case "Reading":
			return "bg-rose-dusk/55";
		// book
		case "Want to Read":
			return "bg-blue-600/50";
		// game
		case "Playing":
			return "bg-blue-600/50";
		default:
			return "bg-zinc-600/40";
	}
};

// shimmer over those same status bars
export const getStatusWaveColor = (status: Partial<MediaStatus>) => {
	switch (status) {
		case "Completed":
			// cyan-700: rgb(14, 116, 144)
			return "linear-gradient(90deg, transparent 20%, rgba(14, 116, 144, 0.45) 50%, transparent 80%)";
		case "Dropped":
			// yellow-400: rgb(250, 204, 21)
			return "linear-gradient(90deg, transparent 20%, rgba(250, 204, 21, 0.35) 50%, transparent 80%)";
		case "Want to Watch":
			// rose-600: rgb(225, 29, 72)
			return "linear-gradient(90deg, transparent 20%, rgba(225, 29, 72, 0.35) 50%, transparent 80%)";
		case "Watching":
		case "Reading":
			// cyan-600: rgb(8, 145, 178),
			return "linear-gradient(90deg, transparent 20%, rgba(8, 145, 178, 0.5) 50%, transparent 80%)";
		case "Want to Read":
			// rose-600: rgb(225, 29, 72)
			return "linear-gradient(90deg, transparent 20%, rgba(225, 29, 72, 0.35) 50%, transparent 80%)";
		case "Playing":
			// orange-400: rgb(251, 146, 60), amber-300: rgb(252, 211, 77)
			return "linear-gradient(90deg, transparent 20%, rgba(225, 29, 72, 0.35) 50%, transparent 80%)";
		default:
			// amber-300: rgb(252, 211, 77)
			return "linear-gradient(90deg, transparent 20%, rgba(252, 211, 77, 0.5) 50%, transparent 80%)";
	}
};

// details cover underline -- same shape off a cover swatch instead of a status
export const coverWave = (color: string) => {
	const lifted = `color-mix(in srgb, white 22%, ${color})`;
	return `linear-gradient(90deg, transparent 20%, color-mix(in srgb, ${lifted} 55%, transparent) 50%, transparent 80%)`;
};

// details status underline
export const getStatusDetailWaveColor = (status: Partial<MediaStatus>) => {
	switch (status) {
		case "Completed":
			// emerald-500: rgb(16, 185, 129)
			return "linear-gradient(90deg, transparent 20%, rgba(16, 185, 129, 0.5) 50%, transparent 80%)";
		case "Dropped":
			// red-500: rgb(239, 68, 68)
			return "linear-gradient(90deg, transparent 20%, rgba(239, 68, 68, 0.4) 50%, transparent 80%)";
		case "Want to Watch":
			// blue-500: rgb(59, 130, 246)
			return "linear-gradient(90deg, transparent 20%, rgba(59, 130, 246, 0.5) 50%, transparent 80%)";
		case "Watching":
		case "Reading":
			return "linear-gradient(90deg, transparent 20%, color-mix(in srgb, var(--color-rose-dusk) 60%, transparent) 50%, transparent 80%)";
		case "Want to Read":
			// blue-500: rgb(59, 130, 246)
			return "linear-gradient(90deg, transparent 20%, rgba(59, 130, 246, 0.5) 50%, transparent 80%)";
		case "Playing":
			// blue-500: rgb(59, 130, 246)
			return "linear-gradient(90deg, transparent 20%, rgba(59, 130, 246, 0.5) 50%, transparent 80%)";
		default:
			// zinc-600: rgb(82, 82, 91)
			return "linear-gradient(90deg, transparent 20%, rgba(82, 82, 91, 0.4) 50%, transparent 80%)";
	}
};

// listing title squiggle on hover, score badge rules
export const getStatusStrokeColor = (status?: MediaStatus): string => {
	switch (status) {
		case "Completed":
			return "rgb(5, 150, 105)"; // emerald-600
		case "Dropped":
			return "rgb(220, 38, 38)"; // red-600
		case "Want to Watch":
			return "rgb(37, 99, 235)"; // blue-600
		case "Watching":
		case "Reading":
			return "color-mix(in srgb, var(--color-rose-dusk) 80%, transparent)";
		case "Want to Read":
			return "rgb(37, 99, 235)"; // blue-600
		case "Playing":
			return "rgb(37, 99, 235)"; // blue-600
		default:
			return "rgb(63, 63, 70)"; // zinc-700
	}
};

// listing
export const getTierInk = (tier: Tier): string => {
	switch (tier) {
		case "Goosebumps":
			return "rgb(226, 185, 110)";
		case "Exceptional":
			return "rgb(206, 178, 124)";
		case "Amazing":
			return "rgb(181, 173, 145)";
		case "Good":
			return "rgb(154, 158, 150)";
		case "Pretty good":
			return "rgb(140, 142, 148)";
		case "Average":
			return "rgb(124, 124, 134)";
		case "Off-key":
			return "rgb(142, 118, 126)";
		case "Bad":
			return "rgb(154, 104, 112)";
		case "Appalling":
			return "rgb(160, 92, 92)";
	}
};

// listing
export const getTierInkLit = (tier: Tier): string => {
	switch (tier) {
		case "Goosebumps":
			return "rgb(255, 205, 116)";
		case "Exceptional":
			return "rgb(243, 198, 132)";
		case "Amazing":
			return "rgb(224, 206, 158)";
		case "Good":
			return "rgb(196, 205, 194)";
		case "Pretty good":
			return "rgb(182, 187, 200)";
		case "Average":
			return "rgb(168, 168, 182)";
		case "Off-key":
			return "rgb(196, 158, 172)";
		case "Bad":
			return "rgb(216, 134, 146)";
		case "Appalling":
			return "rgb(226, 114, 114)";
	}
};

// ─── shared class strings

// hover-revealed +/- controls on the score row
export const SCORE_SUB_BTN =
	"flex justify-center items-center w-8 h-8 rounded-lg neu-carved enabled:hover:neu-carved-hi enabled:active:scale-95 transition-all duration-150 hover:cursor-pointer disabled:neu-carved-off disabled:opacity-45 disabled:cursor-default";

// details card | anime rail
export const HEADER_WASH_MASK = [
	"linear-gradient(to right, transparent 0px, black 72px, black calc(100% - 96px), transparent 100%)",
	"linear-gradient(to bottom, transparent 0px, black 40px, black calc(100% - 40px), transparent 100%)",
].join(", ");

// desktop details | edit progress -- STATUS / SCORE / NOTES / PROGRESS captions
export const FIELD_LABEL =
	"block select-none text-[0.7rem] uppercase tracking-widest font-medium text-zinc-500";

// the scored button (once a score exists) and the notes panel
export const FIELD_PLATE = "rounded-lg neu-raised";
