import Image from "next/image";
import { isResizable } from "@/utils/image-loader";
import { Option } from "@/app/components/ui/Dropdown";
import { CreditNames } from "./shared/CreditNames";
import {
	BaseMediaProps,
	ColumnConfig,
	MediaCoverProps,
	SeriesMediaProps,
	SeriesTargetProps,
} from "@/types/media";
import { GameProps } from "@/types/game";
import { ShowProps } from "@/types/show";
import { useEffect, useRef, useState } from "react";
import { MobileScorePicker } from "@/app/components/ui/MobileScorePicker";
import {
	Plus,
	ChevronLeft,
	ChevronRight,
	ChevronsUp,
	ChevronUp,
	ChevronDown,
	Type,
	Feather,
	Hourglass,
	Boxes,
	Box,
	Leaf,
	BookCheck,
	EyeOff,
	Milestone,
	Users,
	BarChart2,
	ListTree,
	RefreshCw,
	RotateCcw,
	Unlink,
	Trash2,
	Check,
	X,
	Wallpaper,
	Loader2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Loading } from "@/app/components/ui/Loading";
import { formatDateShort } from "@/utils/formattingUtils";
import { hasSeries, seriesTitleOf } from "@/utils/seriesRead";
import {
	coverWave,
	getStatusBg,
	getStatusDetailWaveColor,
} from "@/utils/styleUtils";
import { slotSubtitle } from "@/app/shows/utils/animeTitles";
import { activeLogoIndex, isLogoCleared } from "../../../utils/artworkIndex";
import { MovieProps } from "@/types/movie";
import { MobileAutoTextarea } from "@/app/components/ui/MobileAutoTextArea";
import { BookCoverConfig } from "@/app/books/components/BookCoverConfigDetails";
import { CoverColorPicker } from "@/app/components/ui/CoverColorPicker";
import { MobileProgressPicker } from "@/app/components/ui/MobileSeasonEpPicker";
import { MobileSeriesNav } from "./shared/MobileSeriesNav";
import { LOGO_SPEC } from "./shared/logoMetrics";
import { useArtworkPrime } from "@/hooks/useArtworkPrime";
import {
	MediaTitle,
	SERIES_TEXT,
	SLOT_TEXT,
	TITLE_TEXT,
} from "./shared/MediaTitle";
import {
	calcCurProgress,
	franchiseEpisodes,
} from "@/app/shows/utils/progressCalc";
import {
	isAnimeRow,
	isMovieSlot,
	slotIndexOf,
	slotName,
	timelineOf,
	franchiseRomajiOf,
} from "@/app/shows/utils/slotRef";
import { canNudgeMu, getDisplayScore, getTierFromMu } from "@/lib/tierConfig";
import { BookProps } from "@/types/book";
import { useScrollLock } from "@/hooks/useScrollLock";
import { ConfirmPrompt } from "@/app/components/ui/ConfirmButton";

//
const MOBILE_ACTION_TONE = {
	emerald: "text-emerald-400/90 bg-emerald-800/30",
	blue: "text-blue-400/90 bg-blue-800/30",
	orange: "text-orange-400/90 bg-orange-700/30",
	red: "text-red-400/90 bg-red-700/30",
	purple: "text-purple-400/90 bg-purple-800/30",
} as const;

const POSTER_SPEC = { width: 342, sizes: "100vw" };
const BACKDROP_SPEC = { width: 540, sizes: "100vw" };

type Control = {
	key: string;
	icon: LucideIcon;
	tone: keyof typeof MOBILE_ACTION_TONE;
	label: string;
	action: string;
	//
	confirm?: { title: string; confirmLabel: string };
};

function MobileActionBtn({
	icon: Icon,
	tone,
	label,
	expanded,
	busy = false,
	onPress,
}: {
	icon: LucideIcon;
	tone: keyof typeof MOBILE_ACTION_TONE;
	label: string;
	expanded: boolean;
	busy?: boolean;
	onPress: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onPress}
			disabled={busy}
			title={label}
			className={`flex items-center gap-1.5 h-7 shrink-0 rounded-lg transition-all duration-200 ${
				busy ? "" : "active:scale-95"
			} ${
				expanded
					? `px-2 ${MOBILE_ACTION_TONE[tone]}`
					: "w-7 justify-center neu-carved text-zinc-400/50"
			}`}
		>
			{busy ? (
				<Loader2 className="w-4 h-4 shrink-0 animate-spin" />
			) : (
				<Icon className="w-4 h-4 shrink-0" />
			)}
			{expanded && (
				<span className="text-[0.7rem] font-semibold uppercase tracking-wide whitespace-nowrap">
					{label}
				</span>
			)}
		</button>
	);
}

interface MobileDetailsProps<T extends BaseMediaProps> {
	item: T;
	localNote: string;
	onClose: () => void;
	isLoading?: { isTrue: boolean; style: string; text: string };
	isAdding: boolean;
	onAdd: () => void;
	isSubmitting?: boolean;
	statusOptions: Option[];
	mediaType: string;
	onAction: (action: { type: string; payload?: unknown }) => void;
	differentColumns: [ColumnConfig<T>, ColumnConfig<T>];
	onSeriesNav?: (dir: "left" | "right") => void; // book + movie
	isInList?: (target: SeriesTargetProps) => boolean;
	// show only
	noteSubject?: string;
	franchiseView?: boolean;
	isBrowsing?: boolean;
	isSelecting?: boolean;
	canRefresh?: boolean;
	// book only
	coverUrls?: MediaCoverProps[];
	coverIndex?: number;
	// movie/show
	posterUrls?: string[];
	posterIndex?: number;
	// game/movie/show
	backdropUrls?: string[];
	backdropIndex?: number;
	// movie/show/game
	logoUrls?: string[];
	logoIndex?: number;
}

export function MobileDetails<T extends BaseMediaProps>({
	item,
	localNote,
	noteSubject,
	franchiseView,
	onClose,
	isLoading,
	isAdding,
	onAdd,
	isSubmitting,
	statusOptions,
	mediaType,
	onAction,
	differentColumns,
	onSeriesNav,
	isInList,
	isBrowsing,
	isSelecting,
	canRefresh,
	coverUrls,
	coverIndex,
	posterUrls,
	posterIndex,
	backdropUrls,
	backdropIndex,
	logoUrls,
	logoIndex,
}: MobileDetailsProps<T>) {
	const isBook = mediaType === "book";
	const isPicking = isAdding || !!isSelecting;
	const [isProgressPickerOpen, setIsProgressPickerOpen] = useState(false);
	const [isScorePickerOpen, setIsScorePickerOpen] = useState(false);
	// swaps the hero over to the backdrop candidates while picking
	const [showBackdrop, setShowBackdrop] = useState(false);
	// the control waiting on its confirmation sheet
	const [pending, setPending] = useState<Control | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [isVisible, setIsVisible] = useState(false);
	const startY = useRef(0);
	const startScrollY = useRef(0);
	const modalRef = useRef<HTMLDivElement>(null);
	const dragVelocity = useRef(0);
	const lastY = useRef(0);
	const lastTime = useRef(0);
	// where the sheet sits. a ref, not state -- see handleTouchMove
	const dragY = useRef(0);

	const SNAP = "transform 0.34s cubic-bezier(0.16, 1, 0.3, 1)";
	const FLING = "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)";

	// "drag" follows the finger with no easing, "snap" springs back
	const setSheetY = (y: number, how: "drag" | "snap" | "fling" = "drag") => {
		const el = modalRef.current;
		if (!el) return;
		dragY.current = y;
		el.style.transition =
			how === "drag" ? "none" : how === "snap" ? SNAP : FLING;
		el.style.transform = `translate3d(0, ${y}px, 0)`;
	};

	// throw the sheet out, then hand back once the motion has actually finished
	const dismiss = () => {
		const el = modalRef.current;
		if (!el) return onClose();
		setSheetY(window.innerHeight, "fling");
		let closed = false;
		const finish = () => {
			if (closed) return;
			closed = true;
			el.removeEventListener("transitionend", onEnd);
			onClose();
		};
		// transitionend bubbles
		const onEnd = (e: TransitionEvent) => {
			if (e.target !== el || e.propertyName !== "transform") return;
			finish();
		};
		el.addEventListener("transitionend", onEnd);
		// transitionend never arrives if the sheet is interrupted or offscreen
		setTimeout(finish, 340);
	};

	const s = item as unknown as SeriesMediaProps;
	const g = item as unknown as GameProps;
	const show = item as unknown as ShowProps;
	const isAnimeShow = mediaType === "show" && isAnimeRow(show);
	//
	const creditNames =
		(mediaType === "movie" || mediaType === "show") && !isPicking
			? String(differentColumns[0].getValue(item) ?? "")
					.split(",")
					.map((n) => n.trim())
					.filter(Boolean)
			: [];
	const creditOpens: "director" | "studio" | "creator" | null =
		!creditNames.length
			? null
			: mediaType === "movie"
				? "director"
				: isAnimeShow
					? "studio"
					: "creator";
	//
	const slotAt = slotIndexOf(show);
	const slotLine = timelineOf(show);
	//
	const franchise = franchiseView
		? franchiseEpisodes(slotLine, slotAt, show.curEpisode ?? 0)
		: null;
	//
	const slotArc =
		mediaType === "show"
			? slotSubtitle(
					slotLine[slotAt]?.title,
					item.title,
					franchiseRomajiOf(show),
				)
			: null;
	//
	const slotCopyTitle = isAnimeShow
		? (slotLine[slotAt]?.title ?? null)
		: null;
	// side content is the only thing the order lets you set aside
	const canHideSlot =
		!!slotLine[slotAt]?.isSide && slotLine[slotAt]?.anilistId != null;

	//
	const stepFrom = (type: string) => (e: React.MouseEvent<HTMLElement>) => {
		const rect = e.currentTarget.getBoundingClientRect();
		const clickX = e.clientX - rect.left;
		const elementWidth = rect.width;
		const isRightSide = clickX > elementWidth / 2;

		onAction({ type, payload: isRightSide ? "next" : "prev" });
	};
	const handleCoverChange = stepFrom("changeCover");
	const handleBackdropChange = stepFrom("changeBackdrop");

	//
	const activeCover =
		(isBook && isPicking ? coverUrls?.[coverIndex ?? 0] : undefined) ??
		item.cover ??
		undefined;

	const coverSrc = item.cover?.url ?? item.posterUrl;

	const posterCount = (isBook ? coverUrls?.length : posterUrls?.length) ?? 0;
	const posterPos = (isBook ? coverIndex : posterIndex) ?? 0;
	//
	const backdropCount = backdropUrls?.length ?? 0;
	const viewingBackdrop = isPicking && backdropCount > 0 && showBackdrop;
	const canCyclePoster = isPicking && !viewingBackdrop && posterCount > 1;
	const canCycleBackdrop = viewingBackdrop && backdropCount > 1;
	const backdropSrc = viewingBackdrop
		? backdropUrls?.[backdropIndex ?? 0]
		: undefined;
	const displayLogoUrl =
		isPicking && logoUrls?.length ? logoUrls[logoIndex ?? 0] : item.logoUrl;
	const logoIsCleared = isLogoCleared(logoIndex);

	// warm once it is opened
	useArtworkPrime("mobile", [
		{
			urls: posterUrls,
			index: posterIndex,
			spec: POSTER_SPEC,
			enabled: isPicking && !isBook,
			palette: true,
		},
		{
			urls: coverUrls?.map((cover) => cover.url),
			index: coverIndex,
			spec: POSTER_SPEC,
			enabled: isPicking && isBook,
		},
		{
			urls: backdropUrls,
			index: backdropIndex,
			spec: BACKDROP_SPEC,
			enabled: viewingBackdrop,
		},
		{
			urls: logoUrls,
			index: activeLogoIndex(logoIndex ?? 0),
			spec: LOGO_SPEC,
			enabled: isPicking,
		},
	]);

	const coverColor = activeCover?.color;
	const underlineColor =
		mediaType === "show"
			? undefined
			: coverColor?.trim()
				? coverWave(coverColor)
				: getStatusDetailWaveColor(item.status);

	// source rating stands in for the completed date until it is watched/read
	const externalRating =
		mediaType === "movie" && item.status === "Want to Watch"
			? (item as unknown as MovieProps).imdbRating
			: isBook && item.status === "Want to Read"
				? (item as unknown as BookProps).rating
				: null;

	const metaDivider = (
		<span aria-hidden className="h-3 w-px shrink-0 bg-zinc-500/35" />
	);

	//
	const MOBILE_SCORE_SUB_BTN =
		"flex justify-center items-center w-7.5 h-7.5 rounded-lg neu-carved text-zinc-400/55 active:scale-95 active:text-zinc-200 transition-all duration-150 disabled:neu-carved-off disabled:opacity-40 disabled:active:scale-100";
	const canNudgeScore = !!item.score && !isPicking && !franchiseView;

	// the modal swaps items in place on a series jump
	useEffect(() => {
		setPending(null);
	}, [item.id]);

	const hasSeriesMeta = hasSeries(s);

	const controls: Control[] = isAdding
		? [
				{
					key: "add",
					icon: Plus,
					tone: "emerald",
					label: "Add",
					action: "add",
				},
				{
					key: "moreOptions",
					icon: ChevronsUp,
					tone: "blue",
					label: isBook ? "More" : "Year",
					action: isBook ? "moreBooks" : "needYearField",
				},
			]
		: isSelecting
			? [
					{
						key: "confirmRefresh",
						icon: Check,
						tone: "emerald",
						label: "Apply",
						action: "confirmRefresh",
					},
					{
						key: "cancelRefresh",
						icon: X,
						tone: "red",
						label: "Cancel",
						action: "cancelRefresh",
					},
				]
			: [
					...(canRefresh
						? [
								{
									key: "refresh",
									icon: RefreshCw,
									tone: "emerald",
									label: "Reload",
									action: "refresh",
									confirm: {
										title: `Reload this ${mediaType}?`,
										confirmLabel: "Reload",
									},
								} as Control,
							]
						: []),
					...(hasSeriesMeta && mediaType !== "game"
						? [
								{
									key: "clearSeriesMeta",
									icon: Unlink,
									tone: "orange",
									label: "Clear series",
									action: "clearSeriesMeta",
									confirm: {
										title: "Clear series info?",
										confirmLabel: "Clear",
									},
								} as Control,
							]
						: []),
					...(item.score && !franchiseView
						? [
								{
									key: "resetScore",
									icon: RotateCcw,
									tone: "blue",
									label: "Reset score",
									action: "resetScore",
									confirm: {
										title: "Reset score?",
										confirmLabel: "Reset",
									},
								} as Control,
							]
						: []),
					...(franchiseView === undefined
						? []
						: [
								{
									key: "toggleFranchiseView",
									icon: franchiseView ? Boxes : Box,
									tone: "purple",
									label: franchiseView
										? "This part"
										: "Whole franchise",
									action: "toggleFranchiseView",
								} as Control,
							]),
					{
						key: "delete",
						icon: Trash2,
						tone: "red",
						label: "Delete " + mediaType,
						action: "delete",
						confirm: {
							title: `Delete this ${mediaType}?`,
							confirmLabel: "Delete",
						},
					},
				];

	const splitAt = Math.ceil(controls.length / 2);
	const leftControls = controls.slice(0, splitAt);
	const rightControls = controls.slice(splitAt);

	const renderControl = (c: Control) => (
		<MobileActionBtn
			key={c.key}
			icon={c.icon}
			tone={c.tone}
			label={c.label}
			expanded={!c.confirm}
			busy={c.action === "add" && !!isSubmitting}
			onPress={() =>
				c.confirm
					? setPending(c)
					: c.action === "add"
						? onAdd()
						: onAction({ type: c.action })
			}
		/>
	);

	// COMPLETED DATE | RATING
	const trailingMeta =
		externalRating != null ? (
			<span className="flex items-center shrink-0 gap-1.5">
				<Leaf
					className="w-3.5 h-3.5 shrink-0 text-green-400/60"
					strokeWidth={1.75}
				/>
				<span className="font-semibold tabular-nums text-zinc-300/80 tracking-tight">
					{externalRating.toFixed(1)}
				</span>
			</span>
		) : item.status === "Completed" && item.dateCompleted ? (
			<span className="shrink-0 flex items-center gap-1.5 tabular-nums">
				{isBook && (
					<BookCheck
						className="w-3.5 h-3.5 shrink-0 text-zinc-400/70"
						strokeWidth={1.75}
					/>
				)}
				{formatDateShort(item.dateCompleted)}
			</span>
		) : null;

	const colorPicker = activeCover ? (
		<CoverColorPicker
			key={activeCover.url}
			coverUrl={activeCover.url}
			currentColor={activeCover.color}
			onPick={(color) =>
				onAction({ type: "pickCoverColor", payload: color })
			}
		/>
	) : null;

	const handleTouchStart = (e: React.TouchEvent) => {
		if (isScorePickerOpen || isProgressPickerOpen || pending) return;
		//
		const target = e.target as HTMLElement;
		if (
			target.closest("button") ||
			target.closest("textarea") ||
			target.closest("[data-no-drag]")
		) {
			return;
		}

		const modal = modalRef.current;
		if (!modal) return;

		if (modal.scrollTop < 3) {
			startY.current = e.touches[0].clientY;
			lastY.current = e.touches[0].clientY;
			lastTime.current = Date.now();
			startScrollY.current = modal.scrollTop;
			dragVelocity.current = 0;
			setIsDragging(true);
		}
	};

	const handleTouchMove = (e: React.TouchEvent) => {
		if (!isDragging || isScorePickerOpen || isProgressPickerOpen || pending)
			return;

		const modal = modalRef.current;
		if (!modal) return;

		const currentY = e.touches[0].clientY;
		const currentTime = Date.now();
		const deltaY = currentY - startY.current;

		const timeDelta = currentTime - lastTime.current;
		if (timeDelta > 0) {
			dragVelocity.current = (currentY - lastY.current) / timeDelta;
		}

		lastY.current = currentY;
		lastTime.current = currentTime;

		if (modal.scrollTop < 3 && deltaY > 0) {
			const resistance = Math.max(0.3, 1 - deltaY / 800);
			// written straight to the node
			setSheetY(deltaY * resistance);
		} else if (deltaY < 0) {
			setIsDragging(false);
			setSheetY(0, "snap");
		}
	};

	const handleTouchEnd = () => {
		if (!isDragging) return;

		const threshold = 50;
		const velocityThreshold = 0.5;

		if (
			dragY.current > threshold ||
			dragVelocity.current > velocityThreshold
		) {
			dismiss();
		} else {
			setSheetY(0, "snap");
		}

		setIsDragging(false);
		dragVelocity.current = 0;
	};

	// the swap only exists while picking -- confirming a reload drops it
	useEffect(() => {
		if (!isPicking) setShowBackdrop(false);
	}, [isPicking]);

	// hold the page still behind the sheet
	useScrollLock();

	useEffect(() => {
		// trigger mount animation
		requestAnimationFrame(() => {
			setIsVisible(true);
		});
	}, []);

	return (
		<>
			<div
				ref={modalRef}
				className={`fixed inset-0 z-20 bg-zinc-950 flex flex-col transition-opacity duration-300 ease-out will-change-transform ${
					isScorePickerOpen || isProgressPickerOpen
						? "overflow-hidden"
						: "overflow-y-auto"
				}`}
				// transform is driven imperatively by setSheetY
				style={{ opacity: isVisible ? 1 : 0 }}
				onTouchStart={handleTouchStart}
				onTouchMove={handleTouchMove}
				onTouchEnd={handleTouchEnd}
			>
				{isLoading?.isTrue && (
					<Loading
						customStyle={isLoading.style}
						text={isLoading.text}
						isMobile={true}
					/>
				)}
				{/* ACTION BAR -- a reload preview picks artwork the same way */}
				{isPicking && (
					<div className="sticky top-0 z-30">
						<div className="absolute top-0 left-0 right-0 mt-1.5 mx-0.5 flex items-center justify-between">
							{/* LEFT -- WHAT THE HERO SHOWS */}
							<div className="flex items-center gap-2">
								{/* COVER COLORS */}
								{colorPicker}
								{/* POSTER <-> BACKDROP */}
								{backdropCount > 0 && (
									<button
										className="bg-zinc-800/50 backdrop-blur-2xl p-2 rounded-md active:scale-95 transition-transform duration-150"
										onClick={() =>
											setShowBackdrop((v) => !v)
										}
										title={
											viewingBackdrop
												? "Back to the poster"
												: "Pick a backdrop"
										}
									>
										<Wallpaper
											className={`w-5 h-5 ${
												viewingBackdrop
													? "text-emerald-400"
													: "text-slate-400"
											}`}
										/>
									</button>
								)}
							</div>
							{/* ARTWORK INDICATOR */}
							{(canCyclePoster || canCycleBackdrop) && (
								<div className="p-1.5 px-2.5 bg-zinc-800/50 backdrop-blur-sm rounded-md">
									<span className="text-xs text-slate-400 font-medium">
										{viewingBackdrop
											? `${(backdropIndex ?? 0) + 1}/${backdropCount}`
											: `${posterPos + 1}/${posterCount}`}
									</span>
								</div>
							)}
							<div className="flex items-center gap-2">
								{/* CYCLE TITLE LOGOS */}
								{!!logoUrls?.length && (
									<div className="flex items-center gap-1 bg-zinc-800/60 rounded-lg p-0.5">
										{logoUrls.length > 1 && (
											<button
												className="bg-zinc-800/50 p-2 rounded-md active:scale-95 transition-transform duration-150"
												onClick={() =>
													onAction({
														type: "changeLogo",
														payload: "prev",
													})
												}
											>
												<ChevronLeft className="w-5 h-5 text-gray-400" />
											</button>
										)}
										{/* TEXT TITLE INSTEAD */}
										<button
											className="bg-zinc-800/50 p-2 rounded-md active:scale-95 transition-transform duration-150"
											onClick={() =>
												onAction({ type: "clearLogo" })
											}
										>
											<Type
												className={`w-5 h-5 ${
													logoIsCleared
														? "text-purple-400"
														: "text-gray-400"
												}`}
											/>
										</button>
										{logoUrls.length > 1 && (
											<button
												className="bg-zinc-800/50 p-2 rounded-md active:scale-95 transition-transform duration-150"
												onClick={() =>
													onAction({
														type: "changeLogo",
														payload: "next",
													})
												}
											>
												<ChevronRight className="w-5 h-5 text-gray-400" />
											</button>
										)}
									</div>
								)}
								{/* DIFFERENT SERIES OPTIONS */}
								{onSeriesNav && (
									<div className="flex gap-1 bg-zinc-800/60 rounded-lg p-0.5">
										<button
											className="bg-zinc-800/50 p-2 rounded-md active:scale-95 transition-transform duration-150"
											onClick={() => onSeriesNav("left")}
										>
											<ChevronLeft className="w-5 h-5 text-gray-400 transition-colors" />
										</button>
										<button
											className="bg-zinc-800/50 backdrop-blur-2xl p-2 px-2.5 rounded-md active:scale-95 transition-transform duration-150"
											onClick={() => onSeriesNav("right")}
										>
											<ChevronRight className="w-5 h-5 text-gray-400 transition-colors" />
										</button>
									</div>
								)}
							</div>
						</div>
					</div>
				)}
				{/* INFO */}
				<div className="pb-10">
					{/* PIC */}
					<div
						className={`relative w-full overflow-hidden bg-zinc-900/40 transition-all duration-300 ${
							isDragging && "rounded-lg"
						} ${canCyclePoster || canCycleBackdrop ? "cursor-pointer" : ""}`}
						onClick={
							canCycleBackdrop
								? handleBackdropChange
								: canCyclePoster
									? handleCoverChange
									: undefined
						}
					>
						{backdropSrc ? (
							<Image
								src={backdropSrc}
								alt={item.title || "Backdrop"}
								// 16:9, and off the rungs tmdb/igdb store
								width={540}
								height={304}
								sizes="100vw"
								draggable={false}
								className="object-cover w-full select-none"
							/>
						) : isBook ? (
							<BookCoverConfig
								coverUrl={
									(item as unknown as BookProps).cover?.url
								}
								title={item.title}
								coverUrls={coverUrls}
								coverIndex={coverIndex}
								height={585}
								width={390}
								sizes="100vw"
								className="object-cover w-full select-none"
							/>
						) : coverSrc ? (
							<Image
								src={coverSrc}
								alt={item.title || "Poster"}
								width={342}
								height={513}
								sizes="100vw"
								unoptimized={!isResizable(coverSrc)}
								draggable={false}
								className="object-cover w-full select-none"
							/>
						) : (
							<div className="h-64 bg-linear-to-br from-zinc-700 to-zinc-800" />
						)}
						{/* BOTTOM FADE */}
						<div className="absolute bottom-0 left-0 w-full h-20 bg-linear-to-t from-zinc-950 to-transparent pointer-events-none" />
					</div>
					<div className="px-4">
						<div className="mt-4">
							{/* SERIES TITLE */}
							{(() => {
								const seriesLabel =
									mediaType === "game"
										? g.dlcIndex !== 0
											? g.mainTitle
											: null
										: seriesTitleOf(s);

								return seriesLabel ? (
									<div className={SERIES_TEXT.sm}>
										{seriesLabel}
									</div>
								) : (
									<div></div>
								);
							})()}
							<div>
								{/* TITLE + AUTHOR  */}
								<div className="min-w-0">
									<MediaTitle
										title={item.title}
										subtitle={slotArc}
										copyTitle={slotCopyTitle}
										logoUrl={
											logoIsCleared
												? null
												: displayLogoUrl
										}
										size="sm"
										className="-mt-0.5 mx-auto min-w-0 max-w-full"
										textClass={TITLE_TEXT.sm}
										isBook={isBook}
										underlineColor={underlineColor}
									/>
									{/* CURRENT ARC */}
									{slotArc && (
										<div className={SLOT_TEXT.sm}>
											{slotArc}
										</div>
									)}
									{/* AUTHOR/STUDIO/DIRECTOR AND DATES */}
									<div className="mt-1.5 text-zinc-200/70 text-[0.8rem] font-medium leading-5 flex items-center justify-center gap-2 min-w-0">
										{/* AUTHOR / DIRECTOR / STUDIO */}
										<span className="flex items-center gap-1.5 min-w-0">
											{/* not on an anime row */}
											{(mediaType === "movie" ||
												(mediaType === "show" &&
													!isAnimeShow)) && (
												<button
													onClick={() =>
														onAction({
															type: "cast",
														})
													}
													title="View cast"
													className="shrink-0 text-zinc-400/70 active:text-zinc-200 active:scale-95 transition-all duration-200"
												>
													<Users
														className="w-3.5 h-3.5"
														strokeWidth={1.75}
													/>
												</button>
											)}
											{mediaType === "show" && (
												<button
													onClick={() =>
														onAction({
															type: "openRatings",
														})
													}
													title="Episode ratings"
													className="shrink-0 text-zinc-400/70 active:text-zinc-200 active:scale-95 transition-all duration-200"
												>
													<BarChart2
														className="w-3.5 h-3.5"
														strokeWidth={1.75}
													/>
												</button>
											)}
											{/* anilist rows only */}
											{mediaType === "show" &&
												show.anilistId && (
													<button
														onClick={() =>
															onAction({
																type: "openChain",
															})
														}
														title="Parts & side stories"
														className="shrink-0 text-zinc-400/70 active:text-zinc-200 active:scale-95 transition-all duration-200"
													>
														<ListTree
															className="w-3.5 h-3.5"
															strokeWidth={1.75}
														/>
													</button>
												)}
											{isBook && (
												<Feather
													className="w-3.5 h-3.5 shrink-0 text-zinc-400/70 rotate-280"
													strokeWidth={1.75}
												/>
											)}
											{creditOpens === "director" ? (
												<CreditNames
													names={creditNames}
													width="max-w-32"
													label="Directors"
													pickTitle="See their movies"
													onPick={(name) =>
														onAction({
															type: "directorClick",
															payload: name,
														})
													}
												/>
											) : creditOpens === "studio" ? (
												<CreditNames
													names={creditNames}
													width="max-w-32"
													label="Studios"
													pickTitle="See what they made"
													onPick={(name) =>
														onAction({
															type: "studioClick",
															payload: name,
														})
													}
												/>
											) : creditOpens === "creator" ? (
												<CreditNames
													names={creditNames}
													width="max-w-32"
													label="Creators"
													pickTitle="See their shows"
													onPick={(name) =>
														onAction({
															type: "creatorClick",
															payload: name,
														})
													}
												/>
											) : creditNames.length > 1 ? (
												<CreditNames
													names={creditNames}
													width="max-w-32"
												/>
											) : (
												<span className="truncate min-w-0">
													{differentColumns[0].getValue(
														item,
													) ||
														"Unknown " +
															differentColumns[0]
																.label}
												</span>
											)}
										</span>
										{metaDivider}
										{/* RELEASE YEAR */}
										<span className="shrink-0 flex items-center gap-1.5 tabular-nums">
											{isBook && (
												<Hourglass
													className="w-3.5 h-3.5 shrink-0 text-zinc-400/70"
													strokeWidth={1.75}
												/>
											)}
											{differentColumns[1].getValue(
												item,
											) || "Unknown"}
										</span>
										{trailingMeta && metaDivider}
										{trailingMeta}
									</div>
								</div>
								{/* SCORE | ACTION BUTTONS */}
								<div
									className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center gap-2"
									data-no-drag
								>
									<div className="flex items-center justify-end gap-1.5">
										{leftControls.map(renderControl)}
									</div>
									<div className="inline-flex items-center gap-1.5 rounded-xl neu-raised p-1">
										{canNudgeScore && (
											<button
												className={MOBILE_SCORE_SUB_BTN}
												disabled={
													!canNudgeMu(
														item.score!.mu,
														"down",
													)
												}
												onClick={() =>
													onAction({
														type: "nudgeScore",
														payload: "down",
													})
												}
											>
												<ChevronDown className="w-4 h-4" />
											</button>
										)}
										<button
											onClick={() => {
												if (franchiseView) return;
												if (!item.score || isAdding)
													setIsScorePickerOpen(true);
											}}
											className="inline-flex items-center justify-center h-7.5 px-2 min-w-15 text-sm leading-5 font-semibold tracking-wide tabular-nums text-zinc-300/85"
										>
											{item.score?.mu == null
												? "-"
												: isAdding
													? getTierFromMu(
															item.score.mu,
														)
													: `${getDisplayScore(item.score.mu)} - ${getTierFromMu(item.score.mu)}`}
										</button>
										{canNudgeScore && (
											<button
												className={MOBILE_SCORE_SUB_BTN}
												disabled={
													!canNudgeMu(
														item.score!.mu,
														"up",
													)
												}
												onClick={() =>
													onAction({
														type: "nudgeScore",
														payload: "up",
													})
												}
											>
												<ChevronUp className="w-4 h-4" />
											</button>
										)}
									</div>
									<div className="flex items-center justify-start gap-1.5">
										{rightControls.map(renderControl)}
									</div>
								</div>
							</div>
						</div>
						{/* PROGRESS BAR — show only */}
						{mediaType === "show" && slotLine.length > 0 && (
							<div onClick={() => setIsProgressPickerOpen(true)}>
								<div className="mt-4.5 w-full bg-zinc-800/80 rounded-md h-1.5 overflow-hidden shadow-md shadow-black/50">
									<div
										className={`${getStatusBg(item.status)} h-1.5 transition-all duration-500 ease-out rounded-md`}
										style={{
											width: `${
												slotLine[slotAt]
													? calcCurProgress(
															slotLine,
															slotAt,
															show.curEpisode ??
																0,
														)
													: 100
											}%`,
										}}
									/>
								</div>
								<div className="mt-1 flex justify-between text-zinc-400 text-sm font-bold mb-0.5">
									{/* same rule as the desktop box */}
									<span className="min-w-0 truncate pr-2">
										{franchiseView
											? "All seasons"
											: slotName(
													show,
													slotLine[slotAt],
													slotAt,
												)}
									</span>
									{/* movie */}
									{franchise ? (
										<span>
											Episode: {franchise.watched}/
											{franchise.total}
										</span>
									) : isMovieSlot(slotLine[slotAt]) ? (
										<span>
											Runtime:{" "}
											{(slotLine[slotAt]?.episode_count ||
												1) *
												(slotLine[slotAt]?.duration ||
													0) || "-"}{" "}
											min
										</span>
									) : (
										<span>
											Episode:{" "}
											{isBrowsing
												? "—"
												: (show.curEpisode ?? "-")}
										</span>
									)}
								</div>
								{isBrowsing && (
									<div
										className="mt-1.5 flex justify-end gap-2"
										data-no-drag
										onClick={(e) => e.stopPropagation()}
									>
										{/* what the order's own node does, for the part in view */}
										{canHideSlot && (
											<button
												onClick={() =>
													onAction({
														type: "hideSlot",
													})
												}
												aria-label="Set aside"
												className="flex items-center justify-center w-8 h-8 rounded-lg neu-carved active:scale-95 transition-all duration-150"
											>
												<EyeOff
													className="w-4 h-4 text-zinc-500"
													strokeWidth={2.25}
												/>
											</button>
										)}
										<button
											onClick={() =>
												onAction({
													type: "commitView",
												})
											}
											aria-label="Watch from here"
											className="flex items-center justify-center w-8 h-8 rounded-lg neu-carved active:scale-95 transition-all duration-150"
										>
											<Milestone
												className="w-4 h-4 text-emerald-600 drop-shadow-[0_0_5px_rgba(16,185,129,0.3)]"
												strokeWidth={2.25}
											/>
										</button>
									</div>
								)}
							</div>
						)}
						{/* STATUS */}
						<div className="-mt-2" data-no-drag>
							<label className="text-zinc-400 text-xs font-medium">
								Status
							</label>
							<div className="pt-1 flex flex-wrap gap-2 pb-1">
								{statusOptions.map((status, index) => (
									<button
										key={status.value}
										onClick={() =>
											onAction({
												type: "changeStatus",
												payload: `${status.value}`,
											})
										}
										className={`${
											index === 3 ? "w-full" : "flex-1"
										} px-4 py-1.5 text-sm rounded-md border border-zinc-700/30 font-semibold whitespace-nowrap transition-all duration-200 active:scale-95 shadow-lg shadow-black/50 ${
											status.value === item.status
												? `${getStatusBg(status.value)} text-zinc-100`
												: "text-zinc-300 bg-zinc-900/40 hover:bg-zinc-800/60"
										}`}
									>
										{status.label}
									</button>
								))}
							</div>
						</div>
						{/* PREQUEL AND SEQUEL */}
						{mediaType !== "show" && (
							<MobileSeriesNav
								item={item}
								mediaType={mediaType}
								onAction={onAction}
								isInList={isInList}
							/>
						)}
						{/* NOTE */}
						<div
							className={`${mediaType === "show" ? "mt-1" : "mt-3"}`}
							data-no-drag
						>
							<label className="text-zinc-400 text-xs font-medium">
								Notes
							</label>
							<div className="bg-zinc-800/40 rounded-lg pl-3 pr-1 pt-3 pb-2 focus-within:ring-1 focus-within:ring-zinc-700 transition-all duration-200 max-h-22 overflow-auto shadow-lg shadow-black/50">
								<MobileAutoTextarea
									value={localNote}
									onChange={(e) =>
										onAction({
											type: "changeNote",
											payload: e.target.value,
										})
									}
									onBlur={() =>
										onAction({ type: "saveNote" })
									}
									placeholder={`Add your thoughts about ${
										noteSubject ?? `this ${mediaType}`
									}...`}
									className="w-full bg-transparent text-zinc-200 text-sm leading-relaxed resize-none outline-none placeholder-zinc-500"
								/>
							</div>
						</div>
					</div>
				</div>
			</div>
			<MobileScorePicker
				isOpen={isScorePickerOpen}
				onClose={() => setIsScorePickerOpen(false)}
				onScoreChange={(tier) =>
					onAction({ type: "setInitialTier", payload: tier })
				}
			/>
			{mediaType === "show" && (
				<MobileProgressPicker
					isOpen={isProgressPickerOpen}
					seasons={slotLine}
					showTitle={item.title}
					showTitleAlt={franchiseRomajiOf(show)}
					slotIndex={slotAt}
					curEpisode={show.curEpisode ?? 1}
					onClose={() => setIsProgressPickerOpen(false)}
					onSeasonIndexChange={(seasonIndex) => {
						onAction({
							type: "changeSeasonNum",
							payload: seasonIndex,
						});
					}}
					onEpisodeChange={(episode) => {
						onAction({
							type: "changeEpisodeNum",
							payload: episode,
						});
					}}
				/>
			)}
			{/* CONFIRM AN ACTION */}
			<ConfirmPrompt
				isOpen={!!pending}
				title={pending?.confirm?.title ?? ""}
				confirmLabel={pending?.confirm?.confirmLabel}
				icon={pending?.icon}
				tone={pending?.tone}
				onCancel={() => setPending(null)}
				onConfirm={() => {
					const action = pending?.action;
					setPending(null);
					if (action) onAction({ type: action });
				}}
			/>
		</>
	);
}
