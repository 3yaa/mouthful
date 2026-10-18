import type { AnimeSeason } from "@/types/show";

export const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
] as const;

export const SEASONS: AnimeSeason[] = ["WINTER", "SPRING", "SUMMER", "FALL"];
export const SEASON_LABEL: Record<AnimeSeason, string> = {
	WINTER: "Winter",
	SPRING: "Spring",
	SUMMER: "Summer",
	FALL: "Fall",
};

// corner badge for the drama countries
export const DRAMA_BADGE: Record<string, string> = {
	KR: "K",
	CN: "C",
	JP: "J",
};

export const MONTH_DAY: Intl.DateTimeFormatOptions = {
	month: "short",
	day: "numeric",
};

// the year only shows once it is not this one
export function dateLabel(date: string | null) {
	if (!date) return "TBA";
	const [year, month, day] = date.split("-").map(Number);
	if (!month) return String(year);
	const at = new Date(year, month - 1, day || 1);
	return day && year === new Date().getFullYear()
		? at.toLocaleDateString("en-US", MONTH_DAY)
		: at.toLocaleDateString("en-US", {
				month: "short",
				year: "numeric",
			});
}

export function runtimeLabel(minutes: number) {
	const hours = Math.floor(minutes / 60);
	return hours ? `${hours}h ${minutes % 60}m` : `${minutes}m`;
}
