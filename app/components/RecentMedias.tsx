import { BaseMediaProps, MediaStatus } from "@/types/media";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ChevronDown, ChevronRight, type LucideIcon } from "lucide-react";
import { isResizable } from "@/utils/image-loader";
import { getStatusBg, getStatusWaveColor } from "@/utils/styleUtils";
import { getDisplayScore } from "@/lib/tierConfig";
import { ShowProps } from "@/types/show";
import { MangaProps } from "@/types/manga";
import { calcCurProgress } from "@/app/shows/utils/progressCalc";
import {
	episodeCountOf,
	progressLabel,
	slotIndexOf,
	timelineOf,
} from "@/app/shows/utils/slotRef";
import {
	chapterLabel,
	chapterProgress,
} from "@/app/manga/utils/chapterProgress";

// score badge rule
const scoreLabel = (mu?: number) => {
	if (!mu) return "–";
	const score = getDisplayScore(mu);
	return score === 10 ? "10" : score.toFixed(1);
};

function timeAgo(date: Date, short = false): string {
	const ago = short ? "" : " ago";
	const diff = Date.now() - new Date(date).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return short ? "now" : "just now";
	if (mins < 60) return `${mins}m${ago}`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h${ago}`;
	const days = Math.floor(hrs / 24);
	if (days < 30) return `${days}d${ago}`;
	const months = Math.floor(days / 30);
	return `${months}mo${ago}`;
}

function Poster({ item }: { item: BaseMediaProps }) {
	return (
		<div className="relative h-18 w-12 shrink-0 overflow-hidden rounded-md bg-zinc-900 p-0.5 shadow-island sm:h-20 sm:w-14">
			{item.imageUrl ? (
				<Image
					src={item.imageUrl}
					alt={item.title}
					className="h-full w-full rounded-sm object-cover transition-transform duration-300 ease-out group-hover/card:scale-[1.06]"
					width={112}
					height={168}
					sizes="56px"
					unoptimized={!isResizable(item.imageUrl)}
				/>
			) : (
				<div className="h-full w-full rounded-sm neu-carved" />
			)}
		</div>
	);
}

// the moving half of a track
function StatusWave({ status }: { status: MediaStatus }) {
	return (
		<div
			className="absolute inset-0"
			style={{
				background: getStatusWaveColor(status),
				animation: "wave 4s ease-in-out infinite",
				width: "200%",
			}}
		/>
	);
}

function StatusTrack({
	status,
	progress,
	shape = "relative mt-0.5 h-0.75 w-full rounded-full",
}: {
	status: MediaStatus;
	progress: number | null;
	shape?: string;
}) {
	if (progress == null)
		return (
			<div className={`overflow-hidden ${shape} ${getStatusBg(status)}`}>
				<StatusWave status={status} />
			</div>
		);

	return (
		<div className={`overflow-hidden bg-zinc-800/80 ${shape}`}>
			<div
				className={`relative h-full overflow-hidden rounded-full transition-all duration-500 ease-out ${getStatusBg(
					status,
				)}`}
				style={{ width: `${progress}%` }}
			>
				<StatusWave status={status} />
			</div>
		</div>
	);
}

// show only
function showProgressOf(item: BaseMediaProps) {
	const show = item as unknown as ShowProps;
	const line = timelineOf(show);
	if (!line.length) return { progress: 100, label: null };

	const at = slotIndexOf(show);
	const totalEps = episodeCountOf(line[at]);
	return {
		// an airing part announces no count -- nothing to divide into
		progress: totalEps
			? calcCurProgress(line, at, show.curEpisode ?? 0)
			: 100,
		label: progressLabel(line, at, show.curEpisode),
	};
}

function progressOf(item: BaseMediaProps, mediaType: string) {
	if (mediaType === "shows") return showProgressOf(item);
	if (mediaType === "manga") {
		const manga = item as unknown as MangaProps;
		return {
			progress: chapterProgress(manga),
			label: chapterLabel(manga),
		};
	}
	return { progress: null, label: null };
}

// a phone's folded recents
export function RecentPeek({
	items,
	label,
	open,
	controls,
	onToggle,
}: {
	items: BaseMediaProps[];
	label: string;
	open: boolean;
	controls: string;
	onToggle: (peek: HTMLElement) => void;
}) {
	const latest = items[0];
	return (
		<button
			type="button"
			aria-expanded={open}
			aria-controls={controls}
			aria-label={`Recent ${label}`}
			onClick={(e) => onToggle(e.currentTarget)}
			className={`group/peek relative flex w-full items-center rounded-lg neu-carved pr-10 pl-3.5 transition-[height,background-color,box-shadow,transform] duration-[300ms,200ms,200ms,200ms] ease-arrive hover:neu-carved-hi hover:cursor-pointer active:translate-y-px active:neu-carved-in active:duration-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 motion-reduce:transition-none ${
				open ? "h-8" : "h-15"
			}`}
		>
			<span
				className={`flex items-center gap-3 transition-[opacity,scale] duration-200 ease-out motion-reduce:transition-none ${
					open ? "scale-95 opacity-0" : ""
				}`}
			>
				<span className="flex items-center">
					{items.map((item, i) => (
						<span
							key={item.id}
							className="relative -ml-3 h-10 w-7.5 shrink-0 origin-bottom overflow-hidden rounded-[0.3rem] bg-zinc-900 p-px shadow-island first:ml-0"
							// latest on top, the rest tucked behind it
							style={{
								zIndex: items.length - i,
								rotate: `${i * 7}deg`,
							}}
						>
							{item.imageUrl ? (
								<Image
									src={item.imageUrl}
									alt=""
									className="h-full w-full rounded-sm object-cover"
									width={60}
									height={80}
									sizes="30px"
									unoptimized={!isResizable(item.imageUrl)}
								/>
							) : (
								<span className="block h-full w-full rounded-sm neu-carved" />
							)}
						</span>
					))}
				</span>
				<span className="text-sm font-semibold whitespace-nowrap text-zinc-500/90">
					{latest.lastUpdated ? timeAgo(latest.lastUpdated) : "–"}
				</span>
			</span>
			<ChevronDown
				aria-hidden
				strokeWidth={2.25}
				className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500 transition-[rotate,color,right,translate] duration-300 ease-arrive group-hover/peek:text-zinc-300 motion-reduce:transition-none ${
					open ? "right-1/2 translate-x-1/2 rotate-180" : "right-3"
				}`}
			/>
		</button>
	);
}

export function RecentItems({
	items,
	mediaType,
	href,
	onNavigate,
}: {
	items: BaseMediaProps[];
	mediaType: string;
	// the libray the row belongs to
	href: string;
	onNavigate?: () => void;
}) {
	if (!items || items.length === 0) return null;

	return (
		<ul className="flex flex-col gap-2">
			{items.map((item, i) => {
				const { progress, label } = progressOf(item, mediaType);

				return (
					<li key={item.id} className="relative">
						{i > 0 && (
							<span
								aria-hidden
								className="absolute inset-x-2 -top-1 h-px bg-linear-to-r from-transparent via-zinc-700/50 to-transparent"
							/>
						)}
						<Link
							href={item.id ? `${href}?open=${item.id}` : href}
							onNavigate={onNavigate}
							className="group/card relative flex items-center gap-3 rounded-lg p-2 transition-[background-color,box-shadow,transform] duration-200 ease-out hover:neu-carved-hi hover:cursor-pointer active:translate-y-px active:neu-carved-in active:duration-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
						>
							<Poster item={item} />
							{/* title | score */}
							<div className="flex min-w-0 flex-1 flex-col justify-center">
								<div className="flex items-center justify-between">
									<p
										className="min-w-0 truncate text-sm leading-snug font-semibold text-zinc-300 transition-colors duration-200 ease-out group-hover/card:text-zinc-100 sm:text-base"
										title={item.title}
									>
										{item.title}
									</p>
									<span className="shrink-0 -my-1.25 rounded-md neu-carved p-1.25 px-2 text-center text-xs font-bold text-zinc-300/75 tabular-nums transition-[opacity,transform] duration-200 ease-out group-hover/card:translate-x-1 group-hover/card:opacity-0 min-w-[4ch] sm:text-[0.8125rem]">
										{scoreLabel(item.score?.mu)}
									</span>
								</div>
								{/* update time */}
								<div className="flex items-baseline justify-between gap-2 mb-1">
									<p className="shrink-0 whitespace-nowrap text-zinc-500/90 text-sm font-semibold">
										{item.lastUpdated
											? timeAgo(item.lastUpdated)
											: "–"}
									</p>
									{label && (
										<span className="min-w-0 truncate text-[0.6875rem] font-medium tracking-wide text-zinc-400 tabular-nums transition-[opacity,transform] duration-200 ease-out group-hover/card:translate-x-1 group-hover/card:opacity-0 pr-1 pt-1">
											{label}
										</span>
									)}
								</div>
								<StatusTrack
									status={item.status}
									progress={progress}
								/>
							</div>
							<ChevronRight
								aria-hidden
								strokeWidth={2.25}
								className="pointer-events-none absolute top-2/5 right-3 h-5.5 w-5.5 -translate-x-1.5 -translate-y-1/2 text-zinc-400 opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover/card:translate-x-0 group-hover/card:opacity-100 group-active/card:translate-x-0.5"
							/>
						</Link>
					</li>
				);
			})}
		</ul>
	);
}

export type PosterTone = "rest" | "lit" | "dim";
const TONE: Record<PosterTone, string> = {
	rest: "brightness(0.74) saturate(0.85)",
	lit: "brightness(0.9) saturate(0.95)",
	dim: "brightness(0.62) saturate(0.78)",
};
const REFLECTION: Record<PosterTone, number> = {
	rest: 0.32,
	lit: 0.38,
	dim: 0.26,
};
const RIPPLE_TILE = { w: 256, h: 64 };
const RIPPLE_LOOP_S = 3.2;

function WaterFilter({ id, still }: { id: string; still: boolean }) {
	return (
		<svg aria-hidden className="absolute h-0 w-0">
			<filter
				id={id}
				primitiveUnits="userSpaceOnUse"
				x="-5%"
				y="-5%"
				width="110%"
				height="110%"
			>
				<feTurbulence
					type="fractalNoise"
					baseFrequency="0.006 0.09"
					numOctaves="2"
					seed="3"
					stitchTiles="stitch"
					x="0"
					y="0"
					width={RIPPLE_TILE.w}
					height={RIPPLE_TILE.h}
					result="tile"
				/>
				<feTile in="tile" result="water" />
				<feOffset
					in="water"
					dy="0"
					x="0"
					y="0"
					width={RIPPLE_TILE.w}
					height={RIPPLE_TILE.h}
					result="slid"
				>
					{!still && (
						<animate
							attributeName="dy"
							from="0"
							to={-RIPPLE_TILE.h}
							dur={`${RIPPLE_LOOP_S}s`}
							repeatCount="indefinite"
						/>
					)}
				</feOffset>
				<feTile in="slid" result="flow" />
				<feDisplacementMap in="SourceGraphic" in2="flow" scale="8" />
			</filter>
		</svg>
	);
}
export function RecentPoster({
	item,
	mediaType,
	href,
	onNavigate,
	icon: Icon,
	priority,
	tone = "rest",
	onHover,
	revealed = true,
	revealDelay = 0,
	onReady,
}: {
	item: BaseMediaProps;
	mediaType: string;
	href: string;
	onNavigate?: () => void;
	// which library it came from
	icon?: LucideIcon;
	priority?: boolean;
	tone?: PosterTone;
	onHover?: (over: boolean) => void;
	// held as a dark frame until the row is ready
	revealed?: boolean;
	revealDelay?: number;
	onReady?: () => void;
}) {
	const { progress, label } = progressOf(item, mediaType);
	const still = useReducedMotion() ?? false;
	const waterId = `water-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
	const [loaded, setLoaded] = useState(!item.imageUrl);
	const shown = revealed && loaded;
	// the stagger is for the first fill only
	const [settled, setSettled] = useState(false);
	useEffect(() => {
		if (!shown || settled) return;
		const id = setTimeout(() => setSettled(true), revealDelay + 800);
		return () => clearTimeout(id);
	}, [shown, settled, revealDelay]);
	const fill = {
		opacity: shown ? 1 : 0,
		transition: "opacity 800ms cubic-bezier(0.16, 1, 0.3, 1)",
		transitionDelay: settled ? "0ms" : `${revealDelay}ms`,
	};
	useEffect(() => {
		if (!item.imageUrl) onReady?.();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const chip =
		"rounded-md bg-black/65 px-2 py-0.75 text-[0.8125rem] leading-none font-bold tracking-wide text-zinc-100 tabular-nums backdrop-blur-sm";
	return (
		<Link
			href={item.id ? `${href}?open=${item.id}` : href}
			onNavigate={onNavigate}
			onMouseEnter={() => onHover?.(true)}
			onMouseLeave={() => onHover?.(false)}
			onFocus={() => onHover?.(true)}
			onBlur={() => onHover?.(false)}
			className="group/poster flex min-w-0 flex-col gap-3.5 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-400"
		>
			<div className="relative isolate transition-[translate] duration-700 ease-arrive group-hover/poster:-translate-y-1.5">
				<div className="relative aspect-2/3 overflow-hidden rounded-xl bg-zinc-900 shadow-island transition-shadow duration-700 ease-arrive group-hover/poster:shadow-[0_28px_50px_-14px_rgba(0,0,0,0.85)]">
					<div
						className="absolute inset-0 transition-[filter] duration-700 ease-arrive"
						style={{ filter: TONE[tone] }}
					>
						<div className="absolute inset-0" style={fill}>
							{item.imageUrl ? (
								<Image
									src={item.imageUrl}
									alt={item.title}
									fill
									onLoad={() => {
										setLoaded(true);
										onReady?.();
									}}
									className="object-cover"
									sizes="(min-width: 80rem) 15rem, 11rem"
									priority={priority}
									unoptimized={!isResizable(item.imageUrl)}
								/>
							) : (
								<div className="h-full w-full neu-carved" />
							)}
							{item.score?.mu ? (
								<span
									className={`absolute top-2.5 right-2.5 ${chip}`}
								>
									{scoreLabel(item.score.mu)}
								</span>
							) : null}
							{label && (
								<span
									className={`absolute bottom-3 left-2.5 ${chip}`}
								>
									{label}
								</span>
							)}
							{/* status along the art's bottom edge */}
							<StatusTrack
								status={item.status}
								progress={progress}
								shape="absolute inset-x-0 bottom-0 h-1"
							/>
						</div>
					</div>
				</div>
				{item.imageUrl && <WaterFilter id={waterId} still={still} />}
				{item.imageUrl && (
					<div
						aria-hidden
						className="pointer-events-none absolute inset-x-0 top-full -z-10 h-[42%] overflow-hidden transition-opacity duration-700 ease-arrive mask-[linear-gradient(to_bottom,transparent_0,transparent_2.75rem,black_3.75rem,transparent_100%)]"
						style={{
							opacity: shown ? REFLECTION[tone] : 0,
							transitionDelay: settled
								? "0ms"
								: `${revealDelay}ms`,
						}}
					>
						<div
							className="absolute inset-x-0 top-0 aspect-2/3 -scale-y-100"
							style={{
								filter: `url(#${waterId}) blur(1px) ${TONE[tone]}`,
							}}
						>
							<Image
								src={item.imageUrl}
								alt=""
								fill
								className="rounded-xl object-cover"
								sizes="(min-width: 80rem) 15rem, 11rem"
								unoptimized={!isResizable(item.imageUrl)}
							/>
						</div>
					</div>
				)}
			</div>
			<div
				className="relative flex min-w-0 items-center gap-2 px-0.5 transition-opacity duration-700 ease-arrive"
				style={{
					opacity: shown ? (tone === "dim" ? 0.8 : 1) : 0,
					transitionDelay: settled ? "0ms" : `${revealDelay}ms`,
				}}
			>
				{Icon && (
					<Icon
						className="h-4 w-4 shrink-0 text-zinc-500"
						strokeWidth={1.75}
					/>
				)}
				<p
					className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold text-zinc-300 transition-colors duration-200 group-hover/poster:text-zinc-100"
					title={item.title}
				>
					{item.title}
				</p>
				<span className="shrink-0 text-[0.9375rem] font-medium text-zinc-500 tabular-nums">
					{item.lastUpdated ? timeAgo(item.lastUpdated, true) : "–"}
				</span>
			</div>
		</Link>
	);
}
