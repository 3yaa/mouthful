import {
	BaseMediaProps,
	ColumnConfig,
	SeriesMediaProps,
	SeriesProps,
} from "./media";

export const DIFF_COLUMNS_MOVIE: [
	ColumnConfig<MovieProps>,
	ColumnConfig<MovieProps>,
] = [
	{ label: "Director", sortKey: "director", getValue: (m) => m.director },
	{
		label: "Released",
		sortKey: "dateReleased",
		getValue: (m) => m.dateReleased,
	},
];

export interface MovieProps extends BaseMediaProps, SeriesMediaProps {
	status: "Completed" | "Want to Watch" | "Dropped";
	imdbId: string;
	tmdbId?: string;
	normalizedTitle: string;
	director?: string;
	dateReleased?: number;
	imdbRating?: number | null;
}

export interface MovieAPIProps {
	imdbId: string;
	tmdb_id?: string;
	title: string;
	director?: string;
	released_date?: number;
	imdbRating?: number | null;
	poster_url?: string;
	backdrop_url?: string;
	posters?: string[];
	backdrops?: string[];
	logo_url?: string | null;
	logos?: string[];
	series?: SeriesProps | null;
	//
	isAnime?: boolean;
	animeMovie?: AnimeMovieResolve; // in an anime chian
}

// a movie's place on an anime chain
export type AnimeMovieResolve =
	// kind == movie -> log into movie list
	| { kind: "movie"; why: string }
	| {
			kind: "show";
			// why gives reason as to why its not in chain
			why: string;
			showTitle: string | null;
			tmdbId: string;
			anilistId: number;
			parts: number;
	  };
