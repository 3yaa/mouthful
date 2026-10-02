"use client";
import { useState } from "react";
import {
	AnimeDiscoverCard,
	useMinuteClock,
} from "@/app/views/discover/AnimeDiscoverCard";
import {
	DiscoverFrame,
	Segmented,
	SubTabs,
} from "@/app/views/discover/DiscoverFrame";
import { useDiscoverLists } from "@/app/views/discover/useDiscoverLists";
import {
	MonthlyShowCard,
	ORIGINS,
	useMonthlyShows,
	type OriginCode,
} from "./MonthlyShows";
import {
	ANIME_TABS,
	useSeasonalAnime,
	type AnimeTabCode,
} from "./SeasonalAnime";

// same order as the movies discover
const TABS = [{ label: "anime", code: "anime" }, ...ORIGINS] as const;
type TabCode = (typeof TABS)[number]["code"];

export function DiscoverShows() {
	const [origin, setOrigin] = useState<OriginCode>("drama");
	const [isAnime, setIsAnime] = useState(false);
	const [animeTab, setAnimeTab] = useState<AnimeTabCode>("new");
	const monthly = useMonthlyShows(origin, !isAnime);
	const seasonal = useSeasonalAnime(animeTab, isAnime);
	const now = useMinuteClock(isAnime);
	const lists = useDiscoverLists();

	const pickTab = (code: TabCode) => {
		if (code === "anime") return setIsAnime(true);
		setIsAnime(false);
		setOrigin(code);
	};

	return (
		<DiscoverFrame
			home={{ href: "/shows", title: "My Show List", listing: "show" }}
			feed={isAnime ? seasonal : monthly}
			emptyText={isAnime ? "No anime found." : "No shows found."}
			controls={
				<>
					<SubTabs show={isAnime}>
						<Segmented
							options={ANIME_TABS}
							value={animeTab}
							onChange={setAnimeTab}
						/>
					</SubTabs>
					<Segmented
						options={TABS}
						value={isAnime ? "anime" : origin}
						onChange={pickTab}
					/>
				</>
			}
			overlays={lists.modals}
		>
			{isAnime
				? seasonal.items.map((anime) => (
						<AnimeDiscoverCard
							key={anime.anilistId}
							anime={anime}
							now={now}
							status={lists.ownedOfAnime(anime)?.status}
							onClick={() => lists.openAnime(anime)}
						/>
					))
				: monthly.items.map((show) => (
						<MonthlyShowCard
							key={show.tmdbId}
							show={show}
							owned={lists.showOfTmdb(show.tmdbId)}
							onClick={() => lists.openShowCard(show)}
						/>
					))}
		</DiscoverFrame>
	);
}
