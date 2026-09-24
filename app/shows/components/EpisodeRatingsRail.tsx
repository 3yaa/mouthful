"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Disc, Film, Leaf } from "lucide-react";
import { ShowProps } from "@/types/show";
import type { AuthFetch } from "@/app/auth/hooks/useAuthFetch";
import { Loading } from "@/app/components/ui/Loading";
import { getStatusAccent } from "@/utils/styleUtils";
import {
	EpisodeRating,
	RatingColumn,
	SeriesInfo,
	type ExtraScores,
	fetchEpisodeRatings,
	getTier,
	partitionRatings,
} from "@/app/shows/utils/episodeRatings";

const mix = (hex: string, pct: number, base = "transparent") =>
	`color-mix(in srgb, ${hex} ${pct}%, ${base})`;

// cell's silhouette
const CELL_SHAPE =
	"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 84' preserveAspectRatio='none'%3E%3Cpath d='M 8,84 C 3,84 0,81 0,76 L 0,34 C 0,29 3,26 7,26 L 8,26 C 22,26 19,0 36,0 L 64,0 C 81,0 78,26 92,26 L 93,26 C 97,26 100,29 100,34 L 100,76 C 100,81 97,84 92,84 Z' fill='%23fff'/%3E%3C/svg%3E";
//
const SWELL = "#32323a";
const SWELL_END = "31%";
const cellFill = (hex?: string) => {
	const face = hex ?? "rgba(39,39,42,0.8)";
	return `linear-gradient(to bottom, ${SWELL} 0, ${SWELL} ${SWELL_END}, ${face} ${SWELL_END}, ${face} 100%)`;
};

const cellMask = {
	maskImage: `url("${CELL_SHAPE}")`,
	WebkitMaskImage: `url("${CELL_SHAPE}")`,
	maskSize: "100% 100%",
	WebkitMaskSize: "100% 100%",
	maskRepeat: "no-repeat",
	WebkitMaskRepeat: "no-repeat",
} as const;

function PartBlock({ column }: { column: RatingColumn }) {
	const tier = getTier(column.average);

	// movie or a piece of side content is one sitting
	if (column.kind) {
		const side = column.kind === "side";
		const Icon = side ? Disc : Film;
		return (
			<li className={side ? "py-1 pl-7 pr-3.5" : "px-3.5 py-1.5"}>
				<div className="flex items-center gap-2 rounded-lg neu-raised-firm px-2 py-1.5">
					<Icon
						aria-hidden
						className="w-3 h-3 shrink-0 text-zinc-500"
						strokeWidth={2}
					/>
					<span
						className="min-w-0 flex-1 select-text truncate text-[0.78rem] font-medium text-zinc-300/75"
						title={column.title}
					>
						{column.title ?? column.label}
					</span>
					<span
						className={`shrink-0 rounded-md px-2 py-0.5 text-[0.8rem] font-bold leading-[1.15rem] tabular-nums ${
							tier?.text ?? "text-zinc-400"
						}`}
						style={{
							background: tier?.hex ?? "rgba(39,39,42,0.8)",
						}}
					>
						{column.average != null
							? column.average.toFixed(1)
							: "?"}
					</span>
				</div>
			</li>
		);
	}

	return (
		<li className="px-3.5 py-2.5">
			<div className="rounded-lg neu-raised-firm px-2 py-1.5">
				<div className="mb-1.5 flex items-center justify-between gap-2">
					<span
						className="min-w-0 shrink select-text truncate text-[0.78rem] font-medium tabular-nums text-zinc-300/75"
						title={column.title}
					>
						{column.title ? (
							column.title
						) : column.number ? (
							<>
								<span className="mr-1.5 text-[0.72rem] font-medium text-zinc-400/85">
									Season:
								</span>
								{column.number}
							</>
						) : (
							column.label
						)}
					</span>
					{column.average != null && (
						<span className="ml-auto flex shrink-0 items-center gap-1.5">
							<Leaf
								className="w-3 h-3"
								strokeWidth={2}
								style={{ color: tier?.hex ?? "#71717a" }}
							/>
							<span className="text-[0.76rem] font-bold tabular-nums text-zinc-300/70">
								{column.average.toFixed(1)}
							</span>
						</span>
					)}
				</div>
				<div className="grid grid-cols-6 justify-items-center gap-1">
					{column.scores.map((score, i) => {
						const cell = getTier(score);
						return (
							<span
								key={i}
								className="flex h-[2.15rem] w-[86%] flex-col items-center"
								style={{
									...cellMask,
									background: cellFill(cell?.hex),
								}}
							>
								<span className="text-[0.62rem] font-bold leading-[0.78rem] tabular-nums text-zinc-400">
									{i + 1}
								</span>
								<span
									className={`flex flex-1 items-center text-[0.875rem] font-bold leading-none tracking-tight tabular-nums ${
										cell?.text ?? "text-zinc-400"
									}`}
								>
									{score != null ? score.toFixed(1) : "?"}
								</span>
							</span>
						);
					})}
				</div>
			</div>
		</li>
	);
}

interface EpisodeRatingsRailProps {
	show: ShowProps;
	authFetch: AuthFetch;
	onSeries: (series: SeriesInfo | null) => void;
}

export function EpisodeRatingsRail({
	show,
	authFetch,
	onSeries,
}: EpisodeRatingsRailProps) {
	const reduced = useReducedMotion();
	const statusColor = getStatusAccent(show.status);
	const [ratings, setRatings] = useState<EpisodeRating[]>([]);
	// a movie or an ova
	const [extraScores, setExtraScores] = useState<ExtraScores>({});
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let live = true;
		setLoading(true);
		setError(null);
		fetchEpisodeRatings(show, authFetch)
			.then(({ ratings, series, extras }) => {
				if (!live) return;
				setRatings(ratings);
				setExtraScores(extras);
				onSeries(series);
			})
			.catch((e: unknown) => {
				if (!live) return;
				setError(e instanceof Error ? e.message : "No ratings found");
			})
			.finally(() => live && setLoading(false));
		return () => {
			live = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [show.id, show.imdbId, show.tmdbId]);

	const { columns } = partitionRatings(show, ratings, extraScores);

	return (
		<motion.aside
			initial={reduced ? { opacity: 0 } : { opacity: 0, x: -22 }}
			animate={{
				opacity: 1,
				x: 0,
				transition: {
					x: { duration: 0.52, ease: [0.16, 1, 0.3, 1] },
					opacity: { duration: 0.3, ease: "easeOut" },
				},
			}}
			// the arrival run backwards on a faster clock
			exit={{
				opacity: 0,
				x: reduced ? 0 : -22,
				transition: {
					x: { duration: 0.28, ease: [0.7, 0, 0.84, 0] },
					opacity: { duration: 0.16, delay: 0.12, ease: "easeIn" },
				},
			}}
			className="pointer-events-none absolute right-full top-0 mr-1.5 h-full hidden 2xl:flex w-76 flex-col py-2"
		>
			<div
				className="pointer-events-auto relative flex max-h-full min-h-0 select-none flex-col overflow-hidden rounded-2xl bg-[#121212] py-2"
				style={{
					boxShadow: `0 22px 55px -20px rgba(0,0,0,0.9), 0 0 34px -18px ${mix(statusColor, 45)}`,
				}}
			>
				{loading ? (
					<div className="relative h-24">
						<Loading customStyle="h-6 w-6 border-zinc-500" />
					</div>
				) : error || !columns.length ? (
					<p className="px-3.5 py-6 text-center text-[0.78rem] text-zinc-500">
						{error ?? "No episode ratings for this one"}
					</p>
				) : (
					<ul
						className="min-h-0 shrink overflow-y-auto"
						style={{
							maskImage:
								"linear-gradient(to bottom, black calc(100% - 0.85rem), transparent)",
							WebkitMaskImage:
								"linear-gradient(to bottom, black calc(100% - 0.85rem), transparent)",
						}}
					>
						{columns.map((column) => (
							<PartBlock key={column.key} column={column} />
						))}
					</ul>
				)}
			</div>
		</motion.aside>
	);
}
