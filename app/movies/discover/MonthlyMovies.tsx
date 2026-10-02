"use client";
import { useState } from "react";
import { Clapperboard } from "lucide-react";
import type { HollowMovieProps, MovieProps } from "@/types/movie";
import {
	CornerChip,
	DiscoverCard,
	ScoreLeaf,
} from "@/app/views/discover/DiscoverCard";
import {
	usePaging,
	useDiscoverPage,
	type DiscoverFeed,
} from "@/app/views/discover/useDiscoverPage";
import { MONTHS, dateLabel, runtimeLabel } from "@/app/views/discover/labels";
import { genreLineOf } from "@/utils/formattingUtils";

// release dates are set months out -- worth browsing ahead
const MAX_AHEAD = 6;
const OPEN_BACK = 2;
const DRAMA_BADGE: Record<string, string> = { KR: "K", CN: "C" };

const monthIndexOf = (date: Date) => date.getFullYear() * 12 + date.getMonth();

export function useMonthlyMovies(): DiscoverFeed<HollowMovieProps> {
	const [at, setAt] = useState(() => monthIndexOf(new Date()) - OPEN_BACK);
	const { page, setPage } = usePaging(String(at));
	const year = Math.floor(at / 12);
	const month = (at % 12) + 1;

	const params = new URLSearchParams({
		year: String(year),
		month: String(month),
		page: String(page),
	});
	const found = useDiscoverPage<HollowMovieProps>(
		`/api/movies-api/tmdb-discover?${params}`,
		"movies",
	);

	return {
		...found,
		page,
		setPage,
		onPrev: () => setAt((a) => a - 1),
		onNext: () => setAt((a) => a + 1),
		nextDisabled: at >= monthIndexOf(new Date()) + MAX_AHEAD,
		heading: (
			<>
				{MONTHS[month - 1]}
				<span className="text-zinc-500 font-medium mx-2">·</span>
				<span className="text-zinc-400 font-medium">{year}</span>
			</>
		),
	};
}

export function MovieDiscoverCard({
	movie,
	owned,
	onClick,
}: {
	movie: HollowMovieProps;
	owned?: MovieProps;
	onClick: () => void;
}) {
	const badge = movie.originCountry.map((c) => DRAMA_BADGE[c]).find(Boolean);
	const genre = genreLineOf(movie.genres);
	return (
		<DiscoverCard
			title={movie.title}
			posterUrl={movie.poster_url}
			corner={
				genre && (
					<CornerChip>
						<span className="block truncate">{genre}</span>
					</CornerChip>
				)
			}
			badge={badge && <CornerChip>{badge}</CornerChip>}
			status={owned?.status}
			icon={Clapperboard}
			onClick={onClick}
		>
			<div className="text-zinc-300 font-medium whitespace-nowrap tabular-nums">
				{dateLabel(movie.release_date)}
			</div>
			<div className="text-center text-zinc-300/80 font-medium tracking-wide truncate">
				{movie.runtime ? runtimeLabel(movie.runtime) : ""}
			</div>
			<div className="flex justify-end">
				<ScoreLeaf score={movie.imdbRating} />
			</div>
		</DiscoverCard>
	);
}
