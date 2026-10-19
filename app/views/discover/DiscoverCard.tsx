"use client";
import {
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
	type CSSProperties,
	type ReactNode,
} from "react";
import Image from "next/image";
import { Leaf, type LucideIcon } from "lucide-react";
import { getStatusBorderColor } from "@/utils/styleUtils";
import type { MediaStatus } from "@/types/media";

const INK = "#09090b";

const washOf = (color?: string | null) =>
	color ? `color-mix(in srgb, ${color} 30%, ${INK})` : INK;

interface DiscoverCardProps {
	title: string;
	posterUrl: string | null;
	posterColor?: string | null;
	// bottom right of the art -- loses to title hover
	footChip?: ReactNode;
	caption?: { tag?: ReactNode };
	badge?: ReactNode;
	status?: MediaStatus | null;
	icon: LucideIcon;
	onClick: () => void;
	children: ReactNode;
}

export function DiscoverCard({
	title,
	posterUrl,
	posterColor,
	footChip,
	caption,
	badge,
	status,
	icon: Icon,
	onClick,
	children,
}: DiscoverCardProps) {
	const wash = washOf(posterColor);
	const washGradient = `linear-gradient(to top, ${INK}, color-mix(in srgb, ${wash} 94%, transparent) 22%, color-mix(in srgb, ${wash} 72%, transparent) 60%, transparent)`;
	return (
		<button
			type="button"
			onClick={onClick}
			className="@container group relative w-full text-left cursor-pointer rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800/50 shadow-md shadow-black/40 transition-[translate,box-shadow,border-color] duration-300 ease-out hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/60 hover:border-zinc-700/70 focus-visible:outline-2 focus-visible:outline-zinc-500"
		>
			{/* POSTER */}
			<div className="relative aspect-2/3 bg-zinc-900 overflow-hidden">
				{posterUrl ? (
					<Image
						src={posterUrl}
						alt={title}
						fill
						className="object-cover"
						sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 14rem"
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center bg-linear-to-br from-zinc-800 to-zinc-900">
						<Icon
							className="w-7 h-7 text-zinc-700"
							strokeWidth={1.5}
						/>
					</div>
				)}
				{badge && (
					<div className="absolute top-1.5 left-1.5 z-10">
						{badge}
					</div>
				)}
				{status && (
					<div className="absolute top-1.5 right-1.5 z-10 flex max-w-[70%] justify-end">
						<CornerChip>In List</CornerChip>
					</div>
				)}
				{footChip && (
					<div className="absolute bottom-1.5 inset-x-1.5 z-10 flex justify-end transition-opacity duration-300 group-hover:opacity-0 group-focus-visible:opacity-0">
						{footChip}
					</div>
				)}
				{caption && (
					<div
						className="absolute inset-x-0 bottom-0 z-10 px-2.5 pb-2.5 pt-12"
						style={{ background: washGradient }}
					>
						{caption.tag && (
							<div className="mb-1.5 flex">{caption.tag}</div>
						)}
						<CaptionTitle title={title} />
					</div>
				)}
				{!caption && (
					<div
						className="absolute inset-x-0 bottom-0 z-10 px-2.5 pb-2.5 pt-12 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-300"
						style={{ background: washGradient }}
					>
						<div className="translate-y-1 group-hover:translate-y-0 group-focus-visible:translate-y-0 transition-transform duration-300 ease-out">
							<p className="text-[0.8125rem] font-semibold leading-snug text-zinc-50 line-clamp-2">
								{title}
							</p>
						</div>
					</div>
				)}
			</div>
			<div className="relative z-10 -mt-px bg-zinc-950 px-2.5 py-2.5 grid grid-cols-[auto_1fr_auto] gap-x-1.5 items-center text-[0.75rem] @max-[11rem]:px-2 @max-[11rem]:gap-x-1">
				{children}
			</div>

			{status && (
				<div
					className={`pointer-events-none absolute inset-0 z-20 rounded-lg border-2 ${getStatusBorderColor(status)}`}
				/>
			)}
		</button>
	);
}

// a card's shape before its page lands
export function DiscoverCardSkeleton({ index }: { index: number }) {
	// a diagonal ripple -- column plus row
	const delay = ((index % 6) + Math.floor(index / 6)) * 0.07;
	return (
		<div
			className="discover-shimmer rounded-lg overflow-hidden bg-zinc-950 border border-zinc-800/50 shadow-md shadow-black/40"
			style={{ "--shimmer-delay": `${delay}s` } as CSSProperties}
		>
			<div className="aspect-2/3 bg-zinc-900/70" />
			<div className="-mt-px bg-zinc-950 px-2.5 py-2.5 grid grid-cols-[auto_1fr_auto] gap-x-1.5 items-center text-[0.8125rem]">
				<span className="h-2.5 w-10 rounded-sm bg-zinc-800/70" />
				<span className="h-2.5 w-8 justify-self-center rounded-sm bg-zinc-800/50" />
				<span className="flex items-center">
					<span className="invisible w-0">0</span>
					<span className="h-2.5 w-7 rounded-sm bg-zinc-800/70" />
				</span>
			</div>
		</div>
	);
}

// the long label while the cell holds it, else the short one
export function FitLabel({ full, short }: { full: string; short: string }) {
	const cellRef = useRef<HTMLSpanElement>(null);
	const probeRef = useRef<HTMLSpanElement>(null);
	const [fits, setFits] = useState(true);

	useLayoutEffect(() => {
		const cell = cellRef.current;
		const probe = probeRef.current;
		if (!cell || !probe || full === short) return setFits(true);
		const measure = () =>
			setFits(probe.getBoundingClientRect().width <= cell.clientWidth);
		measure();
		document.fonts?.ready.then(measure).catch(() => {});
		const observer = new ResizeObserver(measure);
		observer.observe(cell);
		return () => observer.disconnect();
	}, [full, short]);

	return (
		<span ref={cellRef} className="relative block truncate">
			<span
				ref={probeRef}
				aria-hidden
				className="invisible absolute left-0 top-0 whitespace-nowrap"
			>
				{full}
			</span>
			{fits ? full : short}
		</span>
	);
}

export function CornerChip({ children }: { children: ReactNode }) {
	return (
		<div className="grid h-5 min-w-5 max-w-full grid-cols-[minmax(0,auto)] px-1.5 items-center text-center rounded-md bg-zinc-900/80 backdrop-blur-sm border border-zinc-700/60 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-zinc-300">
			{children}
		</div>
	);
}

// blue = no score yet, red = imdb has no entry to score
export function ScoreLeaf({
	score,
	unlisted = false,
}: {
	score: number | null;
	unlisted?: boolean;
}) {
	return score != null ? (
		<span className="flex items-center gap-1">
			<Leaf
				className="w-3 h-3 text-emerald-300/75 fill-emerald-300/15"
				strokeWidth={1.75}
			/>
			<span className="text-[0.8125rem] font-bold tabular-nums text-zinc-100 tracking-tight">
				{score.toFixed(1)}
			</span>
		</span>
	) : (
		<Leaf
			aria-label={unlisted ? "Not on IMDb" : "No rating yet"}
			className={`w-3 h-3 ${
				unlisted
					? "text-red-400/75 fill-red-400/15"
					: "text-blue-400/75 fill-blue-400/15"
			}`}
			strokeWidth={1.75}
		/>
	);
}

const SCROLL_PACE = 0.06;

function CaptionTitle({ title }: { title: string }) {
	const ref = useRef<HTMLParagraphElement>(null);
	const [overflow, setOverflow] = useState(0);

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		const measure = () =>
			setOverflow(Math.max(0, el.scrollWidth - el.clientWidth));
		measure();
		document.fonts?.ready.then(measure);
		const observer = new ResizeObserver(measure);
		observer.observe(el);
		return () => observer.disconnect();
	}, [title]);

	const line =
		"text-[0.8125rem] font-semibold leading-snug whitespace-nowrap";
	return (
		<div className="relative">
			<p
				ref={ref}
				className={`${line} truncate text-zinc-300 transition-[opacity,color] duration-300 group-hover:text-zinc-100 group-focus-visible:text-zinc-100 ${overflow ? "group-hover:opacity-0 group-focus-visible:opacity-0" : ""}`}
			>
				{title}
			</p>
			{overflow > 0 && (
				<p
					aria-hidden
					className={`${line} absolute inset-0 overflow-hidden text-zinc-100 opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 mask-[linear-gradient(to_right,transparent,black_0.5rem,black_calc(100%-0.5rem),transparent)]`}
				>
					<span
						className="inline-block transition-transform ease-in-out delay-300 group-hover:translate-x-(--shift) group-focus-visible:translate-x-(--shift) motion-reduce:transition-none"
						style={
							{
								"--shift": `-${overflow}px`,
								transitionDuration: `${Math.round(overflow / SCROLL_PACE)}ms`,
							} as CSSProperties
						}
					>
						{title}
					</span>
				</p>
			)}
		</div>
	);
}
