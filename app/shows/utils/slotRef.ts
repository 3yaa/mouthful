import {
	AnimeSubNodeProps,
	AnimeMovieProps,
	AnimeSideStoryProps,
	ShowProps,
	SourceMediaProps,
	ShowSeasonProps,
	SlotIndex,
	SlotKey,
} from "@/types/show";
import { slotSubtitle, titleCase } from "@/app/shows/utils/animeTitles";

// ─── row key

// same for show | anime pos is season pos, key is anilistId
const pos = (index: number) => index as SlotIndex;
const key = (value: number) => value as SlotKey;

// which of the two a row stores
export const isAnimeRow = (show: Pick<ShowProps, "anilistId">) =>
	show.anilistId != null;

export const FIRST_SLOT = pos(0);
export const slotIndexAt = (index: number): SlotIndex => pos(index);
export const NEW_SLOT_KEY = key(0);

// a rebuilt chain can come back shorter than stored
export const clampToLine = (
	line: ShowSeasonProps[],
	index: number,
): SlotIndex => pos(Math.min(Math.max(index, 0), Math.max(line.length - 1, 0)));

// ─── the shapes each read needs

// spine alone -- plus its refusals, then row's own position
type ChainShow = Pick<ShowProps, "seasons">;
type WatchShow = Pick<ShowProps, "seasons" | "parts">;

type ProgressShow = Pick<
	ShowProps,
	"anilistId" | "seasons" | "curSeasonIndex" | "parts"
>;

// ─── refusals

// runs per listing row on every render
const NONE: ReadonlySet<number> = new Set();

// timelineOf needs this and that needs timelineOf
const hiddenSetOf = (show: Pick<ShowProps, "parts">): ReadonlySet<number> => {
	const parts = show.parts;
	if (!parts) return NONE;
	const out = new Set<number>();
	for (const key in parts) {
		if (parts[key]?.hidden) out.add(Number(key));
	}
	return out.size ? out : NONE;
};

// a continuation cannot be refused
const isRefusable = (extra: Pick<AnimeSubNodeProps, "kind" | "isMainLine">) =>
	extra.kind !== "film" || !extra.isMainLine;

const isRefused = (
	extra: Pick<AnimeSubNodeProps, "kind" | "isMainLine" | "anilistId">,
	hidden: ReadonlySet<number>,
) => isRefusable(extra) && hidden.has(extra.anilistId);

// ─── sides

// parent is stamped on at read time
function extrasOf<T extends AnimeSubNodeProps>(
	show: ChainShow,
	kind: "film" | "sideStory",
): T[] {
	const out: T[] = [];
	for (const slot of show.seasons ?? []) {
		for (const sub of slot.subNodes ?? []) {
			if (sub.kind !== kind) continue;
			out.push({
				...sub,
				parentSlot: slot.number ?? null,
				parentSlotAnilistId: slot.anilistId ?? null,
			} as unknown as T);
		}
	}
	return out;
}

export const moviesOf = (show: ChainShow): AnimeMovieProps[] =>
	extrasOf<AnimeMovieProps>(show, "film");

export const sideStoriesOf = (show: ChainShow): AnimeSideStoryProps[] =>
	extrasOf<AnimeSideStoryProps>(show, "sideStory");

export function orderMoviesOf(show: WatchShow): AnimeMovieProps[] {
	const hidden = hiddenSetOf(show);
	const movies = moviesOf(show);
	return hidden.size
		? movies.filter((movie) => !isRefused(movie, hidden))
		: movies;
}

// where the rail draws them -- under the movie they shipped with
export function movieExtrasOf(
	show: ChainShow,
): Map<number, AnimeSideStoryProps[]> {
	const out = new Map<number, AnimeSideStoryProps[]>();
	for (const extra of sideStoriesOf(show)) {
		if (extra.underMovie == null) continue;
		const list = out.get(extra.underMovie);
		if (list) list.push(extra);
		else out.set(extra.underMovie, [extra]);
	}
	return out;
}

// side movie is refused the same way
export function hiddenExtrasOf(show: WatchShow): AnimeSubNodeProps[] {
	const hidden = hiddenSetOf(show);
	if (!hidden.size) return [];
	const all = [
		...sideStoriesOf(show),
		...moviesOf(show),
	] as AnimeSubNodeProps[];
	return all.filter((extra) => isRefused(extra, hidden));
}

// ─── chain as ids

// what the row owns
export function chainIdsOf(
	show: Pick<ShowProps, "anilistId" | "seasons">,
): number[] {
	const ids: number[] = [];
	const take = (id?: number | null) => {
		if (id != null) ids.push(id);
	};

	take(show.anilistId);
	for (const slot of show.seasons ?? []) {
		take(slot.anilistId);
		for (const variant of slot.variants ?? []) take(variant.anilistId);
		for (const subNode of slot.subNodes ?? []) {
			take(subNode.anilistId);
			for (const variant of subNode.variants ?? [])
				take(variant.anilistId);
		}
	}
	return ids;
}

// mirrors activeAnimeCutIds on the server -- anything sent as `cuts` has to agree with it
export function activeCutsOf(show: Pick<ShowProps, "seasons">): number[] {
	const ids: number[] = [];
	const take = (id?: number | null) => {
		if (id != null) ids.push(id);
	};

	for (const slot of show.seasons ?? []) {
		take(slot.anilistId);
		for (const subNode of slot.subNodes ?? []) {
			if (subNode.kind === "film" && subNode.isMainLine)
				take(subNode.anilistId);
		}
	}
	return ids;
}

// ONLY FOR STUDIO CATALOG
export function droppedOf(show: ChainShow): number[] {
	for (const slot of show.seasons ?? []) {
		if (slot.droppedNodes?.length)
			return slot.droppedNodes.map((node) => node.anilistId);
	}
	return [];
}

//
export function sourceOf(show: ChainShow): SourceMediaProps | null {
	for (const slot of show.seasons ?? []) {
		if (slot.sourceManga) return slot.sourceManga;
	}
	return null;
}

//
export function franchiseRomajiOf(
	show: Pick<ShowProps, "seasons" | "anilistId">,
): string | null {
	const slots = show.seasons ?? [];
	if (show.anilistId != null) {
		const root = slots.find((slot) => slot.anilistId === show.anilistId);
		if (root?.titleRomaji) return root.titleRomaji;
	}
	return slots[0]?.titleRomaji ?? null;
}

// ─── watch order

// id first, number after -- a rebuild can renumber a part but not re-id it -- -1 for none
export function parentIndex(
	slots: ShowSeasonProps[],
	item: Pick<AnimeSubNodeProps, "parentSlot" | "parentSlotAnilistId">,
): SlotIndex {
	return pos(
		slots.findIndex((slot) =>
			item.parentSlotAnilistId != null
				? slot.anilistId === item.parentSlotAnilistId
				: !!item.parentSlot && slot.number === item.parentSlot,
		),
	);
}

// isSide about whether the story runs through it
const asSlot = (item: AnimeSubNodeProps): ShowSeasonProps => ({
	// side sit under main -- null is what the ui reads
	episode_count: item.episode_count ?? 0,
	anilistId: item.anilistId,
	title: item.title,
	number: null,
	format: item.format,
	duration: item.duration,
	startDate: item.startDate,
	posterUrl: item.posterUrl,
	posterColor: item.posterColor,
	// movie is on main when the chain says it is
	isSide: item.kind === "film" ? !item.isMainLine : true,
	isMainLine: item.kind === "film" ? item.isMainLine : false,
	kind: item.kind,
	// cuts
	variants: item.variants,
});

const byRelease = (a: ShowSeasonProps, z: ShowSeasonProps) =>
	(a.startDate ?? "9999").localeCompare(z.startDate ?? "9999");

// watch order as one sequence -- derived on every read
export function timelineOf(show: WatchShow): ShowSeasonProps[] {
	const slots = show.seasons ?? [];
	// a resual leaves
	const hidden = hiddenSetOf(show);
	const all = [
		...sideStoriesOf(show),
		...moviesOf(show),
	] as AnimeSubNodeProps[];
	// mainline movie keeps its place however it is marked
	const sides = hidden.size
		? all.filter((side) => !isRefused(side, hidden))
		: all;
	//
	if (!sides.length) return slots;

	const after = new Map<number, ShowSeasonProps[]>();
	// only a movie's own extra carries one
	const before = new Map<number, ShowSeasonProps[]>();
	const loose: ShowSeasonProps[] = [];

	for (const side of sides) {
		const at = parentIndex(slots, side);
		const slot = asSlot(side);
		if (at === -1) {
			// an unannounced date | parent the last rebuild renumbered away
			loose.push(slot);
			continue;
		}
		const bucket = side.placement === "before" ? before : after;
		const list = bucket.get(at);
		if (list) list.push(slot);
		else bucket.set(at, [slot]);
	}

	const out: ShowSeasonProps[] = [];
	slots.forEach((slot, at) => {
		const leading = before.get(at);
		if (leading) out.push(...leading.sort(byRelease));
		out.push(slot);
		const hanging = after.get(at);
		if (hanging) out.push(...hanging.sort(byRelease));
	});
	return out.concat(loose.sort(byRelease));
}

// ─── slot and where it sit

export const isMovieSlot = (slot?: ShowSeasonProps) => slot?.kind === "film";

export const episodeCountOf = (slot?: ShowSeasonProps): number =>
	slot?.episode_count ?? 0;

// parent where walk starts -- side that aired first come between
export function movieIndex(
	line: ShowSeasonProps[],
	movie: Pick<
		AnimeSubNodeProps,
		"parentSlot" | "parentSlotAnilistId" | "startDate"
	>,
): SlotIndex {
	const at = parentIndex(line, movie);
	if (at === -1) return at;
	let out: SlotIndex = at;
	for (
		let next = at + 1;
		// side only -- movie cannot come after itself and two off one part draw side by side
		next < line.length && line[next].isSide && !isMovieSlot(line[next]);
		next++
	) {
		const when = line[next].startDate;
		if (!when || !movie.startDate || when > movie.startDate) break;
		out = pos(next);
	}
	return out;
}

// where the row is on this chain | -1 when nothing on it accounts for the row
export function findSlotIndex(show: ProgressShow): SlotIndex {
	const line = timelineOf(show);
	if (!isAnimeRow(show)) {
		const at = show.curSeasonIndex ?? 0;
		return pos(at >= 0 && at < line.length ? at : -1);
	}
	return pos(line.findIndex((s) => s.anilistId === show.curSeasonIndex));
}

//
export function slotIndexOf(show: ProgressShow): SlotIndex {
	const at = findSlotIndex(show);
	return at === -1 ? FIRST_SLOT : at;
}

export const slotOf = (show: ProgressShow): ShowSeasonProps | undefined =>
	timelineOf(show)[slotIndexOf(show)];

// emits whichever value the row is keyed on -- so can keep thinking in positions
export function slotRefFor(
	show: Pick<ShowProps, "anilistId" | "seasons" | "parts">,
	index: SlotIndex,
): Partial<ShowProps> {
	if (!isAnimeRow(show)) return { curSeasonIndex: key(index) };
	const id = timelineOf(show)[index]?.anilistId;
	//
	return id == null ? {} : { curSeasonIndex: key(id) };
}

// walks everything on the order, side entries included -- -1 when there is nowhere to go
export function stepWatchIndex(
	line: ShowSeasonProps[],
	from: SlotIndex,
	dir: "left" | "right",
): SlotIndex {
	const move = dir === "left" ? -1 : 1;
	const at = from + move;
	return pos(at >= 0 && at < line.length ? at : -1);
}

// ─── numbered parts

const isNumberedPart = (slot?: ShowSeasonProps) =>
	slot?.number != null || slot?.season_number != null;

// the nth numbered part, 1-based -- -1 when unreachable
export function mainOrdinalIndex(
	line: ShowSeasonProps[],
	ordinal: number,
): SlotIndex {
	let seen = 0;
	for (let at = 0; at < line.length; at++) {
		if (!isNumberedPart(line[at])) continue;
		if (++seen === ordinal) return pos(at);
	}
	return pos(-1);
}

// what a typed season number counts
export const mainCount = (line: ShowSeasonProps[]) =>
	line.reduce((n, slot) => (isNumberedPart(slot) ? n + 1 : n), 0);

// anything unnumbered reports the part it follows
export function mainOrdinalAt(line: ShowSeasonProps[], index: SlotIndex) {
	let seen = 0;
	for (let at = 0; at <= index && at < line.length; at++) {
		if (isNumberedPart(line[at])) seen++;
	}
	return Math.max(1, seen);
}

// ─── what row shows and what it called

//
export function wearsRowPoster(
	show: Pick<ShowProps, "anilistId" | "franchisePoster">,
): boolean {
	if (show.franchisePoster != null) return show.franchisePoster;
	return !isAnimeRow(show);
}

export function slotPoster(
	show: Pick<
		ShowProps,
		| "anilistId"
		| "seasons"
		| "curSeasonIndex"
		| "parts"
		| "franchisePoster"
		| "posterUrl"
	>,
) {
	if (wearsRowPoster(show)) return show.posterUrl ?? null;
	return slotOf(show)?.posterUrl ?? show.posterUrl ?? null;
}

export function slotBadge(line: ShowSeasonProps[], index: SlotIndex): string {
	const slot = line[index];
	if (!slot) return "S1";
	// anime parts carry `number`, tmdb seasons `season_number`
	const number = slot.number ?? slot.season_number;
	if (number == null) return (slot.format ?? "OVA").replace(/_/g, " ");
	return `S${number}`;
}

// the arc name wins where the source names one
export function slotName(
	show: Pick<ShowProps, "title" | "seasons" | "anilistId">,
	slot: ShowSeasonProps | undefined,
	position: SlotIndex,
): string {
	const name = slot?.title;
	const raw = slotSubtitle(name, show.title, franchiseRomajiOf(show));
	const named = raw && titleCase(raw);
	// an unnumbered entry is its title
	if (slot && slot.number == null && slot.season_number == null)
		return named || (name ? titleCase(name) : "Side story");

	// server writes cour as "2-1" for the badge
	const number = String(slot?.number ?? slot?.season_number ?? position + 1);
	const [seasonNo, numberedPart] = number.split("-");
	if (!named)
		return numberedPart
			? `Season ${seasonNo} Part ${numberedPart}`
			: `Season ${number}`;

	// which half
	const titledPart = name?.match(/\bpart\s+(\d+)\b/i)?.[1];
	const part = numberedPart ?? titledPart;
	return part ? `${named} Part ${part}` : named;
}
