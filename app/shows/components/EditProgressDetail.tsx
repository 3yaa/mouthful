import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ShowProps } from "@/types/show";
import {
	episodeCountOf,
	isAnimeRow,
	isMovieSlot,
	runtimeOf,
	mainCount,
	mainOrdinalAt,
	slotIndexOf,
	slotName,
	stepWatchIndex,
	timelineOf,
} from "@/app/shows/utils/slotRef";
import { getStatusTextColor } from "@/utils/styleUtils";
import { franchiseEpisodes } from "@/app/shows/utils/progressCalc";
import {
	ChevronLeft,
	ChevronRight,
	ChevronsLeft,
	ChevronsRight,
	EyeOff,
	Milestone,
	X,
} from "lucide-react";
import { FIELD_LABEL } from "@/utils/styleUtils";

// the node name conatiner shrinking/enlarging
const SLACK = 2;
const MIN_SHARE = 0.5;
const MAX_SHARE = 0.7;
const SHARE_UNITS = 2;
//
export const NAME_TYPE = "text-[0.9375rem] font-[550]";
export const RING =
	"focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-zinc-300";

export function ProgressInput({
	value,
	min,
	max,
	onChange,
	onSubmit,
	onCancel,
}: {
	value: number | "";
	min: number;
	max: number;
	onChange: (raw: string) => void;
	onSubmit: () => void;
	onCancel: () => void;
}) {
	return (
		<input
			type="number"
			value={value}
			onChange={(e) => onChange(e.target.value)}
			onKeyDown={(e) => {
				if (e.key === "Enter") onSubmit();
				else if (e.key === "Escape") onCancel();
			}}
			onClick={(e) => e.stopPropagation()}
			onBlur={onSubmit}
			className="max-w-10 text-center focus:outline-none focus:ring-0 border-0"
			style={{
				width: value === "" ? "1ch" : `${value.toString().length}ch`,
			}}
			autoFocus
			min={min}
			max={max}
		/>
	);
}

interface EditProgressProps {
	item: ShowProps;
	editingMode: { season: boolean; episode: boolean };
	inputValues: { season: number | ""; episode: number | "" };
	isBrowsing?: boolean;
	// is the cur season completed
	viewedComplete?: boolean;
	franchiseView?: boolean;
	onAction: (action: { type: string; payload?: unknown }) => void;
}

export function EditProgress({
	item,
	editingMode,
	inputValues,
	isBrowsing,
	viewedComplete,
	franchiseView,
	onAction,
}: EditProgressProps) {
	const slotLine = timelineOf(item);
	const slotAt = slotIndexOf(item);
	//
	const curEpisode = item.curEpisode ?? 0;
	const curSlot = slotLine[slotAt];
	const maxEpisodes = episodeCountOf(curSlot);
	//
	const onSide = !!curSlot?.isSide;
	const onMovie = isMovieSlot(curSlot);
	const movieRuntime = runtimeOf(curSlot);
	//
	const isAnime = isAnimeRow(item);
	// only an anilist row has an order
	const hasOrder = isAnime && slotLine.length > 0;
	const canHide = isBrowsing && onSide && curSlot?.anilistId != null;
	const slotCount = mainCount(slotLine);
	const slotOrdinal = mainOrdinalAt(slotLine, slotAt);
	//
	const watchPrev = stepWatchIndex(slotLine, slotAt, "left");
	const watchNext = stepWatchIndex(slotLine, slotAt, "right");
	const noPrevSeason = watchPrev === -1;
	const noNextSeason = watchNext === -1;
	//
	const seasonName = franchiseView
		? "All seasons"
		: slotName(item, curSlot, slotAt);
	//
	const franchise = franchiseView
		? franchiseEpisodes(slotLine, slotAt, item.curEpisode ?? 0)
		: null;
	//
	const episodeIsStatic = onMovie || !!franchise;

	// the WAY last step went
	const prevSlot = useRef(slotAt);
	const stepDir = useRef(1);
	if (prevSlot.current !== slotAt) {
		stepDir.current = slotAt > prevSlot.current ? 1 : -1;
		prevSlot.current = slotAt;
	}
	const reduceMotion = useReducedMotion();

	const rowRef = useRef<HTMLDivElement>(null);
	const seasonBoxRef = useRef<HTMLDivElement>(null);
	const episodeBoxRef = useRef<HTMLDivElement>(null);
	const nameRef = useRef<HTMLSpanElement>(null);
	const mirrorRef = useRef<HTMLSpanElement>(null);
	const [seasonFr, setSeasonFr] = useState(1);

	// rendered name for each season
	useLayoutEffect(() => {
		const row = rowRef.current;
		const box = seasonBoxRef.current;
		const episode = episodeBoxRef.current;
		const name = nameRef.current;
		const mirror = mirrorRef.current;
		// TMDB ROW SKIP
		if (!row || !box || !episode || !name || !mirror) {
			setSeasonFr(1);
			return;
		}

		const measure = () => {
			const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
			const track = row.getBoundingClientRect().width - gap;
			if (track <= 0) return;
			const chrome =
				box.getBoundingClientRect().width -
				name.getBoundingClientRect().width;
			const floor = parseFloat(getComputedStyle(episode).minWidth);
			const ceiling =
				floor > 0
					? Math.max(MIN_SHARE, (track - floor) / track)
					: MAX_SHARE;
			const want = mirror.getBoundingClientRect().width + chrome + SLACK;
			const share = Math.min(ceiling, Math.max(MIN_SHARE, want / track));
			setSeasonFr(Math.round(share * SHARE_UNITS * 1e4) / 1e4);
		};

		measure();
		// first measurement can land on fallback metrics
		let live = true;
		document.fonts.ready.then(() => {
			if (live) measure();
		});
		// panel is resizable and the root font-size tracks the viewport
		const observer = new ResizeObserver(measure);
		observer.observe(row);
		return () => {
			live = false;
			observer.disconnect();
		};
	}, [seasonName, slotAt, item.anilistId]);

	const navBtnClass =
		"group flex justify-center items-center w-8 h-8 rounded-lg neu-carved enabled:hover:neu-carved-hi enabled:active:scale-95 transition-all duration-150 hover:cursor-pointer disabled:neu-carved-off disabled:opacity-45 disabled:cursor-default";

	const iconClass =
		"w-4 h-4 text-zinc-300/80 group-active:text-zinc-200/80 transition-colors";

	const seasonLabel = isAnime ? (
		<div className="flex flex-1 items-center justify-between gap-2 min-w-0 pl-1">
			<span className="group/season mt-0.5 flex flex-1 items-baseline gap-2 min-w-0 text-[0.9375rem] text-zinc-300/70 font-bold">
				<motion.span
					ref={nameRef}
					key={seasonName}
					initial={
						reduceMotion
							? false
							: { opacity: 0, x: stepDir.current * 10 }
					}
					animate={{ opacity: 1, x: 0 }}
					transition={{
						x: { duration: 0.44, ease: [0.16, 1, 0.3, 1] },
						opacity: { duration: 0.24, ease: "easeOut" },
					}}
					className={`min-w-0 flex-1 truncate ${NAME_TYPE} text-zinc-300/75 group-hover/season:text-zinc-300/95 transition-colors duration-300 ease-out`}
					title={
						franchiseView
							? seasonName
							: (curSlot?.title ?? seasonName)
					}
				>
					{seasonName}
				</motion.span>
			</span>
		</div>
	) : (
		<div className="flex flex-1 items-center min-w-0 pl-1">
			<span
				className={`mt-0.5 text-[0.9375rem] text-zinc-300/70 font-bold hover:cursor-pointer ${RING}`}
				role={editingMode.season ? undefined : "button"}
				tabIndex={editingMode.season ? undefined : 0}
				onClick={(e) => {
					e.stopPropagation();
					onAction({ type: "clickSeasonInput" });
				}}
				onKeyDown={(e) => {
					if (editingMode.season) return;
					if (e.key !== "Enter" && e.key !== " ") return;
					e.preventDefault();
					e.stopPropagation();
					onAction({ type: "clickSeasonInput" });
				}}
			>
				<span className={`${NAME_TYPE} text-zinc-300/75 mr-2`}>
					Season:
				</span>
				{editingMode.season ? (
					<ProgressInput
						value={inputValues.season}
						min={1}
						max={slotCount || 1}
						onChange={(payload) =>
							onAction({ type: "changeSeasonInput", payload })
						}
						onSubmit={() => onAction({ type: "submitSeasonInput" })}
						onCancel={() => onAction({ type: "clickSeasonInput" })}
					/>
				) : (
					<span
						className={`underline ${
							isBrowsing
								? "text-zinc-600"
								: getStatusTextColor(item.status)
						}`}
					>
						{slotOrdinal}
					</span>
				)}
				<span>/{slotCount}</span>
			</span>
		</div>
	);

	const seasonControls = (
		<div
			className="flex gap-1.5 shrink-0"
			onClick={(e) => e.stopPropagation()}
		>
			<button
				className={navBtnClass}
				onClick={() =>
					onAction({ type: "changeSeason", payload: "left" })
				}
				disabled={noPrevSeason}
			>
				<ChevronsLeft className={iconClass} />
			</button>
			<button
				className={navBtnClass}
				onClick={() =>
					onAction({ type: "changeSeason", payload: "right" })
				}
				disabled={noNextSeason}
			>
				<ChevronsRight className={iconClass} />
			</button>
		</div>
	);

	return (
		<div className="space-y-1.5 mb-2 w-[94%] mx-auto">
			<div className="flex h-[1.05rem] items-center justify-between gap-3 min-w-0">
				<div className="flex shrink-0 items-center gap-2">
					<label className={FIELD_LABEL}>
						{isBrowsing ? "Viewing" : "Progress"}
					</label>
					{/* SIDE */}
					{onSide && !franchise && (
						<span
							className="rounded-full border border-zinc-700/70 px-1.5 text-[0.6rem] leading-4 font-medium uppercase tracking-wider text-zinc-500"
							title="Side content -- not part of the main line"
						>
							{(curSlot?.format ?? "OVA").replace(/_/g, " ")}
						</span>
					)}
				</div>
				{/* WATCH FROM HERE */}
				<div className="flex shrink-0 items-center gap-2 mr-2">
					<AnimatePresence initial={false}>
						{/* what the order's own node does, for the part the card is on */}
						{canHide && (
							<motion.button
								key="hide"
								initial={
									reduceMotion ? false : { opacity: 0, y: 3 }
								}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: 3 }}
								transition={{ duration: 0.22, ease: "easeOut" }}
								onClick={() => onAction({ type: "hideSlot" })}
								title="Set aside -- off the watch order"
								aria-label="Set aside"
								className={`shrink-0 text-zinc-600 hover:text-red-400 active:scale-95 hover:cursor-pointer transition-all duration-150 ${RING}`}
							>
								<EyeOff
									className="w-3.5 h-3.5"
									strokeWidth={2.25}
								/>
							</motion.button>
						)}
						{isBrowsing && (
							<motion.button
								key="plant"
								initial={
									reduceMotion ? false : { opacity: 0, y: 3 }
								}
								animate={{ opacity: 1, y: 0 }}
								exit={{ opacity: 0, y: 3 }}
								transition={{ duration: 0.22, ease: "easeOut" }}
								onClick={() => onAction({ type: "commitView" })}
								title="Watch from here"
								aria-label="Watch from here"
								className={`shrink-0 text-emerald-600 hover:text-emerald-500 active:scale-95 hover:cursor-pointer transition-all duration-150 ${RING}`}
							>
								<Milestone
									className="w-3.5 h-3.5 drop-shadow-[0_0_5px_rgba(16,185,129,0.3)]"
									strokeWidth={2.25}
								/>
							</motion.button>
						)}
					</AnimatePresence>
				</div>
			</div>
			<div
				ref={rowRef}
				className="grid gap-4 transition-[grid-template-columns] duration-500 ease-leave motion-reduce:transition-none"
				style={{
					gridTemplateColumns: `${seasonFr}fr ${SHARE_UNITS - seasonFr}fr`,
				}}
			>
				{/* SEASON */}
				<div
					ref={seasonBoxRef}
					onClick={
						hasOrder
							? (e) => {
									e.stopPropagation();
									onAction({ type: "openChain" });
								}
							: undefined
					}
					role={hasOrder ? "button" : undefined}
					tabIndex={hasOrder ? 0 : undefined}
					onKeyDown={
						hasOrder
							? (e) => {
									if (e.key !== "Enter" && e.key !== " ")
										return;
									e.preventDefault();
									e.stopPropagation();
									onAction({ type: "openChain" });
								}
							: undefined
					}
					title={hasOrder ? "Watch order" : undefined}
					className={`relative flex items-center gap-2 rounded-lg neu-raised-firm py-1.5 px-3 select-none min-w-0 ${
						hasOrder
							? `hover:cursor-pointer hover:brightness-110 transition-all duration-300 ${RING}`
							: ""
					}`}
				>
					{seasonLabel}
					{seasonControls}
					{/* the name at its natural width*/}
					{isAnime && (
						<span
							ref={mirrorRef}
							aria-hidden
							className={`pointer-events-none invisible absolute left-0 top-0 w-max whitespace-nowrap ${NAME_TYPE}`}
						>
							{seasonName}
						</span>
					)}
				</div>
				{/* EPISODE */}
				<div
					ref={episodeBoxRef}
					className="min-w-46 rounded-lg neu-raised-firm py-1.5 px-3 select-none"
				>
					<div className="flex items-center justify-between">
						<span
							className={`mt-0.5 text-[0.9375rem] text-zinc-300/70 font-bold ${
								episodeIsStatic
									? ""
									: `hover:cursor-pointer ${RING}`
							}`}
							role={
								episodeIsStatic || editingMode.episode
									? undefined
									: "button"
							}
							tabIndex={
								episodeIsStatic || editingMode.episode
									? undefined
									: 0
							}
							onClick={() => {
								if (episodeIsStatic) return;
								onAction({ type: "clickEpisodeInput" });
							}}
							onKeyDown={(e) => {
								if (episodeIsStatic || editingMode.episode)
									return;
								if (e.key !== "Enter" && e.key !== " ") return;
								e.preventDefault();
								onAction({ type: "clickEpisodeInput" });
							}}
						>
							{!onMovie && (
								<span
									className={`${NAME_TYPE} text-zinc-300/75 mr-2`}
								>
									Ep:
								</span>
							)}
							{franchise ? (
								<>
									<span
										className={`underline ${getStatusTextColor(item.status)}`}
									>
										{franchise.watched}
									</span>
									<span>/{franchise.total}</span>
								</>
							) : onMovie ? (
								<span className="font-medium text-zinc-300/80">
									{movieRuntime ? `${movieRuntime} min` : "—"}
								</span>
							) : (
								<>
									{editingMode.episode ? (
										<ProgressInput
											value={inputValues.episode}
											min={0}
											max={maxEpisodes || 1}
											onChange={(payload) =>
												onAction({
													type: "changeEpisodeInput",
													payload,
												})
											}
											onSubmit={() =>
												onAction({
													type: "submitEpisodeInput",
												})
											}
											onCancel={() =>
												onAction({
													type: "clickEpisodeInput",
												})
											}
										/>
									) : isBrowsing ? (
										viewedComplete ? (
											<span className="underline text-zinc-500">
												{maxEpisodes}
											</span>
										) : (
											<X
												className="inline-block w-3.5 h-3.5 align-[-0.15em] text-zinc-600"
												strokeWidth={2.5}
											/>
										)
									) : (
										<span
											className={`underline ${getStatusTextColor(item.status)}`}
										>
											{curEpisode}
										</span>
									)}
									<span>/{maxEpisodes}</span>
								</>
							)}
						</span>
						{/* don't include stepper for movie ep */}
						<div className="flex h-8 items-center gap-1.5">
							{!episodeIsStatic && (
								<>
									<button
										className={navBtnClass}
										onClick={() =>
											onAction({
												type: "changeEpisode",
												payload: "left",
											})
										}
										disabled={
											isBrowsing ||
											(curEpisode === 0 &&
												watchPrev === -1)
										}
									>
										<ChevronLeft className={iconClass} />
									</button>
									<button
										className={navBtnClass}
										onClick={() =>
											onAction({
												type: "changeEpisode",
												payload: "right",
											})
										}
										disabled={
											isBrowsing ||
											(curEpisode === maxEpisodes &&
												watchNext === -1)
										}
									>
										<ChevronRight className={iconClass} />
									</button>
								</>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
