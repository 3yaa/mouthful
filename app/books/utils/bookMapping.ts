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
		timeSpent: dataAPI.time_spent ?? undefined,
		rating: dataAPI.rating ?? undefined,
	};
}

export function pickBookSeries(
	series: BookAPIProps["series"],
	seriesI?: number,
): SeriesProps | null {
	return series?.[seriesI ?? 0] ?? null;
}

// keep the one a jump came along, else the saved one, else the featured one
export function runIndexOf(
	series: BookAPIProps["series"],
	along: { fromId?: string | null; title?: string | null },
): number {
	if (!series?.length) return 0;
	const linked = along.fromId
		? series.findIndex(
				(run) =>
					run.prequel?.id === along.fromId ||
					run.sequel?.id === along.fromId,
			)
		: -1;
	if (linked !== -1) return linked;
	const named = along.title
		? series.findIndex((run) => run.title === along.title)
		: -1;
	return named !== -1 ? named : 0;
}
