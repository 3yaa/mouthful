"use client";
import Image from "next/image";
import { Fragment, useEffect, useRef, useState } from "react";
import {
	AnimatePresence,
	LayoutGroup,
	motion,
	useReducedMotion,
	Variants,
} from "framer-motion";
import { ArrowUpRight, ChevronDown, X } from "lucide-react";
import {
	AnimeMovieProps,
	ShowProps,
	ShowSeasonProps,
	SlotIndex,
} from "@/types/show";
import {
	parentIndex,
	franchiseRomajiOf,
	movieIndex,
	movieExtrasOf,
	orderMoviesOf,
	hiddenExtrasOf,
	slotIndexAt,
	slotIndexOf,
	sourceOf,
	timelineOf,
} from "@/app/shows/utils/slotRef";
import { weigherOf } from "@/app/shows/utils/animePartMarks";
import {
	getStatusAccent,
	statusBezel,
	HEADER_WASH_MASK,
} from "@/utils/styleUtils";
import { titleCase } from "@/app/shows/utils/animeTitles";
import { ModalBackdrop, ModalPanel } from "@/app/components/ui/ModalMotion";
import {
	Bead,
	HIGHLIGHT_SHAPE,
	INK,
	type SlotState,
	colorOf,
	cursorBlade,
	hoverFill,
	mix,
	onActivate,
	rowName,
	runtimeOf,
} from "./RowChrome";
import {
	CutPicker,
	ExtraRows,
	MovieRow,
	type Rail,
	SlotRow,
	listVariants,
} from "./TimelineRows";

export interface AnimeChainProps {
	show: ShowProps;
	onClose: () => void;
	// browsing, not moving
	onPickSlot: (index: SlotIndex) => void;
	// this is where I am
	onWatchSlot: (index: SlotIndex) => void;
	// the part being looked at, when that is not the part being watched
	viewIndex?: SlotIndex | null;
	onPickCut?: (groupIds: number[], chosenId: number) => void;
	canPickCut?: boolean;
	onHide?: (anilistId: number) => void;
	onUnhide?: (anilistId: number) => void;
}

// ─── the header

const sourceKind = (format?: string) => {
	const f = (format ?? "").toUpperCase();
	if (f.includes("NOVEL") && f !== "VISUAL_NOVEL") return "novel";
	if (f === "ONE_SHOT") return "one-shot";
	if (f === "VISUAL_NOVEL") return "game";
	return f.toLowerCase().replace(/_/g, " ") || "source";
};

const railColorOf = (show: ShowProps, line?: ShowSeasonProps[]) =>
	colorOf(
		show.cover?.color ??
			(line ?? timelineOf(show)).find((slot) => !slot.isSide)
				?.posterColor,
	);

function SourceLine({
	show,
	className = "",
	onOpen,
}: {
	show: ShowProps;
	className?: string;
	onOpen?: () => void;
}) {
	const source = sourceOf(show);
	if (!source) return null;
	const color = railColorOf(show);
	const opens = !!onOpen;

	const body = (
		<>
			{opens && (
				<span
					aria-hidden
					className="pointer-events-none absolute -inset-x-1.5 -inset-y-1 rounded-lg opacity-0 transition-opacity duration-300 group-hover/source:opacity-100"
					style={{
						background: `linear-gradient(100deg, ${mix(color, 14)}, ${mix(color, 4)} 70%, transparent)`,
					}}
				/>
			)}
			<span
				className={`relative min-w-0 flex-1 truncate text-left text-[0.74rem] text-zinc-400 transition-colors ${
					opens ? "group-hover/source:text-zinc-100" : ""
				}`}
			>
				{rowName(source.title, show.title, franchiseRomajiOf(show))}
			</span>
			<span className="relative flex h-6 shrink-0 items-center justify-end">
				<span
					className={`flex h-4 items-center rounded px-1.5 neu-carved text-[0.62rem] tracking-[0.06em] indent-[0.06em] transition-opacity duration-200 ${
						opens ? "group-hover/source:opacity-0" : ""
					}`}
					style={{
						color: mix(color, 24, INK),
						background: mix(color, 12),
					}}
				>
					{sourceKind(source.format)}
				</span>
				{opens && (
					<span className="absolute right-0 flex h-6 w-6 items-center justify-center rounded-lg neu-carved opacity-0 transition-opacity duration-200 group-hover/source:opacity-100">
						<ArrowUpRight className="w-3.5 h-3.5 text-zinc-300/80" />
					</span>
				)}
			</span>
		</>
	);

	const shell = `group/source relative flex min-w-0 items-center gap-2 ${className}`;
	const title = `Adapted from the ${sourceKind(source.format)} "${source.title}"`;

	return opens ? (
		<button
			type="button"
			onClick={onOpen}
			title={title}
			className={`${shell} hover:cursor-pointer`}
		>
			{body}
		</button>
	) : (
		<div className={shell} title={title}>
			{body}
		</div>
	);
}

// ─── progress

type Pip = { key: string; at: SlotIndex };

function mainLinePips(show: ShowProps): Pip[] {
	const line = timelineOf(show);
	const pips: Pip[] = [];
	line.forEach((slot, index) => {
		if (slot.isSide) return;
		pips.push({
			key: String(slot.anilistId ?? `pip-${index}`),
			at: slotIndexAt(index),
		});
	});
	return pips;
}

function Pips({ show }: { show: ShowProps }) {
	const curIndex = slotIndexOf(show);
	const isDone = show.status === "Completed";
	const accent = getStatusAccent(show.status);

	return (
		<div className="flex items-center gap-1">
			{mainLinePips(show).map((pip) => {
				// a stop is behind you once you are on it
				const current = !isDone && pip.at === curIndex;
				const lit = isDone || pip.at <= curIndex;
				return (
					<span
						key={pip.key}
						className="h-0.75 flex-1 rounded-full transition-all duration-500"
						style={{
							background: lit
								? mix(accent, current ? 95 : 60)
								: "rgba(255,255,255,0.13)",
							boxShadow: current
								? `0 0 6px ${mix(accent, 45)}`
								: undefined,
						}}
					/>
				);
			})}
		</div>
	);
}

// ─── walk, list it fills

function ChainRows({
	show,
	onClose,
	onPickSlot,
	onWatchSlot,
	viewIndex,
	onPickCut,
	canPickCut,
	onHide,
	onUnhide,
}: AnimeChainProps) {
	const reduced = useReducedMotion();
	const scrollRef = useRef<HTMLDivElement>(null);
	const railPointer = useRef<{
		x: number;
		y: number;
		dragged: boolean;
	} | null>(null);
	const linkedRef = useRef<HTMLElement | null>(null);
	const opened = useRef(false);

	const line = timelineOf(show);
	const romaji = franchiseRomajiOf(show);
	const curIndex = slotIndexOf(show);
	const isDone = show.status === "Completed";
	const hereColor = getStatusAccent(show.status);
	const railColor = railColorOf(show, line);
	const weights = line.map(weigherOf(line));
	const wholeWeight = weights.reduce((sum, weight) => sum + weight, 0);
	const shareOf = (index?: SlotIndex | null) =>
		index == null || wholeWeight <= 0 ? 0 : weights[index] / wholeWeight;
	const mostShare = shareOf(
		slotIndexAt(
			weights.reduce(
				(most, weight, at) => (weight > weights[most] ? at : most),
				0,
			),
		),
	);
	// the row the details card is showing
	const linked = viewIndex ?? curIndex;

	// mark main movie
	const movies = orderMoviesOf(show);
	const movieOf = new Map(
		movies.map((movie) => [movie.anilistId, movie] as const),
	);
	const hangingIds = new Set(
		movies
			.filter((movie) => !movie.isMainLine)
			.map((movie) => movie.anilistId),
	);
	// still positions -- this changes only where the rail draws
	const movieExtras = movieExtrasOf(show);
	const underMovieIds = new Set(
		[...movieExtras.values()].flat().map((extra) => extra.anilistId),
	);
	const lineIndexOf = new Map(
		line.map((slot, at) => [slot.anilistId, slotIndexAt(at)] as const),
	);
	const moviesBySlot = new Map<number, AnimeMovieProps[]>();
	const moviesBeforeSlot = new Map<number, AnimeMovieProps[]>();
	const looseMovies: AnimeMovieProps[] = [];
	for (const movie of movies) {
		// drawn at its own index
		if (!hangingIds.has(movie.anilistId)) continue;
		// a declared prequel belongs before its parent even when it was released later
		const before = movie.placement === "before";
		const at = before ? parentIndex(line, movie) : movieIndex(line, movie);
		if (at === -1) {
			looseMovies.push(movie);
			continue;
		}
		const bucket = before ? moviesBeforeSlot : moviesBySlot;
		const list = bucket.get(at);
		if (list) list.push(movie);
		else bucket.set(at, [movie]);
	}
	const byRelease = (a: AnimeMovieProps, z: AnimeMovieProps) =>
		(a.startDate ?? "9999").localeCompare(z.startDate ?? "9999");
	for (const list of moviesBySlot.values()) list.sort(byRelease);
	for (const list of moviesBeforeSlot.values()) list.sort(byRelease);
	looseMovies.sort(byRelease);

	//
	const lastMain = line.reduce(
		(last, slot, at) => (slot.isSide ? last : at),
		-1,
	);

	const stateOf = (index: SlotIndex): SlotState => {
		if (isDone || index < curIndex) return "watched";
		return index === curIndex ? "current" : "ahead";
	};

	// open on the entry you are on and follow the cursor after
	useEffect(() => {
		const box = scrollRef.current;
		const row = linkedRef.current;
		if (!box || !row) return;
		const top =
			row.getBoundingClientRect().top -
			box.getBoundingClientRect().top +
			box.scrollTop;
		const first = !opened.current;
		opened.current = true;
		const above = top < box.scrollTop + 8;
		const below =
			top + row.clientHeight > box.scrollTop + box.clientHeight - 8;
		if (!first && !above && !below) return;
		const to = Math.max(
			0,
			top - box.clientHeight / 2 + row.clientHeight / 2,
		);
		if (first || reduced) box.scrollTop = to;
		else box.scrollTo({ top: to, behavior: "smooth" });
	}, [linked, reduced]);

	const rowVariants: Variants = reduced
		? { hidden: { opacity: 1 }, visible: { opacity: 1 } }
		: {
				hidden: { opacity: 0, y: 10 },
				visible: {
					opacity: 1,
					y: 0,
					transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
				},
			};

	//
	const cursorMark = (
		<motion.span
			layoutId="chain-cursor"
			aria-hidden
			className="absolute right-0 inset-y-1 w-0.75 rounded-full"
			style={{
				background: cursorBlade(hereColor),
				boxShadow: `0 0 10px ${mix(hereColor, 55)}`,
			}}
			transition={
				reduced
					? { duration: 0 }
					: {
							type: "spring",
							stiffness: 420,
							damping: 34,
						}
			}
		/>
	);

	const rail: Rail = {
		show,
		line,
		romaji,
		curIndex,
		linked,
		viewIndex,
		isDone,
		stateOf,
		hereColor,
		railColor,
		shareOf,
		mostShare,
		lineIndexOf,
		movieOf,
		movieExtras,
		moviesBySlot,
		moviesBeforeSlot,
		underMovieIds,
		lastMain,
		reduced,
		rowVariants,
		cursorMark,
		linkedRef,
		onPickSlot,
		onWatchSlot,
		onHide,
		onPickCut,
		canPickCut,
	};

	return (
		<div
			ref={scrollRef}
			onPointerDown={(event) => {
				railPointer.current = {
					x: event.clientX,
					y: event.clientY,
					dragged: false,
				};
			}}
			onPointerMove={(event) => {
				const start = railPointer.current;
				if (!start || start.dragged) return;
				if (
					Math.hypot(
						event.clientX - start.x,
						event.clientY - start.y,
					) > 5
				)
					start.dragged = true;
			}}
			onPointerCancel={() => {
				railPointer.current = null;
			}}
			onClickCapture={(event) => {
				const dragged = railPointer.current?.dragged;
				railPointer.current = null;
				if (dragged) {
					event.preventDefault();
					event.stopPropagation();
					return;
				}

				const target = event.target as HTMLElement;
				if (target.closest("button, a, [role='button']")) return;
				onClose();
			}}
			className="relative min-h-0 shrink overflow-y-auto px-3.5 pb-3.5"
			style={{
				maskImage:
					"linear-gradient(to bottom, black calc(100% - 0.85rem), transparent)",
				WebkitMaskImage:
					"linear-gradient(to bottom, black calc(100% - 0.85rem), transparent)",
			}}
		>
			<motion.ul
				className="relative pl-6"
				variants={listVariants}
				initial="hidden"
				animate="visible"
			>
				{line.map((slot, index) => {
					if (
						slot.anilistId != null &&
						underMovieIds.has(slot.anilistId)
					)
						return null;
					if (
						slot.anilistId != null &&
						hangingIds.has(slot.anilistId)
					)
						return null;
					return (
						<SlotRow
							key={slot.anilistId ?? `slot-${index}`}
							rail={rail}
							slot={slot}
							index={slotIndexAt(index)}
						/>
					);
				})}

				{/* an unannounced date, or a parent the last rebuild renumbered away */}
				{looseMovies.length > 0 && (
					<motion.li variants={rowVariants} className="mt-2">
						{looseMovies.map((movie, at) => (
							<Fragment key={`movie-loose-${movie.anilistId}`}>
								<MovieRow
									rail={rail}
									movie={movie}
									linkedAbove={at > 0}
								/>
								<ExtraRows rail={rail} movie={movie} />
								{/* no parent, but the same cuts a placed one has */}
								<CutPicker
									current={movie}
									variants={movie.variants ?? []}
									color={colorOf(movie.posterColor)}
									hang
									canPick={canPickCut}
									onPick={onPickCut}
								/>
							</Fragment>
						))}
					</motion.li>
				)}
			</motion.ul>
			<SetAside show={show} onUnhide={onUnhide} />
		</div>
	);
}

// ─── left off

function SetAside({
	show,
	onUnhide,
}: {
	show: ShowProps;
	onUnhide?: (anilistId: number) => void;
}) {
	const [open, setOpen] = useState(false);
	const [copied, setCopied] = useState<number | null>(null);
	const copiedTimer = useRef<number | undefined>(undefined);
	useEffect(() => () => window.clearTimeout(copiedTimer.current), []);
	const reduced = useReducedMotion();
	// off the watch order, still on the chain -- side stories and side movies alike
	const rows = hiddenExtrasOf(show).sort((a, z) =>
		(a.startDate ?? "9999").localeCompare(z.startDate ?? "9999"),
	);
	if (!rows.length) return null;

	return (
		<div className="mt-1.5 border-t border-zinc-800/40 pt-1.5">
			<button
				type="button"
				onClick={() => setOpen((was) => !was)}
				title="Entries that are not on the watch order"
				className="group/aside relative flex w-full items-center gap-2 py-1 text-left hover:cursor-pointer"
			>
				<span
					className={`min-w-0 flex-1 truncate text-[0.72rem] transition-colors ${
						open
							? "text-zinc-300"
							: "text-zinc-500 group-hover/aside:text-zinc-300"
					}`}
				>
					Set aside
				</span>
				<span className="text-[0.6rem] tracking-wide text-zinc-600">
					{rows.length}
				</span>
				<ChevronDown
					aria-hidden
					strokeWidth={2}
					className={`w-3 h-3 shrink-0 text-zinc-600 transition-transform duration-300 ${
						open ? "rotate-180" : ""
					}`}
				/>
			</button>

			<AnimatePresence initial={false}>
				{open && (
					<motion.ul
						initial={
							reduced ? { opacity: 0 } : { height: 0, opacity: 0 }
						}
						animate={
							reduced
								? { opacity: 1 }
								: { height: "auto", opacity: 1 }
						}
						exit={
							reduced ? { opacity: 0 } : { height: 0, opacity: 0 }
						}
						transition={{
							height: { duration: 0.34, ease: [0.16, 1, 0.3, 1] },
							opacity: { duration: 0.2 },
						}}
						className="-mx-2 overflow-hidden px-2"
					>
						{rows.map((node) => {
							const color = colorOf(node.posterColor);
							const restorable =
								node.anilistId != null && !!onUnhide;
							const movie = node.kind === "film";
							const runtime = movie
								? runtimeOf({
										episode_count: node.episode_count || 1,
										duration: node.duration,
									})
								: 0;
							const year = node.startDate?.slice(0, 4) ?? null;
							// a movie with no runtime falls to its year
							const size = movie
								? runtime
									? `${runtime} min`
									: year
								: node.duration
									? `${node.duration} min`
									: node.episode_count
										? `${node.episode_count} ep`
										: year;
							const label = rowName(
								node.title,
								show.title,
								franchiseRomajiOf(show),
							);
							const copy = () => {
								navigator.clipboard
									?.writeText(label)
									.catch(() => {});
								setCopied(node.anilistId);
								window.clearTimeout(copiedTimer.current);
								copiedTimer.current = window.setTimeout(
									() => setCopied(null),
									1400,
								);
							};
							const disc = (
								<Bead
									state="ahead"
									kind={movie ? "film" : "side"}
									format={node.format}
									danger={restorable}
									className=""
								/>
							);
							return (
								<li
									key={node.anilistId}
									className="group/row relative flex items-center gap-2.5 py-1"
								>
									<span
										aria-hidden
										className={`pointer-events-none ${HIGHLIGHT_SHAPE} -left-1.5 bg-linear-to-r from-white/[0.028] via-white/[0.012] to-transparent`}
									/>
									<span
										aria-hidden
										className={`pointer-events-none opacity-0 transition-opacity duration-300 group-hover/row:opacity-100 ${HIGHLIGHT_SHAPE} -left-1.5`}
										style={{ background: hoverFill(color) }}
									/>
									{restorable ? (
										<button
											type="button"
											onClick={() =>
												onUnhide?.(node.anilistId)
											}
											title="Put it back on the watch order"
											aria-label={`Put ${node.title ?? "this"} back on the watch order`}
											className="group/restore relative shrink-0 rounded-full hover:cursor-pointer focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-red-400"
										>
											{disc}
										</button>
									) : (
										<span className="relative shrink-0">
											{disc}
										</span>
									)}
									<div
										role="button"
										tabIndex={0}
										title={`${label} -- click to copy the name`}
										onClick={copy}
										onKeyDown={onActivate(copy)}
										className="relative flex min-w-0 flex-1 items-center gap-2.5 text-left hover:cursor-pointer"
									>
										<span className="min-w-0 flex-1 truncate text-[0.7rem] text-zinc-500 transition-colors group-hover/row:text-zinc-300">
											{label}
										</span>
										<span className="flex h-6 shrink-0 items-center justify-end text-[0.58rem] tracking-wide text-zinc-600">
											{copied === node.anilistId
												? "copied"
												: size}
										</span>
									</div>
								</li>
							);
						})}
					</motion.ul>
				)}
			</AnimatePresence>
		</div>
	);
}

// ─── docked beside details modal

export function AnimeChainRail(props: AnimeChainProps) {
	const { show } = props;
	const reduced = useReducedMotion();
	const statusColor = getStatusAccent(show.status);

	return (
		<motion.aside
			initial={reduced ? { opacity: 0 } : { opacity: 0, x: 22 }}
			animate={{
				opacity: 1,
				x: 0,
				transition: {
					x: { duration: 0.44, ease: [0.16, 1, 0.3, 1] },
					opacity: { duration: 0.24, ease: "easeOut" },
				},
			}}
			exit={{
				opacity: 0,
				x: reduced ? 0 : 22,
				transition: {
					x: { duration: 0.28, ease: [0.7, 0, 0.84, 0] },
					opacity: { duration: 0.16, delay: 0.12, ease: "easeIn" },
				},
			}}
			className="absolute left-full top-0 ml-3 max-h-full hidden 2xl:flex w-76 flex-col select-none rounded-[1.25rem] p-1 py-1.5"
			style={{
				background: statusBezel(show.status, 34, "top left"),
				boxShadow: `0 22px 55px -20px rgba(0,0,0,0.9), 0 0 34px -18px ${mix(statusColor, 45)}`,
			}}
		>
			<div className="relative flex min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-800/50 bg-[#121212] shadow-2xl">
				<header className="relative shrink-0 space-y-2 px-3.5 py-2.5">
					<SourceLine show={show} />
					<Pips show={show} />
				</header>
				<LayoutGroup id="chain-rail">
					<ChainRows {...props} />
				</LayoutGroup>
			</div>
		</motion.aside>
	);
}

// ─── modal

export function AnimeChainModal(props: AnimeChainProps) {
	const { show, onClose } = props;

	return (
		<ModalBackdrop className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-30">
			<div className="fixed inset-0" onClick={onClose} />
			<ModalPanel className="relative bg-zinc-950 rounded-2xl shadow-2xl w-[94vw] max-w-lg max-h-[86vh] flex flex-col overflow-hidden">
				{/* on mobile stands alone*/}
				<header className="relative shrink-0 px-6 pt-6 pb-4 text-center">
					{show.backdropUrl && (
						<div
							aria-hidden
							className="absolute inset-x-0 top-0 h-40 pointer-events-none"
							style={{
								maskImage: HEADER_WASH_MASK,
								WebkitMaskImage: HEADER_WASH_MASK,
								maskComposite: "intersect",
								WebkitMaskComposite: "source-in",
							}}
						>
							<Image
								src={show.backdropUrl}
								alt=""
								fill
								sizes="512px"
								unoptimized
								className="object-cover opacity-45"
							/>
							<div className="absolute inset-0 bg-linear-to-b from-zinc-950/30 via-zinc-950/70 to-zinc-950" />
						</div>
					)}

					<button
						onClick={onClose}
						title="Close"
						className="absolute right-3 top-3 z-10 p-1.5 rounded-lg text-zinc-500 hover:text-zinc-100 hover:cursor-pointer active:scale-95 transition-all"
					>
						<X className="w-4 h-4" />
					</button>

					<p className="relative font-display uppercase text-[0.58rem] tracking-[0.34em] text-zinc-400/70 indent-[0.34em]">
						Watch order
					</p>
					<h2 className="relative mt-1.5 font-display uppercase font-bold text-[1.35rem] leading-[1.15] tracking-wider bg-linear-to-b from-zinc-100 via-zinc-100/90 to-zinc-400/90 bg-size-[100%_1.15em] bg-repeat-y bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)] line-clamp-2">
						{titleCase(show.title)}
					</h2>
					<div className="relative mt-3.5">
						<Pips show={show} />
					</div>
					<SourceLine
						show={show}
						className="relative mt-2.5 justify-center"
					/>
				</header>
				<LayoutGroup id="chain-modal">
					<ChainRows {...props} />
				</LayoutGroup>
			</ModalPanel>
		</ModalBackdrop>
	);
}
