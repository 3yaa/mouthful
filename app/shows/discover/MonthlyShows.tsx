"use client";
import { Tv } from "lucide-react";
import type { ShowProps, HollowShowProps } from "@/types/show";
import type { DroppedTitle } from "@/types/media";
import {
	CornerChip,
	DiscoverCard,
	FitLabel,
	ScoreLeaf,
} from "@/app/views/discover/DiscoverCard";
import {
	usePaging,
	useDiscoverPage,
	type DiscoverFeed,
} from "@/app/views/discover/useDiscoverPage";
import { DRAMA_BADGE } from "@/app/views/discover/labels";
import { periodLabel, usePeriods } from "@/app/views/discover/periods";
import type { DiscoverSort } from "@/app/views/discover/DiscoverFrame";

// "all" leaves the dramas out -- they have their own tab
export const ORIGINS = [
	{ label: "drama", code: "drama" },
	{ label: "all", code: "rest" },
] as const;
export type OriginCode = (typeof ORIGINS)[number]["code"];

// drama narrowed to one country
export const DRAMA_PICKS = [
	{ label: "all", code: "all" },
	{ label: "kr", code: "KR" },
	{ label: "cn", code: "CN" },
	{ label: "jp", code: "JP" },
] as const;
export type DramaPick = (typeof DRAMA_PICKS)[number]["code"];

const WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// week order, but a pair across the weekend keeps its run (Sun/Mon)
function airDayLabels(airDays: string | null) {
	const days = (airDays?.split(" & ") ?? []).sort(
		(a, b) => WEEK.indexOf(a) - WEEK.indexOf(b),
	);
	const gap = WEEK.indexOf(days[1]) - WEEK.indexOf(days[0]);
	if (days.length === 2 && gap > 3) days.reverse();
	return {
		full: days.join("/"),
		short: days.map((day) => day.slice(0, 2)).join("/"),
	};
}

// tmdb has little dated tv past the next season
const SEASONS_AHEAD = 1;

// last month first -- past months one at a time, upcoming ones grouped
export function useMonthlyShows(
	origin: OriginCode,
	pick: DramaPick,
	active: boolean,
	sort: DiscoverSort,
): DiscoverFeed<HollowShowProps, DroppedTitle> {
	// opens on last month
	const { period, onPrev, onNext, nextDisabled } = usePeriods(
		-1,
		SEASONS_AHEAD,
	);
	const { year, month, months } = period;

	const country = origin === "drama" && pick !== "all" ? pick : null;
	const { page, setPage } = usePaging(
		`${origin}:${country ?? ""}:${sort}:${year}-${month}+${months}`,
	);

	const params = new URLSearchParams({
		year: String(year),
		month: String(month),
		page: String(page),
		origin,
		...(months > 1 && { months: String(months) }),
		...(country && { country }),
		...(sort === "rated" && { sort }),
	});
	const found = useDiscoverPage<HollowShowProps, DroppedTitle>(
		active ? `/api/shows-api/tmdb-tv-discover?${params}` : null,
		"shows",
		`${origin}:${country ?? ""}`,
	);

	return {
		...found,
		page,
		setPage,
		onPrev,
		onNext,
		nextDisabled,
		heading: (
			<>
				{periodLabel(period)}
				<span className="text-zinc-500 font-medium mx-2">·</span>
				<span className="text-zinc-400 font-medium">{year}</span>
			</>
		),
	};
}

export function MonthlyShowCard({
	show,
	owned,
	hideBadge,
	onClick,
}: {
	show: HollowShowProps;
	owned?: ShowProps;
	// a one-country pick already says it
	hideBadge?: boolean;
	onClick: () => void;
}) {
	const badge =
		!hideBadge &&
		show.originCountry?.map((c) => DRAMA_BADGE[c]).find(Boolean);
	const days = airDayLabels(show.airDays);
	return (
		<DiscoverCard
			title={show.title}
			posterUrl={show.poster_url}
			badge={badge && <CornerChip>{badge}</CornerChip>}
			status={owned?.status}
			icon={Tv}
			onClick={onClick}
		>
			<div className="text-zinc-300 font-medium whitespace-nowrap">
				{show.currentEp != null ? (
					<span className="tabular-nums">
						Ep {show.currentEp}
						{show.totalEp != null && (
							<span className="text-zinc-500">
								{" "}
								/ {show.totalEp}
							</span>
						)}
					</span>
				) : show.first_air_date ? (
					new Date(
						show.first_air_date + "T00:00:00",
					).toLocaleDateString("en-US", {
						month: "short",
						day: "numeric",
					})
				) : (
					<span className="text-zinc-500 italic">no info</span>
				)}
			</div>
			<div className="text-center text-zinc-300/80 font-medium tracking-wide truncate">
				<FitLabel full={days.full} short={days.short} />
			</div>
			<div className="flex justify-end">
				<ScoreLeaf score={show.imdbRating} />
			</div>
		</DiscoverCard>
	);
}
