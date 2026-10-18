"use client";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useAuthFetch } from "@/app/auth/hooks/useAuthFetch";

export interface DiscoverPage<T, D = never> {
	items: T[];
	dropped: D[];
	minVotes: number | null;
	totalPages: number;
	loading: boolean;
	refreshing: boolean;
	error: string | null;
}

// pages seen this session
const FRESH_MS = 30 * 60 * 1000;
const SEEN_MAX = 120;
const seen = new Map<
	string,
	{
		items: unknown[];
		dropped: unknown[];
		minVotes: number | null;
		totalPages: number;
		at: number;
	}
>();

function remember(
	url: string,
	items: unknown[],
	dropped: unknown[],
	minVotes: number | null,
	totalPages: number,
) {
	seen.delete(url);
	seen.set(url, { items, dropped, minVotes, totalPages, at: Date.now() });
	if (seen.size > SEEN_MAX) seen.delete(seen.keys().next().value!);
}

// list names what the url pages through -- another page of it keeps the old cards up
export function useDiscoverPage<T, D = never>(
	url: string | null,
	key: string,
	list: string,
): DiscoverPage<T, D> {
	const { authFetch } = useAuthFetch();
	const [items, setItems] = useState<T[]>([]);
	const [dropped, setDropped] = useState<D[]>([]);
	const [minVotes, setMinVotes] = useState<number | null>(null);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [error, setError] = useState<string | null>(null);
	// the list the shown cards belong to
	const shownList = useRef<string | null>(null);

	useEffect(() => {
		if (!url) return;
		const hit = seen.get(url);
		if (hit) {
			setItems(hit.items as T[]);
			setDropped(hit.dropped as D[]);
			setMinVotes(hit.minVotes);
			setTotalPages(hit.totalPages);
			setLoading(false);
			setRefreshing(false);
			setError(null);
			shownList.current = list;
			if (Date.now() - hit.at < FRESH_MS) return;
		} else {
			setLoading(true);
			setRefreshing(shownList.current === list);
			setError(null);
		}
		let alive = true;
		// a page left behind stops loading instead of finishing in the dark
		const abort = new AbortController();
		(async () => {
			try {
				const res = await authFetch(url, { signal: abort.signal });
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const data = await res.json();
				remember(
					url,
					data[key] ?? [],
					data.dropped ?? [],
					data.minVotes ?? null,
					data.totalPages ?? 1,
				);
				if (!alive) return;
				setItems(data[key] ?? []);
				setDropped(data.dropped ?? []);
				setMinVotes(data.minVotes ?? null);
				setTotalPages(data.totalPages ?? 1);
				shownList.current = list;
			} catch (e) {
				// a quiet refresh keeps the copy it had
				if (alive && !hit)
					setError(e instanceof Error ? e.message : "Unknown error");
			} finally {
				if (alive) {
					setLoading(false);
					setRefreshing(false);
				}
			}
		})();
		return () => {
			alive = false;
			abort.abort();
		};
	}, [url, key, list, authFetch]);

	return {
		items,
		dropped,
		minVotes,
		totalPages,
		loading,
		refreshing,
		error,
	};
}

export interface DiscoverFeed<T, D = never> extends DiscoverPage<T, D> {
	heading: ReactNode;
	onPrev: () => void;
	onNext: () => void;
	nextDisabled: boolean;
	page: number;
	setPage: (page: number) => void;
}

export function usePaging(filter: string) {
	const [paging, setPaging] = useState({ filter, page: 1 });
	const page = paging.filter === filter ? paging.page : 1;
	const setPage = (next: number) => setPaging({ filter, page: next });
	return { page, setPage };
}
