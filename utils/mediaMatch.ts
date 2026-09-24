type NamedRow = {
	title?: string | null;
	series?: { title?: string | null } | null;
};

export const normName = (t?: string | null) =>
	(t ?? "")
		.toLowerCase()
		.trim()
		.replace(/^(the|a|an)\s+/, "")
		.replace(/[^a-z0-9]+/g, "");

// the same thing with the words left standing
const normWords = (t?: string | null) =>
	(t ?? "")
		.toLowerCase()
		.trim()
		.replace(/^(the|a|an)\s+/, "")
		.replace(/[^a-z0-9]+/g, " ")
		.trim();

const holdsWords = (haystack: string, needle: string) =>
	` ${haystack} `.includes(` ${needle} `);

// normalized title match | they do once the row's franchise is read
const isNamedExactly = (row: NamedRow, want: string) => {
	const title = normName(row.title);
	if (!title) return false;
	if (title === want) return true;
	const series = row.series?.title;
	return !!series && normName(`${series} ${row.title}`) === want;
};

// exact - normalized titles match
// split - franchise on its series, so the two halves together are the names everything else uses
// longer form - one name conatins the other
export function isSameName(row: NamedRow, wanted: string): boolean {
	const want = normName(wanted);
	const title = normName(row.title);
	if (!want || !title) return false;
	if (isNamedExactly(row, want)) return true;
	if (title.length <= 5) return false;
	const wantWords = normWords(wanted);
	const titleWords = normWords(row.title);
	return (
		holdsWords(wantWords, titleWords) || holdsWords(titleWords, wantWords)
	);
}

export function findOnlyNamed<T extends NamedRow>(
	rows: T[],
	wanted: string,
): T | null {
	const want = normName(wanted);
	if (!want) return null;
	let only: T | null = null;
	for (const row of rows) {
		if (!isNamedExactly(row, want)) continue;
		if (only) return null;
		only = row;
	}
	return only;
}

// legacy
export const isRealTmdbId = (tmdbId?: string) => !!tmdbId && tmdbId !== "-1";
