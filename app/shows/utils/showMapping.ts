import { ShowProps, ShowBaseProps, ShowEnrichmentProps } from "@/types/show";
import { NEW_SLOT_KEY } from "./slotRef";

export function mapNewShow(show: ShowBaseProps): Partial<ShowProps> {
	return {
		tmdbId: show.tmdbId,
		title: show.title,
		curSeasonIndex: NEW_SLOT_KEY,
		curEpisode: 0,
	};
}

export function mapShowMeta(meta: ShowEnrichmentProps): Partial<ShowProps> {
	const [poster] = meta.posters ?? [];
	const [backdrop] = meta.backdrops ?? [];
	const [logo] = meta.logos ?? [];
	return {
		seasons: meta.seasons,
		creator: meta.creator,
		...(meta.released_date ? { dateReleased: meta.released_date } : {}),
		...(meta.imdbId ? { imdbId: meta.imdbId } : {}),
		...(poster ? { posterUrl: poster } : {}),
		...(backdrop ? { backdropUrl: backdrop } : {}),
		...(logo ? { logoUrl: logo } : {}),
		...mapAnimeChain(meta),
	};
}

export function mapAnimeChain(meta: ShowEnrichmentProps): Partial<ShowProps> {
	return meta.anilistId ? { anilistId: meta.anilistId } : {};
}
