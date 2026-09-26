import { Score } from "@/lib/tierConfig";

export type MediaStatus =
	| "Completed"
	| "Want to Read"
	| "Reading"
	| "Playing"
	| "Watching"
	| "Want to Watch"
	| "Dropped";

// books and manga
export const isPrintMedia = (mediaType: string) =>
	mediaType === "book" || mediaType === "manga";

export type SortState<K extends string> = { type: K; order: "asc" | "desc" };

export interface ColumnConfig<T> {
	label: string;
	sortKey: string;
	getValue: (item: T) => string | number | null | undefined;
}

export interface SeriesProps {
	title: string | null;
	// the source's own label for the place - not an index
	position: string | null;
	total: number | null;
	prequel: SeriesTargetProps | null;
	sequel: SeriesTargetProps | null;
}

export interface SeriesMediaProps {
	series?: SeriesProps | null;
}

export interface SeriesTargetProps {
	id?: string | null;
	title: string;
}

// jsonb { url, color } -- books, manga, movies and games
export interface MediaCoverProps {
	url: string;
	color: string;
}

export interface BaseMediaProps {
	id: number;
	title: string;
	status: MediaStatus;
	lastUpdated: Date;
	dateCompleted?: Date | null;
	note?: string;
	score: Score | null;
	// the author and dateReleased and cover i need to fix sometimes T_T
	imageUrl?: string;
	cover?: MediaCoverProps | null;
	// shows still carry a bare poster url
	posterUrl?: string;
	//
	backdropUrl?: string;
	// movie/show/game
	logoUrl?: string | null;
}
