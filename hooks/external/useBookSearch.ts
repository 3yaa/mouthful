import { useState } from "react";
import { BookAPIProps, BookSearchResult } from "@/types/book";
import { useAuthFetch } from "@/app/auth/hooks/useAuthFetch";

export function useBookSearch() {
	const { authFetch, isAuthLoading } = useAuthFetch();
	const [isSearching, setIsSearching] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isBookSearching = isSearching || isAuthLoading;

	// HARDCOVER API -- BOOK PRIMARY
	const searchForBooks = async (
		title: string,
		// the key a series jump is aiming at
		knownKey?: string,
	): Promise<
		| BookAPIProps
		| null
		| { isDuplicate: boolean; title: string; key?: string }
	> => {
		try {
			setIsSearching(true);
			setError(null);
			// make call
			const params = new URLSearchParams({ title });
			if (knownKey) params.set("key", knownKey);
			const url = `/api/books-api/hardcover?${params}`;
			const response = await authFetch(url);
			// if duplicate
			if (response.status === 409) {
				const data = await response.json();
				return {
					isDuplicate: true,
					title: data.title,
					key: data.key,
				};
			}
			if (!response.ok) {
				throw new Error(`HTTP error--status: ${response.status}`);
			}
			// format data
			const resJson = await response.json();
			const books = resJson.data || null;
			//
			return books;
		} catch (e) {
			setError(e instanceof Error ? e.message : "An error occurred");
			console.error("Getting book failed: ", e);
			return null;
		} finally {
			setIsSearching(false);
		}
	};

	// HARDCOVER MULTI -- top N candidates
	const searchForBooksMulti = async (
		title: string,
	): Promise<BookSearchResult[] | null> => {
		try {
			setIsSearching(true);
			setError(null);
			//
			const url = `/api/books-api/hardcover-multi?title=${encodeURIComponent(title)}`;
			const response = await authFetch(url);
			if (!response.ok) {
				throw new Error(`HTTP error--status: ${response.status}`);
			}
			//
			const resJson = await response.json();
			const books = resJson.data || null;
			//
			return books;
		} catch (e) {
			setError(e instanceof Error ? e.message : "An error occurred");
			console.error("Getting book results failed: ", e);
			return null;
		} finally {
			setIsSearching(false);
		}
	};

	// reload + multi book
	const loadBookByKey = async (key: string): Promise<BookAPIProps | null> => {
		try {
			setIsSearching(true);
			setError(null);
			// make call
			const url = `/api/books-api/hardcover-refresh?key=${key}`;
			const response = await authFetch(url);
			if (!response.ok) {
				throw new Error(`HTTP error--status: ${response.status}`);
			}
			// format data
			const resJson = await response.json();
			const book = resJson.data || null;
			//
			return book;
		} catch (e) {
			setError(e instanceof Error ? e.message : "An error occurred");
			console.error("Getting book by key failed: ", e);
			return null;
		} finally {
			setIsSearching(false);
		}
	};

	return {
		error,
		isBookSearching,
		searchForBooks,
		searchForBooksMulti,
		loadBookByKey,
	};
}
