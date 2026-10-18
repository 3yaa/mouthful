"use client";
import { useMemo } from "react";
import { type AuthFetch, useAuthFetch } from "@/app/auth/hooks/useAuthFetch";
import { isAnimeRow, slotOf } from "@/app/shows/utils/slotRef";
import type { MovieProps } from "@/types/movie";
import type { ShowProps } from "@/types/show";

export interface TrailerHandle {
	prime: () => void;
	open: () => void;
}

type TrailerTarget = { path: string | null; search: string };

const searchUrl = (query: string) =>
	`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

function targetOf(mediaType: string, item: unknown): TrailerTarget | null {
	if (mediaType === "movie") {
		const movie = item as MovieProps;
		return {
			path: movie.tmdbId
				? `/api/movies-api/trailer?tmdbId=${movie.tmdbId}`
				: null,
			search: [movie.title, movie.dateReleased, "trailer"]
				.filter(Boolean)
				.join(" "),
		};
	}
	if (mediaType !== "show") return null;
	const show = item as ShowProps;
	// the node or season
	const slot = slotOf(show);
	if (isAnimeRow(show) && slot?.anilistId) {
		return {
			path: `/api/shows-api/trailer?anilistId=${slot.anilistId}`,
			search: `${slot.title ?? slot.titleRomaji ?? show.title} trailer`,
		};
	}
	const season = slot?.season_number;
	return {
		path: show.tmdbId
			? `/api/shows-api/trailer?tmdbId=${show.tmdbId}` +
				(season != null ? `&season=${season}` : "")
			: null,
		search: [
			show.title,
			season && season > 1 && `season ${season}`,
			"trailer",
		]
			.filter(Boolean)
			.join(" "),
	};
}

// answers last the session -- a failed lookup is retried next time
const settled = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

function lookup({ path, search }: TrailerTarget, authFetch: AuthFetch) {
	if (!path) return Promise.resolve(searchUrl(search));
	const known = settled.get(path);
	if (known) return Promise.resolve(known);

	let call = inflight.get(path);
	if (!call) {
		call = authFetch(path)
			.then(async (res) => {
				if (!res.ok) throw new Error(`trailer lookup ${res.status}`);
				const data = await res.json();
				const url: string = data.url ?? searchUrl(search);
				settled.set(path, url);
				return url;
			})
			.catch(() => searchUrl(search))
			.finally(() => inflight.delete(path));
		inflight.set(path, call);
	}
	return call;
}

const openTab = (url: string) =>
	window.open(url, "_blank", "noopener,noreferrer");

// movies and shows only
export function useTrailer(
	mediaType: string,
	item: unknown,
): TrailerHandle | undefined {
	const { authFetch } = useAuthFetch();
	const target = targetOf(mediaType, item);
	const path = target?.path ?? null;
	const search = target?.search;

	return useMemo(() => {
		if (search == null) return undefined;
		const target = { path, search };
		return {
			prime: () => void lookup(target, authFetch),
			open: () => {
				const known = path ? settled.get(path) : searchUrl(search);
				if (known) return void openTab(known);
				// a tab opened after the await is blocked as a popup
				const tab = window.open("", "_blank");
				if (tab) tab.opener = null;
				lookup(target, authFetch).then((url) => {
					if (!tab) openTab(url);
					else if (!tab.closed) tab.location.href = url;
				});
			},
		};
	}, [path, search, authFetch]);
}
