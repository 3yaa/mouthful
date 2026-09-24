import { BookProps, BookAPIProps } from "@/types/book";
import { SeriesProps } from "@/types/media";

export function mapBookAPIDatatoBook(
	dataAPI: BookAPIProps,
): Partial<BookProps> {
	return {
		key: dataAPI.key,
		title: dataAPI.title,
		author: dataAPI.author_name?.[0],
		status: "Want to Read",
		datePublished: dataAPI.first_publish_year ?? undefined,
		numPages: dataAPI.num_pages ?? undefined,
		rating: dataAPI.rating ?? undefined,
	};
}

export function pickBookSeries(
	series: BookAPIProps["series"],
	seriesI?: number,
): SeriesProps | null {
	return series?.[seriesI ?? 0] ?? null;
}
