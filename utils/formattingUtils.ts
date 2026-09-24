import { MediaStatus } from "@/types/media";

// completed date
export const formatDateShort = (value?: string | Date | null): string => {
	if (!value) return "";
	const date = value instanceof Date ? value : new Date(value);
	return date.toLocaleDateString("en-US", {
		day: "numeric",
		month: "numeric",
		year: "2-digit",
	});
};

// anime release year
const AIR_SEASONS = ["Winter", "Spring", "Summer", "Fall"];
export const airSeasonLabel = (startDate?: string | null) => {
	if (!startDate) return null;
	const [y, m] = startDate.split("-");
	const year = Number(y);
	if (!year) return null;
	const month = Number(m);
	if (!month || month < 1 || month > 12) return String(year);
	return `${AIR_SEASONS[Math.floor((month - 1) / 3)]} ${year}`;
};

// bootleg fix for games status -- FIX LATER
const STATUS_LABELS: Partial<Record<MediaStatus, string>> = {
	Playing: "Soon to Finish",
};

// stats bar | listing status filters | status dropdowns
export const statusLabel = (status: string) =>
	STATUS_LABELS[status as MediaStatus] ?? status;
