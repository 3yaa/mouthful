"use client";
import { useState } from "react";
import { Tv } from "lucide-react";
import {
	AnimeDiscoverCard,
	useMinuteClock,
} from "@/app/views/discover/AnimeDiscoverCard";
import {
	DiscoverFrame,
	Segmented,
	SubTabs,
	type DiscoverSort,
} from "@/app/views/discover/DiscoverFrame";
import { useDiscoverLists } from "@/app/views/discover/useDiscoverLists";
import {
	tmdbDroppedGroups,
	type DroppedGroup,
} from "@/app/views/discover/DroppedList";
import {
	DRAMA_PICKS,
	MonthlyShowCard,
	ORIGINS,
	useMonthlyShows,
	type DramaPick,
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
	const [dramaPick, setDramaPick] = useState<DramaPick>("all");
	const [sort, setSort] = useState<DiscoverSort>("popular");
	const monthly = useMonthlyShows(origin, dramaPick, !isAnime, sort);
	const showsDrama = !isAnime && origin === "drama";
	const seasonal = useSeasonalAnime(animeTab, isAnime, sort);
	const now = useMinuteClock(isAnime);
	const lists = useDiscoverLists();

	// anilist has no vote counts -- only whether a work is scored yet
	const dropped: DroppedGroup[] | undefined =
		sort !== "rated"
			? undefined
			: isAnime
				? [
						{
							label: "No score yet",
							icon: Tv,
							rows: seasonal.dropped.map((anime) => ({
								key: String(anime.anilistId),
								title: anime.title,
								posterUrl: anime.posterUrl,
								score: null,
								status: lists.ownedOfAnime(anime)?.status,
								onClick: () => lists.openAnime(anime),
							})),
						},
					]
				: tmdbDroppedGroups(
						monthly.dropped,
						monthly.minVotes,
						Tv,
						(show) => ({
							status: lists.showOfTmdb(show.tmdbId)?.status,
							onClick: () => lists.openShowCard(show),
						}),
					);

	const pickTab = (code: TabCode) => {
		if (code === "anime") return setIsAnime(true);
		setIsAnime(false);
		setOrigin(code);
	};

	return (
		<DiscoverFrame
			home={{ href: "/shows", title: "My Show List", listing: "show" }}
			swap={{
				href: "/movies/discover",
				title: "Discover movies",
				to: "movie",
			}}
			feed={isAnime ? seasonal : monthly}
			sort={{ value: sort, onChange: setSort }}
			dropped={dropped}
			emptyText={
				sort === "rated"
					? isAnime
						? "Nothing scored yet."
						: monthly.minVotes
							? `Nothing with ${monthly.minVotes}+ votes yet.`
							: "Nothing rated yet."
					: isAnime
						? "No anime found."
						: "No shows found."
			}
			controls={
				<>
					<SubTabs
						show={isAnime || showsDrama}
						id={isAnime ? "anime" : "drama"}
					>
						{isAnime ? (
							<Segmented
								options={ANIME_TABS}
								value={animeTab}
								onChange={setAnimeTab}
							/>
						) : (
							<Segmented
								options={DRAMA_PICKS}
								value={dramaPick}
								onChange={setDramaPick}
							/>
						)}
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
							hideBadge={showsDrama && dramaPick !== "all"}
							onClick={() => lists.openShowCard(show)}
						/>
					))}
		</DiscoverFrame>
	);
}
