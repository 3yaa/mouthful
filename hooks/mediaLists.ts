import type { MediaDataConfig } from "./useMediaData";
import type { MovieProps } from "@/types/movie";
import type { ShowProps } from "@/types/show";
import type { BookProps } from "@/types/book";
import type { MangaProps } from "@/types/manga";
import type { GameProps } from "@/types/game";

// one config per list -- every hub that loads another's list must agree with its owner
export const MOVIE_LIST: MediaDataConfig<MovieProps> = {
	endpoint: "movies",
	requiredFieldsToPost: ["title", "status", "imdbId"],
	statusOrder: { "Want to Watch": 0, Completed: 1, Dropped: 2 },
	extraFieldsToUpdate: ["series"],
};

export const SHOW_LIST: MediaDataConfig<ShowProps> = {
	endpoint: "shows",
	requiredFieldsToPost: ["title", "status", "tmdbId"],
	statusOrder: {
		Watching: 0,
		"Want to Watch": 1,
		Completed: 2,
		"On Hold": 3,
		Dropped: 4,
	},
	extraFieldsToUpdate: ["curSeasonIndex", "curEpisode", "franchisePoster"],
	// an anime row's score is its parts' rollup
	mergeUpdate: (show, updates) =>
		updates.score === null && show.parts
			? {
					...show,
					...updates,
					parts: Object.fromEntries(
						Object.entries(show.parts).map(([id, mark]) => [
							id,
							{ ...mark, score: null },
						]),
					),
				}
			: { ...show, ...updates },
	//
	reconcileUpdate: (saved, current, sent) =>
		"score" in sent
			? { ...current, score: saved.score, parts: saved.parts }
			: current,
};

export const BOOK_LIST: MediaDataConfig<BookProps> = {
	endpoint: "books",
	requiredFieldsToPost: ["title", "status", "key"],
	statusOrder: {
		Reading: 0,
		"Want to Read": 1,
		Completed: 2,
		Dropped: 3,
	},
	extraFieldsToUpdate: ["series"],
};

export const MANGA_LIST: MediaDataConfig<MangaProps> = {
	endpoint: "manga",
	requiredFieldsToPost: ["title", "status", "anilistId"],
	statusOrder: {
		Reading: 0,
		"Want to Read": 1,
		Completed: 2,
		Dropped: 3,
	},
	extraFieldsToUpdate: ["series", "curChapter"],
};

export const GAME_LIST: MediaDataConfig<GameProps> = {
	endpoint: "games",
	requiredFieldsToPost: ["title", "status", "igdbId"],
	statusOrder: { Playing: 0, Completed: 1, Dropped: 2 },
};
