import Image from "next/image";
import { isResizable } from "@/utils/image-loader";
import React, { ReactNode } from "react";
import { BaseMediaProps, ColumnConfig, SeriesMediaProps } from "@/types/media";
import { BackdropImageMobile } from "../../components/ui/BackdropMobile";
import { formatDateShort, splitCredits } from "@/utils/formattingUtils";
import { CreditNames } from "../mediaDetails/shared/CreditNames";
import {
	seriesNeighbours,
	seriesPlace,
	seriesTitleOf,
} from "@/utils/seriesRead";
import { getStatusBg, getStatusWaveColor } from "@/utils/styleUtils";
import { ShowProps } from "@/types/show";
import { calcCurProgress } from "@/app/shows/utils/progressCalc";
import {
	episodeCountOf,
	slotIndexOf,
	slotPoster,
	timelineOf,
	FIRST_SLOT,
} from "@/app/shows/utils/slotRef";
import { GameProps } from "@/types/game";
import { BookProps } from "@/types/book";
import { MovieProps } from "@/types/movie";
import { Leaf } from "lucide-react";
import { getDisplayScore } from "@/lib/tierConfig";
import { useLogoPrime } from "../mediaDetails/shared/useLogoPrime";

interface MobileItemProps<T extends BaseMediaProps> {
	item: T;
	isNavOpen: boolean;
	mediaType: string;
	differentColumns: [ColumnConfig<T>, ColumnConfig<T>];
	onClick: (item: T) => void;
}

export const MobileItem = React.memo(function MobileItem<
	T extends BaseMediaProps,
>({
	item,
	isNavOpen,
	mediaType,
	differentColumns,
	onClick,
}: MobileItemProps<T>) {
	// press loads logo
	const prime = useLogoPrime(item.logoUrl);

	const seriesSection =
		mediaType === "game"
			? (() => {
					const game = item as unknown as GameProps;
					return {
						// dlc sits under the base game's name
						label: game.dlcIndex !== 0 ? game.mainTitle : undefined,
						placement:
							game.dlcIndex !== 0
								? String(game.dlcIndex)
								: undefined,
						prequel: game.dlcs?.[game.dlcIndex - 1]?.name, //prev
						sequel: game.dlcs?.[game.dlcIndex + 1]?.name, //next
					};
				})()
			: (() => {
					const row = item as unknown as SeriesMediaProps;
					const { prev, next } = seriesNeighbours(row);
					return {
						label: seriesTitleOf(row),
						placement: seriesPlace(row),
						prequel: prev?.title,
						sequel: next?.title,
					};
				})();

	const show = item as unknown as ShowProps;
	// franchise vs season poster
	const coverSrc =
		item.cover?.url ??
		(mediaType === "show" ? slotPoster(show) : item.posterUrl);

	// rating stand in until completed date
	const externalRating =
		mediaType === "movie" && item.status === "Want to Watch"
			? (item as unknown as MovieProps).imdbRating
			: mediaType === "book" && item.status === "Want to Read"
				? (item as unknown as BookProps).rating
				: null;

	// progress
	const slotAt = mediaType === "show" ? slotIndexOf(show) : FIRST_SLOT;
	const slotLine = mediaType === "show" ? timelineOf(show) : [];
	const showProgress =
		mediaType === "show"
			? episodeCountOf(slotLine[slotAt])
				? calcCurProgress(slotLine, slotAt, show.curEpisode ?? 0)
				: 100
			: 0;

	const metaDot = <span className="text-zinc-600 shrink-0">·</span>;
	const credits = splitCredits(differentColumns[0].getValue(item));

	// RATING | COMPLETED DATE
	const trailingMeta =
		externalRating != null ? (
			<span className="flex items-center gap-1 shrink-0">
				{metaDot}
				<Leaf
					className="w-2.25 h-2.25 text-emerald-300/65 fill-emerald-300/15"
					strokeWidth={1.75}
				/>
				<span className="tabular-nums text-zinc-400">
					{externalRating.toFixed(1)}
				</span>
			</span>
		) : item.dateCompleted && item.status === "Completed" ? (
			<span className="flex items-center gap-x-1.5 shrink-0">
				{metaDot}
				<span className="tabular-nums">
					{formatDateShort(item.dateCompleted)}
				</span>
			</span>
		) : null;

	return (
		<div
			className={`relative mx-auto flex bg-zinc-950 backdrop-blur-2xl shadow-sm rounded-md border-b border-b-zinc-700/20 ${
				isNavOpen ? "pointer-events-none" : ""
			}`}
			onClick={() => onClick(item)}
			{...prime}
		>
			<div
				className={`relative w-30 overflow-hidden rounded-md shadow-sm shadow-black/40 bg-linear-to-br from-zinc-800 to-zinc-900`}
				style={{ aspectRatio: mediaType === "game" ? "3/4" : "0.677" }}
			>
				{coverSrc ? (
					<>
						<Image
							src={coverSrc}
							alt={item.title || "Untitled"}
							width={240}
							height={360}
							sizes="120px"
							unoptimized={!isResizable(coverSrc)}
							className="object-fill w-full h-full rounded-md border border-zinc-700/40"
						/>
					</>
				) : (
					<div
						className="w-full h-full bg-linear-to-br from-zinc-700 to-zinc-800 rounded-md border border-zinc-600/30"
						style={{
							aspectRatio: mediaType === "game" ? "3/4" : "0.677",
						}}
					></div>
				)}
			</div>
			<div className="px-3 pt-3 pb-2.5 flex flex-col w-full min-w-0">
				{/* BACKDROP */}
				{item.backdropUrl && (
					<BackdropImageMobile
						src={item.backdropUrl}
						width={540}
						height={304}
					/>
				)}
				{/* the whole stack rides the bottom of the row */}
				<div className="mt-auto">
					{/* SERIES TITLE -- fixed line so rows stay level */}
					<div className="h-4 flex items-center gap-1 min-w-0 text-[0.65rem] leading-none font-semibold text-zinc-400/70">
						{seriesSection.label && (
							<span className="truncate min-w-0">
								{seriesSection.label} ᭡
							</span>
						)}
					</div>
					{/* TITLE */}
					<span className="block pr-14 text-zinc-200 font-semibold text-base leading-tight truncate">
						{item.title || "-"}
					</span>
					{/* AUTHOR · RELEASED · COMPLETED/RATING */}
					<div className="flex items-center gap-x-1.5 pr-14 text-[0.7rem] text-zinc-500 font-semibold min-w-0">
						{credits.length > 0 && (
							<>
								<CreditNames
									names={credits}
									limit={1}
									width="max-w-36"
								/>
								{metaDot}
							</>
						)}
						<span className="shrink-0 tabular-nums">
							{differentColumns[1].getValue(item) || "-"}
						</span>
						{trailingMeta}
					</div>
					{/* STATUS BAR -- the score sits on its right end */}
					<div className="relative mt-2">
						{/* SCORE */}
						<span className="absolute right-0 bottom-full mb-1 px-2.5 py-1 rounded-lg neu-carved text-zinc-300/85 text-sm font-semibold tracking-wide tabular-nums">
							{item.score?.mu
								? getDisplayScore(item.score.mu)
								: "-"}
						</span>
						{mediaType === "show" ? (
							// shows fill to their progress, no season/episode labels
							<div className="w-full bg-zinc-800/80 h-1 rounded-md overflow-hidden">
								<div
									className={`relative h-1 ${getStatusBg(item.status)} rounded-md overflow-hidden transition-all duration-500 ease-out`}
									style={{ width: `${showProgress}%` }}
								>
									<div
										className="absolute inset-0"
										style={{
											background: getStatusWaveColor(
												item.status,
											),
											animation:
												"wave 4s ease-in-out infinite",
											width: "200%",
										}}
									/>
								</div>
							</div>
						) : (
							<div
								className={`relative w-full ${getStatusBg(item.status)} h-1 rounded-md overflow-hidden`}
							>
								<div
									className="absolute inset-0"
									style={{
										background: getStatusWaveColor(
											item.status,
										),
										animation:
											"wave 4s ease-in-out infinite",
										width: "200%",
									}}
								/>
							</div>
						)}
					</div>
					{/* PREQUEL | PLACE IN SERIES | SEQUEL */}
					{mediaType !== "show" &&
						(seriesSection.prequel ||
							seriesSection.sequel ||
							seriesSection.placement) && (
							<div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-[0.60rem] text-zinc-400/80">
								{/* PREQUEL */}
								<div className="flex gap-1 items-center min-w-0">
									{seriesSection.prequel && (
										<>
											<span className="shrink-0">←</span>
											<span className="truncate">
												{seriesSection.prequel}
											</span>
										</>
									)}
								</div>
								{/* PLACE IN SERIES */}
								<span className="shrink-0 text-[0.65rem] font-medium text-zinc-400/85 tabular-nums">
									{seriesSection.placement}
								</span>
								{/* SEQUEL */}
								<div className="flex gap-1 items-center justify-end min-w-0">
									{seriesSection.sequel && (
										<>
											<span className="truncate">
												{seriesSection.sequel}
											</span>
											<span className="shrink-0">→</span>
										</>
									)}
								</div>
							</div>
						)}
					{/* NOTE -- one line */}
					<span className="block mt-1 text-center text-[0.8125rem] font-medium text-zinc-400/90 truncate">
						{item.note ? (
							<>&ldquo;{item.note}&rdquo;</>
						) : (
							<>&ldquo;{"· · ·"}&rdquo;</>
						)}
					</span>
				</div>
			</div>
		</div>
	);
}) as <T extends BaseMediaProps>(props: MobileItemProps<T>) => ReactNode;
