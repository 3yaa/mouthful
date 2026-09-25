"use client";
import { Fragment, type RefObject, type ReactNode } from "react";
import { motion, Variants } from "framer-motion";
import {
	AnimeMovieProps,
	AnimeFormat,
	AnimeVariantProps,
	AnimeSideStoryProps,
	ShowProps,
	ShowSeasonProps,
	SlotIndex,
} from "@/types/show";
import {
	episodeCountOf,
	isMovieSlot,
	slotName,
} from "@/app/shows/utils/slotRef";
import { titleCase } from "@/app/shows/utils/animeTitles";
import {
	Bead,
	type Cut,
	HIGHLIGHT_X,
	HideNode,
	Meta,
	PlantButton,
	RowWash,
	type SlotState,
	Weight,
	branchElbow,
	branchLink,
	colorOf,
	kindOf,
	mix,
	onActivate,
	rowName,
	runtimeOf,
	sized,
} from "./RowChrome";

// ─── list

export const listVariants: Variants = {
	visible: { transition: { staggerChildren: 0.035, delayChildren: 0.06 } },
};

export interface Rail {
	show: ShowProps;
	// the watch order and the franchise's other name
	line: ShowSeasonProps[];
	romaji: string | null;
	curIndex: SlotIndex;
	linked: SlotIndex;
	viewIndex?: SlotIndex | null;
	hereDone: boolean;
	stateOf: (index: SlotIndex) => SlotState;
	hereColor: string;
	railColor: string;
	// what each stop is worth to the rolled-up score
	shareOf: (index?: SlotIndex | null) => number;
	mostShare: number;
	// the chain
	lineIndexOf: Map<number | null | undefined, SlotIndex>;
	movieOf: Map<number, AnimeMovieProps>;
	movieExtras: Map<number, AnimeSideStoryProps[]>;
	moviesBySlot: Map<number, AnimeMovieProps[]>;
	moviesBeforeSlot: Map<number, AnimeMovieProps[]>;
	underMovieIds: Set<number>;
	lastMain: number;
	reduced: boolean | null;
	rowVariants: Variants;
	cursorMark: ReactNode;
	// row the card is showing
	linkedRef: RefObject<HTMLElement | null>;
	onPickSlot: (index: SlotIndex) => void;
	onWatchSlot: (index: SlotIndex) => void;
	onHide?: (anilistId: number) => void;
	onPickCut?: (groupIds: number[], chosenId: number) => void;
	canPickCut?: boolean;
}

// ─── what a row is made of

const LEAN = { type: "spring", stiffness: 420, damping: 32 } as const;

function NodeMark({
	x,
	label,
	title,
	onHide,
	onPick,
	children,
}: {
	x: string;
	label: string;
	title?: string;
	onHide?: () => void;
	onPick?: () => void;
	children: ReactNode;
}) {
	if (onHide)
		return (
			<HideNode x={x} label={label} onHide={onHide}>
				{children}
			</HideNode>
		);
	if (!onPick) return <>{children}</>;
	return (
		<button
			type="button"
			onClick={onPick}
			title={title}
			aria-label={`View ${label}`}
			className={`absolute ${x} top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-full hover:cursor-pointer focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-zinc-300`}
		>
			{children}
		</button>
	);
}

function RowBody({
	label,
	title,
	scale,
	current,
	browsing,
	weight,
	reduced,
	box,
	onPick,
	onPlant,
}: {
	label: string;
	title?: string;
	// what hangs off from main
	scale: "part" | "side";
	current: boolean;
	browsing: boolean;
	weight: ReactNode;
	reduced: boolean | null;
	// the lane it sits in
	box: string;
	onPick: () => void;
	onPlant?: () => void;
}) {
	const part = scale === "part";
	return (
		<motion.div
			role="button"
			tabIndex={0}
			whileHover={reduced ? undefined : { x: 2 }}
			transition={LEAN}
			onClick={onPick}
			onKeyDown={onActivate(onPick)}
			title={title}
			aria-current={current ? "step" : undefined}
			className={`relative px-2 py-1.5 text-left transition-colors duration-300 hover:cursor-pointer ${box}`}
		>
			<div className="relative flex items-center gap-2">
				<span
					className={`min-w-0 flex-1 truncate transition-colors ${
						current
							? "text-[0.82rem] font-medium text-zinc-100"
							: browsing
								? `${part ? "text-[0.82rem] font-medium" : "text-[0.78rem]"} text-zinc-100`
								: part
									? "text-[0.82rem] font-medium text-zinc-300/80 group-hover:text-zinc-200/90"
									: "text-[0.78rem] text-zinc-400/90 group-hover:text-zinc-300"
					}`}
				>
					{label}
				</span>
				<Meta
					value={weight}
					pinned={current || browsing}
					action={
						onPlant ? <PlantButton onPlant={onPlant} /> : undefined
					}
				/>
			</div>
		</motion.div>
	);
}

// ─── rows

export function SlotRow({
	rail,
	slot,
	index,
}: {
	rail: Rail;
	slot: ShowSeasonProps;
	index: SlotIndex;
}) {
	const {
		show,
		line,
		curIndex,
		hereDone,
		stateOf,
		hereColor,
		railColor,
		shareOf,
		mostShare,
		linked,
		movieOf,
		moviesBySlot,
		moviesBeforeSlot,
		underMovieIds,
		lastMain,
		reduced,
		rowVariants,
		cursorMark,
		linkedRef,
		viewIndex,
		onPickSlot,
		onWatchSlot,
		onHide,
		onPickCut,
		canPickCut,
	} = rail;
	const state = stateOf(index);
	const current = state === "current";
	const side = !!slot.isSide;
	// refused ones never reach here -- timelineOf dropped them
	const onLine =
		!side && isMovieSlot(slot) && slot.anilistId != null
			? movieOf.get(slot.anilistId)
			: undefined;
	const color = colorOf(slot.posterColor);
	const name = slotName(show, slot, index);
	//
	const sizeLabel =
		episodeCountOf(slot) === 1 && slot.duration
			? `${slot.duration} min`
			: `${episodeCountOf(slot)} ep`;
	const before = moviesBeforeSlot.get(index) ?? [];
	const after = moviesBySlot.get(index) ?? [];
	const previous = line[index - 1];
	const browsing = !current && viewIndex === index;
	const litRun = state === "ahead" ? null : mix(hereColor, 55);
	//
	const gapAbove = index === 0 ? 0 : side ? 0.125 : 0.5;
	const runTop = index === 0 ? "0.5rem" : `-${gapAbove}rem`;
	const runToBead = `${index === 0 ? 0.5 : 1 + gapAbove}rem`;
	const runEnd = index === lastMain ? { height: runToBead } : { bottom: 0 };
	//
	const shownAbove =
		index > 0 &&
		!!line[index - 1]?.isSide &&
		!underMovieIds.has(line[index - 1].anilistId!);
	const linkedAbove =
		side &&
		index > 0 &&
		(shownAbove || (moviesBySlot.get(index - 1)?.length ?? 0) > 0);
	//
	const shownName = side ? `${name} \u00b7 ${kindOf(slot.format)}` : name;
	const hideFromNode = side && slot.anilistId != null && !!onHide;
	const node = (
		<Bead
			state={state}
			kind={side ? "side" : "part"}
			format={slot.format}
			accent={current ? color : undefined}
			glow={state === "watched" ? hereColor : undefined}
			dangerHover={hideFromNode}
			className={
				hideFromNode || !side
					? ""
					: "absolute left-1 top-1/2 -translate-x-1/2 -translate-y-1/2"
			}
		/>
	);

	return (
		<motion.li variants={rowVariants} className="relative">
			{index <= lastMain && (
				<>
					<span
						aria-hidden
						className="pointer-events-none absolute -left-3 z-1 w-px bg-zinc-800"
						style={{ top: runTop, ...runEnd }}
					/>
					{index <= curIndex && (
						<span
							aria-hidden
							className="pointer-events-none absolute -left-3 z-1 w-px"
							style={{
								top: runTop,
								...(index < curIndex ||
								(hereDone && index === curIndex)
									? runEnd
									: { height: runToBead }),
								background: mix(hereColor, 62),
							}}
						/>
					)}
				</>
			)}

			{before.map((movie, at) => (
				<Fragment key={`movie-before-${movie.anilistId}`}>
					<MovieRow rail={rail} movie={movie} linkedAbove={at > 0} />
					<ExtraRows rail={rail} movie={movie} />
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
			{onLine ? (
				<>
					<MovieRow rail={rail} movie={onLine} />
					<ExtraRows rail={rail} movie={onLine} />
				</>
			) : (
				<div
					ref={(el) => {
						if (linked === index) linkedRef.current = el;
					}}
					className={`group relative ${
						side
							? previous?.isSide
								? "mt-px"
								: "mt-0.5"
							: "mt-1.5"
					}`}
				>
					<RowWash
						side={side}
						x={side ? HIGHLIGHT_X.branch : HIGHLIGHT_X.node}
						color={color}
						railColor={railColor}
						current={current}
						browsing={browsing}
					/>
					{side &&
						(linkedAbove
							? branchLink("left-1", litRun)
							: branchElbow("-left-3", litRun))}
					<NodeMark
						x={side ? "left-1" : "-left-3"}
						label={side ? (slot.title ?? "side entry") : name}
						title={slot.title ?? show.title}
						onHide={
							hideFromNode
								? () => onHide!(slot.anilistId!)
								: undefined
						}
						onPick={side ? undefined : () => onPickSlot(index)}
					>
						{node}
					</NodeMark>

					{linked === index && cursorMark}

					<RowBody
						label={titleCase(shownName)}
						title={`${
							side
								? titleCase(shownName)
								: (slot.title ?? show.title)
						}${sized(slot) ? ` \u00b7 ${sizeLabel}` : ""}`}
						scale={side ? "side" : "part"}
						current={current}
						browsing={browsing}
						weight={
							sized(slot) ? (
								<Weight share={shareOf(index)} of={mostShare} />
							) : null
						}
						reduced={reduced}
						box={side ? "ml-4 w-[calc(100%-1rem)]" : "w-full"}
						onPick={() => onPickSlot(index)}
						onPlant={current ? undefined : () => onWatchSlot(index)}
					/>
				</div>
			)}

			<CutPicker
				current={slot}
				variants={slot.variants ?? []}
				color={color}
				hang={side}
				canPick={canPickCut}
				onPick={onPickCut}
			/>

			{after.map((movie, at) => (
				<Fragment key={`movie-${movie.anilistId}`}>
					<MovieRow
						rail={rail}
						movie={movie}
						linkedAbove={at > 0 || side}
					/>
					<ExtraRows rail={rail} movie={movie} />
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
	);
}

export function MovieRow({
	rail,
	movie,
	linkedAbove,
}: {
	rail: Rail;
	movie: AnimeMovieProps;
	linkedAbove?: boolean;
}) {
	const {
		show,
		romaji,
		hereColor,
		railColor,
		shareOf,
		mostShare,
		linked,
		lineIndexOf,
		stateOf,
		reduced,
		cursorMark,
		linkedRef,
		onPickSlot,
		onWatchSlot,
		onHide,
	} = rail;
	const label = rowName(movie.title, show.title, romaji);
	const color = colorOf(movie.posterColor);
	const index = lineIndexOf.get(movie.anilistId);
	const movieState = index == null ? "ahead" : stateOf(index);
	const current = movieState === "current";
	const viewing = index != null && linked === index;
	const lit = movieState === "ahead" ? null : mix(hereColor, 55);
	const online = !!movie.isMainLine;
	const runtime = runtimeOf({
		// zero here means unreported, not a movie of no length
		episode_count: movie.episode_count || 1,
		duration: movie.duration,
	});
	const sizeLabel = runtime > 0 ? `${runtime} min` : null;
	const pick = () => {
		if (index != null) onPickSlot(index);
	};
	const hideFromNode = !online && !!onHide;
	const pickFromNode = !hideFromNode && index != null;
	const bead = (
		<Bead
			state={movieState}
			kind="film"
			accent={current ? color : undefined}
			glow={movieState === "watched" ? hereColor : undefined}
			dangerHover={hideFromNode}
			className={
				hideFromNode || pickFromNode
					? ""
					: "absolute -left-3 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
			}
		/>
	);
	return (
		<div
			ref={(el) => {
				if (viewing) linkedRef.current = el;
			}}
			className={`group relative ${
				online
					? "mt-1.5 w-full"
					: `${linkedAbove ? "mt-px" : "mt-0.5"} ml-4 w-[calc(100%-1rem)]`
			}`}
		>
			<RowWash
				side={!online}
				x={HIGHLIGHT_X.node}
				color={color}
				railColor={railColor}
				current={current}
				browsing={viewing}
			/>
			{online
				? null
				: linkedAbove
					? branchLink("-left-3", lit)
					: branchElbow("-left-7", lit)}
			<NodeMark
				x="-left-3"
				label={movie.title ?? "film"}
				title={movie.title ?? show.title}
				onHide={
					hideFromNode ? () => onHide!(movie.anilistId) : undefined
				}
				onPick={pickFromNode ? pick : undefined}
			>
				{bead}
			</NodeMark>
			{viewing && cursorMark}
			<RowBody
				label={label}
				title={
					[movie.title, sizeLabel].filter(Boolean).join(" \u00b7 ") ||
					undefined
				}
				scale={online ? "part" : "side"}
				current={current}
				browsing={viewing}
				weight={
					runtime > 0 ? (
						<Weight share={shareOf(index)} of={mostShare} />
					) : null
				}
				reduced={reduced}
				box="w-full"
				onPick={pick}
				onPlant={
					index == null || current
						? undefined
						: () => onWatchSlot(index)
				}
			/>
		</div>
	);
}

export function ExtraRows({
	rail,
	movie,
}: {
	rail: Rail;
	movie: AnimeMovieProps;
}) {
	const {
		show,
		romaji,
		hereColor,
		railColor,
		shareOf,
		mostShare,
		movieExtras,
		lineIndexOf,
		stateOf,
		linked,
		reduced,
		cursorMark,
		linkedRef,
		onPickSlot,
		onWatchSlot,
		onHide,
	} = rail;
	return (
		<>
			{(movieExtras.get(movie.anilistId) ?? []).map((extra, at) => {
				const index = lineIndexOf.get(extra.anilistId);
				if (index == null) return null;
				const state = stateOf(index);
				const current = state === "current";
				const browsing = !current && linked === index;
				const lit = state === "ahead" ? null : mix(hereColor, 55);
				const color = colorOf(extra.posterColor);
				const label = titleCase(
					rowName(extra.title, show.title, romaji),
				);
				const sizeLabel = extra.duration
					? `${extra.duration} min`
					: `${extra.episode_count} ep`;
				const hideFromNode = extra.anilistId != null && !!onHide;
				const node = (
					<Bead
						state={state}
						kind="side"
						format={extra.format}
						accent={current ? color : undefined}
						glow={state === "watched" ? hereColor : undefined}
						dangerHover={hideFromNode}
						className={
							hideFromNode
								? ""
								: "absolute left-1 top-1/2 -translate-x-1/2 -translate-y-1/2"
						}
					/>
				);
				return (
					<div
						key={`extra-${extra.anilistId}`}
						ref={(el) => {
							// the scroll follows the row the card is showing
							if (linked === index) linkedRef.current = el;
						}}
						className="group relative mt-px"
					>
						<RowWash
							side
							x={HIGHLIGHT_X.branch}
							color={color}
							railColor={railColor}
							current={current}
							browsing={browsing}
						/>
						{at > 0
							? branchLink("left-1", lit)
							: branchElbow("-left-3", lit)}
						<NodeMark
							x="left-1"
							label={extra.title ?? "side entry"}
							onHide={
								hideFromNode
									? () => onHide!(extra.anilistId)
									: undefined
							}
						>
							{node}
						</NodeMark>
						{/* see cursorMark */}
						{linked === index && cursorMark}
						<RowBody
							label={label}
							title={
								sized(extra)
									? `${label} \u00b7 ${sizeLabel}`
									: label
							}
							scale="side"
							current={current}
							browsing={browsing}
							weight={
								sized(extra) ? (
									<Weight
										share={shareOf(index)}
										of={mostShare}
									/>
								) : null
							}
							reduced={reduced}
							box="ml-4 w-[calc(100%-1rem)]"
							onPick={() => onPickSlot(index)}
							onPlant={
								current ? undefined : () => onWatchSlot(index)
							}
						/>
					</div>
				);
			})}
		</>
	);
}

// ─── cuts

const cutKind = (format?: AnimeFormat) =>
	format === "MOVIE"
		? "film"
		: format === "TV" || format === "TV_SHORT"
			? "cour"
			: (format ?? "cut").toLowerCase().replace(/_/g, " ");

const CONDENSED = 0.6;

const cutSize = (cut: Cut) =>
	cut.episode_count && cut.episode_count > 1
		? `${cut.episode_count} ep`
		: cut.duration
			? `${cut.duration} min`
			: null;

export function CutPicker({
	current,
	variants,
	color,
	hang,
	canPick,
	onPick,
}: {
	current: Cut;
	variants: AnimeVariantProps[];
	color: string;
	canPick?: boolean;
	hang?: boolean;
	onPick?: (groupIds: number[], chosenId: number) => void;
}) {
	const cuts: Cut[] =
		current.format === "MOVIE"
			? [current, ...variants]
			: [
					current,
					...variants.filter(
						(v) =>
							v.format !== "MOVIE" ||
							!runtimeOf(v) ||
							!runtimeOf(current) ||
							runtimeOf(v) / runtimeOf(current) > CONDENSED,
					),
				];
	const groupIds = cuts
		.map((cut) => cut.anilistId)
		.filter((id): id is number => id != null);
	// a node with one cut has nothing to choose between
	if (groupIds.length < 2) return null;
	if (!canPick || !onPick) return null;

	return (
		<div className="relative mb-0.5">
			<div
				className={`inline-flex flex-wrap items-center gap-0.5 rounded-lg neu-carved p-0.5 ${
					hang
						? "ml-1 max-w-[calc(100%-0.25rem)]"
						: "ml-2 max-w-[calc(100%-0.5rem)]"
				}`}
			>
				{cuts.map((cut) => {
					const active = cut.anilistId === current.anilistId;
					const size = cutSize(cut);
					return (
						<button
							key={cut.anilistId}
							disabled={active}
							onClick={(e) => {
								e.stopPropagation();
								if (cut.anilistId != null)
									onPick(groupIds, cut.anilistId);
							}}
							className={`rounded-md px-1.5 py-0.5 text-[0.6rem] whitespace-nowrap transition-all duration-200 ${
								active
									? ""
									: "text-zinc-500 hover:bg-white/5 hover:text-zinc-200 hover:cursor-pointer"
							}`}
							style={
								active
									? {
											background: mix(color, 16),
											color: mix(color, 85, "white"),
											boxShadow:
												"inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.35)",
										}
									: undefined
							}
						>
							{cutKind(cut.format)}
							{size ? ` \u00b7 ${size}` : ""}
						</button>
					);
				})}
			</div>
		</div>
	);
}
