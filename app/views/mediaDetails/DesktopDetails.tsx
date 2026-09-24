import Image from "next/image";
import { ReactNode, useState } from "react";
import { Loading } from "@/app/components/ui/Loading";
import { CreditNames } from "./shared/CreditNames";
import { ModalBackdrop, ModalPanel } from "@/app/components/ui/ModalMotion";
import {
	BaseMediaProps,
	ColumnConfig,
	MediaCoverProps,
	SeriesMediaProps,
	SeriesTargetProps,
} from "@/types/media";
import { GameProps } from "@/types/game";
import { formatDateShort } from "@/utils/formattingUtils";
import { hasSeries, seriesTitleOf } from "@/utils/seriesRead";
import {
	coverWave,
	getStatusDetailWaveColor,
	statusBezel,
} from "@/utils/styleUtils";
import { slotSubtitle } from "@/app/shows/utils/animeTitles";
import {
	Trash2,
	Plus,
	X,
	ChevronsUp,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	ChevronDown,
	RotateCcw,
	RefreshCw,
	Images,
	Image as ImageIcon,
	Check,
	List,
	Users,
	Boxes,
	Box,
	Leaf,
	Feather,
	Hourglass,
	BookCheck,
	Unlink,
	Type,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BackdropImage } from "@/app/components/ui/Backdrop";
import { Dropdown, Option } from "@/app/components/ui/Dropdown";
import { tierOptions } from "@/utils/dropDownDetails";
import { AutoTextarea } from "@/app/components/ui/AutoTextArea";
import { BookCoverConfig } from "@/app/books/components/BookCoverConfigDetails";
import { CoverColorPicker } from "@/app/components/ui/CoverColorPicker";
import { BookBackdropDetails } from "@/app/components/ui/BookBackdrop";
import { SeriesNav } from "./shared/SeriesNav";
import { activeLogoIndex, isLogoCleared } from "../../../utils/artworkIndex";
import {
	franchiseRomajiOf,
	isAnimeRow,
	slotOf,
	wearsRowPoster,
} from "@/app/shows/utils/slotRef";
import { formatVotes, getTier } from "@/app/shows/utils/episodeRatings";
import { ActionBtn } from "../../components/ui/DetailsActionBtn";
import {
	FIELD_LABEL,
	FIELD_PLATE,
	HEADER_WASH_MASK,
	SCORE_SUB_BTN,
} from "@/utils/styleUtils";
import { MediaTitle, SERIES_TEXT, TITLE_TEXT } from "./shared/MediaTitle";
import { LOGO_SPEC } from "./shared/logoMetrics";
import { useArtworkPrime } from "@/hooks/useArtworkPrime";
import { EditProgress } from "@/app/shows/components/EditProgressDetail";
import {
	canNudgeMu,
	getDisplayScore,
	getTierFromMu,
	Tier,
} from "@/lib/tierConfig";
import { ShowProps } from "@/types/show";
import { MovieProps } from "@/types/movie";
import { BookProps } from "@/types/book";
import {
	ConfirmPrompt,
	type ConfirmTone,
} from "@/app/components/ui/ConfirmButton";

// action button thang
const ACTION_ROW = "absolute right-3 top-3 flex items-center z-10";
//
const POSTER_SPEC = { width: 248, sizes: "(min-width: 2200px) 500px, 250px" };
const BACKDROP_SPEC = { width: 780, sizes: "40vw" };

// an action held back until it's confirmed
type PendingConfirm = {
	action: string;
	title: string;
	confirmLabel: string;
	tone: ConfirmTone;
	icon: LucideIcon;
};

interface DesktopDetailsProps<T extends BaseMediaProps> {
	item: T;
	localNote: string;
	statusOptions: Option[];
	mediaType: string;
	isLoading?: { isTrue: boolean; style: string; text: string };
	isAdding: boolean;
	onAdd: () => void;
	isSubmitting?: boolean;
	onClose: () => void;
	onSeriesNav?: (dir: "left" | "right") => void;
	isInList?: (target: SeriesTargetProps) => boolean;
	differentColumns: [ColumnConfig<T>, ColumnConfig<T>];
	onAction: (action: { type: string; payload?: unknown }) => void;
	canRefresh?: boolean;
	isSelecting?: boolean;
	// movie/show
	posterUrls?: string[];
	posterIndex?: number;
	// game/movie/show
	backdropUrls?: string[];
	backdropIndex?: number;
	// movie/show/game
	logoUrls?: string[];
	logoIndex?: number;
	// book
	coverUrls?: MediaCoverProps[];
	coverIndex?: number;
	// show
	isBrowsing?: boolean;
	noteSubject?: string;
	sidePanel?: ReactNode;
	ratingsDocked?: boolean;
	franchiseView?: boolean;
	viewedComplete?: boolean;
	editingMode?: { season: boolean; episode: boolean };
	inputValues?: { season: number | ""; episode: number | "" };
	seriesInfo?: { rating: number | null; votes: number | null } | null;
}

export function DesktopDetails<T extends BaseMediaProps>({
	sidePanel,
	item,
	localNote,
	noteSubject,
	franchiseView,
	statusOptions,
	mediaType,
	isLoading,
	isAdding,
	onAdd,
	isSubmitting,
	onClose,
	onSeriesNav,
	isInList,
	isBrowsing,
	ratingsDocked,
	seriesInfo,
	viewedComplete,
	onAction,
	canRefresh,
	isSelecting,
	coverUrls,
	coverIndex,
	posterUrls,
	posterIndex,
	backdropUrls,
	backdropIndex,
	logoUrls,
	logoIndex,
	editingMode,
	inputValues,
	differentColumns,
}: DesktopDetailsProps<T>) {
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault(); // prevent new line
			onAction({ type: "saveNote" });
			e.currentTarget.blur(); // remove focus
		}
	};
	const isBook = mediaType === "book";
	const series = item as unknown as SeriesMediaProps;
	const gameItem = item as unknown as GameProps;
	const movieItem = item as unknown as MovieProps;
	const bookItem = item as unknown as BookProps;
	const showRow = item as unknown as ShowProps;
	const isPicking = isAdding || !!isSelecting;

	useArtworkPrime("desktop", [
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
			enabled: isPicking && !isBook,
		},
		{
			urls: logoUrls,
			index: activeLogoIndex(logoIndex ?? 0),
			spec: LOGO_SPEC,
			enabled: isPicking,
		},
	]);

	// the action waiting on its confirmation
	const [pending, setPending] = useState<PendingConfirm | null>(null);

	// which half of the artwork was clicked decides the direction
	const stepFrom = (type: string) => (e: React.MouseEvent<HTMLElement>) => {
		const rect = e.currentTarget.getBoundingClientRect();
		const clickX = e.clientX - rect.left;
		const elementWidth = rect.width;
		const isRightSide = clickX > elementWidth / 2;

		onAction({ type, payload: isRightSide ? "next" : "prev" });
	};
	const handleCoverChange = stepFrom("changeCover");
	const handleBackdropChange = stepFrom("changeBackdrop");

	// POSTER STUFF
	const activeCover =
		(isBook && isPicking ? coverUrls?.[coverIndex ?? 0] : undefined) ??
		item.cover ??
		undefined;
	//
	const posterCount = (isBook ? coverUrls?.length : posterUrls?.length) ?? 0;
	const posterPos = (isBook ? coverIndex : posterIndex) ?? 0;
	const isAnimeShow = mediaType === "show" && isAnimeRow(showRow);
	//
	const franchisePoster = wearsRowPoster(showRow, isPicking);
	const hasSlotArt =
		mediaType === "show" &&
		(showRow.seasons ?? []).some((season) => !!season.posterUrl);
	//
	const canCyclePoster = isPicking && posterCount > 1 && franchisePoster;

	//
	const opensRatings = mediaType === "show" && !isPicking;
	// season title
	const slotTitle =
		mediaType === "show" ? (slotOf(showRow)?.title ?? null) : null;
	const slotArc =
		mediaType === "show"
			? slotSubtitle(slotTitle, item.title, franchiseRomajiOf(showRow))
			: null;
	const slotCopyTitle = isAnimeShow ? slotTitle : null;
	//
	const logoIsCleared = isLogoCleared(logoIndex);
	const logoPicker =
		isPicking && logoUrls?.length ? (
			<div className="flex gap-1 bg-zinc-800/50 rounded-lg">
				{logoUrls.length > 1 && (
					<button
						className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-yellow-600/60 hover:cursor-pointer transition-all group"
						onClick={() =>
							onAction({ type: "changeLogo", payload: "prev" })
						}
						title={`Previous title logo (${activeLogoIndex(logoIndex ?? 0) + 1}/${
							logoUrls.length
						})`}
					>
						<ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-yellow-500 transition-colors" />
					</button>
				)}
				{/* TEXT TITLE */}
				<button
					className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-purple-600/25 hover:cursor-pointer transition-all group"
					onClick={() => onAction({ type: "clearLogo" })}
					title={
						logoIsCleared
							? "Use the title logo"
							: "Use the text title instead"
					}
				>
					<Type
						className={`w-5 h-5 transition-colors ${
							logoIsCleared
								? "text-purple-400"
								: "text-gray-400 group-hover:text-purple-400"
						}`}
					/>
				</button>
				{logoUrls.length > 1 && (
					<button
						className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-yellow-600/60 hover:cursor-pointer transition-all group"
						onClick={() =>
							onAction({ type: "changeLogo", payload: "next" })
						}
						title={`Next title logo (${activeLogoIndex(logoIndex ?? 0) + 1}/${logoUrls.length})`}
					>
						<ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-yellow-500 transition-colors" />
					</button>
				)}
			</div>
		) : null;

	// cover colour picker
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

	// Prequel/sequel stepper
	const seriesNav = onSeriesNav ? (
		<div className="flex gap-1 bg-zinc-800/50 rounded-lg">
			<button
				className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-yellow-600/60 hover:cursor-pointer transition-all group"
				onClick={() => onSeriesNav("left")}
				title={"Previous series"}
			>
				<ChevronLeft className="w-5 h-5 text-gray-400 group-hover:text-yellow-500 transition-colors" />
			</button>
			<button
				className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-yellow-600/60 hover:cursor-pointer transition-all group"
				onClick={() => onSeriesNav("right")}
				title={"Next series"}
			>
				<ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-yellow-500 transition-colors" />
			</button>
		</div>
	) : null;

	// POSTER SOURCE
	const posterSourceToggle = (ghost = false) => {
		if (!hasSlotArt) return null;
		const icon = franchisePoster ? ImageIcon : Images;
		const title = franchisePoster
			? "Showing the show's poster -- use the part's"
			: "Showing the part's poster -- use the show's";
		const pick = () => onAction({ type: "togglePosterSource" });
		return ghost ? (
			<ActionBtn
				variant="ghost"
				icon={icon}
				tone="blue"
				onClick={pick}
				title={title}
			/>
		) : (
			<ActionBtn icon={icon} tone="blue" onClick={pick} title={title} />
		);
	};

	// FRANCHISE VIEW
	const franchiseToggle =
		franchiseView === undefined ? null : (
			<ActionBtn
				variant="ghost"
				icon={franchiseView ? Boxes : Box}
				tone="purple"
				onClick={() => onAction({ type: "toggleFranchiseView" })}
				title={
					franchiseView
						? "Showing the whole franchise -- back to this part"
						: "Showing this part -- see the whole franchise"
				}
			/>
		);

	// MORE STUFF -- books only
	const moreResults = isBook ? (
		<button
			className="p-1.5 px-2.5 rounded-lg bg-zinc-800/50 hover:bg-blue-600/20 hover:cursor-pointer transition-all group"
			onClick={() => onAction({ type: "moreBooks" })}
			title={"Other results"}
		>
			<List className="w-5 h-5 text-gray-400 group-hover:text-blue-400 transition-colors" />
		</button>
	) : null;

	// cover color
	const coverSrc = item.cover?.url ?? item.posterUrl;
	const coverColor = activeCover?.color;

	// falls through to the stored backdrop when the source served no candidates
	const imageBackdropUrl =
		(isPicking ? backdropUrls?.[backdropIndex ?? 0] : undefined) ??
		item.backdropUrl;
	const displayLogoUrl =
		isPicking && logoUrls?.length ? logoUrls[logoIndex ?? 0] : item.logoUrl;

	// find creator
	const creditNames =
		(mediaType === "movie" || mediaType === "show") && !isPicking
			? String(differentColumns[0].getValue(item) ?? "")
					.split(",")
					.map((n) => n.trim())
					.filter(Boolean)
			: [];
	//
	const creditOpens: "director" | "studio" | "creator" | null =
		!creditNames.length
			? null
			: mediaType === "movie"
				? "director"
				: isAnimeShow
					? "studio"
					: "creator";

	// ---
	const hasBackdrop = isBook ? !!coverColor : !!imageBackdropUrl;
	// ---
	const showLogoTitle = !!displayLogoUrl;
	// ---
	const seriesLabel =
		mediaType === "game"
			? gameItem.dlcIndex !== 0
				? gameItem.mainTitle
				: null
			: seriesTitleOf(series);
	// ---
	const underlineColor =
		mediaType === "show"
			? undefined
			: coverColor?.trim()
				? coverWave(coverColor)
				: getStatusDetailWaveColor(item.status);

	// source rating
	const externalRating =
		mediaType === "movie" && item.status === "Want to Watch"
			? movieItem.imdbRating
			: isBook && item.status === "Want to Read"
				? bookItem.rating
				: null;

	// COMPLETED DATE | RATING
	const trailingMeta =
		externalRating != null ? (
			<span
				className="flex items-center shrink-0 gap-1.5"
				title="Source rating"
			>
				<Leaf
					className="w-3.5 h-3.5 shrink-0 text-green-400/60"
					strokeWidth={1.75}
				/>
				<span className="font-semibold tabular-nums text-zinc-300/80 tracking-tight">
					{externalRating.toFixed(1)}
				</span>
			</span>
		) : item.status === "Completed" ? (
			<span
				className="shrink-0 flex items-center gap-1.5 tabular-nums"
				title="Date Completed"
			>
				{isBook && (
					<BookCheck
						className="w-3.5 h-3.5 shrink-0 text-zinc-400/70"
						strokeWidth={1.75}
					/>
				)}
				{formatDateShort(item.dateCompleted)}
			</span>
		) : null;

	//
	const authorSectorDivider = (
		<span aria-hidden className="h-3 w-px shrink-0 bg-zinc-500/35" />
	);

	// RELEASE YEAR
	const releaseMeta = (
		<span
			className="shrink-0 flex items-center gap-1.5 tabular-nums"
			title="Date Published"
		>
			{isBook && (
				<Hourglass
					className="w-3.5 h-3.5 shrink-0 text-zinc-400/70"
					strokeWidth={1.75}
				/>
			)}
			{differentColumns[1].getValue(item) || "Unknown"}
		</span>
	);

	// author section
	const metaRow = (
		<div
			className={`select-none flex items-center gap-3 text-[0.92rem] font-medium leading-6 text-zinc-200/70 ${
				isBook
					? "justify-center w-[94%] mx-auto -mb-0.5"
					: "justify-between w-full mt-1.25 mb-0.75"
			}`}
		>
			{/* LEFT -- AUTHOR */}
			<span className="flex items-center gap-1.5 min-w-0">
				{(mediaType === "movie" ||
					// not used for anime since it will only return va
					(mediaType === "show" && !isAnimeShow)) && (
					<button
						onClick={() =>
							onAction({
								type: "cast",
							})
						}
						title="View cast"
						className="cursor-pointer text-zinc-400/70 hover:text-zinc-200 transition-all duration-200 shrink-0 hover:scale-105"
					>
						<Users className="w-3.5 h-3.5" strokeWidth={1.75} />
					</button>
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
				) : (
					<>
						{isBook && (
							<Feather
								className="w-3.5 h-3.5 shrink-0 text-zinc-400/70 rotate-280"
								strokeWidth={1.75}
							/>
						)}
						{ratingsDocked && seriesInfo?.rating != null ? (
							<span className="flex min-w-0 items-center gap-1.5 text-[0.8rem] tabular-nums">
								{seriesInfo.votes != null && (
									<span className="shrink-0 text-zinc-400/70">
										{formatVotes(seriesInfo.votes)}
									</span>
								)}
								<Leaf
									className="w-3.5 h-3.5 shrink-0"
									strokeWidth={2}
									style={{
										color:
											getTier(seriesInfo.rating)?.hex ??
											"#71717a",
									}}
								/>
								<span className="shrink-0 text-[0.85rem] font-bold text-zinc-300">
									{seriesInfo.rating.toFixed(1)}
								</span>
							</span>
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
							<CreditNames names={creditNames} width="max-w-32" />
						) : (
							<span
								className="truncate min-w-0"
								title={String(
									differentColumns[0].getValue(item) ?? "",
								)}
							>
								{differentColumns[0].getValue(item) ||
									"Unknown " + differentColumns[0].label}
							</span>
						)}
					</>
				)}
			</span>
			{/* RIGHT -- RELEASE YEAR | RATING/COMPLETE DATE */}
			{isBook ? (
				<>
					{authorSectorDivider}
					{releaseMeta}
					{trailingMeta && authorSectorDivider}
					{trailingMeta}
				</>
			) : (
				<span className="shrink-0 flex items-center gap-3">
					{releaseMeta}
					{trailingMeta}
				</span>
			)}
		</div>
	);

	return (
		<ModalBackdrop className="fixed inset-0 bg-linear-to-br from-black/50 via-black/60 to-black/80 backdrop-blur-md flex items-center justify-center z-20">
			<div
				className="fixed inset-0"
				onClick={
					isPicking
						? undefined
						: () => {
								onAction({ type: "closeModal" });
							}
				}
			/>
			<div className="relative">
				{sidePanel}
				{/* BACKGROUND BORDER GRADIENT */}
				<ModalPanel
					className={`rounded-[1.375rem] p-1.5 py-2 ${isBook ? "lg:min-w-225 lg:max-w-225" : "lg:min-w-230 lg:max-w-230"}`}
					style={{ background: statusBezel(item.status) }}
				>
					{/* ACTUAL DETAIL CARD */}
					<div className="bg-linear-to-br bg-[#121212] backdrop-blur-xl border border-zinc-800/50 rounded-2xl shadow-2xl w-full max-h-[calc(100vh-3rem)]">
						{isLoading?.isTrue && (
							<Loading
								customStyle={isLoading.style}
								text={isLoading.text}
							/>
						)}
						<div
							className={`px-5 py-3.5 border-0 rounded-2xl overflow-hidden`}
						>
							{/* ACTION BUTTONS */}
							{isSelecting ? (
								<div className={`${ACTION_ROW} gap-1.5`}>
									{seriesNav}
									{/* CYCLE LOGOS | TEXT TITLE */}
									{logoPicker}
									{/* COVER COLORS */}
									{colorPicker}
									{/* POSTER SOURCE */}
									{posterSourceToggle()}
									{moreResults}
									{/* CONFIRM REFRESH */}
									<ActionBtn
										icon={Check}
										tone="green"
										pad="py-1.5 px-5"
										onClick={() =>
											onAction({ type: "confirmRefresh" })
										}
										title="Apply"
									/>
									{/* CANCEL REFRESH */}
									<ActionBtn
										icon={X}
										tone="red"
										pad="py-1.5 px-2"
										onClick={() =>
											onAction({ type: "cancelRefresh" })
										}
										title="Cancel"
									/>
								</div>
							) : isAdding ? (
								<div className={`${ACTION_ROW} gap-1.5`}>
									{/* CYCLE LOGOS | TEXT TITLE */}
									{logoPicker}
									{/* COVER COLORS */}
									{colorPicker}
									{/* POSTER SOURCE */}
									{posterSourceToggle()}
									{seriesNav}
									{/* ADD */}
									<ActionBtn
										icon={Plus}
										tone="green"
										pad="py-1.5 px-5"
										onClick={onAdd}
										busy={isSubmitting}
										title={"Add " + mediaType}
									/>
									{/* NEED YEAR */}
									{!isBook && (
										<ActionBtn
											icon={ChevronsUp}
											tone="blue"
											pad="p-1.5 px-2.5"
											onClick={() =>
												onAction({
													type: "needYearField",
												})
											}
											title="Search with year"
										/>
									)}
									{moreResults}
									{/* CLOSE BUTTON */}
									<ActionBtn
										icon={X}
										tone="red"
										pad="py-1.5 px-2"
										onClick={onClose}
										title="Close"
									/>
								</div>
							) : (
								<div className={`${ACTION_ROW} gap-1`}>
									{/* RELOAD METADATA FROM SOURCE */}
									{canRefresh && (
										<ActionBtn
											variant="ghost"
											icon={RefreshCw}
											tone="emerald"
											onClick={() =>
												onAction({ type: "refresh" })
											}
											title="Reload cover / series info"
										/>
									)}
									{/* RESET SCORE */}
									{item.score && !franchiseView && (
										<ActionBtn
											variant="ghost"
											icon={RotateCcw}
											tone="blue"
											onClick={() =>
												setPending({
													action: "resetScore",
													title: "Reset score?",
													confirmLabel: "Reset",
													tone: "blue",
													icon: RotateCcw,
												})
											}
											title="Reset score"
										/>
									)}
									{/* DELETE SERIES METADATA */}
									{hasSeries(series) &&
										mediaType !== "game" && (
											<ActionBtn
												variant="ghost"
												icon={Unlink}
												tone="orange"
												onClick={() =>
													setPending({
														action: "clearSeriesMeta",
														title: "Clear series info?",
														confirmLabel: "Clear",
														tone: "orange",
														icon: Unlink,
													})
												}
												title="Clear series metadata"
											/>
										)}
									{/* DELETE ITEM */}
									<ActionBtn
										variant="ghost"
										icon={Trash2}
										tone="red"
										onClick={() =>
											setPending({
												action: "delete",
												title: `Delete this ${mediaType}?`,
												confirmLabel: "Delete",
												tone: "red",
												icon: Trash2,
											})
										}
										title={"Delete " + mediaType}
									/>
								</div>
							)}

							<div className="flex gap-6">
								{/* LEFT SIDE -- PIC */}
								<div
									className={`relative w-69 shrink-0 bg-[#141414] p-3.5 rounded-xl shadow-island select-none transition-all duration-300 ${
										isBook ? "" : "pb-0"
									}`}
								>
									{/* art takes the click*/}
									<div
										className={`relative flex items-center justify-center max-w-62 max-h-93 overflow-hidden rounded-lg bg-linear-to-br from-zinc-800 to-zinc-900 transition-all duration-300 ${
											canCyclePoster || opensRatings
												? "hover:cursor-pointer"
												: ""
										} ${opensRatings ? "hover:brightness-110" : ""}`}
										onClick={(e) => {
											if (canCyclePoster)
												return handleCoverChange(e);
											if (opensRatings)
												onAction({
													type: "openRatings",
												});
										}}
										title={
											canCyclePoster
												? `${posterPos + 1}/${posterCount}`
												: opensRatings
													? "Episode ratings"
													: ""
										}
									>
										{!isBook ? (
											coverSrc ? (
												<Image
													src={coverSrc}
													alt={
														item.title || "Untitled"
													}
													width={248}
													height={372}
													sizes="(min-width: 2200px) 500px, 250px"
													draggable={false}
													className={`min-w-62 min-h-93 select-none ${mediaType === "game" ? "object-cover" : "object-cover"}`}
												/>
											) : (
												<div className="min-w-62 min-h-93 bg-linear-to-br from-zinc-700 to-zinc-800 border border-zinc-600/30"></div>
											)
										) : (
											<BookCoverConfig
												coverUrl={bookItem.cover?.url}
												title={item.title}
												coverUrls={coverUrls}
												coverIndex={coverIndex}
												className={
													"min-w-62 min-h-93 object-cover select-none"
												}
												height={372}
												width={248}
												sizes="(min-width: 2200px) 500px, 250px"
											/>
										)}
									</div>
									{/* gradient overlay */}
									<div
										className="absolute inset-0 left-3.5 top-3.5 max-w-62 max-h-93 rounded-lg pointer-events-none"
										style={{
											background:
												"linear-gradient(to bottom, transparent 0%, rgba(24,24,27,0) 50%, rgba(24,24,27,0.3) 100%)",
										}}
									/>
									{/* inner vignette */}
									<div className="absolute -inset-1 pointer-events-none rounded-xl shadow-[inset_0_0_12px_rgba(0,0,0,0.4)]" />
									{/* AUTHOR/STUDIO/DIRECTOR/DATES */}
									{!isBook && metaRow}
								</div>

								{/* RIGHT SIDE -- DETAILS */}
								<div className="flex flex-col flex-1 min-h-93 min-w-62 relative">
									{/* WHOSE POSTER | WHOSE SCORE AND NOTE */}
									{!isPicking &&
										(hasSlotArt ||
											franchiseView !== undefined) && (
											<div className="absolute -top-0.5 left-[3%] z-10 flex items-center gap-1">
												{posterSourceToggle(true)}
												{franchiseToggle}
											</div>
										)}
									{/* BACKDROP */}
									{isBook
										? coverColor && (
												<BookBackdropDetails
													color={coverColor}
												/>
											)
										: imageBackdropUrl && (
												<BackdropImage
													src={imageBackdropUrl}
													width={
														mediaType === "game"
															? 540
															: 780
													}
													height={
														mediaType === "game"
															? 304
															: 439
													}
												/>
											)}
									{/* backdrop cycling overlay */}
									{isPicking &&
										backdropUrls &&
										backdropUrls.length > 1 && (
											<div
												className="absolute top-0 -left-8 -right-8 h-40 hover:cursor-pointer z-5"
												onClick={handleBackdropChange}
												title={`${(backdropIndex ?? 0) + 1}/${backdropUrls.length}`}
											/>
										)}
									{/*  */}
									<div
										className={`flex flex-col flex-1 ${
											mediaType === "show"
												? "justify-end translate-y-1.5"
												: seriesLabel
													? "justify-end mb-4"
													: "justify-end mb-3"
										}`}
									>
										{/* HEADER -- sat over backdrop */}
										<div
											className={`relative flex flex-col items-center w-fit max-w-[94%] mx-auto ${isBook ? "-mb-1" : `${showLogoTitle ? "mb-0.5" : "-mb-1"}`}`}
										>
											{/* washblur */}
											{hasBackdrop && !isBook && (
												<div
													className="absolute -left-5 -right-10 -top-5 -bottom-2 -z-1 pointer-events-none  backdrop-blur-[3px]"
													style={{
														backgroundColor:
															"rgba(9,9,11,0.16)",
														maskImage:
															HEADER_WASH_MASK,
														WebkitMaskImage:
															HEADER_WASH_MASK,
														maskComposite:
															"intersect",
														WebkitMaskComposite:
															"source-in",
													}}
												/>
											)}
											{/* SERIES TITLE */}
											{seriesLabel && (
												<span
													className={
														!isBook
															? SERIES_TEXT.lgScreen
															: SERIES_TEXT.lg
													}
												>
													{seriesLabel}
												</span>
											)}
											{/* TITLE */}
											<MediaTitle
												title={item.title}
												subtitle={slotArc}
												copyTitle={slotCopyTitle}
												logoUrl={displayLogoUrl}
												size="lg"
												className="mx-auto mb-1.5 max-w-full"
												textClass={
													!isBook
														? TITLE_TEXT.lgScreen
														: TITLE_TEXT.lg
												}
												underlineColor={underlineColor}
												isBook={isBook}
											/>
										</div>
										{isBook && metaRow}
										{/* STATUS AND SCORE */}
										<div className="flex justify-start gap-4 mb-2.5 w-[94%] mx-auto">
											{/* STAUTS */}
											<div className="flex-[0.77] lg:min-w-41.25">
												<label
													className={`${FIELD_LABEL} mb-1.5`}
												>
													Status
												</label>
												<Dropdown
													value={item.status}
													onChange={(value) => {
														onAction({
															type: "changeStatus",
															payload: value as
																| "Completed"
																| "Want to Watch"
																| "Dropped",
														});
													}}
													options={statusOptions}
													customStyle="text-zinc-300/85 select-none"
													dropDuration={0.24}
												/>
											</div>
											{/* SCORE */}
											<div className="flex-[0.865] lg:min-w-48.75">
												<label
													className={`${FIELD_LABEL} mb-1.5 text-right pr-2`}
												>
													Score
												</label>
												{franchiseView ? (
													<div
														className={`w-full ${FIELD_PLATE} flex items-center px-4 py-3 select-none`}
													>
														<span className="text-sm text-zinc-300/85 font-bold tracking-wide">
															{item.score
																? `${getTierFromMu(item.score.mu)} - ${getDisplayScore(item.score.mu)}`
																: "-"}
														</span>
													</div>
												) : item.score && !isAdding ? (
													<div
														// DO flex-row-reverse for flip
														className={`group w-full ${FIELD_PLATE} flex flex-row items-center justify-between gap-3 px-4 py-3 select-none transition-all duration-300 ease-out`}
													>
														<span className="text-sm text-zinc-300/85 font-bold tracking-wide">
															{getTierFromMu(
																item.score!.mu,
															)}
															{!isAdding &&
																` - ${getDisplayScore(item.score.mu)}`}
														</span>
														{/* SCORE SUB BUTTONS */}
														{!isAdding &&
															!isSelecting && (
																<div className="flex gap-1 -my-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
																	<button
																		className={
																			SCORE_SUB_BTN
																		}
																		disabled={
																			!canNudgeMu(
																				item
																					.score
																					.mu,
																				"down",
																			)
																		}
																		onClick={() =>
																			onAction(
																				{
																					type: "nudgeScore",
																					payload:
																						"down",
																				},
																			)
																		}
																		title={
																			"Lower by 0.1"
																		}
																	>
																		<ChevronDown className="w-4 h-4 text-zinc-300/80" />
																	</button>
																	<button
																		className={
																			SCORE_SUB_BTN
																		}
																		disabled={
																			!canNudgeMu(
																				item
																					.score
																					.mu,
																				"up",
																			)
																		}
																		onClick={() =>
																			onAction(
																				{
																					type: "nudgeScore",
																					payload:
																						"up",
																				},
																			)
																		}
																		title={
																			"Raise by 0.1"
																		}
																	>
																		<ChevronUp className="w-4 h-4 text-zinc-300/80" />
																	</button>
																</div>
															)}
													</div>
												) : (
													<Dropdown
														value={
															item.score
																? getTierFromMu(
																		item
																			.score
																			.mu,
																	)
																: "-"
														}
														onChange={(value) => {
															if (value === "-")
																return;
															onAction({
																type: "setInitialTier",
																payload:
																	value as Tier,
															});
														}}
														options={tierOptions}
														customStyle="text-zinc-300/85 select-none"
														// flip
														dropStyle={(() => {
															const option =
																statusOptions.find(
																	(opt) =>
																		opt.value ===
																		item.status,
																);
															return option
																? [
																		option.textStyle,
																		option.bgStyle,
																	].filter(
																		(
																			s,
																		): s is string =>
																			s !==
																			undefined,
																	)
																: [];
														})()}
														dropDuration={0.4}
													/>
												)}
											</div>
										</div>
										{/* SHOW PROGRESS (season/episode) */}
										{mediaType === "show" &&
											editingMode &&
											inputValues && (
												<EditProgress
													item={showRow}
													editingMode={editingMode}
													inputValues={inputValues}
													isBrowsing={isBrowsing}
													viewedComplete={
														viewedComplete
													}
													franchiseView={
														franchiseView
													}
													onAction={onAction}
												/>
											)}
										{/* NOTES */}
										<div className="space-y-1.5 mb-2 w-[94%] mx-auto">
											<label className={FIELD_LABEL}>
												Notes
											</label>
											<div
												className={`${FIELD_PLATE} focus-within:neu-pressed px-3 pt-2.75 pb-0.75  max-h-15 overflow-auto transition-all duration-200`}
											>
												<AutoTextarea
													value={localNote}
													onChange={(e) => {
														onAction({
															type: "changeNote",
															payload:
																e.target.value,
														});
													}}
													onKeyDown={handleKeyDown}
													onBlur={() => {
														onAction({
															type: "saveNote",
														});
													}}
													placeholder={`Add your thoughts about ${
														noteSubject ??
														`this ${mediaType}`
													}...`}
													className="text-gray-300/90 text-sm leading-relaxed whitespace-pre-line w-full bg-transparent border-none resize-none outline-none placeholder-zinc-500 font-medium select-none focus:select-text"
												/>
											</div>
										</div>
									</div>
									{/* PREQUEL AND SEQUEL */}
									{mediaType !== "show" && (
										<SeriesNav
											item={item}
											mediaType={mediaType}
											onAction={onAction}
											isInList={isInList}
											accentColor={coverColor}
										/>
									)}
								</div>
							</div>
						</div>
					</div>
				</ModalPanel>
			</div>
			{/* CONFIRM AN ACTION */}
			<ConfirmPrompt
				isOpen={!!pending}
				placement="center"
				title={pending?.title ?? ""}
				confirmLabel={pending?.confirmLabel}
				icon={pending?.icon}
				tone={pending?.tone}
				onCancel={() => setPending(null)}
				onConfirm={() => {
					const action = pending?.action;
					setPending(null);
					if (action) onAction({ type: action });
				}}
			/>
		</ModalBackdrop>
	);
}
