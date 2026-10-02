"use client";
import { useState } from "react";
import type { AnimeSeason, SeasonalAnimeProps } from "@/types/show";
import {
	usePaging,
	useDiscoverPage,
	type DiscoverFeed,
} from "@/app/views/discover/useDiscoverPage";

const SEASONS: AnimeSeason[] = ["WINTER", "SPRING", "SUMMER", "FALL"];
const SEASON_LABEL: Record<AnimeSeason, string> = {
	WINTER: "Winter",
	SPRING: "Spring",
	SUMMER: "Summer",
	FALL: "Fall",
};
// past a year out anilist barely has a schedule
const MAX_AHEAD = 3;

export const ANIME_TABS = [
	{ label: "new", code: "new" },
	{ label: "ongoing", code: "continuing" },
	{ label: "movies", code: "movies" },
] as const;
export type AnimeTabCode = (typeof ANIME_TABS)[number]["code"];

const seasonIndexOf = (date: Date) =>
	date.getFullYear() * 4 + Math.floor(date.getMonth() / 3);

export function useSeasonalAnime(
	tab: AnimeTabCode,
	active: boolean,
): DiscoverFeed<SeasonalAnimeProps> {
	const [at, setAt] = useState(() => seasonIndexOf(new Date()));
	const { page, setPage } = usePaging(`${tab}:${at}`);
	const year = Math.floor(at / 4);
	const season = SEASONS[at % 4];

	const params = new URLSearchParams({
		season,
		year: String(year),
		tab,
		page: String(page),
	});
	const found = useDiscoverPage<SeasonalAnimeProps>(
		active ? `/api/shows-api/anime-discover?${params}` : null,
		"anime",
	);

	return {
		...found,
		page,
		setPage,
		onPrev: () => setAt((a) => a - 1),
		onNext: () => setAt((a) => a + 1),
		nextDisabled: at >= seasonIndexOf(new Date()) + MAX_AHEAD,
		heading: (
			<>
				{SEASON_LABEL[season]}
				<span className="text-zinc-500 font-medium mx-2">·</span>
				<span className="text-zinc-400 font-medium">{year}</span>
			</>
		),
	};
}
