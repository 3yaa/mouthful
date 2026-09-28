// FOR GAME/MOVIE/BOOK/MANGA
import Image from "next/image";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
	BaseMediaProps,
	SeriesMediaProps,
	SeriesTargetProps,
} from "@/types/media";
import { GameProps } from "@/types/game";
import { seriesNeighbours, seriesPlace } from "@/utils/seriesRead";

interface SeriesNavProps {
	item: BaseMediaProps;
	mediaType: string;
	onAction: (action: { type: string; payload?: unknown }) => void;
	isInList?: (target: SeriesTargetProps) => boolean;
	accentColor?: string;
}

const ART_SRC = "/non-series-placeholder.png";

// vertical framing of the art
const ART_POSITION = "center 40%";

const ART_MASK = {
	maskImage: `url(${ART_SRC})`,
	WebkitMaskImage: `url(${ART_SRC})`,
	maskSize: "cover",
	WebkitMaskSize: "cover",
	maskPosition: ART_POSITION,
	WebkitMaskPosition: ART_POSITION,
	maskRepeat: "no-repeat",
	WebkitMaskRepeat: "no-repeat",
} as React.CSSProperties;

const TOP_FADE = "linear-gradient(to bottom, transparent 0%, #000 10%)";

const tint = (pct: number, into = "transparent") =>
	`color-mix(in srgb, var(--c) ${pct}%, ${into})`;

const seeded = (s: string) => {
	let h = 2166136261;
	for (let i = 0; i < s.length; i++)
		h = Math.imul(h ^ s.charCodeAt(i), 16777619);
	return () => {
		h = (h + 0x6d2b79f5) | 0;
		let t = Math.imul(h ^ (h >>> 15), 1 | h);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

const SCRIBBLE_H = 20;
const STROKE = 1.4;

const scribbleOf = (seed: string, w: number) => {
	const rand = seeded(seed);
	const h = SCRIBBLE_H;
	const points: [number, number][] = [];
	const pass = (
		from: number,
		to: number,
		turns: number,
		depth: number,
		loop: number,
	) => {
		const turn = () => ({
			depth: depth * (0.7 + rand() * 0.5),
			loop: loop * (0.5 + rand()),
			step: 0.7 + rand() * 0.6,
			lift: (rand() - 0.5) * 2.6,
		});
		const specs = Array.from({ length: turns + 1 }, turn);
		const unit =
			(to - from) / specs.slice(1).reduce((n, t) => n + t.step, 0);
		let x0 = from;
		for (let k = 1; k <= turns; k++) {
			const [was, now] = [specs[k - 1], specs[k]];
			const a = (now.step * unit) / (2 * Math.PI);
			for (let i = 0; i < 18; i++) {
				const f = i / 18;
				const t = f * 2 * Math.PI;
				const e = f * f * (3 - 2 * f);
				const mix = (u: number, v: number) => u + (v - u) * e;
				const y =
					h / 2 +
					mix(was.lift, now.lift) -
					mix(was.depth, now.depth) * Math.cos(t);
				// leaning a little, as a hand does
				const x =
					x0 +
					a * t -
					mix(was.loop, now.loop) * Math.abs(a) * Math.sin(t) +
					(y - h / 2) * 0.3;
				points.push([x, y]);
			}
			x0 += now.step * unit;
		}
	};
	pass(
		3,
		w - 3,
		Math.max(5, Math.round(w / 14) + Math.floor(rand() * 2)),
		6.4,
		1.9,
	);
	pass(w - 8, 8, Math.max(3, Math.round(w / 23)), 3.6, 0.6);
	const at = (i: number) =>
		points[Math.max(0, Math.min(points.length - 1, i))];
	const curve: [number, number][] = [points[0]];
	for (let i = 0; i < points.length - 1; i++) {
		const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
		curve.push(
			[p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
			[p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6],
			p2,
		);
	}
	const xs = curve.map(([x]) => x);
	const ys = curve.map(([, y]) => y);
	const fit = (v: number, lo: number, hi: number, size: number) =>
		(STROKE / 2 + ((v - lo) * (size - STROKE)) / (hi - lo || 1)).toFixed(1);
	const [x0, x1, y0, y1] = [
		Math.min(...xs),
		Math.max(...xs),
		Math.min(...ys),
		Math.max(...ys),
	];
	const pt = ([x, y]: [number, number]) =>
		`${fit(x, x0, x1, w)} ${fit(y, y0, y1, h)}`;
	let d = `M${pt(curve[0])}`;
	for (let i = 1; i < curve.length; i += 3)
		d += `C${pt(curve[i])} ${pt(curve[i + 1])} ${pt(curve[i + 2])}`;
	return d;
};

function Unwritten({
	label,
	seed,
	mirror,
	align,
}: {
	label: string;
	seed: string;
	mirror?: string | null;
	align: "left" | "right";
}) {
	const boxRef = useRef<HTMLSpanElement | null>(null);
	const [width, setWidth] = useState(0);
	useLayoutEffect(() => {
		const box = boxRef.current;
		if (!box) return;
		const measure = () => {
			const { width: w, height: h } = box.getBoundingClientRect();
			if (h) setWidth(Math.round((w * SCRIBBLE_H) / h));
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(box);
		return () => observer.disconnect();
	}, []);
	const path = useMemo(
		() => (width ? scribbleOf(seed, width) : null),
		[seed, width],
	);
	return (
		<div
			role="img"
			aria-label={`No ${label.toLowerCase()}`}
			className={`flex min-w-0 flex-col ${align === "right" ? "items-end" : "items-start"}`}
		>
			<label className="text-xs font-medium text-zinc-500 block pointer-events-none">
				<span className="inline-flex h-4 items-center gap-1 align-top">
					{align === "left" && <span>←</span>}
					<span>{label}</span>
					{align === "right" && <span>→</span>}
				</span>
			</label>
			<span ref={boxRef} className="relative block max-w-full">
				{mirror ? (
					<span className="invisible block truncate text-sm font-medium">
						{mirror}
					</span>
				) : (
					<span className="block h-5 w-34" />
				)}
				{path && (
					<svg
						viewBox={`0 0 ${width} ${SCRIBBLE_H}`}
						className="absolute inset-0 h-full w-full overflow-visible opacity-70"
						fill="none"
					>
						<path
							d={path}
							pathLength={1}
							className="scribble-in"
							// the pen keeps one pace, so a long scribble takes longer rather than rushing
							style={{
								animationDuration: `${Math.min(1.9, Math.max(0.9, width / 120)).toFixed(2)}s`,
							}}
							stroke="#a1a1aa"
							strokeWidth={STROKE}
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				)}
			</span>
		</div>
	);
}

export function NotInListBadge() {
	return (
		<span
			title="Not in your list — opens the add flow"
			className="shrink-0 rounded-full border border-zinc-700/70 px-1 text-[0.6rem] leading-[1.15] font-semibold text-zinc-500/90"
		>
			+
		</span>
	);
}

export function SeriesNav({
	item,
	mediaType,
	onAction,
	isInList,
	accentColor,
}: SeriesNavProps) {
	const nav =
		mediaType === "game"
			? (() => {
					const g = item as unknown as GameProps;
					return {
						prev:
							g.dlcs && g.dlcIndex - 1 >= 0
								? {
										label: "Previous",
										name: g.dlcs[g.dlcIndex - 1].name,
										action: {
											type: "dlcNav",
											payload: "prev",
										},
									}
								: null,
						center: g.dlcIndex !== 0 ? String(g.dlcIndex) : null,
						next:
							g.dlcs && g.dlcIndex + 1 < g.dlcs.length
								? {
										label: "Next",
										name: g.dlcs[g.dlcIndex + 1].name,
										action: {
											type: "dlcNav",
											payload: "next",
										},
									}
								: null,
					};
				})()
			: (() => {
					// movies and books both step along a stored run
					const row = item as unknown as SeriesMediaProps;
					const { prev, next } = seriesNeighbours(row);
					return {
						prev: prev
							? {
									label: "Prequel",
									name: prev.title,
									target: prev,
									action: {
										type: "seriesNav",
										payload: "prequel",
									},
								}
							: null,
						center: seriesPlace(row),
						next: next
							? {
									label: "Sequel",
									name: next.title,
									target: next,
									action: {
										type: "seriesNav",
										payload: "sequel",
									},
								}
							: null,
					};
				})();

	const isMissing = (
		entry: { name?: string | null; target?: SeriesTargetProps } | null,
	) => !!entry?.target && !!isInList && !isInList(entry.target);
	const prevMissing = isMissing(nav.prev);
	const nextMissing = isMissing(nav.next);

	const nameStyle = (missing: boolean) =>
		`truncate text-sm font-medium transition-colors duration-200 group-hover:underline group-hover:underline-offset-4 ${
			missing
				? "text-zinc-300/45 group-hover:text-zinc-300/70 group-hover:decoration-dotted group-hover:decoration-zinc-400/80"
				: "text-zinc-300/70 group-hover:text-zinc-300/85"
		}`;

	// show art if there is no series to step through -- manga/show goes without
	if (!nav.prev && !nav.center && !nav.next) {
		if (mediaType === "manga") return null;
		const tinted = !!accentColor;
		return (
			<div className="-mt-2">
				<div
					className="flex justify-center select-none"
					aria-hidden="true"
				>
					<div className="relative w-full h-14 -mb-2.5">
						<div
							className="absolute inset-x-0 -top-1.5 -bottom-4 pointer-events-none"
							style={{
								WebkitMaskImage: TOP_FADE,
								maskImage: TOP_FADE,
							}}
						>
							<div
								className="absolute inset-0"
								style={
									{
										transform: "scaleY(-1)",
										// keeps the blend layers off the modal
										isolation: "isolate",
										opacity: tinted ? 0.92 : 0.7,
										"--c": accentColor,
									} as React.CSSProperties
								}
							>
								{/* AURA -- light spilling off the cloud */}
								{tinted && (
									<div
										className="absolute inset-0"
										style={{
											backgroundImage: `radial-gradient(58% 78% at 50% 62%, ${tint(
												34,
											)} 0%, ${tint(12)} 45%, transparent 74%)`,
										}}
									/>
								)}
								{/* SHAPE + SHADING */}
								<Image
									src={ART_SRC}
									alt=""
									fill
									sizes="(min-width: 1024px) 860px, 100vw"
									unoptimized
									className="object-cover"
									style={{
										objectPosition: ART_POSITION,
										filter: tinted
											? "grayscale(1) brightness(1.08) contrast(1.06)"
											: "grayscale(0.7)",
									}}
								/>
								{/* PAINT */}
								{tinted && (
									<div
										className="absolute inset-0"
										style={{
											backgroundImage: `linear-gradient(to bottom, ${tint(
												100,
											)} 0%, ${tint(92)} 45%, ${tint(78)} 100%)`,
											mixBlendMode: "multiply",
											...ART_MASK,
										}}
									/>
								)}
								{/* SHEEN */}
								{tinted && (
									<div
										className="absolute inset-0"
										style={{
											backgroundImage:
												"linear-gradient(to bottom, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.03) 45%, transparent 78%)",
											mixBlendMode: "plus-lighter",
											...ART_MASK,
										}}
									/>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="pr-0.5 pl-1.75">
			<div
				className={`grid grid-cols-[1fr_auto_1fr] w-full pr-1.5 select-none ${
					nav.prev && nav.center && nav.next ? "gap-6" : "gap-3"
				}`}
			>
				<div className="truncate text-left">
					{nav.prev && (
						<div
							className="group flex flex-col hover:cursor-pointer"
							onClick={() => onAction(nav.prev!.action)}
						>
							<label className="text-xs font-medium text-zinc-500 block pointer-events-none">
								<span className="inline-flex h-4 items-center gap-1 align-top">
									<span>←</span>
									<span>{nav.prev.label}</span>
									{prevMissing && <NotInListBadge />}
								</span>
							</label>
							<span className={nameStyle(prevMissing)}>
								{nav.prev.name}
							</span>
						</div>
					)}
					{!nav.prev && (
						<Unwritten
							label={
								mediaType === "game" ? "Previous" : "Prequel"
							}
							seed={`${item.title}<`}
							mirror={nav.next?.name}
							align="left"
						/>
					)}
				</div>

				<div className="flex justify-center">
					{nav.center && (
						<div className="flex flex-col items-center">
							<label className="text-xs font-medium text-zinc-500 block">
								{mediaType === "game" ? "DLC" : "Position"}
							</label>
							<span className="text-[0.8125rem] leading-5 font-medium text-zinc-300/70 tabular-nums">
								{nav.center}
							</span>
						</div>
					)}
				</div>

				<div className="truncate text-right">
					{nav.next && (
						<div
							className="group flex flex-col hover:cursor-pointer"
							onClick={() => onAction(nav.next!.action)}
						>
							<label className="text-xs font-medium text-zinc-500 block pointer-events-none">
								<span className="inline-flex h-4 items-center gap-1 align-top">
									{nextMissing && <NotInListBadge />}
									<span>{nav.next.label}</span>
									<span>→</span>
								</span>
							</label>
							<span className={nameStyle(nextMissing)}>
								{nav.next.name}
							</span>
						</div>
					)}
					{!nav.next && (
						<Unwritten
							label={mediaType === "game" ? "Next" : "Sequel"}
							seed={`${item.title}>`}
							mirror={nav.prev?.name}
							align="right"
						/>
					)}
				</div>
			</div>
		</div>
	);
}
