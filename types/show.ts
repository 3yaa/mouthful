import { BaseMediaProps } from "./media";
import { Score } from "@/lib/tierConfig";

export type SlotKey = number & { readonly __slotKey: unique symbol }; // the stored cursor
export type SlotIndex = number & { readonly __slotIndex: unique symbol }; // position in timelineOf(show) -- only slowRef mints

// main
export interface ShowProps extends BaseMediaProps {
	status: "Completed" | "Want to Watch" | "Dropped" | "Watching";
	tmdbId: string;
	imdbId?: string;
	creator?: string;
	dateReleased?: number;
	franchisePoster?: boolean | null;
	seasons?: ShowSeasonProps[];
	// two meanings in one column -- only slotRef read
	curSeasonIndex: SlotKey;
	curEpisode: number;
	// for anime
	anilistId?: number | null;
	parts?: Record<string, AnimeNodeMark> | null;
}

// stuff you can edit per node
export interface AnimeNodeMark {
	score: Score | null;
	note?: string | null;
	hidden?: boolean;
}

// show indentity
export interface ShowBaseProps {
	tmdbId: string;
	title: string;
}

// show meat
export interface ShowEnrichmentProps {
	seasons?: ShowSeasonProps[];
	creator?: string;
	released_date?: number; // year only
	imdbId?: string | null;
	posters?: string[];
	backdrops?: string[];
	logos?: string[];
	// --- set only on anime
	anilistId?: number;
}

// normal and anime -- per season
export interface ShowSeasonProps extends Partial<AnimeNodeProps> {
	// tmdb season numbred | anilist slots anilistid-ed
	season_number?: number;
	episode_count: number;
	// --- anime slots only ---
	number?: string | null; // season number, ie: 3 or 3-2
	position?: number; // spine position, 1-based
	sourceManga?: SourceMediaProps | null;
	variants?: AnimeVariantProps[]; // cuts
	isSide?: boolean; // derived, never persisted
	kind?: "film" | "sideStory"; // derived, never persisted
	subNodes?: AnimeSubNodeProps[]; // side stories
	droppedNodes?: { anilistId: number }[] | null;
}

// === anime

export type AnimeFormat =
	| "TV"
	| "TV_SHORT"
	| "ONA"
	| "MOVIE"
	| "OVA"
	| "SPECIAL"
	| "UNKNOWN";

export interface SourceMediaProps {
	anilistId: number;
	title: string | null;
	format: string;
}

export interface AnimeNodeProps {
	anilistId: number;
	title: string | null;
	titleRomaji: string | null;
	format: AnimeFormat;
	status: string | null; // RELEASING, FINISHED, NOT_YET_RELEASED, ...
	episode_count: number | null;
	duration: number | null; // minutes per ep
	startDate: string | null;
	studio: string | null;
	posterUrl: string | null;
	posterColor: string | null;
	// does it go one or two layer deep
	isMainLine: boolean;
}

export interface AnimeVariantProps extends AnimeNodeProps {
	variantKind: "alternate_cut";
}

// mainline movies are subnodes as well
export interface AnimeSubNodeProps extends AnimeNodeProps {
	kind: "film" | "sideStory";
	placement?: "before" | "after"; // only for movies
	underMovie?: number | null;
	variants?: AnimeVariantProps[];
	parentSlot?: string | null;
	parentSlotAnilistId?: number | null;
}
//
export type AnimeSideStoryProps = AnimeSubNodeProps & { kind: "sideStory" };
export type AnimeMovieProps = AnimeSubNodeProps & { kind: "film" };

// === for the discover shows
export type HollowShowProps = {
	tmdbId: string;
	imdbId: string;
	title: string;
	imdbRating: number | null;
	poster_url: string | null;
	//
	currentEp: number | null;
	totalEp: number | null;
	//
	airDays: string | null;
	first_air_date: string;
};
