import { BaseMediaProps } from "@/types/media";
import { MovieProps } from "@/types/movie";
import { ShowProps, ShowSeasonProps } from "@/types/show";
import { BookProps } from "@/types/book";
import { ChapterLength, MangaProps } from "@/types/manga";
import { GameProps } from "@/types/game";
import {
	episodeCountOf,
	isMovieSlot,
	isOpenEnded,
	slotIndexOf,
	timelineOf,
} from "@/app/shows/utils/slotRef";

// ~15 seconds a page -- a ~12 page gag chapter, a ~20 page weekly, a ~40 page monthly
export const CHAPTER_MINUTES: Record<ChapterLength, number> = {
	short: 3,
	medium: 5,
	long: 10,
};

export type TimeSpent = {
	spent: number | null;
	total: number | null;
	estimate: boolean;
};

const NOT_STARTED = new Set(["Want to Watch", "Want to Read"]);

// whole or nothing
const wholeRun = (
	item: BaseMediaProps,
	total: number | null,
	estimate: boolean,
): TimeSpent => ({
	spent: item.status === "Completed" ? total : null,
	total,
	estimate,
});

function showTime(show: ShowProps): TimeSpent {
	const line = timelineOf(show);
	const main = line.filter((slot) => !slot.isSide);
	// a season tmdb has no runtime for borrows the show's usual episode
	const usual =
		main.find((slot) => !isMovieSlot(slot) && slot.duration)?.duration ?? 0;
	const minutesOf = (slot: ShowSeasonProps, episodes: number) =>
		isMovieSlot(slot)
			? (slot.duration ?? 0) * (slot.episode_count || 1)
			: (slot.duration || usual) * episodes;
	const known = main.every(
		(slot) => slot.duration || (!isMovieSlot(slot) && usual),
	);
	const whole = (slot: ShowSeasonProps) =>
		minutesOf(slot, episodeCountOf(slot));
	// a side with no episodes out yet adds nothing, rather than unknowing the whole run
	const total =
		known && !main.some(isOpenEnded)
			? line.reduce((sum, slot) => sum + whole(slot), 0)
			: null;
	if (NOT_STARTED.has(show.status) || !known)
		return { spent: null, total, estimate: false };
	if (show.status === "Completed" && total != null)
		return { spent: total, total, estimate: false };

	const at = slotIndexOf(show);
	const curEp = show.curEpisode ?? 0;
	let spent = line.slice(0, at).reduce((sum, slot) => sum + whole(slot), 0);
	const on = line[at];
	// a film is all or nothing, as on the progress bar
	if (on)
		spent += isMovieSlot(on)
			? curEp >= Math.max(1, episodeCountOf(on))
				? whole(on)
				: 0
			: minutesOf(on, curEp);
	// finished while it still airs
	return {
		spent,
		total: show.status === "Completed" ? spent : total,
		estimate: false,
	};
}

export function timeSpentOf(
	mediaType: string,
	item: BaseMediaProps,
): TimeSpent {
	switch (mediaType) {
		case "movie":
			return wholeRun(item, (item as MovieProps).runtime ?? null, false);
		case "show":
			return showTime(item as unknown as ShowProps);
		case "book":
			// the server settled it -- an audiobook, the pages, or a hand-set time
			return wholeRun(
				item,
				(item as unknown as BookProps).timeSpent ?? null,
				false,
			);
		case "manga": {
			const manga = item as unknown as MangaProps;
			const perChapter = CHAPTER_MINUTES[manga.chapterLength ?? "medium"];
			// a running serial has no end to count to
			const total = manga.chapters ? manga.chapters * perChapter : null;
			const read = (manga.curChapter ?? 0) * perChapter;
			// caught up on a running serial still reads as one figure
			const done = manga.status === "Completed" ? (total ?? read) : null;
			return {
				spent: NOT_STARTED.has(manga.status) ? null : (done ?? read),
				total: done ?? total,
				estimate: true,
			};
		}
		case "game":
			// igdb's estimate until it is set by hand
			return wholeRun(
				item,
				(item as unknown as GameProps).timeToBeat ?? null,
				false,
			);
		default:
			return { spent: null, total: null, estimate: false };
	}
}

// "2h 49m" -- hours and minutes, however long it runs
export function formatMinutes(minutes: number): string {
	const rounded = Math.round(minutes);
	if (rounded < 60) return `${rounded}m`;
	const hours = Math.floor(rounded / 60);
	const rest = rounded % 60;
	return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function parseMinutes(text: string): number | null {
	const raw = text.trim().toLowerCase();
	if (!raw) return null;
	const clock = raw.match(/^(\d+):([0-5]\d)$/);
	if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
	if (/^\d+(\.\d+)?$/.test(raw)) return Math.round(Number(raw) * 60) || null;
	// the m may drop after hours -- "15h30"
	const parts = raw.match(
		/^(?:(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?)?\s*(?:(\d+)\s*(?:m(?:in(?:utes?|s)?)?)?)?$/,
	);
	if (!parts || (parts[1] == null && parts[2] == null)) return null;
	const minutes = Math.round(
		Number(parts[1] ?? 0) * 60 + Number(parts[2] ?? 0),
	);
	return minutes > 0 ? minutes : null;
}

export function timeLine({
	spent,
	total,
	estimate,
}: TimeSpent): { figure: string; of?: string } | null {
	const approx = estimate ? "~" : "";
	if (spent && (total == null || spent < total))
		return {
			figure: `${approx}${formatMinutes(spent)}`,
			of: total == null ? "???" : formatMinutes(total),
		};
	const shown = total ?? spent;
	return shown ? { figure: `${approx}${formatMinutes(shown)}` } : null;
}
