"use client";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useAuthFetch } from "@/app/auth/hooks/useAuthFetch";

export interface DiscoverPage<T> {
	items: T[];
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
	{ items: unknown[]; totalPages: number; at: number }
>();

function remember(url: string, items: unknown[], totalPages: number) {
	seen.delete(url);
	seen.set(url, { items, totalPages, at: Date.now() });
	if (seen.size > SEEN_MAX) seen.delete(seen.keys().next().value!);
}

// list names what the url pages through -- another page of it keeps the old cards up
export function useDiscoverPage<T>(
	url: string | null,
	key: string,
	list: string,
): DiscoverPage<T> {
	const { authFetch } = useAuthFetch();
	const [items, setItems] = useState<T[]>([]);
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
				remember(url, data[key] ?? [], data.totalPages ?? 1);
				if (!alive) return;
				setItems(data[key] ?? []);
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

	return { items, totalPages, loading, refreshing, error };
}

export interface DiscoverFeed<T> extends DiscoverPage<T> {
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
