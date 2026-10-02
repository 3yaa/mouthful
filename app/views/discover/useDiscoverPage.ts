"use client";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useAuthFetch } from "@/app/auth/hooks/useAuthFetch";

export interface DiscoverPage<T> {
	items: T[];
	totalPages: number;
	loading: boolean;
	error: string | null;
}

export function useDiscoverPage<T>(
	url: string | null,
	key: string,
): DiscoverPage<T> {
	const { authFetch } = useAuthFetch();
	const [items, setItems] = useState<T[]>([]);
	const [totalPages, setTotalPages] = useState(1);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!url) return;
		let alive = true;
		// a page left behind stops loading instead of finishing in the dark
		const abort = new AbortController();
		setLoading(true);
		setError(null);
		(async () => {
			try {
				const res = await authFetch(url, { signal: abort.signal });
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const data = await res.json();
				if (!alive) return;
				setItems(data[key] ?? []);
				setTotalPages(data.totalPages ?? 1);
			} catch (e) {
				if (alive)
					setError(e instanceof Error ? e.message : "Unknown error");
			} finally {
				if (alive) setLoading(false);
			}
		})();
		return () => {
			alive = false;
			abort.abort();
		};
	}, [url, key, authFetch]);

	return { items, totalPages, loading, error };
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
