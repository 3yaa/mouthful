import { useState } from "react";
import { MONTHS, SEASON_LABEL, SEASONS } from "./labels";

// a run of months -- one past month, or an upcoming stretch
export type Period = {
	year: number;
	month: number;
	months: number;
	season?: number;
};

const monthIndexOf = (date: Date) => date.getFullYear() * 12 + date.getMonth();

const periodAt = (index: number, months = 1, season?: number): Period => ({
	year: Math.floor(index / 12),
	month: (index % 12) + 1,
	months,
	season,
});

// the rest of this season, then whole seasons
function upcomingPeriods(now: number, seasons: number): Period[] {
	const seasonEnd = now - (now % 3) + 2;
	return [
		...(seasonEnd > now ? [periodAt(now + 1, seasonEnd - now)] : []),
		...Array.from({ length: seasons }, (_, i) => {
			const start = seasonEnd + 1 + i * 3;
			return periodAt(start, 3, (start % 12) / 3);
		}),
	];
}

export function periodLabel({ month, months, season }: Period) {
	if (season != null) return SEASON_LABEL[SEASONS[season]];
	const first = MONTHS[month - 1];
	return months > 1 ? `${first} – ${MONTHS[month + months - 2]}` : first;
}

// past months one at a time, upcoming ones grouped -- 0 is this month, openAt counts back from it
export function usePeriods(openAt: number, seasonsAhead: number) {
	const [at, setAt] = useState(openAt);
	const now = monthIndexOf(new Date());
	const upcoming = upcomingPeriods(now, seasonsAhead);
	const shown = Math.min(at, upcoming.length);
	return {
		period: shown > 0 ? upcoming[shown - 1] : periodAt(now + shown),
		onPrev: () => setAt(shown - 1),
		onNext: () => setAt(Math.min(shown + 1, upcoming.length)),
		nextDisabled: shown >= upcoming.length,
	};
}
