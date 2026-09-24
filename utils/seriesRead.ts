import { SeriesMediaProps, SeriesTargetProps } from "@/types/media";

export const seriesTitleOf = (row: SeriesMediaProps): string | null =>
	row.series?.title ?? null;

export function seriesNeighbours(row: SeriesMediaProps): {
	prev: SeriesTargetProps | null;
	next: SeriesTargetProps | null;
} {
	return {
		prev: row.series?.prequel ?? null,
		next: row.series?.sequel ?? null,
	};
}

// how the place reads: "3/7", or bare when the source gave no length
export function seriesPlace(row: SeriesMediaProps): string | null {
	const where = row.series?.position;
	if (!where) return null;
	const total = row.series?.total;
	return total ? `${where}/${total}` : where;
}

// anything to show at all -- a name, a place, or somewhere to step
export const hasSeries = (row: SeriesMediaProps): boolean =>
	!!row.series?.title ||
	!!row.series?.position ||
	!!row.series?.prequel ||
	!!row.series?.sequel;
