// poster/backdrop pickers cycle
export const stepArtworkIndex = (
	index: number,
	dir: "next" | "prev",
	total: number,
) => (total < 2 ? index : (index + (dir === "next" ? 1 : total - 1)) % total);

// -- logo

// mean text title
export const clearedFrom = (index: number) => -index - 1;

// cleared or not
export const activeLogoIndex = (index: number) =>
	index < 0 ? -index - 1 : index;

export const isLogoCleared = (index?: number) => (index ?? 0) < 0;

// next/prev from wherever the picker actually sits
export const stepLogoIndex = (
	index: number,
	dir: "next" | "prev",
	total: number,
) => {
	const from = activeLogoIndex(index);
	return dir === "next"
		? (from + 1) % total
		: from === 0
			? total - 1
			: from - 1;
};

// -- reload previews start on the saved art

const fileOf = (url: string) => url.split(/[?#]/)[0].split("/").pop() || url;

// by file name -- the size segment of the url can differ between saves
export const savedArtIndex = (items: string[], saved?: string | null) => {
	if (!saved) return -1;
	const file = fileOf(saved);
	return items.findIndex((url) => fileOf(url) === file);
};

// a saved row without a logo kept the text title
export const savedLogoIndex = (items: string[], saved?: string | null) => {
	if (!items.length) return 0;
	if (!saved) return clearedFrom(0);
	return Math.max(savedArtIndex(items, saved), 0);
};
