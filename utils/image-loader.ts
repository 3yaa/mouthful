type ImageLoaderProps = { src: string; width: number; quality?: number };

const TMDB_WIDTHS = [45, 92, 154, 185, 300, 342, 500, 780, 1280];

const ANILIST_VARIANTS: Array<[number, string]> = [
	[100, "small"],
	[230, "medium"],
	[460, "large"],
	[Infinity, "extraLarge"],
];

// IGDB presets
const IGDB_PRESETS: Array<[number, string]> = [
	[90, "t_cover_small"],
	[264, "t_cover_big"],
	[540, "t_720p"],
	[810, "t_1080p"],
];

// smallest variant that still covers the requested width, else the largest
const atLeast = (ladder: number[], width: number) =>
	ladder.find((w) => w >= width) ?? ladder[ladder.length - 1];

// only these expose a size
export const isResizable = (src: string) =>
	src.includes("image.tmdb.org")
		? !src.toLowerCase().endsWith(".svg")
		: src.includes("images.igdb.com") || src.includes("s4.anilist.co");

// hosts verified to answer a cross-origin request
export const corsMode = (src: string): "anonymous" | undefined =>
	src.includes("image.tmdb.org") ||
	src.includes("images.igdb.com") ||
	src.includes("s4.anilist.co")
		? "anonymous"
		: undefined;

export default function mouthfulImageLoader({
	src,
	width,
}: ImageLoaderProps): string {
	// public/ assets and any already-relative path are served as authored
	if (src.startsWith("/")) return src;

	if (src.includes("image.tmdb.org")) {
		// svg logos carry no raster size
		if (src.toLowerCase().endsWith(".svg")) return src;
		return src.replace(
			/\/t\/p\/(w\d+|h\d+|original)\//,
			`/t/p/w${atLeast(TMDB_WIDTHS, width)}/`,
		);
	}

	if (src.includes("images.igdb.com")) {
		const preset =
			IGDB_PRESETS.find(([w]) => w >= width) ??
			IGDB_PRESETS[IGDB_PRESETS.length - 1];
		return src.replace(/\/t_[a-z0-9_]+\//, `/${preset[1]}/`);
	}

	if (src.includes("s4.anilist.co")) {
		const at = src.match(/\/cover\/(small|medium|large|extraLarge)\//);
		if (!at) return src;
		const ceiling = ANILIST_VARIANTS.findIndex(([, s]) => s === at[1]);
		const wanted = ANILIST_VARIANTS.findIndex(([w]) => w >= width);
		const [, size] =
			ANILIST_VARIANTS[
				Math.min(
					wanted === -1 ? ANILIST_VARIANTS.length - 1 : wanted,
					ceiling === -1 ? ANILIST_VARIANTS.length - 1 : ceiling,
				)
			];
		return src.replace(at[0], `/cover/${size}/`);
	}
	// hardcover, google books and steamgriddb expose no size api -- pass through
	return src;
}
