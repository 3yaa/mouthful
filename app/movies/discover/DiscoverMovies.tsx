"use client";
import { useState } from "react";
import { Clapperboard } from "lucide-react";
import {
	DiscoverFrame,
	Segmented,
	type DiscoverSort,
} from "@/app/views/discover/DiscoverFrame";
import { useDiscoverLists } from "@/app/views/discover/useDiscoverLists";
import { tmdbDroppedGroups } from "@/app/views/discover/DroppedList";
import {
	MOVIE_ORIGINS,
	MovieDiscoverCard,
	useMonthlyMovies,
	type MovieOrigin,
} from "./MonthlyMovies";

export function DiscoverMovies() {
	const [origin, setOrigin] = useState<MovieOrigin>("all");
	const [sort, setSort] = useState<DiscoverSort>("popular");
	const feed = useMonthlyMovies(origin, sort);
	const lists = useDiscoverLists();

	return (
		<DiscoverFrame
			home={{ href: "/movies", title: "My Movie List", listing: "movie" }}
			swap={{
				href: "/shows/discover",
				title: "Discover shows",
				to: "show",
			}}
			feed={feed}
			sort={{ value: sort, onChange: setSort }}
			dropped={
				sort === "rated"
					? tmdbDroppedGroups(
							feed.dropped,
							feed.minVotes,
							Clapperboard,
							(movie) => ({
								status: lists.movieOf(
									movie.tmdbId,
									movie.imdbId,
								)?.status,
								unlisted: movie.imdbId === null,
								onClick: () => lists.openMovieCard(movie),
							}),
						)
					: undefined
			}
			controls={
				<Segmented
					options={MOVIE_ORIGINS}
					value={origin}
					onChange={setOrigin}
				/>
			}
			emptyText={
				sort === "rated"
					? feed.minVotes
						? `Nothing with ${feed.minVotes}+ votes yet.`
						: "Nothing rated yet."
					: "No movies found."
			}
			overlays={lists.modals}
		>
			{feed.items.map((movie) => (
				<MovieDiscoverCard
					key={movie.tmdbId}
					movie={movie}
					owned={lists.movieOf(movie.tmdbId, movie.imdbId)}
					onClick={() => lists.openMovieCard(movie)}
				/>
			))}
		</DiscoverFrame>
	);
}
