"use client";
import { useEffect, useState } from "react";
import { Clapperboard, Tv } from "lucide-react";
import type { SeasonalAnimeProps } from "@/types/show";
import type { MediaStatus } from "@/types/media";
import { CornerChip, DiscoverCard, ScoreLeaf } from "./DiscoverCard";
import { MONTH_DAY, dateLabel, runtimeLabel } from "./labels";

const DAY_SEC = 24 * 60 * 60;

export function useMinuteClock(active: boolean) {
	const [now, setNow] = useState(() => Date.now() / 1000);
	useEffect(() => {
		if (!active) return;
		const tick = () => setNow(Date.now() / 1000);
		tick();
		const id = setInterval(tick, 60_000);
		return () => clearInterval(id);
	}, [active]);
	return now;
}

// --- strip text

function untilLabel(sec: number) {
	if (sec < 60) return "now";
	if (sec < 3600) return `${Math.floor(sec / 60)}m`;
	if (sec < DAY_SEC) return `${Math.floor(sec / 3600)}h`;
	return `${Math.floor(sec / DAY_SEC)}d`;
}

const weekdayOf = (airingAt: number) =>
	new Date(airingAt * 1000).toLocaleDateString("en-US", {
		weekday: "short",
	});

function sequelLabel(sequel: SeasonalAnimeProps["sequel"]) {
	if (!sequel) return null;
	const parts = [
		sequel.season && `S${sequel.season}`,
		sequel.part && `P${sequel.part}`,
	].filter(Boolean);
	return parts.length ? parts.join(" ") : null;
}

function leadOf(anime: SeasonalAnimeProps, now: number) {
	const next = anime.nextEpisode;
	const isMovie = anime.format === "MOVIE";
	if (isMovie || !next) {
		if (!isMovie && anime.status === "FINISHED" && anime.episodes)
			return `${anime.episodes} eps`;
		return dateLabel(anime.startDate);
	}
	const left = next.airingAt - now;
	// a week out the date says more than a count
	if (left >= 7 * DAY_SEC)
		return new Date(next.airingAt * 1000).toLocaleDateString(
			"en-US",
			MONTH_DAY,
		);
	return (
		<>
			Ep {next.episode}
			<span className="text-zinc-500"> · {untilLabel(left)}</span>
		</>
	);
}

function middleOf(anime: SeasonalAnimeProps) {
	if (anime.format === "MOVIE")
		return anime.duration ? runtimeLabel(anime.duration) : null;
	if (anime.nextEpisode) return weekdayOf(anime.nextEpisode.airingAt);
	return null;
}

export function AnimeDiscoverCard({
	anime,
	now,
	status,
	onClick,
}: {
	anime: SeasonalAnimeProps;
	now: number;
	status?: MediaStatus | null;
	onClick: () => void;
}) {
	const sequel = sequelLabel(anime.sequel);
	return (
		<DiscoverCard
			title={anime.title}
			posterUrl={anime.posterUrl}
			posterColor={anime.posterColor}
			caption={{
				tag: anime.studio && (
					<CornerChip>
						<span className="block max-w-44 truncate">
							{anime.studio}
						</span>
					</CornerChip>
				),
			}}
			badge={sequel && <CornerChip>{sequel}</CornerChip>}
			status={status}
			icon={anime.format === "MOVIE" ? Clapperboard : Tv}
			onClick={onClick}
		>
			<div className="text-zinc-300 font-medium whitespace-nowrap tabular-nums">
				{leadOf(anime, now)}
			</div>
			<div className="text-center text-zinc-300/80 font-medium tracking-wide truncate">
				{middleOf(anime) ?? ""}
			</div>
			<div className="flex justify-end">
				<ScoreLeaf
					score={anime.score != null ? anime.score / 10 : null}
				/>
			</div>
		</DiscoverCard>
	);
}
