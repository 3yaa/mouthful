import type { CSSProperties } from "react";
import { ART_MASK } from "./BackdropDesktop";

interface BookBackdropDesktopProps {
	color?: string;
	title?: string;
	author?: string;
}

export const GRAIN =
	"url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

const Grain = () => (
	<div
		className="absolute inset-0 opacity-[0.35] mix-blend-soft-light"
		style={{ backgroundImage: GRAIN }}
	/>
);

const resolve = (color?: string) =>
	color && color.trim() !== "" ? color : "#52525b";

const TIMING =
	"duration-420 ease-leave live:duration-800 live:ease-arrive live:delay-200";

const clothOf = (color?: string) =>
	`oklch(from ${resolve(color)} clamp(0.3, l, 0.78) min(c * 1.05, 0.2) h)`;

const INK_L = "clamp(0.26, (0.56 - l) * 80, 0.92)";

export const bookInk = (color?: string) => {
	const cloth = clothOf(color);
	return `color-mix(in oklab, oklch(from ${cloth} ${INK_L} 0.035 h) 60%, oklch(from ${cloth} ${INK_L} 0.035 75))`;
};

export const artInk = (color?: string) =>
	`color-mix(in oklab, oklch(from ${resolve(color)} 0.93 min(c, 0.03) h) 60%, oklch(0.93 0.03 75))`;

const faded = (ink: string, pct: number) =>
	`color-mix(in srgb, ${ink} ${pct}%, transparent)`;

// FNV-1a
const hash = (s: string) => {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++)
		h = Math.imul(h ^ s.charCodeAt(i), 16777619);
	return h >>> 0;
};

// a fractal noise field as an image -- `matrix` maps its red channel into what the layer needs
const noise = (freq: string, seed: number, matrix: string, octaves = 3) =>
	`url("data:image/svg+xml,${encodeURIComponent(
		`<svg xmlns='http://www.w3.org/2000/svg' width='480' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='${octaves}' seed='${seed}' stitchTiles='stitch'/><feColorMatrix values='${matrix}'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
	)}")`;

const TONE = "1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1";
const PATCHES = "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3 0 0 0 -1.4";
const FLAKES = "0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -4 0 0 0 3.3";

type Wear = {
	seed: number;
	jitter: (k: number) => number;
	// which end the sun reached
	fadeFrom: "left" | "right";
};

const wearOf = (title = ""): Wear => {
	const h = hash(title);
	return {
		seed: h % 9,
		jitter: (k) => ((h >>> (k * 3)) & 7) / 7 - 0.5,
		fadeFrom: h & 1 ? "left" : "right",
	};
};

const masked = (image: string, size = "100% 100%"): CSSProperties => ({
	maskImage: image,
	WebkitMaskImage: image,
	maskSize: size,
	WebkitMaskSize: size,
});

function Cloth({ cloth, wear }: { cloth: string; wear: Wear }) {
	return (
		<>
			<div className="absolute inset-0" style={{ background: cloth }} />
			<div
				className="absolute inset-0 opacity-35 mix-blend-soft-light"
				style={{
					backgroundImage: noise("0.012 0.05", wear.seed, TONE, 4),
					backgroundSize: "100% 100%",
				}}
			/>
			<div
				className="absolute inset-0 opacity-40 mix-blend-overlay"
				style={{
					backgroundImage:
						"repeating-linear-gradient(45deg, rgba(255,255,255,0.07) 0 1px, transparent 1px 3px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.14) 0 1px, transparent 1px 3px)",
				}}
			/>
			<div
				className="absolute inset-0"
				style={{
					background: `linear-gradient(to ${wear.fadeFrom === "left" ? "right" : "left"}, rgba(236,226,206,0.04), transparent 45%)`,
				}}
			/>
			<Grain />
		</>
	);
}

function Rubbing({ wear, reach = "10%" }: { wear: Wear; reach?: string }) {
	return (
		<div
			className="absolute inset-0"
			style={{
				background: `linear-gradient(to bottom, rgba(226,214,192,0.2), transparent ${reach}, transparent calc(100% - ${reach}), rgba(226,214,192,0.16))`,
				...masked(noise("0.03 0.12", wear.seed + 3, PATCHES)),
			}}
		/>
	);
}

function Spine({ color, title }: { color?: string; title?: string }) {
	const cloth = clothOf(color);
	const ink = bookInk(color);
	const wear = wearOf(title);
	const shade = (pct: number, into: string) =>
		`color-mix(in srgb, ${cloth} ${pct}%, ${into})`;
	const bands = [15, 24, 75, 84].map((x, k) => x + wear.jitter(k) * 1.6);
	const lit = 40 + wear.jitter(5) * 6;
	return (
		<>
			<Cloth cloth={cloth} wear={wear} />
			<div
				className="absolute inset-0"
				style={{
					background: `linear-gradient(to bottom, rgba(20,12,6,0.3) 0%, transparent 28%, rgba(255,240,220,0.035) ${lit}%, transparent 62%, rgba(20,12,6,0.32) 100%)`,
				}}
			/>
			{bands.map((x, k) => (
				<div
					key={k}
					className="absolute inset-y-0 opacity-60 blur-[0.6px]"
					style={{
						left: `${x}%`,
						width: `${1 + wear.jitter(k + 6) * 0.35}%`,
						background: `linear-gradient(90deg, ${shade(76, "#000")}, ${shade(92, "#fff")} 45%, ${shade(84, "#000")})`,
						boxShadow: "1px 0 3px rgba(20,12,6,0.25)",
					}}
				/>
			))}
			{bands.map((x, k) => (
				<div
					key={k}
					className="absolute inset-y-[20%] w-px blur-[0.3px]"
					style={{
						left: `${x + (k % 2 ? -1.8 : 2.2)}%`,
						background: faded(ink, 22),
						...masked(noise("0.9", wear.seed + k, FLAKES, 2)),
					}}
				/>
			))}
			<Rubbing wear={wear} />
			{/* a faint light along the round -- live, it slides as if the book tilted */}
			<div
				className={`absolute inset-0 opacity-40 live:opacity-80 bg-position-[0%_0] live:bg-position-[100%_0] transition-[background-position,opacity] ${TIMING}`}
				style={{
					backgroundImage:
						"linear-gradient(100deg, transparent 38%, rgba(255,255,255,0.045) 50%, transparent 62%)",
					backgroundSize: "180% 100%",
				}}
			/>
		</>
	);
}

export const Fleuron = ({
	ink,
	width = "34%",
}: {
	ink: string;
	width?: string;
}) => (
	<div className="flex items-center gap-1.5 opacity-45" style={{ width }}>
		<div
			className="h-px flex-1"
			style={{
				background: `linear-gradient(90deg, transparent, ${ink})`,
			}}
		/>
		<svg viewBox="0 0 30 10" className="h-[0.55rem] w-auto" fill={ink}>
			<path d="M13 5C11 1.8 7.5 1.6 4.6 4.1 7.6 7 11 7.3 13 5Zm4 0c2-3.2 5.5-3.4 8.4-.9C22.4 7 19 7.3 17 5Z" />
			<circle cx="15" cy="5" r="1.15" />
		</svg>
		<div
			className="h-px flex-1"
			style={{
				background: `linear-gradient(90deg, ${ink}, transparent)`,
			}}
		/>
	</div>
);

const SOFT_TYPE = "'SOFT' 100, 'WONK' 1, 'opsz' 48";

export const PRESSED =
	"0 -0.5px 0 rgba(20,12,6,0.4), 0 0.75px 0 rgba(255,240,220,0.1)";

// LISTING
export const BookBackdropDesktop = ({
	color,
	title,
	author,
}: BookBackdropDesktopProps) => {
	const size = `clamp(0.62rem, calc(96cqw / ${((title?.length || 1) * 0.6).toFixed(2)}), 1.5rem)`;
	const flakes = masked(
		noise("0.7", wearOf(title).seed + 5, FLAKES, 2),
		"12rem 6rem",
	);
	const ink = bookInk(color);
	return (
		<div
			className={`relative h-full overflow-hidden select-none @container-size live:[--art-ramp:15%] ${TIMING}`}
			style={ART_MASK}
		>
			<Spine color={color} title={title} />
			{/* TITLE | AUTHOR */}
			{title && (
				<div
					className="absolute inset-y-0 left-[26%] right-[27%] flex flex-col items-center justify-center gap-[0.3rem] px-1 @container"
					style={flakes}
				>
					<span
						className="font-lettering max-w-full truncate text-center font-semibold leading-none"
						style={{
							fontSize: size,
							color: faded(ink, 88),
							textShadow: PRESSED,
							fontVariationSettings: SOFT_TYPE,
						}}
					>
						{title}
					</span>
					{author && (
						<>
							<Fleuron ink={ink} />
							<span
								className="font-lettering max-w-full truncate italic text-[0.7rem]"
								style={{
									color: faded(ink, 62),
									fontVariationSettings: "'SOFT' 100",
								}}
							>
								{author.split(",")[0]}
							</span>
						</>
					)}
				</div>
			)}
		</div>
	);
};

const eased = (i: number) => {
	const t = i / 8;
	return t * t * (3 - 2 * t);
};
const easedFade = (dir: string, from: number, to: number) => {
	const ramp = (edge: number, reach: number, sign: 1 | -1) =>
		Array.from(
			{ length: 9 },
			(_, i) =>
				`rgba(0,0,0,${eased(i).toFixed(3)}) ${(edge + (sign * i * reach) / 8).toFixed(2)}%`,
		);
	const stops = [
		...(from ? ramp(0, from, 1) : ["black 0%"]),
		...(to ? ramp(100, to, -1).reverse() : ["black 100%"]),
	];
	return `linear-gradient(${dir}, ${stops.join(", ")})`;
};
const BOARD_FADE = `${easedFade("to right", 16, 16)}, ${easedFade("to bottom", 0, 22)}`;

const toolOf = (flip: boolean) =>
	`url("data:image/svg+xml,${encodeURIComponent(
		`<svg xmlns='http://www.w3.org/2000/svg' width='14' height='26'><g${flip ? " transform='translate(14 0) scale(-1 1)'" : ""}><rect x='1' width='1.5' height='26'/><rect x='12.2' width='0.8' height='26'/><path d='M7 0C9.4 3.3 9.4 9.7 7 13S4.6 22.7 7 26' fill='none' stroke='black' stroke-width='0.8'/><path d='M8.4 8.2Q5.9 7.4 4.1 10.4Q7.1 10.9 8.4 8.2Z'/><path d='M5.6 21.2Q8.1 20.4 9.9 23.4Q6.9 23.9 5.6 21.2Z'/><circle cx='4.6' cy='3' r='0.75'/><circle cx='9.4' cy='16' r='0.75'/></g></svg>`,
	)}")`;
const TOOL = { left: toolOf(false), right: toolOf(true) };
const TOOL_IN = 11;

function Tooling({ side, cloth }: { side: "left" | "right"; cloth: string }) {
	const tool = {
		...masked(TOOL[side], "0.875rem 1.625rem"),
		maskRepeat: "repeat-y",
		WebkitMaskRepeat: "repeat-y",
	};
	return (
		<div
			className="absolute top-0 bottom-9 w-3.5"
			style={{
				[side]: `${TOOL_IN}cqw`,
				maskImage: "linear-gradient(to bottom, black 72%, transparent)",
				WebkitMaskImage:
					"linear-gradient(to bottom, black 72%, transparent)",
			}}
		>
			<div
				className="absolute inset-0 translate-x-[0.5px] translate-y-[0.75px] opacity-30"
				style={{
					background: `color-mix(in oklab, ${cloth} 55%, white)`,
					...tool,
				}}
			/>
			<div
				className="absolute inset-0 opacity-80"
				style={{
					background: `color-mix(in oklab, ${cloth} 50%, black)`,
					...tool,
				}}
			/>
			<div className="absolute inset-0 overflow-hidden" style={tool}>
				<div className="carving-light absolute inset-x-0 top-0 h-[300%] opacity-90" />
			</div>
		</div>
	);
}

// DETAILS
export const BookBackdropDetails = ({
	color,
	title,
}: {
	color?: string;
	title?: string;
}) => {
	const cloth = clothOf(color);
	const wear = wearOf(title);
	return (
		<div
			aria-hidden
			className="pointer-events-none absolute -top-4 -bottom-10 -inset-x-0.5 -z-10 select-none overflow-hidden @container-size"
			style={{
				maskImage: BOARD_FADE,
				WebkitMaskImage: BOARD_FADE,
				maskComposite: "intersect",
				WebkitMaskComposite: "source-in",
			}}
		>
			<Cloth cloth={cloth} wear={wear} />
			<div
				className="absolute inset-0"
				style={{
					background:
						"radial-gradient(120% 95% at 40% 0%, rgba(255,240,220,0.05), transparent 55%, rgba(20,12,6,0.12) 100%)",
				}}
			/>
			<Rubbing wear={wear} reach="7%" />
			<Tooling side="left" cloth={cloth} />
			<Tooling side="right" cloth={cloth} />
		</div>
	);
};
