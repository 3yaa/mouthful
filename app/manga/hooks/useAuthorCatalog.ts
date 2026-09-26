"use client";

import { useCallback, useMemo, useState } from "react";
import type { AuthFetch } from "@/app/auth/hooks/useAuthFetch";
import type { MangaProps } from "@/types/manga";
import {
	fetchAuthorCatalog,
	type AuthorCatalog,
	type AuthorSort,
	type AuthorWork,
} from "@/app/manga/utils/authorCatalog";

interface AuthorCatalogConfig {
	authFetch: AuthFetch;
	existingManga: MangaProps[];
}

export function useAuthorCatalog({
	authFetch,
	existingManga,
}: AuthorCatalogConfig) {
	// a name means open; the catalog arrives after
	const [name, setName] = useState<string | null>(null);
	const [catalog, setCatalog] = useState<AuthorCatalog | null>(null);
	const [loading, setLoading] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [sort, setSortState] = useState<AuthorSort>("popular");

	const load = useCallback(
		async (author: string, order: AuthorSort, page: number) => {
			setName(author);
			// only the first page of an author clears the panel
			const first = page === 1;
			if (first) setCatalog(null);
			(first ? setLoading : setLoadingMore)(true);
			try {
				const next = await fetchAuthorCatalog(author, authFetch, {
					page,
					sort: order,
				});
				if (next) setCatalog(next);
			} catch {
				if (first) setCatalog(null);
			} finally {
				(first ? setLoading : setLoadingMore)(false);
			}
		},
		[authFetch],
	);

	const open = useCallback(
		(author: string) => {
			setSortState("popular");
			load(author, "popular", 1);
		},
		[load],
	);

	const setSort = useCallback(
		(order: AuthorSort) => {
			setSortState(order);
			if (name) load(name, order, 1);
		},
		[name, load],
	);

	const setPage = useCallback(
		(page: number) => {
			if (name && page > 0) load(name, sort, page);
		},
		[name, sort, load],
	);

	const close = useCallback(() => setName(null), []);

	//
	const ownedByAnilistId = useMemo(
		() => new Map(existingManga.map((owned) => [owned.anilistId, owned])),
		[existingManga],
	);
	//
	const ownedWork = useCallback(
		(work: AuthorWork) => ownedByAnilistId.get(work.anilistId) ?? null,
		[ownedByAnilistId],
	);

	return {
		name,
		catalog,
		loading,
		loadingMore,
		sort,
		open,
		setSort,
		setPage,
		close,
		ownedWork,
	};
}
