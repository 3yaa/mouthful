import { AnimeFormat, ShowProps, ShowSeasonProps } from "@/types/show";
import type { AuthFetch } from "@/app/auth/hooks/useAuthFetch";
import {
	episodeCountOf,
	moviesOf,
	isMovieSlot,
	sideStoriesOf,
	slotBadge,
	slotName,
	franchiseRomajiOf,
	timelineOf,
	slotIndexAt,
} from "@/app/shows/utils/slotRef";
import { slotSubtitle } from "@/app/shows/utils/animeTitles";

export interface EpisodeRating {
	season: number;
	episode: number;
	score: number | null;
}

export interface SeriesInfo {
	rating: number | null;
	votes: number | null;
}

// what movies and side content scored, by id
export type ExtraScores = Record<number, number | null>;

export interface RatingColumn {
	key: string;
	// fits in a narrow header -- "S3", "S3-2"
	label: string;
	// "3", or "3-2" for a split cour
	number?: string;
	title?: string;
	scores: (number | null)[];
	average: number | null;
	// one sitting, one number -- drawn as a line; absent on a part
	kind?: "film" | "side";
}

export const RATING_TIERS = [
	// BLUE
	{
		label: "Goosebumps",
		min: 9.7,
		bg: "bg-[#1da1f2]",
		text: "text-white",
		hex: "#1da1f2",
	},
	// DARK GREEN
	{
		label: "Exceptional",
		min: 9.0,
		bg: "bg-[#186a3b]",
		text: "text-white",
		hex: "#186a3b",
	},
	// GREEN
	{
		label: "Amazing",
		min: 8.0,
		bg: "bg-[#28b463]",
		text: "text-zinc-900",
		hex: "#28b463",
	},
	// EMERALD
	{
		label: "Good",
		min: 7.0,
		bg: "bg-emerald-400",
		text: "text-zinc-900",
		hex: "#34d399",
	},
	// YELLOW
	{
		label: "Pretty Good",
		min: 6.0,
		bg: "bg-[#f4d03f]",
		text: "text-zinc-900",
		hex: "#f4d03f",
	},
	// ORANGE
	{
		label: "Average",
		min: 5.0,
		bg: "bg-[#f39c12]",
		text: "text-zinc-900",
		hex: "#f39c12",
	},
	// RED
	{
		label: "Off-key",
		min: 4.0,
		bg: "bg-[#e74c3c]",
		text: "text-white",
		hex: "#e74c3c",
	},
	// PURPLE
	{
		label: "Bad",
		min: 0.0,
		bg: "bg-[#633974]",
		text: "text-white",
		hex: "#633974",
	},
] as const;

export function getTier(score: number | null | undefined) {
	if (score === null || score === undefined) return null;
	for (const tier of RATING_TIERS) if (score >= tier.min) return tier;
	return null;
}

export function formatVotes(votes: number): string {
	if (votes >= 1_000_000) return `${(votes / 1_000_000).toFixed(1)}M`;
	if (votes >= 1_000) return `${(votes / 1_000).toFixed(0)}K`;
	return String(votes);
}

const SOLO_BADGE: Partial<Record<AnimeFormat, string>> = {
	MOVIE: "Movie",
	SPECIAL: "Sp",
	OVA: "OVA",
	ONA: "ONA",
	TV_SHORT: "Short",
};

const mean = (scores: (number | null)[]) => {
	const known = scores.filter((s): s is number => s !== null);
	if (!known.length) return null;
	return +(known.reduce((a, b) => a + b, 0) / known.length).toFixed(1);
};

// what imdb aired for it, not its own count
const runShare = (slot: ShowSeasonProps): number => {
	if (isMovieSlot(slot))
		return (
			(slot.variants ?? []).find(
				(cut) => cut.format === "TV" || cut.format === "TV_SHORT",
			)?.episode_count ?? 0
		);
	return slot.isSide ? 0 : episodeCountOf(slot);
};

// imdb's episodes cut into parts
export function partitionRatings(
	show: Pick<ShowProps, "title" | "seasons" | "anilistId" | "parts">,
	ratings: EpisodeRating[],
	// by anilist id
	extraScores: ExtraScores = {},
): { columns: RatingColumn[]; byPart: boolean } {
	const parts = timelineOf(show);
	const ordered = ratings
		// imdb's specials: season 0, and episode 0 inside a real season
		.filter((r) => Number(r.season) > 0 && Number(r.episode) > 0)
		.sort(
			(a, b) =>
				Number(a.season) - Number(b.season) ||
				Number(a.episode) - Number(b.episode),
		);

	const partTotal = parts.reduce((n, p) => n + runShare(p), 0);
	const byPart =
		parts.length > 0 && partTotal > 0 && partTotal <= ordered.length;

	if (byPart) {
		// `ordered` is sorted, so a season is a consecutive stretch of it
		const run: { season: number; episodes: EpisodeRating[] }[] = [];
		for (const rating of ordered) {
			const season = Number(rating.season);
			const open = run[run.length - 1];
			if (open && open.season === season) open.episodes.push(rating);
			else run.push({ season, episodes: [rating] });
		}

		const columns: RatingColumn[] = [];
		// a season, and how far into it
		let atSeason = 0;
		let atEpisode = 0;
		const seasonLeft = () =>
			atSeason < run.length
				? run[atSeason].episodes.length - atEpisode
				: 0;

		// what no part claimed is dropped
		const closeSeason = () => {
			atSeason++;
			atEpisode = 0;
		};

		// padded to the claimed length
		const take = (count: number): (number | null)[] => {
			const out: (number | null)[] = [];
			while (out.length < count && atSeason < run.length) {
				const avail = seasonLeft();
				if (avail <= 0) {
					atSeason++;
					atEpisode = 0;
					continue;
				}
				const n = Math.min(count - out.length, avail);
				for (const rating of run[atSeason].episodes.slice(
					atEpisode,
					atEpisode + n,
				))
					out.push(rating.score);
				atEpisode += n;
				// a cour
				if (out.length < count) {
					atSeason++;
					atEpisode = 0;
				}
			}
			while (out.length < count) out.push(null);
			return out;
		};

		// what the next entry that reads from the run wants
		const nextShare = (from: number) => {
			for (let at = from + 1; at < parts.length; at++) {
				const n = runShare(parts[at]);
				if (n > 0) return n;
			}
			return 0;
		};

		parts.forEach((part, i) => {
			const count = runShare(part);
			const kind = isMovieSlot(part)
				? "film"
				: part.kind === "sideStory"
					? "side"
					: undefined;
			// taken whatever the entry is
			const claimed = take(count);
			const scores = kind
				? [extraScores[part.anilistId ?? -1] ?? null]
				: claimed;
			// an unaired cour: no scores, so no column
			if (!kind && !count) return;
			// a movie keeps its line unrated
			if (kind === "side" && scores[0] == null) return;
			// the part's own number or none
			const numbered = part.number ?? part.season_number;
			const named = slotSubtitle(
				part.title,
				show.title,
				franchiseRomajiOf(show),
			);
			columns.push({
				key: `p${i}`,
				label:
					kind === "film"
						? "Movie"
						: kind === "side"
							? (SOLO_BADGE[part.format ?? "OVA"] ?? "Side")
							: slotBadge(parts, slotIndexAt(i)),
				number: numbered != null ? String(numbered) : undefined,
				kind,
				// slotName, not slotSubtitle -- it keeps the cour number
				title: named || kind ? slotName(show, part, slotIndexAt(i)) : undefined,
				scores,
				average: mean(scores),
			});
			// done with the season once the next entry cannot fit in it
			if (count) {
				const next = nextShare(i);
				if (next > 0 && next > seasonLeft()) closeSeason();
			}
		});
		return { columns, byPart };
	}

	// IMDb's own seasons, when the chain cannot describe this run
	const grid: Record<number, Record<number, number | null>> = {};
	const runsTo = new Map<number, number>();
	for (const { season, episode, score } of ratings) {
		const s = Number(season);
		const e = Number(episode);
		if (!Number.isFinite(s) || !Number.isFinite(e)) continue;
		if (!grid[s]) grid[s] = {};
		grid[s][e] = score;
		runsTo.set(s, Math.max(runsTo.get(s) ?? 0, e));
	}
	const columns: RatingColumn[] = [...runsTo.keys()]
		.sort((a, b) => a - b)
		.map((n) => {
			const scores = Array.from(
				{ length: runsTo.get(n) ?? 0 },
				(_, i) => grid[n]?.[i + 1] ?? null,
			);
			return {
				key: `s${n}`,
				// imdb files specials as season 0
				label: n === 0 ? "Sp" : `S${n}`,
				number: n === 0 ? undefined : String(n),
				scores,
				average: mean(scores),
			};
		});
	return { columns, byPart };
}

// score, imdb's episodes, and a rating per off-run entry by id
export async function fetchEpisodeRatings(
	show: Pick<ShowProps, "id" | "tmdbId" | "imdbId" | "seasons">,
	authFetch: AuthFetch,
): Promise<{
	ratings: EpisodeRating[];
	series: SeriesInfo | null;
	extras: ExtraScores;
}> {
	const params = new URLSearchParams();
	if (show.imdbId) {
		params.set("imdbId", show.imdbId);
	} else {
		params.set("tmdbId", show.tmdbId);
		params.set("showId", String(show.id));
	}
	const extras = [...moviesOf(show), ...sideStoriesOf(show)].map(
		(extra) => extra.anilistId,
	);
	// still named `movies`, but it resolves whatever ids it is handed
	if (extras.length) params.set("movies", extras.join(","));
	const res = await authFetch(`/api/shows-api/episodes-score?${params}`);
	if (!res.ok) throw new Error("Could not fetch episode ratings");
	const data = await res.json();
	return {
		ratings: data.data ?? [],
		series: data.series ?? null,
		extras: data.movies ?? {},
	};
}
