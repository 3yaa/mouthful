"use client";
import { useState } from "react";
import { Tv } from "lucide-react";
import type { ShowProps, HollowShowProps } from "@/types/show";
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
import {
	DRAMA_BADGE,
	MONTHS,
	SEASON_LABEL,
	SEASONS,
} from "@/app/views/discover/labels";

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

// a run of months -- one past month, or an upcoming stretch
type Period = { year: number; month: number; months: number; season?: number };

const monthIndexOf = (date: Date) => date.getFullYear() * 12 + date.getMonth();

const periodAt = (index: number, months = 1, season?: number): Period => ({
	year: Math.floor(index / 12),
	month: (index % 12) + 1,
	months,
	season,
});

// the rest of this season, then the next whole one -- tmdb has little dated past that
function upcomingPeriods(now: number): Period[] {
	const seasonEnd = now - (now % 3) + 2;
	const next = seasonEnd + 1;
	return [
		...(seasonEnd > now ? [periodAt(now + 1, seasonEnd - now)] : []),
		periodAt(next, 3, (next % 12) / 3),
	];
}

function periodLabel({ month, months, season }: Period) {
	if (season != null) return SEASON_LABEL[SEASONS[season]];
	const first = MONTHS[month - 1];
	return months > 1 ? `${first} – ${MONTHS[month + months - 2]}` : first;
}

// last month first -- past months one at a time, upcoming ones grouped
export function useMonthlyShows(
	origin: OriginCode,
	pick: DramaPick,
	active: boolean,
): DiscoverFeed<HollowShowProps> {
	// 0 is this month, below it the months before, above it the upcoming runs
	const [at, setAt] = useState(-1);
	const now = monthIndexOf(new Date());
	const upcoming = upcomingPeriods(now);
	const shown = Math.min(at, upcoming.length);
	const period = shown > 0 ? upcoming[shown - 1] : periodAt(now + shown);
	const { year, month, months } = period;

	const country = origin === "drama" && pick !== "all" ? pick : null;
	const { page, setPage } = usePaging(
		`${origin}:${country ?? ""}:${year}-${month}+${months}`,
	);

	const params = new URLSearchParams({
		year: String(year),
		month: String(month),
		page: String(page),
		origin,
		...(months > 1 && { months: String(months) }),
		...(country && { country }),
	});
	const found = useDiscoverPage<HollowShowProps>(
		active ? `/api/shows-api/tmdb-tv-discover?${params}` : null,
		"shows",
		`${origin}:${country ?? ""}`,
	);

	return {
		...found,
		page,
		setPage,
		onPrev: () => setAt(shown - 1),
		onNext: () => setAt(Math.min(shown + 1, upcoming.length)),
		nextDisabled: shown >= upcoming.length,
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
