"use client";
import { DiscoverFrame } from "@/app/views/discover/DiscoverFrame";
import { useDiscoverLists } from "@/app/views/discover/useDiscoverLists";
import { MovieDiscoverCard, useMonthlyMovies } from "./MonthlyMovies";

export function DiscoverMovies() {
	const feed = useMonthlyMovies();
	const lists = useDiscoverLists();

	return (
		<DiscoverFrame
			home={{ href: "/movies", title: "My Movie List", listing: "movie" }}
			feed={feed}
			emptyText="No movies found."
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
