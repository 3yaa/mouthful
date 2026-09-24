import { MovieProps, MovieAPIProps } from "@/types/movie";

export function mapMetaToMovie(dataMeta: MovieAPIProps): Partial<MovieProps> {
	return {
		imdbId: dataMeta.imdbId,
		tmdbId: dataMeta.tmdb_id,
		title: dataMeta.title,
		director: dataMeta.director,
		status: "Want to Watch",
		dateReleased: dataMeta.released_date,
		imdbRating: dataMeta.imdbRating,
		cover: dataMeta.poster_url
			? { url: dataMeta.poster_url, color: "" }
			: undefined,
		backdropUrl: dataMeta.backdrop_url,
		logoUrl: dataMeta.logo_url,
	};
}
