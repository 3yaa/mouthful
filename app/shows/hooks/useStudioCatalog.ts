"use client";

import { useCallback, useMemo, useState } from "react";
import type { AuthFetch } from "@/app/auth/hooks/useAuthFetch";
import type { MovieProps } from "@/types/movie";
import type { ShowProps } from "@/types/show";
import { chainIdsOf, droppedOf } from "@/app/shows/utils/slotRef";
import {
	fetchStudioCatalog,
	type StudioCatalog,
	type StudioSort,
	type StudioWork,
} from "@/app/shows/utils/studioCatalog";

export type OwnedWork =
	| { type: "tv"; row: ShowProps }
	| { type: "movie"; row: MovieProps };

interface StudioCatalogConfig {
	authFetch: AuthFetch;
	existingShows: ShowProps[];
	findOwnedMovie: (title: string, year?: number) => MovieProps | undefined;
}

export function useStudioCatalog({
	authFetch,
	existingShows,
	findOwnedMovie,
}: StudioCatalogConfig) {
	// a name means open; the catalog arrives after
	const [name, setName] = useState<string | null>(null);
	const [catalog, setCatalog] = useState<StudioCatalog | null>(null);
	const [loading, setLoading] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [sort, setSortState] = useState<StudioSort>("recent");

	const load = useCallback(
		async (studio: string, order: StudioSort, page: number) => {
			setName(studio);
			// only the first page of a studio clears the panel
			const first = page === 1;
			if (first) setCatalog(null);
			(first ? setLoading : setLoadingMore)(true);
			try {
				const next = await fetchStudioCatalog(studio, authFetch, {
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
		(studio: string) => {
			setSortState("recent");
			load(studio, "recent", 1);
		},
		[load],
	);

	const setSort = useCallback(
		(order: StudioSort) => {
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
	const ownedByAnilistId = useMemo(() => {
		const map = new Map<number, ShowProps>();
		for (const owned of existingShows)
			for (const id of chainIdsOf(owned))
				if (!map.has(id)) map.set(id, owned);
		return map;
	}, [existingShows]);
	//
	const droppedByAnilistId = useMemo(() => {
		const ids = new Set<number>();
		for (const owned of existingShows)
			for (const anilistId of droppedOf(owned)) ids.add(anilistId);
		return ids;
	}, [existingShows]);
	//
	const ownedWork = useCallback(
		(work: StudioWork): OwnedWork | null => {
			const row = ownedByAnilistId.get(work.anilistId);
			if (row) return { type: "tv", row };
			if (work.format !== "MOVIE") return null;
			const year = work.startDate
				? parseInt(work.startDate.slice(0, 4))
				: undefined;
			const movie = findOwnedMovie(work.title ?? "", year);
			return movie ? { type: "movie", row: movie } : null;
		},
		[ownedByAnilistId, findOwnedMovie],
	);
	//
	const isDropped = useCallback(
		(work: StudioWork) => droppedByAnilistId.has(work.anilistId),
		[droppedByAnilistId],
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
		isDropped,
	};
}
