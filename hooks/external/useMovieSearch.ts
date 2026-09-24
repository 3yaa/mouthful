import { useState } from "react";
import { MovieAPIProps } from "@/types/movie";
import { useAuthFetch } from "@/app/auth/hooks/useAuthFetch";

export function useMovieSearch() {
	const { authFetch, isAuthLoading } = useAuthFetch();
	const [isSearching, setIsSearching] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isMovieSearching = isSearching || isAuthLoading;

	// title/year to full metadata
	const searchForMovie = async (
		title: string,
		year?: number | undefined,
		// legacy no tmdb id  -- skips the duplicate
		isReload?: boolean,
		movieOnly?: boolean,
		// the id a series jump is aiming at
		knownTmdbId?: string,
	): Promise<
		| MovieAPIProps
		| null
		| {
				isDuplicate: boolean;
				title: string;
				tmdbId?: string;
				imdbId?: string;
		  }
	> => {
		try {
			setIsSearching(true);
			setError(null);
			// make call
			const params = new URLSearchParams({ title });
			if (year) params.set("year", String(year));
			if (isReload) params.set("reload", "1");
			if (movieOnly) params.set("movieOnly", "1");
			if (knownTmdbId) params.set("tmdbId", knownTmdbId);
			const url = `/api/movies-api/tmdb?${params}`;
			const response = await authFetch(url);
			// if duplicate
			if (response.status === 409) {
				const data = await response.json();
				return {
					isDuplicate: true,
					title: data.title,
					tmdbId: data.tmdbId,
					imdbId: data.imdbId,
				};
			}
			if (!response.ok) {
				throw new Error(`HTTP error--status: ${response.status}`);
			}
			// format data
			const resJson = await response.json();
			const movie = resJson.data || null;
			//
			return movie;
		} catch (e) {
			setError(e instanceof Error ? e.message : "An error occurred");
			console.error("Getting movie metadata failed: ", e);
			return null;
		} finally {
			setIsSearching(false);
		}
	};

	// movie whose tmdb id is already known.
	const reloadMovie = async (
		tmdbId: string,
	): Promise<MovieAPIProps | null> => {
		try {
			setIsSearching(true);
			setError(null);
			//
			const url = `/api/movies-api/tmdb-refresh?tmdbId=${tmdbId}`;
			const response = await authFetch(url);
			if (!response.ok) {
				throw new Error(`HTTP error--status: ${response.status}`);
			}
			//
			const resJson = await response.json();
			const movieMeta = resJson.data || null;
			//
			return movieMeta;
		} catch (e) {
			setError(e instanceof Error ? e.message : "An error occurred");
			console.error("Reloading movie metadata failed:", e);
			return null;
		} finally {
			setIsSearching(false);
		}
	};

	return {
		error,
		isMovieSearching,
		searchForMovie,
		reloadMovie,
	};
}
