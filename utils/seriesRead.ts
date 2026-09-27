import {
	SeriesHopProps,
	SeriesJumpProps,
	SeriesMediaProps,
	SeriesProps,
	SeriesTargetProps,
} from "@/types/media";

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

export function seriesJump(
	row: SeriesMediaProps,
	from: SeriesTargetProps,
	dir: SeriesHopProps["dir"],
): SeriesJumpProps | null {
	const run = row.series;
	const target = dir === "sequel" ? run?.sequel : run?.prequel;
	if (!run || !target) return null;
	return { ...target, hop: { from, run, dir } };
}

// where a neighbour sits
function placesBeside(
	position: string | null,
	dir: SeriesHopProps["dir"],
): string[] {
	const at = position ? Number(position) : NaN;
	if (!Number.isFinite(at)) return [];
	const step = dir === "sequel" ? 1 : -1;
	const whole = step > 0 ? Math.floor(at) + 1 : Math.ceil(at) - 1;
	return [...new Set([whole, at + step / 2])]
		.filter((place) => place >= 0)
		.map(String);
}

export function backfillRuns(
	own: SeriesProps | null | undefined,
	hop: SeriesHopProps,
): SeriesProps[] {
	const facing = hop.dir === "prequel" ? own?.sequel : own?.prequel;
	if (!hop.from.id || facing) return [];
	const run: SeriesProps = {
		title: own?.title ?? hop.run.title,
		position: own?.position ?? null,
		total: own?.total ?? hop.run.total,
		prequel: hop.dir === "sequel" ? hop.from : (own?.prequel ?? null),
		sequel: hop.dir === "prequel" ? hop.from : (own?.sequel ?? null),
	};
	if (run.position) return [run];
	const places = placesBeside(hop.run.position, hop.dir);
	return places.length
		? places.map((position) => ({ ...run, position }))
		: [run];
}
