"use client";
import { Clapperboard } from "lucide-react";
import type { HollowMovieProps, MovieProps } from "@/types/movie";
import type { DroppedTitle } from "@/types/media";
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
import {
	DRAMA_BADGE,
	dateLabel,
	runtimeLabel,
} from "@/app/views/discover/labels";
import { periodLabel, usePeriods } from "@/app/views/discover/periods";
import type { DiscoverSort } from "@/app/views/discover/DiscoverFrame";
import { genreLineOf } from "@/utils/formattingUtils";

const OPEN_BACK = 2;
const SEASONS_AHEAD = 4;

// desi is IN | BD | PK on the server, rest is every other country
export const MOVIE_ORIGINS = [
	{ label: "all", code: "all" },
	{ label: "desi", code: "desi" },
	{ label: "rest", code: "rest" },
] as const;
export type MovieOrigin = (typeof MOVIE_ORIGINS)[number]["code"];

export function useMonthlyMovies(
	origin: MovieOrigin,
	sort: DiscoverSort,
): DiscoverFeed<HollowMovieProps, DroppedTitle> {
	const { period, onPrev, onNext, nextDisabled } = usePeriods(
		-OPEN_BACK,
		SEASONS_AHEAD,
	);
	const { year, month, months } = period;
	const { page, setPage } = usePaging(
		`${origin}:${sort}:${year}-${month}+${months}`,
	);

	const params = new URLSearchParams({
		year: String(year),
		month: String(month),
		page: String(page),
		...(months > 1 && { months: String(months) }),
		...(origin !== "all" && { origin }),
		...(sort === "rated" && { sort }),
	});
	// a new order keeps the old cards up, a new origin is another list
	const found = useDiscoverPage<HollowMovieProps, DroppedTitle>(
		`/api/movies-api/tmdb-discover?${params}`,
		"movies",
		`movies:${origin}`,
	);

	return {
		...found,
		page,
		setPage,
		onPrev,
		onNext,
		nextDisabled,
		heading: (
			<>
				{periodLabel(period)}
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
			footChip={
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
				<ScoreLeaf
					score={movie.imdbRating}
					unlisted={movie.imdbId === null}
				/>
			</div>
		</DiscoverCard>
	);
}
