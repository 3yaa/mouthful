"use client";
import type { CSSProperties } from "react";
import type { MediaCoverProps } from "@/types/media";
import { ART_MASK } from "./BackdropDesktop";
import { GRAIN } from "./BookBackdrop";

const TIMING =
	"duration-420 ease-leave live:duration-800 live:ease-arrive live:delay-200";
const CAMERA =
	"duration-420 ease-leave live:duration-1400 live:ease-arrive live:delay-200";

// anilist covers run about 460x650
const COVER_AR = 0.7;

// ─── layouts: three shots on straight cuts

// a panel corner: x, y as fractions of the window, and which way (-1 | 0 | 1) its gutters push it
type Corner = [number, number, number, number];
type Layout = {
	panels: Corner[][];
	// how far the cuts lean, x per unit of y -- the shots slide along it
	slope: number;
};

// three panels between two cuts, each cut x at the top, x at the bottom
const columns = (a: [number, number], b: [number, number]): Layout => ({
	panels: [
		[
			[0, 0, 0, 0],
			[a[0], 0, -1, 0],
			[a[1], 1, -1, 0],
			[0, 1, 0, 0],
		],
		[
			[a[0], 0, 1, 0],
			[b[0], 0, -1, 0],
			[b[1], 1, -1, 0],
			[a[1], 1, 1, 0],
		],
		[
			[b[0], 0, 1, 0],
			[1, 0, 0, 0],
			[1, 1, 0, 0],
			[b[1], 1, 1, 0],
		],
	],
	slope: (a[1] - a[0] + b[1] - b[0]) / 2,
});

const LAYOUTS: Layout[] = [
	// two gentle parallel slashes
	columns([0.34, 0.26], [0.68, 0.6]),
	// a wide shot and a slanted pair
	{
		panels: [
			[
				[0, 0, 0, 0],
				[0.6, 0, -1, 0],
				[0.52, 1, -1, 0],
				[0, 1, 0, 0],
			],
			[
				[0.6, 0, 1, 0],
				[1, 0, 0, 0],
				[1, 0.42, 0, -1],
				[0.556, 0.55, 1, -1],
			],
			[
				[0.556, 0.55, 1, 1],
				[1, 0.42, 0, 1],
				[1, 1, 0, 0],
				[0.52, 1, 1, 0],
			],
		],
		slope: -0.08,
	},
	// two steep slashes, the last shot the widest
	columns([0.3, 0.17], [0.58, 0.45]),
	// two cuts closing into a wedge
	columns([0.4, 0.48], [0.62, 0.54]),
];

const mirror = ({ panels, slope }: Layout): Layout => ({
	panels: panels.map((corners) =>
		corners.map(([x, y, sx, sy]): Corner => [1 - x, y, -sx, sy]),
	),
	slope: -slope,
});

// every page there is -- mirrored pages read right to left, like manga
const PAGES: [number, boolean][] = [
	[0, false],
	[1, false],
	[2, true],
	[3, false],
	[0, true],
	[1, true],
	[2, false],
	[3, true],
];

export const PAGE_COUNT = PAGES.length;

const pageOf = (pick: number) => {
	const [at, flipped] = PAGES[pick % PAGES.length];
	const layout = flipped ? mirror(LAYOUTS[at]) : LAYOUTS[at];
	return { layout, lean: (flipped ? 1 : -1) * 0.03 };
};

type Titled = { anilistId?: number; cover?: MediaCoverProps | null };

// a title's page
export const pageFor = ({ anilistId, cover }: Titled) =>
	cover?.page ?? (anilistId ?? 0) % PAGES.length;

// a list, each row on its title's page
export function withPages<T extends Titled>(rows: T[]): T[] {
	let last = -1;
	return rows.map((row) => {
		let page = pageFor(row);
		if (row.cover?.page == null && PAGES[page][0] === last)
			page = (page + 1) % PAGES.length;
		last = PAGES[page][0];
		return row.cover && row.cover.page !== page
			? { ...row, cover: { ...row.cover, page } }
			: row;
	});
}

// ─── shots

// every shot aims at face height
type Shot = { focus: [number, number]; scale: number };
const CLOSE: Shot = { focus: [0.5, 0.3], scale: 1.3 };
const MEDIUM: Shot = { focus: [0.44, 0.32], scale: 1.05 };
const WIDE: Shot = { focus: [0.54, 0.35], scale: 0.8 };
// widest panel first
const ROLES = [CLOSE, MEDIUM, WIDE];

// what a shot does to its picture
type Treatment = "plain" | "flip" | "tilt";
const TREATMENTS: Treatment[] = ["plain", "flip", "tilt"];
const TILT = 7;
const TILT_GROW = 1.25;
const LOGO_BAND = 0.1;
const CREDIT_BAND = 0.08;

// ─── panels

type Pt = [number, number, number?, number?];
type Cut = {
	shape: string;
	// the panel's middle, left and right edges, and widest span, as fractions of the window
	cx: number;
	cy: number;
	left: number;
	right: number;
	span: number;
};

const coord = (f: number, off = 0) =>
	`calc(${(f * 100).toFixed(2)}% + ${off.toFixed(3)}rem)`;

const polygon = (pts: Pt[]) =>
	`polygon(${pts.map(([x, y, dx, dy]) => `${coord(x, dx)} ${coord(y, dy)}`).join(", ")})`;

const mean = (ns: number[]) => ns.reduce((a, n) => a + n, 0) / ns.length;

// live, the page shears
function cutsOf({ panels }: Layout, h: number, lean = 0): Cut[] {
	return panels.map((corners) => {
		const xs = corners.map(([x]) => x);
		return {
			shape: polygon(
				corners.map(
					([x, y, sx, sy]): Pt => [
						x > 0 && x < 1 ? x + lean * (y - 0.5) : x,
						y,
						sx * h,
						sy * h,
					],
				),
			),
			cx: mean(xs),
			cy: mean(corners.map(([, y]) => y)),
			left: Math.min(...xs),
			right: Math.max(...xs),
			span: Math.max(...xs) - Math.min(...xs),
		};
	});
}

function boxOf(
	cut: Cut,
	[fx, fy]: [number, number],
	tall: number,
	grow: number,
	// how far down the window the aim lands, relative to the panel's own middle
	eyeLine: number,
): CSSProperties {
	const w = `max(${(tall * grow * COVER_AR * 100).toFixed(1)}cqh, ${(cut.span * 112 * grow).toFixed(1)}cqw)`;
	const h = `calc(${w} / ${COVER_AR})`;
	const pct = (n: number) => `${(n * 100).toFixed(1)}cqw`;
	return {
		width: w,
		height: h,
		left: `clamp(calc(${pct(cut.right)} - ${w}), calc(${pct(cut.cx)} - ${fx} * ${w}), ${pct(cut.left)})`,
		top: `clamp(calc(100cqh - ${1 - CREDIT_BAND} * ${h}), calc(${(cut.cy * eyeLine * 200).toFixed(1)}cqh - ${fy} * ${h}), calc(-${LOGO_BAND} * ${h}))`,
	};
}

const SCREENTONE =
	"radial-gradient(circle, rgba(0,0,0,0.9) 0.7px, transparent 1.1px)";

const clip = (rest: string, live: string) =>
	({ "--cut": rest, "--cut-live": live }) as CSSProperties;

const CLIP = `[clip-path:var(--cut)] live:[clip-path:var(--cut-live)] ${TIMING}`;
const PAPER = `bg-[#6f6c67] live:bg-[#ebe7df] ${TIMING}`;

function Shot({
	url,
	cut,
	box,
	pan,
	lines,
	treatment,
	tilt,
}: {
	url: string;
	cut: Cut;
	box: CSSProperties;
	pan: [number, number];
	lines: boolean;
	treatment: Treatment;
	// degrees
	tilt: number;
}) {
	const at = `${(cut.cx * 100).toFixed(1)}% ${(cut.cy * 100).toFixed(1)}%`;
	return (
		<>
			<div
				className={`absolute live:[translate:var(--pan)] transition-[translate] ${CAMERA}`}
				style={
					{
						...box,
						"--pan": `${pan[0]}cqw ${pan[1]}cqh`,
						rotate: treatment === "tilt" ? `${tilt}deg` : undefined,
					} as CSSProperties
				}
			>
				<div
					className={`absolute inset-0 bg-cover bg-center grayscale contrast-[1.2] brightness-[0.62] live:grayscale-0 live:saturate-[0.85] live:contrast-[1.05] live:brightness-[0.7] transition-[filter] ${TIMING}`}
					style={{
						backgroundImage: `url(${url})`,
						scale: treatment === "flip" ? "-1 1" : undefined,
					}}
				/>
				<div
					className="absolute inset-0 mix-blend-multiply opacity-25"
					style={{
						backgroundImage: SCREENTONE,
						backgroundSize: "3px 3px",
					}}
				/>
			</div>
			<div
				className="absolute inset-0"
				style={{
					background: `radial-gradient(${(cut.span * 70).toFixed(0)}% 85% at ${at}, transparent 50%, rgba(0,0,0,0.5) 100%)`,
				}}
			/>
			{lines && (
				<div
					className={`absolute inset-0 opacity-40 live:opacity-100 transition-opacity ${TIMING}`}
					style={{
						backgroundImage: `repeating-conic-gradient(from 0deg at ${at}, rgba(255,255,255,0.14) 0deg 0.6deg, transparent 0.6deg 4deg)`,
						maskImage: `radial-gradient(${(cut.span * 60).toFixed(0)}% 70% at ${at}, transparent 40%, black 100%)`,
						WebkitMaskImage: `radial-gradient(${(cut.span * 60).toFixed(0)}% 70% at ${at}, transparent 40%, black 100%)`,
					}}
				/>
			)}
		</>
	);
}

// one page: paper, then per shot an ink border and the picture inside it, all under a film grain
function Storyboard({
	url,
	pick,
	tall,
	gutter,
	border,
	eyeLine = 0.5,
}: {
	url: string;
	pick: number;
	tall: number;
	// where on the window the aim should sit
	eyeLine?: number;
	gutter: number;
	border: number;
}) {
	const { layout, lean } = pageOf(pick);
	const rims = [cutsOf(layout, gutter), cutsOf(layout, gutter, lean)];
	const cuts = [
		cutsOf(layout, gutter + border),
		cutsOf(layout, gutter + border, lean),
	];
	// widest to narrowest: close, medium, wide
	const bySize = cuts[0]
		.map((c, i) => ({ i, span: c.span }))
		.sort((a, b) => b.span - a.span)
		.map(({ i }) => i);
	const roleOf = (i: number) => ROLES[bySize.indexOf(i)] ?? MEDIUM;
	return (
		<>
			<div className={`absolute inset-0 transition-colors ${PAPER}`} />
			{cuts[0].map((cut, i) => {
				const role = roleOf(i);
				// one shot plain, one flipped, one tilted
				const treatment = TREATMENTS[(i + pick) % TREATMENTS.length];
				// each shot slides along the cuts, the next one the other way
				const d = i % 2 ? 9 : -9;
				return (
					<div key={i}>
						<div
							className={`absolute inset-0 bg-black transition-[clip-path] ${CLIP}`}
							style={clip(rims[0][i].shape, rims[1][i].shape)}
						/>
						<div
							className={`absolute inset-0 overflow-hidden transition-[clip-path] ${CLIP}`}
							style={clip(cut.shape, cuts[1][i].shape)}
						>
							<Shot
								url={url}
								cut={cut}
								box={boxOf(
									cut,
									// a flipped shot mirrors its picture, so its aim mirrors too
									treatment === "flip"
										? [1 - role.focus[0], role.focus[1]]
										: role.focus,
									tall * role.scale,
									treatment === "tilt" ? TILT_GROW : 1,
									eyeLine,
								)}
								pan={[layout.slope * d, d]}
								lines={bySize[0] === i}
								treatment={treatment}
								tilt={pick % 2 ? TILT : -TILT}
							/>
						</div>
					</div>
				);
			})}
			<div
				className="absolute inset-0 opacity-30 mix-blend-soft-light"
				style={{ backgroundImage: GRAIN }}
			/>
		</>
	);
}

type BackdropProps = { cover: MediaCoverProps; anilistId?: number };

// LISTING -- on hover
export const MangaBackdropDesktop = ({ cover, anilistId }: BackdropProps) => (
	<div
		className={`relative h-full overflow-hidden select-none @container-size [--art-ramp:30%] live:[--art-ramp:16%] ${TIMING}`}
		style={ART_MASK}
	>
		<Storyboard
			url={cover.url}
			pick={pageFor({ cover, anilistId })}
			tall={2.4}
			gutter={0.12}
			border={0.14}
		/>
		<div
			className={`absolute inset-0 bg-black/28 live:bg-black/14 transition-colors ${TIMING}`}
		/>
	</div>
);

// the details header fades out sideways, and is gone before the status row
const DETAILS_FADE =
	"linear-gradient(to right, transparent 0%, black 16%, black 84%, transparent 100%), linear-gradient(to bottom, black 0%, black 30%, rgba(0,0,0,0.6) 48%, rgba(0,0,0,0.2) 62%, transparent 74%)";
const DETAILS_MASK: CSSProperties = {
	maskImage: DETAILS_FADE,
	WebkitMaskImage: DETAILS_FADE,
	maskComposite: "intersect",
	WebkitMaskComposite: "source-in",
};

// DETAILS
export const MangaBackdropDetails = ({ cover, anilistId }: BackdropProps) => (
	<div
		className="absolute -top-4 -left-0.5 -right-0.5 h-[70%] -z-10 overflow-hidden select-none @container-size"
		style={DETAILS_MASK}
	>
		<Storyboard
			url={cover.url}
			pick={pageFor({ cover, anilistId })}
			tall={1.45}
			gutter={0.14}
			border={0.18}
			eyeLine={0.3}
		/>
		<div
			className="absolute inset-0"
			style={{
				background:
					"linear-gradient(to bottom, rgba(12,12,13,0.3) 0%, rgba(12,12,13,0.42) 30%, rgba(12,12,13,0.74) 60%)",
			}}
		/>
	</div>
);
