import { useState } from "react";
import { IGDBProps, IGDBDlcProps } from "@/types/game";
import { useAuthFetch } from "@/app/auth/hooks/useAuthFetch";

export function useGameSearch() {
	const { authFetch, isAuthLoading } = useAuthFetch();
	const [isSearching, setIsSearching] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isGameSearching = isSearching || isAuthLoading;

	const searchForGame = async (
		title: string,
		limit: number,
	): Promise<
		| IGDBProps[]
		| null
		| { isDuplicate: boolean; title: string; igdbId?: number }
	> => {
		try {
			setIsSearching(true);
			setError(null);
			//
			const url = `/api/games-api/igdb?title=${encodeURIComponent(title)}&limit=${limit}`;
			const response = await authFetch(url);
			// if duplicate
			if (response.status === 409) {
				const data = await response.json();
				return {
					isDuplicate: true,
					title: data.title,
					igdbId: data.igdbId,
				};
			}
			if (!response.ok) {
				throw new Error(`HTTP error--status: ${response.status}`);
			}
			//
			const resJson = await response.json();
			const games = resJson.data || null;
			//
			return games;
		} catch (e) {
			setError(e instanceof Error ? e.message : "An error occurred");
			console.error("Getting IGDB Search failed:", e);
			return null;
		} finally {
			setIsSearching(false);
		}
	};

	const reloadGame = async (
		igdbId: number,
		title?: string,
	): Promise<IGDBProps | null> => {
		try {
			setIsSearching(true);
			setError(null);
			//
			const url = `/api/games-api/igdb-refresh?igdbId=${igdbId}${
				title ? `&title=${encodeURIComponent(title)}` : ""
			}`;
			const response = await authFetch(url);
			if (!response.ok) {
				throw new Error(`HTTP error--status: ${response.status}`);
			}
			//
			const resJson = await response.json();
			const game = resJson.data || null;
			//
			return game;
		} catch (e) {
			setError(e instanceof Error ? e.message : "An error occurred");
			console.error("Getting IGDB-by-id failed:", e);
			return null;
		} finally {
			setIsSearching(false);
		}
	};

	//
	const searchForGameLogos = async (title: string): Promise<string[]> => {
		try {
			const url = `/api/games-api/sgdb-logos?title=${encodeURIComponent(title)}`;
			const response = await authFetch(url);
			if (!response.ok) return [];
			//
			const resJson = await response.json();
			return resJson.data?.logos ?? [];
		} catch (e) {
			console.error("Getting SteamGridDB logos failed:", e);
			return [];
		}
	};

	const searchForGameDlc = async (
		igdbId: number,
	): Promise<
		| IGDBDlcProps[]
		| null
		| { isDuplicate: boolean; title: string; igdbId?: number }
	> => {
		try {
			setIsSearching(true);
			setError(null);
			//
			const url = `/api/games-api/igdb-dlc?igdbId=${igdbId}`;
			const response = await authFetch(url);
			// if duplicate
			if (response.status === 409) {
				const data = await response.json();
				return {
					isDuplicate: true,
					title: data.title,
					igdbId: data.igdbId,
				};
			}
			if (!response.ok) {
				throw new Error(`HTTP error--status: ${response.status}`);
			}
			//
			const resJson = await response.json();
			const gameDlcs = resJson.data || null;
			//
			return gameDlcs;
		} catch (e) {
			setError(e instanceof Error ? e.message : "An error occurred");
			console.error("Getting IGDB-DLC failed:", e);
			return null;
		} finally {
			setIsSearching(false);
		}
	};

	return {
		error,
		isGameSearching,
		searchForGame,
		reloadGame,
		searchForGameLogos,
		searchForGameDlc,
	};
}
