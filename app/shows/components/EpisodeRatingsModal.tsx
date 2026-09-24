"use client";

import { useEffect, useState } from "react";
import { Leaf, X } from "lucide-react";
import { ShowProps } from "@/types/show";
import {
	EpisodeRating,
	SeriesInfo,
	type ExtraScores,
	fetchEpisodeRatings,
	formatVotes,
	getTier,
	partitionRatings,
} from "@/app/shows/utils/episodeRatings";
import type { AuthFetch } from "@/app/auth/hooks/useAuthFetch";
import Image from "next/image";
import { Loading } from "@/app/components/ui/Loading";
import { ModalBackdrop, ModalPanel } from "@/app/components/ui/ModalMotion";

interface EpisodeRatingsModalProps {
	show: ShowProps;
	onClose: () => void;
	authFetch: AuthFetch;
}

const getTierRgba = (score: number | null): string => {
	const hex = getTier(score)?.hex;
	return hex ? `color-mix(in srgb, ${hex} 50%, transparent)` : "transparent";
};

export function EpisodeRatingsModal({
	show,
	onClose,
	authFetch,
}: EpisodeRatingsModalProps) {
	const [ratings, setRatings] = useState<EpisodeRating[]>([]);
	// a movie or an ova is not in the series' run
	const [extraScores, setExtraScores] = useState<ExtraScores>({});
	const [series, setSeries] = useState<SeriesInfo | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		async function fetchRatings() {
			try {
				setLoading(true);
				setError(null);

				const { ratings, series, extras } = await fetchEpisodeRatings(
					show,
					authFetch,
				);
				setRatings(ratings);
				setExtraScores(extras);
				setSeries(series);
			} catch (e) {
				setError(
					e instanceof Error ? e.message : "Failed to load ratings",
				);
			} finally {
				setLoading(false);
			}
		}

		fetchRatings();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [show.id, show.tmdbId, show.imdbId, authFetch]);

	// the shared cut
	const { columns } = partitionRatings(show, ratings, extraScores);
	const cells = columns.map((c) => c.scores);
	const seasonAverages = columns.map((c) => c.average);
	const maxEpisodes = Math.max(0, ...cells.map((c) => c.length));

	return (
		<ModalBackdrop className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-30">
			<div className="fixed inset-0" onClick={onClose} />
			<ModalPanel className="relative bg-zinc-950 rounded-2xl shadow-2xl p-4 sm:p-6 max-w-[94vw] max-h-[90vh] overflow-hidden">
				{/* the backdrop closes this, but the panel is 94vw of a phone */}
				<button
					onClick={onClose}
					title="Close"
					className="sm:hidden absolute right-2 top-2 z-10 p-1.5 rounded-lg text-zinc-400 active:text-zinc-100 active:scale-95 transition-all"
				>
					<X className="w-5 h-5" />
				</button>
				<div className="flex flex-col sm:flex-row gap-3 sm:items-center">
					{/* LEFT PANEL */}
					<div className="flex flex-col gap-3 w-full sm:w-75 shrink-0">
						{show.posterUrl && (
							<div className="relative hidden sm:block bg-[#141414] p-3.5 rounded-xl shadow-island select-none">
								<div className="relative w-full overflow-hidden rounded-lg aspect-2/3">
									<Image
										src={show.posterUrl}
										alt={show.title}
										fill
										className="object-fill"
										sizes="300px"
									/>
									<div
										className="absolute inset-0 rounded-lg pointer-events-none"
										style={{
											background:
												"linear-gradient(to bottom, transparent 0%, rgba(24,24,27,0) 50%, rgba(24,24,27,0.3) 100%)",
										}}
									/>
								</div>
								<div className="absolute -inset-1 pointer-events-none rounded-xl shadow-[inset_0_0_12px_rgba(0,0,0,0.4)]" />
							</div>
						)}
						<div className="flex flex-col gap-1.5">
							<div className="flex items-center justify-between gap-2 mx-1.5 pr-7 sm:pr-0">
								<p className="text-zinc-100 font-bold text-lg leading-snugml-2">
									{show.title}
								</p>
								{series?.rating != null && (
									<span className="flex items-center gap-2 shrink-0">
										{series.votes != null && (
											<span className="text-zinc-400 text-xs font-semibold">
												{formatVotes(series.votes)}
											</span>
										)}
										<span className="text-zinc-400">
											󠁯•󠁏
										</span>
										<Leaf
											className="w-3 h-3 text-emerald-300/75 fill-emerald-300/15"
											strokeWidth={1.75}
										/>
										<span className="text-base font-black tabular-nums text-zinc-100 tracking-tight">
											{series.rating.toFixed(1)}
										</span>
									</span>
								)}
							</div>
							{/* wave bar */}
							<div className="w-full bg-zinc-800 rounded-full h-0.75 overflow-hidden">
								<div className="bg-zinc-900 h-0.75 rounded-full relative overflow-hidden w-full">
									<div
										className="absolute inset-0"
										style={{
											background: getTier(
												series?.rating ?? null,
											)
												? `linear-gradient(90deg, transparent 20%, ${getTierRgba(series?.rating ?? null)} 50%, transparent 80%)`
												: "transparent",
											animation:
												"wave 6s ease-in-out infinite",
											width: "200%",
										}}
									/>
								</div>
							</div>
						</div>
					</div>

					{/* RIGHT PANEL */}
					<div className="overflow-auto max-h-[60vh] sm:max-h-123.5 max-w-full sm:max-w-[calc(94vw-21rem)] grid place-items-start sm:place-items-center">
						{loading && (
							<div className="relative h-48 w-64">
								<Loading
									customStyle="h-6 w-6 border-zinc-600"
									customBg="bg-transparent"
								/>
							</div>
						)}
						{error && (
							<div className="flex items-center justify-center h-48 w-64 text-red-400 text-sm">
								{error}
							</div>
						)}

						{!loading &&
							!error &&
							(() => {
								const isSingleSeason = columns.length === 1;
								const CHUNK = 11;
								const numChunks = isSingleSeason
									? Math.max(
											1,
											Math.ceil(maxEpisodes / CHUNK),
										)
									: 1;
								// spread the episodes evenly
								const perChunk = Math.ceil(
									maxEpisodes / numChunks,
								);

								const EpisodeCell = ({
									epNum,
									col,
								}: {
									epNum: number;
									col: number;
								}) => {
									const column = cells[col] ?? [];
									if (epNum > column.length) return <td />;
									const score = column[epNum - 1];
									const tier = getTier(score ?? null);
									return (
										<td>
											<div
												className={`${tier?.bg ?? "bg-zinc-800"} ${tier?.text ?? "text-zinc-400"} rounded-lg w-14 h-9 flex items-center justify-center tabular-nums text-xl font-bold`}
											>
												{score != null
													? score.toFixed(1)
													: "?"}
											</div>
										</td>
									);
								};

								const AvgRow = ({
									asHeader,
									className = "",
								}: {
									asHeader: boolean;
									className?: string;
								}) => {
									const Cell = asHeader ? "th" : "td";
									return (
										<tr className={className}>
											<Cell className="text-zinc-400 text-xs font-semibold pr-1 text-right pb-2">
												avg
											</Cell>
											{seasonAverages.map((avg, i) => {
												const tier = getTier(avg);
												return (
													<Cell
														key={i}
														className="pb-2"
													>
														<div className="w-14 flex flex-col items-center gap-1">
															<span className="text-white font-bold text-lg tabular-nums -mb-1">
																{avg != null
																	? avg.toFixed(
																			1,
																		)
																	: "—"}
															</span>
															<div
																className={`h-1 w-full rounded-full ${tier?.bg ?? "bg-zinc-700"}`}
															/>
														</div>
													</Cell>
												);
											})}
										</tr>
									);
								};

								if (isSingleSeason) {
									const chunks = Array.from(
										{ length: numChunks },
										(_, ci) => ({
											start: ci * perChunk + 1,
											end: Math.min(
												(ci + 1) * perChunk,
												maxEpisodes,
											),
											isLast: ci === numChunks - 1,
										}),
									);
									return (
										<div className="flex gap-0 items-start">
											{chunks.map((chunk) => (
												<table
													key={chunk.start}
													className="border-separate border-spacing-x-2 border-spacing-y-1.5"
												>
													<tbody>
														{Array.from(
															{
																length:
																	chunk.end -
																	chunk.start +
																	1,
															},
															(_, idx) => {
																const epNum =
																	chunk.start +
																	idx;
																return (
																	<tr
																		key={
																			epNum
																		}
																	>
																		<td className="text-zinc-400 text-sm font-semibold pr-1 text-right">
																			E
																			{
																				epNum
																			}
																		</td>
																		{columns.map(
																			(
																				column,
																				ci,
																			) => (
																				<EpisodeCell
																					key={
																						column.key
																					}
																					epNum={
																						epNum
																					}
																					col={
																						ci
																					}
																				/>
																			),
																		)}
																	</tr>
																);
															},
														)}
														{chunk.isLast && (
															<tr>
																<td className="text-zinc-500 text-xs font-semibold pr-1 text-right pt-2">
																	avg
																</td>
																{seasonAverages.map(
																	(
																		avg,
																		i,
																	) => {
																		const tier =
																			getTier(
																				avg,
																			);
																		return (
																			<td
																				key={
																					i
																				}
																				className="pt-2"
																			>
																				<div className="w-14 flex flex-col items-center gap-1">
																					<span className="text-white font-bold text-lg tabular-nums -mb-1">
																						{avg !=
																						null
																							? avg.toFixed(
																									1,
																								)
																							: "—"}
																					</span>
																					<div
																						className={`h-1 w-full rounded-full ${tier?.bg ?? "bg-zinc-700"}`}
																					/>
																				</div>
																			</td>
																		);
																	},
																)}
															</tr>
														)}
													</tbody>
												</table>
											))}
										</div>
									);
								}

								return (
									<table className="border-separate border-spacing-x-2 border-spacing-y-1.5">
										<thead>
											<tr>
												<th className="w-10" />
												{columns.map((column) => (
													<th
														key={column.key}
														title={column.title}
														className="text-zinc-400 font-semibold text-center text-sm w-14 pb-1"
													>
														{column.label}
													</th>
												))}
											</tr>
										</thead>
										<tbody>
											{Array.from(
												{ length: maxEpisodes },
												(_, epIdx) => {
													const epNum = epIdx + 1;
													return (
														<tr key={epNum}>
															<td className="text-zinc-400 text-sm font-semibold pr-1 text-right">
																E{epNum}
															</td>
															{columns.map(
																(
																	column,
																	ci,
																) => (
																	<EpisodeCell
																		key={
																			column.key
																		}
																		epNum={
																			epNum
																		}
																		col={ci}
																	/>
																),
															)}
														</tr>
													);
												},
											)}
											<AvgRow asHeader={false} />
										</tbody>
									</table>
								);
							})()}
					</div>
				</div>
			</ModalPanel>
		</ModalBackdrop>
	);
}
