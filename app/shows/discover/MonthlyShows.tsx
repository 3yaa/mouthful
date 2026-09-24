"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2, Tv, ChevronLeft, ChevronRight, Leaf } from "lucide-react";
import { useMediaData } from "@/hooks/useMediaData";
import { withPartPatch } from "@/app/shows/utils/animePartMarks";
import { getStatusBorderColor } from "@/utils/styleUtils";
import { useAuthFetch } from "@/app/auth/hooks/useAuthFetch";
import type { ShowProps, HollowShowProps } from "@/types/show";
import { AddShow } from "@/app/shows/AddShow";
import { ShowDetails as ShowDetailsModal } from "@/app/shows/ShowDetailsHub";
import { BadgeLink } from "@/app/views/mediaListing/ShowsBadge";
import { useFlash } from "@/app/components/RouteFlash";

const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
] as const;

const ORIGINS = [
	{ label: "k-drama", code: "KR" },
	{ label: "c-drama", code: "CN" },
	{ label: "all", code: null },
] as const;

function getCurrentMonth(): { year: number; month: number } {
	const now = new Date();
	return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function isFutureMonth(year: number, month: number): boolean {
	const cur = getCurrentMonth();
	return year > cur.year || (year === cur.year && month > cur.month);
}

export function MonthlyShows() {
	const [year, setYear] = useState(() => {
		const { year, month } = getCurrentMonth();
		return month === 1 ? year - 1 : year;
	});
	const [month, setMonth] = useState(() => {
		const { month } = getCurrentMonth();
		return month === 1 ? 12 : month - 1;
	});
	//
	type OriginCode = (typeof ORIGINS)[number]["code"];
	const [origin, setOrigin] = useState<OriginCode>("KR");
	//
	const [shows, setShows] = useState<HollowShowProps[]>([]);
	const [addingTitle, setAddingTitle] = useState<string | null>(null);
	const [selectAddedShowId, setSelectAddedShowId] = useState<number | null>(
		null,
	);
	//
	const [loading, setLoading] = useState(false);
	const flash = useFlash();
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	//
	const { items, add, update, updatePart } = useMediaData<ShowProps>({
		endpoint: "shows",
		requiredFieldsToPost: ["title", "status", "tmdbId"],
		statusOrder: {
			Watching: 0,
			"Want to Watch": 1,
			Completed: 2,
			Dropped: 3,
		},
	});
	const { authFetch } = useAuthFetch();
	const selectAddedShow =
		selectAddedShowId != null
			? (items.find((s) => s.id === selectAddedShowId) ?? null)
			: null;

	const isFuture = isFutureMonth(year, month);

	// load data
	useEffect(() => {
		const load = async () => {
			setLoading(true);
			setError(null);
			try {
				const params = new URLSearchParams({
					year: String(year),
					month: String(month),
					page: String(page),
					...(origin ? { countryOrigin: origin } : {}),
				});
				//
				const res = await authFetch(
					`/api/shows-api/tmdb-tv-discover?${params}`,
				);
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const data = await res.json();
				//
				setShows(data.shows);
				setTotalPages(data.totalPages);
			} catch (e) {
				setError(e instanceof Error ? e.message : "Unknown error");
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [year, month, page, origin, isFuture, authFetch]);

	const handlePrev = () => {
		setPage(1);
		if (month === 1) {
			setYear((y: number) => y - 1);
			setMonth(12);
		} else {
			setMonth((m: number) => m - 1);
		}
	};

	const handleNext = () => {
		setPage(1);
		if (month === 12) {
			setYear((y: number) => y + 1);
			setMonth(1);
		} else {
			setMonth((m: number) => m + 1);
		}
	};

	return (
		<div className="relative min-h-screen bg-zinc-950 text-zinc-200">
			<BadgeLink
				href="/shows"
				title="My Show List"
				className="absolute right-10 top-0 z-10"
				onClick={() => flash("show")}
			/>
			{/* ACTION BAR */}
			<div className="sticky top-0 bg-zinc-950/75 backdrop-blur-3xl border-b border-zinc-800/50 mx-[15vh] select-none">
				<div className="max-w-375 mx-auto px-6 py-3.5 flex items-center justify-between gap-4">
					{/* Season nav */}
					<div className="flex items-center gap-3">
						<button
							onClick={handlePrev}
							className="cursor-pointer text-zinc-600 hover:text-zinc-300 transition-colors duration-200"
						>
							<ChevronLeft
								className="w-4 h-4"
								strokeWidth={2.25}
							/>
						</button>
						<h1 className="text-zinc-300 text-[0.8125rem] uppercase tracking-[0.2em] font-semibold tabular-nums">
							{isFuture ? (
								<>
									{year}{" "}
									<span className="text-zinc-500 font-medium">
										+ ended
									</span>
								</>
							) : (
								<>
									{MONTHS[month - 1]}
									<span className="text-zinc-500 font-medium mx-2">
										·
									</span>
									<span className="text-zinc-400 font-medium">
										{year}
									</span>
								</>
							)}
						</h1>
						<button
							onClick={handleNext}
							disabled={isFuture}
							className="cursor-pointer text-zinc-600 hover:text-zinc-300 transition-colors duration-200 disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:text-zinc-600"
						>
							<ChevronRight
								className="w-4 h-4"
								strokeWidth={2.25}
							/>
						</button>
					</div>

					{/* Origin filter */}
					<div className="flex items-center gap-1 p-1 rounded-lg bg-linear-to-br from-zinc-900/80 to-zinc-950/90 border border-zinc-800/60 shadow-md shadow-black/30">
						{ORIGINS.map((o) => {
							const active = origin === o.code;
							return (
								<button
									key={String(o.code)}
									onClick={() => {
										setOrigin(o.code);
										setPage(1);
									}}
									className={`px-3 py-1 rounded-md text-[0.6875rem] uppercase tracking-[0.12em] font-semibold transition-all duration-200 cursor-pointer ${
										active
											? "bg-zinc-700/70 text-zinc-300 shadow-sm"
											: "text-zinc-500 hover:text-zinc-300"
									}`}
								>
									{o.label}
								</button>
							);
						})}
					</div>
				</div>
			</div>

			{/* CONTENT */}
			<div className="max-w-375 mx-auto px-6 py-8">
				{loading && (
					<div className="flex justify-center items-center py-40">
						<Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
					</div>
				)}

				{error && (
					<div className="flex justify-center py-40">
						<p className="text-zinc-400 text-sm italic">
							Failed to load — {error}
						</p>
					</div>
				)}

				{!loading && !error && (
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 gap-x-5 gap-y-7">
						{shows.map((show) => {
							const matchedItem = items.find(
								(s) => s.tmdbId === show.tmdbId,
							);
							const inList = !!matchedItem;
							return (
								<div
									key={show.tmdbId}
									onClick={
										matchedItem
											? () =>
													setSelectAddedShowId(
														matchedItem.id,
													)
											: () => setAddingTitle(show.title)
									}
									className={`group bg-linear-to-b from-zinc-900/70 to-zinc-950/85 backdrop-blur-sm rounded-xl border shadow-lg shadow-black/50 transition-all duration-300 ease-out overflow-hidden ${
										matchedItem
											? `cursor-pointer ${getStatusBorderColor(matchedItem.status)} border-3 hover:shadow-2xl hover:shadow-black/70 hover:-translate-y-1`
											: "cursor-pointer border-zinc-800/50 hover:shadow-2xl hover:shadow-black/70 hover:-translate-y-1 hover:border-zinc-700/70"
									}`}
								>
									{/* Poster */}
									<div className="relative aspect-2/3 bg-zinc-900 overflow-hidden">
										{inList && (
											<div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-zinc-900/80 backdrop-blur-sm border border-zinc-700/60 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-zinc-300">
												In List
											</div>
										)}
										{show.poster_url ? (
											<Image
												src={show.poster_url}
												alt={show.title}
												fill
												className={`object-cover transition-transform duration-500 ease-out ${!inList ? "group-hover:scale-[1.04]" : ""}`}
												sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
											/>
										) : (
											<div className="w-full h-full flex items-center justify-center bg-linear-to-br from-zinc-800 to-zinc-900">
												<Tv
													className="w-8 h-8 text-zinc-700"
													strokeWidth={1.5}
												/>
											</div>
										)}
									</div>

									<div className="h-px bg-linear-to-r from-transparent via-zinc-700/45 to-transparent"></div>

									{/* Info strip */}
									<div className="px-3.5 py-3 grid grid-cols-3 items-center">
										<div className="text-[0.8125rem] text-zinc-300 font-medium">
											{show.currentEp != null ? (
												<span className="tabular-nums">
													Ep {show.currentEp}
													{show.totalEp != null && (
														<span className="text-zinc-500">
															{" "}
															/ {show.totalEp}
														</span>
													)}
												</span>
											) : show.first_air_date ? (
												<span className="text-zinc-300 font-medium text-[0.8125rem]">
													{new Date(
														show.first_air_date +
															"T00:00:00",
													).toLocaleDateString(
														"en-US",
														{
															month: "short",
															day: "numeric",
														},
													)}
												</span>
											) : (
												<span className="text-zinc-500 italic text-[0.78125rem]">
													no info
												</span>
											)}
										</div>
										<div className="text-center text-[0.75rem] text-zinc-300/80 font-medium tracking-wide truncate">
											{show.airDays ?? ""}
										</div>
										<div className="flex justify-end">
											{show.imdbRating != null ? (
												<span className="flex items-center gap-1.25">
													<Leaf
														className="w-3 h-3 text-emerald-300/75 fill-emerald-300/15"
														strokeWidth={1.75}
													/>
													<span className="text-[0.8125rem] font-bold tabular-nums text-zinc-100 tracking-tight">
														{show.imdbRating.toFixed(
															1,
														)}
													</span>
												</span>
											) : (
												<Leaf
													className="w-3 h-3 text-blue-400/75 fill-blue-400/15"
													strokeWidth={1.75}
												/>
											)}
										</div>
									</div>
								</div>
							);
						})}
					</div>
				)}

				{!loading && !error && shows.length === 0 && (
					<p className="text-center text-zinc-400 italic text-sm py-40">
						No shows found.
					</p>
				)}

				{!loading && !error && (
					<div
						className={`mt-2 flex justify-end items-center gap-2 ${shows.length === 0 ? "invisible" : ""}`}
					>
						<button
							onClick={() => setPage((p) => Math.max(1, p - 1))}
							disabled={page === 1 || loading}
							className="cursor-pointer w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-all disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-zinc-500"
						>
							<ChevronLeft
								className="w-3.5 h-3.5"
								strokeWidth={2.25}
							/>
						</button>
						<span className="text-zinc-400 text-[0.6875rem] tabular-nums uppercase tracking-[0.12em] font-semibold min-w-14 text-center">
							{String(page).padStart(2, "0")}
							<span className="text-zinc-700 mx-1">/</span>
							{String(totalPages).padStart(2, "0")}
						</span>
						<button
							onClick={() =>
								setPage((p) => Math.min(totalPages, p + 1))
							}
							disabled={page === totalPages || loading}
							className="cursor-pointer w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-all disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-zinc-500"
						>
							<ChevronRight
								className="w-3.5 h-3.5"
								strokeWidth={2.25}
							/>
						</button>
					</div>
				)}
			</div>

			{selectAddedShow && (
				<ShowDetailsModal
					show={selectAddedShow}
					onClose={() => setSelectAddedShowId(null)}
					onUpdate={(id, updates) => {
						if (updates) update(id, updates);
					}}
					onUpdatePart={(showId, anilistId, patch) =>
						updatePart(showId, anilistId, patch, (item) =>
							withPartPatch(item, anilistId, patch),
						)
					}
					existingShows={items}
				/>
			)}

			{addingTitle !== null && (
				<AddShow
					isOpen={true}
					titleFromAbove={addingTitle}
					onClose={() => setAddingTitle(null)}
					existingShows={items}
					onAddShow={add}
				/>
			)}
		</div>
	);
}
