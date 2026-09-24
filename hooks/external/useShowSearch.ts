import { useState } from "react";
import { ShowBaseProps, ShowEnrichmentProps } from "@/types/show";

type ShowAPIResult = ShowBaseProps & ShowEnrichmentProps;
import { useAuthFetch } from "@/app/auth/hooks/useAuthFetch";

export function useShowSearch() {
	const { authFetch, isAuthLoading } = useAuthFetch();
	const [isSearching, setIsSearching] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isShowSearching = isSearching || isAuthLoading;

	const searchForShow = async (
		title: string,
		year?: number,
		detect?: "anime" | "show",
	): Promise<
		| ShowAPIResult
		| null
		| { isDuplicate: boolean; title: string; tmdbId: string }
	> => {
		try {
			setIsSearching(true);
			setError(null);
			// make call
			const url =
				`/api/shows-api/external?title=${encodeURIComponent(title)}` +
				(year ? `&year=${year}` : "") +
				(detect ? `&forceAnime=${detect === "anime" ? 1 : 0}` : "");
			const response = await authFetch(url);
			// if duplicate
			if (response.status === 409) {
				const data = await response.json();
				return {
					isDuplicate: true,
					title: data.title,
					tmdbId: String(data.tmdbId),
				};
			}
			if (!response.ok) {
				throw new Error(`HTTP error--status: ${response.status}`);
			}
			//
			const resJson = await response.json();
			const showBare = resJson.data || null;
			//
			return showBare;
		} catch (e) {
			setError(e instanceof Error ? e.message : "An error occurred");
			console.error("Getting TMDb ID Search failed:", e);
			return null;
		} finally {
			setIsSearching(false);
		}
	};

	// load cuts  + reload
	const loadShowChain = async (
		tmdbId: string,
		forceAnime?: boolean,
		refresh?: boolean,
		cuts?: number[],
	): Promise<ShowEnrichmentProps | null> => {
		try {
			setIsSearching(true);
			setError(null);
			// for reload -- pull fresh
			const bust = refresh ? "&refresh=1" : "";
			// ANIME toggle
			const force =
				forceAnime === undefined
					? ""
					: `&forceAnime=${forceAnime ? 1 : 0}`;
			// ANIME: for when want to pick movie/season (contains anilist ids)
			const picked = cuts?.length ? `&cuts=${cuts.join(",")}` : "";
			//
			const url = `/api/shows-api/external-reload?tmdbId=${tmdbId}${force}${bust}${picked}`;
			const response = await authFetch(url);
			if (!response.ok) {
				throw new Error(`HTTP error--status: ${response.status}`);
			}
			//
			const resJson = await response.json();
			const seasonInfo = resJson.data || null;
			//
			return seasonInfo;
		} catch (e) {
			setError(e instanceof Error ? e.message : "An error occurred");
			console.error("Getting TMDB TV failed: ", e);
			return null;
		} finally {
			setIsSearching(false);
		}
	};

	return {
		error,
		isShowSearching,
		searchForShow,
		loadShowChain,
	};
}
