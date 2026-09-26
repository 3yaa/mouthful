import React, { ReactNode } from "react";
import Image from "next/image";
import { isResizable } from "@/utils/image-loader";
import {
	BaseMediaProps,
	ColumnConfig,
	SeriesMediaProps,
	isPrintMedia,
} from "@/types/media";
import { GameProps } from "@/types/game";
import { formatDateShort, splitCredits } from "@/utils/formattingUtils";
import { CreditNames } from "../mediaDetails/shared/CreditNames";
import { seriesPlace, seriesTitleOf } from "@/utils/seriesRead";
import {
	getStatusBg,
	getStatusBorderColor,
	getStatusStrokeColor,
	getStatusWaveColor,
} from "@/utils/styleUtils";
import { BackdropDesktop } from "../../components/ui/BackdropDesktop";
import { BookBackdropDesktop } from "../../components/ui/BookBackdrop";
import { ScoreMark } from "../../components/ui/ScoreMark";
import {
	ShowProgressBarDesktop,
	ShowProgressCount,
} from "@/app/shows/components/showProgressListing";
import {
	MangaProgressBarDesktop,
	MangaProgressCount,
} from "@/app/manga/components/mangaProgressListing";
import { slotPoster } from "@/app/shows/utils/slotRef";
import { ShowProps } from "@/types/show";
import { BookProps } from "@/types/book";
import { MangaProps } from "@/types/manga";
import { MovieProps } from "@/types/movie";
import { Leaf } from "lucide-react";
import { useLogoPrime } from "../mediaDetails/shared/useLogoPrime";

// for the wave under item
function seededRand(seed: string | number, salt = 0): number {
	const str = String(seed) + salt;
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return ((h >>> 0) % 1000) / 1000;
}

interface DesktopItemProps<T extends BaseMediaProps> {
	item: T;
	index: number;
	total: number;
	rank: number;
	isOpen: boolean;
	mediaType: string;
	onClick: (item: T) => void;
	differentColumns: [ColumnConfig<T>, ColumnConfig<T>];
}

export const DesktopItem = React.memo(function DesktopItem<
	T extends BaseMediaProps,
>({
	item,
	index,
	// total,
	// rank,
	isOpen,
	mediaType,
	onClick,
	differentColumns,
}: DesktopItemProps<T>) {
	const series = item as unknown as SeriesMediaProps;
	const gameItem = item as unknown as GameProps;

	const seriesLabel =
		mediaType === "game"
			? gameItem.dlcIndex !== 0
				? gameItem.mainTitle
				: null
			: seriesTitleOf(series);
	const place = seriesPlace(series);
	const isPrint = isPrintMedia(mediaType);
	const printItem = item as unknown as BookProps | MangaProps;
	const movieItem = item as unknown as MovieProps;
	const showItem = item as unknown as ShowProps;
	// franchise or season poster
	const coverSrc =
		item.cover?.url ??
		(mediaType === "show" ? slotPoster(showItem) : item.posterUrl);

	// fetch logo on hover
	const prime = useLogoPrime(item.logoUrl);
	const credits = splitCredits(differentColumns[0].getValue(item));

	return (
		<div
			data-open={isOpen ? "" : undefined}
			className={`relative group max-w-[99%] mx-auto grid md:grid-cols-[auto_1fr_1.2fr_0.3fr] gap-3 px-1.5 pt-0.5 items-center
		bg-zinc-900/65 hover:bg-zinc-800/80
			shadow-sm hover:shadow-lg hover:shadow-black/40
			border-l-4 ${getStatusBorderColor(item.status)}
			border-b border-b-zinc-700/20
			rounded-lg overflow-hidden
			backdrop-blur-sm
			transition-[background-color,box-shadow]
			duration-300 ease-out
			hover:cursor-pointer
			${index === 0 ? "" : "my-0.5"}
		`}
			onClick={() => onClick(item)}
			{...prime}
		>
			{/* ISLAND - COVER */}
			{coverSrc ? (
				<div className="w-20 aspect-2/3 relative shrink-0 overflow-hidden rounded-md shadow-sm shadow-black/40 bg-linear-to-br from-zinc-800 to-zinc-900">
					{mediaType === "game" || isPrint ? (
						<Image
							src={coverSrc}
							alt={item.title || "Untitled"}
							fill
							sizes="(min-width: 2200px) 160px, 80px"
							unoptimized={!isResizable(coverSrc)}
							className="object-cover transition-transform duration-420 ease-leave live:scale-[1.04] live:duration-800 live:ease-arrive"
						/>
					) : (
						<Image
							src={coverSrc}
							alt={item.title || "Untitled"}
							width={160}
							height={240}
							sizes="(min-width: 2200px) 160px, 80px"
							unoptimized={!isResizable(coverSrc)}
							className="relative w-full h-full aspect-2/3 object-fill transition-transform duration-420 ease-leave live:scale-[1.04] live:duration-800 live:ease-arrive"
						/>
					)}
				</div>
			) : (
				<div className="w-20 relative self-stretch aspect-2/3 bg-linear-to-br from-zinc-700 to-zinc-800 rounded-md border border-zinc-600/30" />
			)}

			{/* ISLAND - CONTENT */}
			<div className="flex flex-col min-w-0 flex-1 relative z-10 self-stretch">
				{/* TOP PART */}
				<div className="flex-1 flex flex-col justify-center">
					{/* SERIES TITLE */}
					<div className="h-5 font-semibold text-zinc-400 text-sm live:text-zinc-300 transition-colors duration-300 ease-out flex gap-1">
						{seriesLabel && (
							<>
								<span className="block max-w-[88%] whitespace-nowrap text-ellipsis overflow-hidden shrink">
									{seriesLabel} ᭡
								</span>
								{place && <span>{place}</span>}
							</>
						)}
					</div>
					{/* TITLE */}
					<div className="flex items-start justify-between gap-4 min-w-0 -mt-0.75">
						<div className="flex items-baseline gap-2 min-w-0 max-w-full">
							<span className="title-line font-semibold text-zinc-300 text-[1.125rem] live:text-zinc-100/90 transition-colors duration-300 ease-out max-w-full inline-block align-bottom">
								<span className="block truncate">
									{item.title || "-"}
								</span>
								<svg
									preserveAspectRatio="none"
									viewBox="0 0 200 8"
									aria-hidden="true"
								>
									<path
										d={(() => {
											const seed =
												item.id ?? item.title ?? index;
											// stronger amplitude 3.5 - 4.8 for visible curves
											const amp =
												3.5 +
												seededRand(seed, 11) * 1.3;
											// random direction (above or below baseline first)
											const dir =
												seededRand(seed, 23) > 0.5
													? 1
													: -1;
											// slight phase offset so curves don't all look the same
											const phase =
												seededRand(seed, 37) * 0.4 -
												0.2;
											const baseline = 5;
											// cubic bezier — control points placed for smooth sine-like wave
											const p1y =
												baseline -
												amp * dir * (1 + phase);
											const p2y =
												baseline +
												amp * dir * (1 - phase);
											return `M 2 ${baseline} C 66 ${p1y}, 134 ${p2y}, 198 ${baseline}`;
										})()}
										style={{
											stroke: getStatusStrokeColor(
												item.status,
											),
										}}
									/>
								</svg>
							</span>
						</div>
					</div>

					<div className="flex items-center gap-x-1.5 live:translate-y-1.25 ml-px text-[0.8125rem] text-zinc-500 font-semibold min-w-0 transition-transform duration-300 ease-out">
						{/* AUTHOR */}
						{credits.length > 0 && (
							<>
								<CreditNames
									names={credits}
									limit={
										mediaType === "manga" ? undefined : 1
									}
									width={
										mediaType === "manga"
											? "max-w-72"
											: "max-w-48"
									}
								/>
								<span className="text-zinc-600 shrink-0">
									·
								</span>
							</>
						)}
						{/* RELEASE DATE */}
						<span className="shrink-0 tabular-nums">
							{differentColumns[1].getValue(item)}
						</span>
						{/* COMPLETED DATE */}
						{item.dateCompleted && item.status === "Completed" && (
							<span className="flex items-center gap-x-1.5 shrink-0">
								<span className="text-zinc-600">·</span>
								<span className="tabular-nums">
									{formatDateShort(item.dateCompleted)}
								</span>
							</span>
						)}
						{/* WHERE YOU ARE */}
						{mediaType === "show" && (
							<ShowProgressCount
								show={item as unknown as ShowProps}
							/>
						)}
						{mediaType === "manga" &&
							item.status !== "Want to Read" && (
								<MangaProgressCount
									manga={item as unknown as MangaProps}
								/>
							)}
						{/* RATING */}
						{((mediaType === "movie" &&
							item.status === "Want to Watch" &&
							movieItem.imdbRating != null) ||
							(isPrint &&
								item.status === "Want to Read" &&
								printItem.rating != null)) && (
							<span className="flex items-center gap-1 shrink-0 ml-auto">
								<Leaf
									className="w-2.25 h-2.25 text-emerald-300/65 fill-emerald-300/15"
									strokeWidth={1.75}
								/>
								<span className="text-[0.75rem] tabular-nums text-zinc-400">
									{(mediaType === "movie"
										? movieItem.imdbRating
										: printItem.rating
									)?.toFixed(1)}
								</span>
							</span>
						)}
					</div>
				</div>

				{/* PROGRESS */}
				<div className="mb-2 -mt-3">
					{mediaType === "show" ? (
						<ShowProgressBarDesktop
							show={item as unknown as ShowProps}
						/>
					) : mediaType === "manga" ? (
						<MangaProgressBarDesktop
							manga={item as unknown as MangaProps}
						/>
					) : (
						<div
							className={`relative w-full mt-2 ${getStatusBg(item.status)} h-0.75 rounded-md overflow-hidden`}
						>
							<div
								className="absolute inset-0"
								style={{
									background: `${getStatusWaveColor(item.status)}`,
									animation: "wave 4s ease-in-out infinite",
									width: "200%",
								}}
							/>
						</div>
					)}
				</div>

				{/* NOTE */}
				<span className="block text-center text-[0.8125rem] font-medium text-zinc-400/90 truncate pb-1.5">
					{item.note ? (
						<>&ldquo;{item.note}&rdquo;</>
					) : (
						<>&ldquo;{"· · ·"}&rdquo;</>
					)}
				</span>
			</div>

			{/* ISLAND - BACKDROP */}
			<div className="listing-art-window h-full">
				<div className="h-full origin-left will-change-transform transition-transform duration-420 ease-leave live:translate-x-[20%] live:duration-800 live:ease-arrive live:delay-200">
					{item.backdropUrl ? (
						<BackdropDesktop src={item.backdropUrl} />
					) : isPrint && printItem.cover ? (
						<BookBackdropDesktop
							color={printItem.cover.color}
							title={item.title}
						/>
					) : (
						<div />
					)}
				</div>
			</div>

			{/* ISLAND - SCORE */}
			<div className="relative z-10 flex -translate-x-5.5 items-center justify-center">
				<ScoreMark mu={item.score?.mu} />
			</div>
		</div>
	);
}) as <T extends BaseMediaProps>(props: DesktopItemProps<T>) => ReactNode;
