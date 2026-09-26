import {
	BaseMediaProps,
	ColumnConfig,
	MediaCoverProps,
	SeriesMediaProps,
	SeriesProps,
} from "./media";

export const DIFF_COLUMNS_MANGA: [
	ColumnConfig<MangaProps>,
	ColumnConfig<MangaProps>,
] = [
	{ label: "Author", sortKey: "author", getValue: (m) => m.author },
	{
		label: "Published",
		sortKey: "datePublished",
		getValue: (m) => m.datePublished,
	},
];

export interface MangaProps extends BaseMediaProps, SeriesMediaProps {
	status: "Reading" | "Want to Read" | "Completed" | "Dropped";
	anilistId: number;
	author: string;
	datePublished: number;
	cover: MediaCoverProps;
	// null while the serial is still running
	chapters: number | null;
	curChapter: number;
	rating: number;
}

export interface MangaAPIProps {
	anilist_id: number;
	title: string;
	author_name: string[];
	first_publish_year: number | null;
	chapters: number | null;
	rating: number | null;
	cover: MediaCoverProps | null;
	series: SeriesProps | null;
}

// lightweight candidate shape for the multi-result picker
export interface MangaSearchResult {
	anilist_id: number;
	title: string;
	author_name: string[];
	first_publish_year: number | null;
	cover_url: string | null;
	isDuplicate: boolean;
}
