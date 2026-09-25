import { ShowSeasonProps, SlotIndex } from "@/types/show";
import { episodeCountOf, isMovieSlot } from "./slotRef";

const movieWeight = (slot: ShowSeasonProps, perEpisode: number): number => {
	const runtime = slot.duration ?? 0;
	if (!runtime || !perEpisode) return slot.episode_count || 1;
	return Math.max(1, Math.round(runtime / perEpisode));
};

export const franchiseEpisodes = (
	timeline: ShowSeasonProps[],
	at: SlotIndex,
	curEp: number,
): { watched: number; total: number } => {
	// 1 episode length for the whole bar
	const perEpisode =
		timeline.find(
			(slot) => !slot.isSide && !isMovieSlot(slot) && slot.duration,
		)?.duration ?? 0;

	let completedEps = 0;
	let totalEps = 0;

	for (let i = 0; i < timeline.length; i++) {
		if (timeline[i].isSide) continue;
		// movie counted
		const count = isMovieSlot(timeline[i])
			? movieWeight(timeline[i], perEpisode)
			: episodeCountOf(timeline[i]);
		totalEps += count;
		if (i < at) completedEps += count;
	}

	// sitting on side doesnt add nothing of its own -- a film is all or nothing
	const on = timeline[at];
	if (on && !on.isSide) {
		if (!isMovieSlot(on)) completedEps += curEp;
		else if (curEp >= Math.max(1, episodeCountOf(on)))
			completedEps += movieWeight(on, perEpisode);
	}

	return { watched: completedEps, total: totalEps };
};

export const calcCurProgress = (
	timeline: ShowSeasonProps[],
	at: SlotIndex,
	curEp: number,
) => {
	if (at === 0 && curEp === 0) return 100;
	if (at === 0 && curEp === 1) return 1;

	const { watched, total } = franchiseEpisodes(timeline, at, curEp);
	// an airing series has no known total -- a NaN width collapses the bar
	if (!total) return 100;

	return (watched / total) * 100;
};
