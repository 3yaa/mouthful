import {
	BaseMediaProps,
	ColumnConfig,
	MediaCoverProps,
	SeriesMediaProps,
	SeriesProps,
} from "./media";

export const DIFF_COLUMNS_BOOK: [
	ColumnConfig<BookProps>,
	ColumnConfig<BookProps>,
] = [
	{ label: "Author", sortKey: "author", getValue: (b) => b.author },
	{
		label: "Published",
		sortKey: "datePublished",
		getValue: (b) => b.datePublished,
	},
];

export interface BookProps extends BaseMediaProps, SeriesMediaProps {
	status: "Completed" | "Want to Read" | "Dropped";
	key: string;
	author: string;
	datePublished: number;
	cover: MediaCoverProps;
	numPages: number;
	rating: number;
}

export interface BookAPIProps {
	key: string;
	title: string;
	subtitle: string | null;
	author_name: string[];
	first_publish_year: number | null;
	num_pages: number | null;
	rating: number | null;
	covers: MediaCoverProps[];
	series: SeriesProps[];
}

// lightweight candidate shape for the multi-result picker
export interface BookSearchResult {
	key: string;
	title: string;
	author_name: string[];
	first_publish_year: number | null;
	cover_url: string | null;
	isDuplicate: boolean;
}
