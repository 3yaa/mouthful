"use client";
import { useState } from "react";
import { Tv } from "lucide-react";
import type { ShowProps, HollowShowProps } from "@/types/show";
import {
	CornerChip,
	DiscoverCard,
	ScoreLeaf,
} from "@/app/views/discover/DiscoverCard";
import {
	usePaging,
	useDiscoverPage,
	type DiscoverFeed,
} from "@/app/views/discover/useDiscoverPage";
import { MONTHS } from "@/app/views/discover/labels";

// "all" leaves the dramas out -- they have their own tab
export const ORIGINS = [
	{ label: "drama", code: "drama" },
	{ label: "all", code: "rest" },
] as const;
export type OriginCode = (typeof ORIGINS)[number]["code"];

const DRAMA_BADGE: Record<string, string> = { KR: "K", CN: "C" };

function getCurrentMonth(): { year: number; month: number } {
	const now = new Date();
	return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

function isFutureMonth(year: number, month: number): boolean {
	const cur = getCurrentMonth();
	return year > cur.year || (year === cur.year && month > cur.month);
}

// last month first
export function useMonthlyShows(
	origin: OriginCode,
	active: boolean,
): DiscoverFeed<HollowShowProps> {
	const [{ year, month }, setPeriod] = useState(() => {
		const { year, month } = getCurrentMonth();
		return month === 1
			? { year: year - 1, month: 12 }
			: { year, month: month - 1 };
	});
	const { page, setPage } = usePaging(`${origin}:${year}-${month}`);
	const isFuture = isFutureMonth(year, month);

	const params = new URLSearchParams({
		year: String(year),
		month: String(month),
		page: String(page),
		origin,
	});
	const found = useDiscoverPage<HollowShowProps>(
		active ? `/api/shows-api/tmdb-tv-discover?${params}` : null,
		"shows",
	);

	const step = (by: number) =>
		setPeriod(({ year, month }) => {
			const at = year * 12 + month - 1 + by;
			return { year: Math.floor(at / 12), month: (at % 12) + 1 };
		});

	return {
		...found,
		page,
		setPage,
		onPrev: () => step(-1),
		onNext: () => step(1),
		nextDisabled: isFuture,
		heading: isFuture ? (
			<>
				{year}{" "}
				<span className="text-zinc-500 font-medium">+ ended</span>
			</>
		) : (
			<>
				{MONTHS[month - 1]}
				<span className="text-zinc-500 font-medium mx-2">·</span>
				<span className="text-zinc-400 font-medium">{year}</span>
			</>
		),
	};
}

export function MonthlyShowCard({
	show,
	owned,
	onClick,
}: {
	show: HollowShowProps;
	owned?: ShowProps;
	onClick: () => void;
}) {
	const badge = show.originCountry?.map((c) => DRAMA_BADGE[c]).find(Boolean);
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
				{show.airDays?.replaceAll(" & ", "/") ?? ""}
			</div>
			<div className="flex justify-end">
				<ScoreLeaf score={show.imdbRating} />
			</div>
		</DiscoverCard>
	);
}
