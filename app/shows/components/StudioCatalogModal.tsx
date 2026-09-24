"use client";

import { ChevronLeft, ChevronRight, Leaf, Loader2, Tv, X } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef } from "react";
import { Loading } from "@/app/components/ui/Loading";
import { ModalBackdrop, ModalPanel } from "@/app/components/ui/ModalMotion";
import { PosterCard } from "@/app/components/ui/PosterCard";
import { useScrollLock } from "@/hooks/useScrollLock";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { MediaStatus } from "@/types/media";
import { airSeasonLabel } from "@/utils/formattingUtils";
import { getStatusBorderColor } from "@/utils/styleUtils";
import { getTier } from "@/app/shows/utils/episodeRatings";
import type {
	StudioCatalog,
	StudioSort,
	StudioWork,
} from "@/app/shows/utils/studioCatalog";

const FORMAT_LABEL: Record<string, string> = {
	TV_SHORT: "Shorts",
	ONA: "ONA",
	OVA: "OVA",
	MOVIE: "Movie",
	SPECIAL: "Special",
	MUSIC: "Music",
};

const PAGE_BTN =
	"flex items-center justify-center w-6 h-6 rounded-md text-zinc-400 enabled:hover:text-zinc-100 enabled:hover:bg-zinc-700/60 enabled:cursor-pointer disabled:opacity-25 transition-colors duration-200";

const sizeLine = (work: StudioWork) => {
	const size =
		work.format === "MOVIE"
			? work.duration && `${work.duration}m`
			: work.episode_count && `${work.episode_count} ep`;
	return [FORMAT_LABEL[work.format] ?? null, size]
		.filter(Boolean)
		.join(" · ");
};

// anilist score
function ScoreLeaf({ score, display }: { score: number; display: string }) {
	const tier = getTier(score / 10);
	if (!tier) return null;
	return (
		<span
			title="AniList score"
			className={`${display} shrink-0 items-center gap-0.5 text-[0.6875rem] font-bold tabular-nums text-zinc-300`}
		>
			<Leaf
				className="w-2.5 h-2.5"
				strokeWidth={2}
				style={{ color: tier.hex }}
			/>
			{(score / 10).toFixed(1)}
		</span>
	);
}

interface StudioCatalogModalProps {
	studioName: string;
	catalog: StudioCatalog | null;
	loading: boolean;
	sort: StudioSort;
	onSortChange: (sort: StudioSort) => void;
	onClose: () => void;
	onPick: (work: StudioWork) => void;
	onPageChange?: (page: number) => void;
	loadingMore?: boolean;
	// already existing
	ownedStatus?: (work: StudioWork) => MediaStatus | undefined;
	isDropped?: (work: StudioWork) => boolean;
}

export function StudioCatalogModal({
	studioName,
	catalog,
	loading,
	sort,
	onSortChange,
	onClose,
	onPick,
	ownedStatus,
	isDropped,
	onPageChange,
	loadingMore,
}: StudioCatalogModalProps) {
	useScrollLock();
	useEscapeClose(onClose);

	const works = catalog?.works ?? [];
	const body = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (body.current) body.current.scrollTop = 0;
	}, [catalog?.page, sort]);

	const turning = loading || !!loadingMore;
	const page = catalog?.page ?? 1;

	return (
		<ModalBackdrop
			className="fixed inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center z-20 p-2 sm:p-4"
			onClick={onClose}
		>
			<ModalPanel
				className="relative w-full max-w-7xl max-h-[88vh] flex flex-col overflow-hidden rounded-2xl bg-zinc-950 border border-zinc-800/50 shadow-2xl shadow-black/80"
				onClick={(e) => e.stopPropagation()}
			>
				{/* HEADER */}
				<div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 sm:px-6 sm:py-4 border-b border-zinc-800/50 bg-linear-to-b from-zinc-900/50 to-transparent">
					<div className="flex items-center gap-3 min-w-0">
						<button
							onClick={onClose}
							title="Close"
							className="sm:hidden shrink-0 p-1.5 -ml-1.5 rounded-lg text-zinc-400 active:text-zinc-100 active:scale-95 transition-all"
						>
							<X className="w-5 h-5" />
						</button>
						<div className="min-w-0">
							<p className="text-[0.625rem] text-zinc-400/60 font-semibold uppercase tracking-[0.18em] mb-0.5">
								Studio
							</p>
							<h2 className="text-zinc-200/90 text-lg font-semibold leading-tight truncate tracking-tight">
								{catalog?.name ?? studioName}
							</h2>
						</div>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<div
							className={`flex items-center gap-1 p-1 rounded-lg bg-linear-to-br from-zinc-900/80 to-zinc-950 border border-zinc-800/60 shadow-md shadow-black/40 transition-opacity duration-200 ${
								works.length
									? "opacity-100"
									: "opacity-0 pointer-events-none"
							}`}
						>
							{(["popular", "recent"] as const).map((s) => (
								<button
									key={s}
									onClick={() => onSortChange(s)}
									className={`cursor-pointer px-3 py-1 rounded-md text-[0.6875rem] uppercase tracking-[0.12em] font-semibold transition-all duration-200 ${
										sort === s
											? "bg-zinc-700/70 text-zinc-100 shadow-sm"
											: "text-zinc-500 hover:text-zinc-300"
									}`}
								>
									{s === "popular" ? "Popular" : "Recent"}
								</button>
							))}
						</div>
						{(page > 1 || catalog?.hasMore) && (
							<div className="flex items-center gap-0.5 p-1 shrink-0 rounded-lg bg-linear-to-br from-zinc-900/80 to-zinc-950 border border-zinc-800/60 shadow-md shadow-black/40">
								<button
									type="button"
									disabled={page <= 1 || turning}
									onClick={() => onPageChange?.(page - 1)}
									title="Previous page"
									className={PAGE_BTN}
								>
									<ChevronLeft
										className="w-4 h-4"
										strokeWidth={2.25}
									/>
								</button>
								<span className="min-w-10 text-center text-[0.6875rem] uppercase tracking-[0.12em] font-semibold text-zinc-400 tabular-nums select-none">
									{turning ? (
										<Loader2 className="mx-auto w-3.5 h-3.5 animate-spin" />
									) : (
										page
									)}
								</span>
								<button
									type="button"
									disabled={!catalog?.hasMore || turning}
									onClick={() => onPageChange?.(page + 1)}
									title="Next page"
									className={PAGE_BTN}
								>
									<ChevronRight
										className="w-4 h-4"
										strokeWidth={2.25}
									/>
								</button>
							</div>
						)}
					</div>
				</div>

				{/* CATALOG */}
				<div
					ref={body}
					className="relative flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6"
				>
					<div className="relative min-h-48">
						{loading && (
							<Loading
								customStyle="h-5 w-5 border-zinc-600"
								customBg="bg-zinc-950"
							/>
						)}
						{!loading && works.length === 0 && (
							<p className="text-zinc-500 italic text-sm text-center py-20">
								Nothing found for {studioName}.
							</p>
						)}
						{!loading && works.length > 0 && (
							<motion.div
								initial={{ opacity: 0 }}
								animate={{
									opacity: 1,
									transition: {
										duration: 0.4,
										ease: "easeInOut",
									},
								}}
								className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-x-3 gap-y-4 sm:gap-x-4 sm:gap-y-5"
							>
								{works.map((work) => {
									const status = ownedStatus?.(work);
									const dropped = isDropped?.(work) ?? false;
									return (
										<PosterCard
											key={work.anilistId}
											src={work.posterUrl}
											alt={work.title ?? "Untitled"}
											fallback={
												<Tv
													className="w-5 h-5 text-zinc-700"
													strokeWidth={1.5}
												/>
											}
											zoomOnHover={!dropped}
											onClick={
												dropped
													? undefined
													: () => onPick(work)
											}
											sizes="(max-width: 640px) 30vw, (max-width: 1024px) 22vw, 13vw"
											className={`shadow-md shadow-black/50 transition-all duration-300 ease-out ${
												dropped
													? "opacity-60"
													: "hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/60"
											} ${
												status
													? `${getStatusBorderColor(status)} border-2`
													: "border-zinc-800/50" +
														(dropped
															? ""
															: " hover:border-zinc-700/60")
											}`}
											badge={
												<>
													{dropped && (
														<div
															title="Left out of your chain"
															className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 z-10 max-w-[calc(100%-0.75rem)] truncate px-1 sm:px-1.5 py-0.5 rounded-md bg-zinc-900/80 backdrop-blur-sm border border-zinc-700/60 text-[0.5625rem] sm:text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-zinc-400 select-none"
														>
															Dropped
														</div>
													)}
													{status && (
														<div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10 px-1 sm:px-1.5 py-0.5 rounded-md bg-zinc-900/80 backdrop-blur-sm border border-zinc-700/60 text-[0.5625rem] sm:text-[0.625rem] font-semibold uppercase tracking-[0.08em] sm:tracking-[0.12em] text-zinc-300 select-none">
															In List
														</div>
													)}
													{work.part && (
														<div className="absolute bottom-1.5 left-1.5 sm:bottom-1 sm:left-1 z-10 max-w-[calc(100%-0.75rem)] sm:max-w-[calc(100%-1rem)] truncate px-1 sm:px-1.5 py-0.5 rounded-md bg-zinc-950/75 backdrop-blur-sm border border-zinc-700/50 text-[0.5625rem] sm:text-[0.625rem] font-semibold text-zinc-300 select-none">
															{work.base}
														</div>
													)}
												</>
											}
											footer={
												<div className="px-2.5 pt-2 pb-1.5">
													<div className="flex items-baseline justify-between gap-1.5">
														<p
															title={
																work.title ??
																undefined
															}
															className="min-w-0 truncate font-semibold text-zinc-200 text-[0.75rem] leading-snug"
														>
															{work.part ??
																work.base}
														</p>
														{work.score != null && (
															<ScoreLeaf
																score={
																	work.score
																}
																display="hidden sm:flex"
															/>
														)}
													</div>
													<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-1.5">
														<span className="truncate text-zinc-400 text-[0.6875rem] font-semibold">
															{airSeasonLabel(
																work.startDate,
															)}
														</span>
														<span className="flex shrink-0 items-center gap-1.5">
															<span className="whitespace-nowrap text-zinc-500 text-[0.6875rem] font-medium">
																{sizeLine(work)}
															</span>
															{work.score !=
																null && (
																<ScoreLeaf
																	score={
																		work.score
																	}
																	display="flex sm:hidden"
																/>
															)}
														</span>
													</div>
												</div>
											}
										/>
									);
								})}
							</motion.div>
						)}
					</div>
				</div>
			</ModalPanel>
		</ModalBackdrop>
	);
}
