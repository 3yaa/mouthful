import { BaseMediaProps, ColumnConfig } from "./media";

export const DIFF_COLUMNS_GAME: [
	ColumnConfig<GameProps>,
	ColumnConfig<GameProps>,
] = [
	{ label: "Studio", sortKey: "studio", getValue: (g) => g.studio },
	{
		label: "Released",
		sortKey: "dateReleased",
		getValue: (g) => g.dateReleased,
	},
];

export interface GameProps extends BaseMediaProps {
	status: "Playing" | "Completed" | "Dropped";
	igdbId: number;
	studio?: string;
	dateReleased?: number;
	dlcIndex: number;
	mainTitle?: string;
	dlcs?: IGDBInitProps[];
}

export interface IGDBInitProps {
	id?: number;
	name?: string;
}

export interface IGDBProps {
	igdbId: number;
	title: string;
	released_year?: number;
	cover_url?: string;
	developer?: { name: string }[];
	expansions?: IGDBInitProps[];
	screenshot_urls?: { ss_url: string }[];
	logo_url?: string | null;
	logos?: string[];
}

export interface IGDBDlcProps {
	igdbId: number;
	title: string;
	released_year?: number;
	cover_url?: string;
	developer?: { name: string }[];
	screenshot_urls?: { ss_url: string }[];
}
