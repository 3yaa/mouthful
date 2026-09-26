import { useState } from "react";
import { MangaAPIProps, MangaSearchResult } from "@/types/manga";
import { useAuthFetch } from "@/app/auth/hooks/useAuthFetch";

export function useMangaSearch() {
	const { authFetch, isAuthLoading } = useAuthFetch();
	const [isSearching, setIsSearching] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isMangaSearching = isSearching || isAuthLoading;

	// ANILIST API -- MANGA PRIMARY
	const searchForManga = async (
		title: string,
		// the entry a series jump is aiming at
		knownId?: string,
	): Promise<
		| MangaAPIProps
		| null
		| { isDuplicate: boolean; title: string; anilistId?: number }
	> => {
		try {
			setIsSearching(true);
			setError(null);
			// make call
			const params = new URLSearchParams({ title });
			if (knownId) params.set("anilistId", knownId);
			const url = `/api/manga-api/anilist?${params}`;
			const response = await authFetch(url);
			// if duplicate
			if (response.status === 409) {
				const data = await response.json();
				return {
					isDuplicate: true,
					title: data.title,
					anilistId: data.anilistId,
				};
			}
			if (!response.ok) {
				throw new Error(`HTTP error--status: ${response.status}`);
			}
			// format data
			const resJson = await response.json();
			const manga = resJson.data || null;
			//
			return manga;
		} catch (e) {
			setError(e instanceof Error ? e.message : "An error occurred");
			console.error("Getting manga failed: ", e);
			return null;
		} finally {
			setIsSearching(false);
		}
	};

	// ANILIST MULTI -- top N candidates
	const searchForMangaMulti = async (
		title: string,
	): Promise<MangaSearchResult[] | null> => {
		try {
			setIsSearching(true);
			setError(null);
			//
			const url = `/api/manga-api/anilist-multi?title=${encodeURIComponent(title)}`;
			const response = await authFetch(url);
			if (!response.ok) {
				throw new Error(`HTTP error--status: ${response.status}`);
			}
			//
			const resJson = await response.json();
			const manga = resJson.data || null;
			//
			return manga;
		} catch (e) {
			setError(e instanceof Error ? e.message : "An error occurred");
			console.error("Getting manga results failed: ", e);
			return null;
		} finally {
			setIsSearching(false);
		}
	};

	// reload + multi manga
	const loadMangaById = async (
		anilistId: number,
	): Promise<MangaAPIProps | null> => {
		try {
			setIsSearching(true);
			setError(null);
			// make call
			const url = `/api/manga-api/anilist-refresh?anilistId=${anilistId}`;
			const response = await authFetch(url);
			if (!response.ok) {
				throw new Error(`HTTP error--status: ${response.status}`);
			}
			// format data
			const resJson = await response.json();
			const manga = resJson.data || null;
			//
			return manga;
		} catch (e) {
			setError(e instanceof Error ? e.message : "An error occurred");
			console.error("Getting manga by id failed: ", e);
			return null;
		} finally {
			setIsSearching(false);
		}
	};

	return {
		error,
		isMangaSearching,
		searchForManga,
		searchForMangaMulti,
		loadMangaById,
	};
}
