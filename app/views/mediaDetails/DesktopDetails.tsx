import Image from "next/image";
import { Fragment, ReactNode, useState } from "react";
import { Loading } from "@/app/components/ui/Loading";
import { CreditNames } from "./shared/CreditNames";
import { ModalBackdrop, ModalPanel } from "@/app/components/ui/ModalMotion";
import {
	BaseMediaProps,
	ColumnConfig,
	MediaCoverProps,
	SeriesMediaProps,
	SeriesTargetProps,
	isPrintMedia,
} from "@/types/media";
import { GameProps } from "@/types/game";
import { formatDateMedium, splitCredits } from "@/utils/formattingUtils";
import { hasSeries, seriesTitleOf } from "@/utils/seriesRead";
import {
	coverWave,
	getStatusDetailWaveColor,
	getStatusTextColor,
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
	BarChart2,
	Image as ImageIcon,
	Check,
	List,
	Users,
	Boxes,
	Box,
	Leaf,
	Feather,
	Hourglass,
	Clapperboard,
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
import {
	BookBackdropDetails,
	Fleuron,
	artInk,
	bookInk,
} from "@/app/components/ui/BookBackdrop";
import { MangaBackdropDetails } from "@/app/components/ui/MangaBackdrop";
import { SeriesNav } from "./shared/SeriesNav";
import { activeLogoIndex, isLogoCleared } from "../../../utils/artworkIndex";
import {
	franchiseRomajiOf,
	isAnimeRow,
	slotOf,
	timelineOf,
	wearsRowPoster,
} from "@/app/shows/utils/slotRef";
import { formatVotes, getTier } from "@/app/shows/utils/episodeRatings";
import { ActionBtn, glassBtn } from "../../components/ui/DetailsActionBtn";
import {
	FIELD_LABEL,
	FIELD_PLATE,
	HEADER_WASH_MASK,
	SCORE_SUB_BTN,
} from "@/utils/styleUtils";
import { MediaTitle, SERIES_TEXT, TITLE_TEXT } from "./shared/MediaTitle";
import { PickHalves, PickPosition } from "./shared/PickPosition";
import { TimeField } from "./shared/TimeField";
import { ChapterLengthField } from "./shared/ChapterLengthField";
import { timeLine, timeSpentOf } from "@/utils/timeSpent";
import { LOGO_SPEC } from "./shared/logoMetrics";
import { useArtworkPrime } from "@/hooks/useArtworkPrime";
import { EditProgress } from "@/app/shows/components/EditProgressDetail";
import { EditChapter } from "@/app/manga/components/EditChapter";
import {
	canNudgeMu,
	getDisplayScore,
	getTierFromMu,
	Tier,
} from "@/lib/tierConfig";
import { ShowProps } from "@/types/show";
import { MovieProps } from "@/types/movie";
import { BookProps } from "@/types/book";
import { MangaProps } from "@/types/manga";
import {
	ConfirmPrompt,
	type ConfirmTone,
} from "@/app/components/ui/ConfirmButton";

// action button thang
const ACTION_ROW = "absolute right-3 top-3 flex items-center z-10";
//
const POSTER_SPEC = { width: 248, sizes: "(min-width: 2200px) 500px, 250px" };
const BACKDROP_SPEC = { width: 780, sizes: "40vw" };
const GENRE_SHORT: Record<string, string> = { "Science Fiction": "Sci-fi" };

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
	// manga
	isEditingChapter?: boolean;
	chapterInput?: number | "";
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
	isEditingChapter,
	chapterInput,
	differentColumns,
}: DesktopDetailsProps<T>) {
	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault(); // prevent new line
			onAction({ type: "saveNote" });
			e.currentTarget.blur(); // remove focus
		}
	};
	const isPrint = isPrintMedia(mediaType);
	const series = item as unknown as SeriesMediaProps;
	const gameItem = item as unknown as GameProps;
	const movieItem = item as unknown as MovieProps;
	const printItem = item as unknown as BookProps | MangaProps;
	const showRow = item as unknown as ShowProps;
	const isPicking = isAdding || !!isSelecting;

	useArtworkPrime("desktop", [
		{
			urls: posterUrls,
			index: posterIndex,
			spec: POSTER_SPEC,
			enabled: isPicking && !isPrint,
			palette: true,
		},
		{
			urls: coverUrls?.map((cover) => cover.url),
			index: coverIndex,
			spec: POSTER_SPEC,
			enabled: isPicking && isPrint,
		},
		{
			urls: backdropUrls,
			index: backdropIndex,
			spec: BACKDROP_SPEC,
			enabled: isPicking && !isPrint,
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
		(isPrint && isPicking ? coverUrls?.[coverIndex ?? 0] : undefined) ??
		item.cover ??
		undefined;
	//
	const posterCount = (isPrint ? coverUrls?.length : posterUrls?.length) ?? 0;
	const posterPos = (isPrint ? coverIndex : posterIndex) ?? 0;
	const isAnimeShow = mediaType === "show" && isAnimeRow(showRow);
	//
	const franchisePoster = wearsRowPoster(showRow);
	const hasSlotArt =
		mediaType === "show" &&
		(showRow.seasons ?? []).some((season) => !!season.posterUrl);
	//
	const canCyclePoster = isPicking && posterCount > 1 && franchisePoster;

	const hasOrder = isAnimeShow && timelineOf(showRow).length > 0;
	const posterOpens = canCyclePoster
		? null
		: hasOrder
			? "openChain"
			: mediaType === "show" && !isPicking
				? "openRatings"
				: null;
	const ratingsBtn =
		mediaType === "show" && isPicking ? (
			<span data-ratings-toggle className="contents">
				<ActionBtn
					icon={BarChart2}
					tone="white"
					onClick={() => onAction({ type: "openRatings" })}
					title="Episode ratings"
				/>
			</span>
		) : null;
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
			<div className="group/pick relative flex gap-0.5">
				{logoUrls.length > 1 && (
					<button
						className={`p-1.5 ${glassBtn()}`}
						onClick={() =>
							onAction({ type: "changeLogo", payload: "prev" })
						}
						title="Previous title logo"
					>
						<ChevronLeft className="w-5 h-5" />
					</button>
				)}
				{/* TEXT TITLE */}
				<button
					className={`p-1.5 ${glassBtn({ on: logoIsCleared })}`}
					onClick={() => onAction({ type: "clearLogo" })}
					title={
						logoIsCleared
							? "Use the title logo"
							: "Use the text title instead"
					}
				>
					<Type className="w-5 h-5" />
				</button>
				{logoUrls.length > 1 && (
					<button
						className={`p-1.5 ${glassBtn()}`}
						onClick={() =>
							onAction({ type: "changeLogo", payload: "next" })
						}
						title="Next title logo"
					>
						<ChevronRight className="w-5 h-5" />
					</button>
				)}
				{logoUrls.length > 1 && (
					<PickPosition
						index={
							logoIsCleared ? -1 : activeLogoIndex(logoIndex ?? 0)
						}
						count={logoUrls.length}
						className="absolute top-full left-1/2 mt-1.5 -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover/pick:opacity-100"
					/>
				)}
			</div>
		) : null;

	// cover colour picker
	const colorPicker = activeCover ? (
		<CoverColorPicker
			key={activeCover.url}
			glass
			coverUrl={activeCover.url}
			currentColor={activeCover.color}
			onPick={(color) =>
				onAction({ type: "pickCoverColor", payload: color })
			}
		/>
	) : null;

	// set by hand while previewing
	const timeField = !isPicking ? null : mediaType === "manga" ? (
		<ChapterLengthField
			value={(printItem as MangaProps).chapterLength ?? "medium"}
			onChange={(length) =>
				onAction({ type: "setChapterLength", payload: length })
			}
		/>
	) : mediaType === "book" || mediaType === "game" ? (
		<TimeField
			minutes={
				(mediaType === "book"
					? (printItem as BookProps).timeSpent
					: gameItem.timeToBeat) ?? null
			}
			onChange={(minutes) =>
				onAction({ type: "setTime", payload: minutes })
			}
		/>
	) : null;

	// manga
	const pagePicker =
		mediaType === "manga" && isPicking ? (
			<ActionBtn
				icon={Clapperboard}
				tone="white"
				onClick={() => onAction({ type: "cyclePage" })}
				title="Change the cuts"
			/>
		) : null;

	// Prequel/sequel stepper
	const seriesNav = onSeriesNav ? (
		<div className="flex gap-0.5">
			<button
				className={`p-1.5 ${glassBtn()}`}
				onClick={() => onSeriesNav("left")}
				title={"Previous series"}
			>
				<ChevronLeft className="w-5 h-5" />
			</button>
			<button
				className={`p-1.5 ${glassBtn()}`}
				onClick={() => onSeriesNav("right")}
				title={"Next series"}
			>
				<ChevronRight className="w-5 h-5" />
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
			<ActionBtn icon={icon} tone="white" onClick={pick} title={title} />
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

	// MORE STUFF -- books and manga
	const moreResults = isPrint ? (
		<button
			className={`p-1.5 ${glassBtn()}`}
			onClick={() => onAction({ type: "moreResults" })}
			title={"Other results"}
		>
			<List className="w-5 h-5" />
		</button>
	) : null;

	// cover color
	const coverSrc = item.cover?.url ?? item.posterUrl;
	const coverColor = activeCover?.color;

	// falls through to the stored backdrop when the source served no candidates
	const imageBackdropUrl =
		(isPicking ? backdropUrls?.[backdropIndex ?? 0] : undefined) ??
		item.backdropUrl;
	const cyclesBackdrop =
		isPicking && !!backdropUrls && backdropUrls.length > 1;
	const displayLogoUrl =
		isPicking && logoUrls?.length ? logoUrls[logoIndex ?? 0] : item.logoUrl;

	// find creator
	const creditNames =
		((mediaType === "movie" || mediaType === "show") && !isPicking) ||
		mediaType === "manga"
			? splitCredits(differentColumns[0].getValue(item))
			: [];
	const creditOpens: "director" | "studio" | "creator" | "author" | null =
		!creditNames.length
			? null
			: mediaType === "manga"
				? isPicking
					? null
					: "author"
				: mediaType === "movie"
					? "director"
					: isAnimeShow
						? "studio"
						: "creator";

	// ---
	const hasBackdrop = isPrint ? !!coverColor : !!imageBackdropUrl;
	const bookBoard = isPrint && mediaType !== "manga" && !!coverColor;
	const endsAtNotes =
		mediaType === "show" ||
		(mediaType === "manga" &&
			!series.series?.position &&
			!series.series?.prequel &&
			!series.series?.sequel);
	// ---
	const showLogoTitle = !!displayLogoUrl;
	// ---
	const seriesLabel =
		mediaType === "game"
			? gameItem.dlcIndex !== 0
				? gameItem.mainTitle
				: null
			: mediaType === "movie"
				? null
				: seriesTitleOf(series);
	//
	const genreLine =
		mediaType === "movie"
			? (movieItem.genres ?? [])
					.slice(0, 2)
					.map((g) => GENRE_SHORT[g] ?? g)
					.join("/")
			: "";
	const chipBelow = isPicking && mediaType === "book";
	const time = timeLine(timeSpentOf(mediaType, item));
	const titleHint = [
		genreLine && <span key="genres">{genreLine}</span>,
		time && (
			<span key="time">
				{time.of ? (
					<>
						<span
							className={`underline underline-offset-[3px] ${getStatusTextColor(item.status)}`}
						>
							{time.figure}
						</span>
						{` of ${time.of}`}
					</>
				) : (
					time.figure
				)}
			</span>
		),
		item.status === "Completed" && item.dateCompleted && (
			<span key="finished">{formatDateMedium(item.dateCompleted)}</span>
		),
	].filter(Boolean);
	// ---
	const underlineColor = coverColor?.trim()
		? coverWave(coverColor)
		: getStatusDetailWaveColor(item.status);

	// source rating
	const externalRating =
		mediaType === "movie" && item.status === "Want to Watch"
			? movieItem.imdbRating
			: isPrint && item.status === "Want to Read"
				? printItem.rating
				: null;

	// RATING
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
			{isPrint && (
				<Hourglass
					className="w-3.5 h-3.5 shrink-0 text-zinc-400/70"
					strokeWidth={1.75}
				/>
			)}
			{differentColumns[1].getValue(item) || "Unknown"}
		</span>
	);

	// author section
	const authorUnderPoster = !isPrint || mediaType === "manga";
	const metaRow = (
		<div
			className={`relative select-none flex items-center gap-3 text-[0.92rem] font-medium leading-6 ${
				bookBoard
					? "text-(--book-ink)/80 [&_span]:text-inherit [&_svg]:text-(--book-ink)/60 [&_span[aria-hidden]]:bg-(--book-ink)/30 [text-shadow:0_-0.5px_0_rgba(20,12,6,0.35)]"
					: "text-zinc-200/70"
			} ${
				authorUnderPoster
					? "justify-between w-full mt-1.25 mb-0.75"
					: `justify-center w-[94%] mx-auto -mb-0.5 ${bookBoard ? "mt-1.5" : ""}`
			}`}
		>
			{/* LEFT -- AUTHOR */}
			<span className="flex items-center gap-1.5 min-w-0">
				{isAnimeShow && !isPicking && (
					<button
						data-ratings-toggle
						onClick={() => onAction({ type: "openRatings" })}
						title="Episode ratings"
						className={`cursor-pointer transition-all duration-200 shrink-0 hover:scale-105 hover:text-zinc-200 ${
							ratingsDocked ? "text-zinc-200" : "text-zinc-400/70"
						}`}
					>
						<BarChart2 className="w-3.5 h-3.5" strokeWidth={1.75} />
					</button>
				)}
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
						{mediaType === "book" && (
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
						) : creditOpens === "author" ? (
							<CreditNames
								names={creditNames}
								width={
									authorUnderPoster ? "max-w-32" : "max-w-72"
								}
								label="Authors"
								pickTitle="See their manga"
								onPick={(name) =>
									onAction({
										type: "authorClick",
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
								width={
									authorUnderPoster ? "max-w-32" : "max-w-72"
								}
							/>
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
			{!authorUnderPoster ? (
				<>
					{authorSectorDivider}
					{releaseMeta}
					{trailingMeta && authorSectorDivider}
					{trailingMeta}
				</>
			) : (
				<span className="shrink-0 flex items-center gap-2">
					{releaseMeta}
					{trailingMeta && authorSectorDivider}
					{trailingMeta}
				</span>
			)}
		</div>
	);

	return (
		<ModalBackdrop className="fixed inset-0 bg-linear-to-br from-black/50 via-black/60 to-black/80 backdrop-blur-md flex items-center justify-center z-20">
			<div
				data-modal-backdrop
				className="fixed inset-0"
				onClick={() => onAction({ type: "closeModal" })}
			/>
			<div className="relative">
				{sidePanel}
				{/* BACKGROUND BORDER GRADIENT */}
				<ModalPanel
					className={`rounded-[1.375rem] p-1.5 py-2 ${mediaType === "book" ? "lg:min-w-230 lg:max-w-230" : "lg:min-w-235 lg:max-w-235"}`}
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
								<div className={`${ACTION_ROW} gap-2`}>
									{/* TIME */}
									{timeField}
									{/* EPISODE RATINGS */}
									{ratingsBtn}
									{seriesNav}
									{/* CYCLE LOGOS | TEXT TITLE */}
									{logoPicker}
									{/* COVER COLORS */}
									{colorPicker}
									{pagePicker}
									{/* POSTER SOURCE */}
									{posterSourceToggle()}
									{moreResults}
									{/* CONFIRM REFRESH */}
									<ActionBtn
										icon={Check}
										tone="green"
										wide
										onClick={() =>
											onAction({ type: "confirmRefresh" })
										}
										title="Apply"
									/>
									{/* CANCEL REFRESH */}
									<ActionBtn
										icon={X}
										tone="red"
										onClick={() =>
											onAction({ type: "cancelRefresh" })
										}
										title="Cancel"
									/>
								</div>
							) : isAdding ? (
								<div className={`${ACTION_ROW} gap-2`}>
									{/* TIME */}
									{timeField}
									{/* EPISODE RATINGS */}
									{ratingsBtn}
									{/* CYCLE LOGOS | TEXT TITLE */}
									{logoPicker}
									{/* COVER COLORS */}
									{colorPicker}
									{pagePicker}
									{/* POSTER SOURCE */}
									{posterSourceToggle()}
									{seriesNav}
									{/* ADD */}
									<ActionBtn
										icon={Plus}
										tone="green"
										wide
										onClick={onAdd}
										busy={isSubmitting}
										title={"Add " + mediaType}
									/>
									{/* NEED YEAR */}
									{!isPrint && (
										<ActionBtn
											icon={ChevronsUp}
											tone="white"
											onClick={() =>
												onAction({
													type: "needYearField",
												})
											}
											title="Search with year"
										/>
									)}
									{moreResults}
									{/* CLOSE */}
									<ActionBtn
										icon={X}
										tone="red"
										onClick={() =>
											onAction({ type: "closeModal" })
										}
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
										isPrint
											? "flex flex-col justify-center"
											: ""
									} ${authorUnderPoster ? "pb-0" : ""}`}
								>
									{/* art takes the click*/}
									<div
										className={`relative flex items-center justify-center max-w-62 max-h-93 overflow-hidden rounded-lg bg-linear-to-br from-zinc-800 to-zinc-900 transition-all duration-300 ${
											canCyclePoster || posterOpens
												? "hover:cursor-pointer"
												: ""
										} ${canCyclePoster ? "group/pick" : ""} ${posterOpens ? "hover:brightness-110" : ""}`}
										data-ratings-toggle={
											posterOpens === "openRatings" ||
											undefined
										}
										onClick={(e) => {
											if (canCyclePoster)
												return handleCoverChange(e);
											if (posterOpens)
												onAction({ type: posterOpens });
										}}
										title={
											posterOpens === "openChain"
												? "Watch order"
												: posterOpens === "openRatings"
													? "Episode ratings"
													: ""
										}
									>
										{!isPrint ? (
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
												coverUrl={printItem.cover?.url}
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
										{/* gradient overlay -- rides with the art when a tall card centres it */}
										<div
											className="absolute inset-0 pointer-events-none"
											style={{
												background:
													"linear-gradient(to bottom, transparent 0%, rgba(24,24,27,0) 50%, rgba(24,24,27,0.3) 100%)",
											}}
										/>
										{canCyclePoster && (
											<>
												<PickHalves />
												<PickPosition
													index={posterPos}
													count={posterCount}
													className="absolute bottom-2.5 left-1/2 -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover/pick:opacity-100"
												/>
											</>
										)}
									</div>
									{/* inner vignette */}
									<div className="absolute -inset-1 pointer-events-none rounded-xl shadow-[inset_0_0_12px_rgba(0,0,0,0.4)]" />
									{/* AUTHOR/STUDIO/DIRECTOR/DATES */}
									{authorUnderPoster && metaRow}
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
									{isPrint ? (
										mediaType === "manga" && activeCover ? (
											<MangaBackdropDetails
												key={activeCover.url}
												cover={activeCover}
												anilistId={
													(printItem as MangaProps)
														.anilistId
												}
											/>
										) : null
									) : (
										imageBackdropUrl && (
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
										)
									)}
									{/* backdrop cycling overlay */}
									{cyclesBackdrop && (
										<div
											className="group/pick absolute top-0 -left-8 -right-8 h-40 hover:cursor-pointer z-5"
											onClick={handleBackdropChange}
										>
											<PickHalves inset="px-9" />
											<PickPosition
												index={backdropIndex ?? 0}
												count={
													backdropUrls?.length ?? 0
												}
												className="absolute top-3.75 left-12 -translate-y-1/2 opacity-0 transition-opacity duration-150 group-hover/pick:opacity-100"
											/>
										</div>
									)}
									{/*  */}
									<div
										className={`flex flex-col flex-1 justify-end ${endsAtNotes ? "" : "mb-3"} ${
											mediaType === "manga" ? "pt-10" : ""
										}`}
									>
										{/* HEADER */}
										<div
											className={`relative isolate ${
												bookBoard
													? "flex flex-1 flex-col justify-end pt-5 pb-1.5 mb-1"
													: ""
											} ${cyclesBackdrop ? "z-6 pointer-events-none" : ""}`}
											style={
												{
													[bookBoard
														? "--book-ink"
														: "--title-ink"]:
														bookBoard
															? bookInk(
																	coverColor,
																)
															: artInk(
																	coverColor,
																),
												} as React.CSSProperties
											}
										>
											{bookBoard && (
												<BookBackdropDetails
													color={coverColor}
													title={item.title}
												/>
											)}
											<div
												className={`group/title pointer-events-auto relative flex flex-col items-center w-fit ${bookBoard ? "max-w-[76%]" : "max-w-[94%]"} mx-auto ${isPrint ? "-mb-1" : `${showLogoTitle ? "mb-0.5" : "-mb-1"}`}`}
											>
												{/* GENRES | TIME | FINISHED */}
												{titleHint.length > 0 && (
													<span
														className={`pointer-events-none absolute left-1/2 z-10 flex -translate-x-1/2 items-center gap-2.5 whitespace-nowrap rounded-full bg-black/45 px-3.5 text-[0.8rem] font-semibold tracking-wide text-zinc-300/85 tabular-nums shadow-[0_2px_8px_rgba(0,0,0,0.45)] backdrop-blur-sm select-none opacity-0 transition-[opacity,translate] duration-200 group-hover/title:translate-y-0 group-hover/title:opacity-100 group-hover/title:delay-150 ${
															chipBelow
																? "top-full mt-7 py-1 -translate-y-1"
																: "bottom-full mb-2 py-1.5 translate-y-1"
														}`}
													>
														{titleHint.map(
															(part, i) => (
																<Fragment
																	key={i}
																>
																	{i > 0 &&
																		authorSectorDivider}
																	{part}
																</Fragment>
															),
														)}
													</span>
												)}
												{/* washblur */}
												{hasBackdrop && !isPrint && (
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
															bookBoard
																? SERIES_TEXT.book
																: SERIES_TEXT.art
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
														bookBoard
															? TITLE_TEXT.book
															: TITLE_TEXT.art
													}
													underlineColor={
														bookBoard
															? undefined
															: underlineColor
													}
													isBook={isPrint}
													wordFit={
														bookBoard
															? 17
															: undefined
													}
													rowCap={
														bookBoard
															? undefined
															: 9.8
													}
												/>
												{bookBoard && (
													<div className="-mt-1 flex justify-center">
														<Fleuron
															ink={bookInk(
																coverColor,
															)}
															width="9rem"
														/>
													</div>
												)}
											</div>
											{bookBoard && metaRow}
										</div>
										{!authorUnderPoster &&
											!bookBoard &&
											metaRow}
										{/* STATUS AND SCORE */}
										<div className="relative flex justify-start gap-4 mb-2.5 w-[94%] mx-auto">
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
										{/* MANGA PROGRESS (chapter) */}
										{mediaType === "manga" && (
											<EditChapter
												item={printItem as MangaProps}
												isEditing={!!isEditingChapter}
												inputValue={chapterInput ?? 0}
												onAction={onAction}
											/>
										)}
										{/* NOTES */}
										<div
											className={`space-y-1.5 w-[94%] mx-auto ${endsAtNotes ? "" : "mb-2"}`}
										>
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
