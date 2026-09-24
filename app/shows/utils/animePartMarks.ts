// per node score/note
import { AnimeNodeMark, ShowProps, ShowSeasonProps } from "@/types/show";
import { Score } from "@/lib/tierConfig";
import { timelineOf } from "./slotRef";

const SIDE_WEIGHT = 0.25;
const DEFAULT_DURATION = 24;
const MIN_PHI = 40;

export type PartPatch = {
	score?: Score | null;
	note?: string | null;
	hidden?: boolean;
};

// optimistic half of a write
export function withPartPatch<S extends Pick<ShowProps, "parts">>(
	show: S,
	anilistId: number,
	patch: PartPatch,
): S {
	const key = String(anilistId);
	return {
		...show,
		parts: {
			...(show.parts ?? {}),
			[key]: { ...(show.parts?.[key] ?? { score: null }), ...patch },
		},
	};
}

// the only place show.parts is indexed
export function markOf(
	show: Pick<ShowProps, "parts">,
	anilistId?: number | null,
): AnimeNodeMark | undefined {
	if (anilistId == null) return undefined;
	return show.parts?.[String(anilistId)];
}

// null covers both "no mark" and "a mark with no score"
export const partScoreOf = (
	show: Pick<ShowProps, "parts">,
	slot?: ShowSeasonProps,
): Score | null => markOf(show, slot?.anilistId)?.score ?? null;

// runtime, not part count -- a movie and a cour are both real amounts of show
const runtimeOf = (slot: ShowSeasonProps, fallback: number) =>
	(slot.episode_count || 0) * (slot.duration || fallback);

// per line, not per slot, so two callers cannot guess the median differently
export function weigherOf(
	line: ShowSeasonProps[],
): (slot: ShowSeasonProps) => number {
	const fallback = medianDuration(line);
	return (slot) => {
		const weight =
			runtimeOf(slot, fallback) * (slot.isSide ? SIDE_WEIGHT : 1);
		return weight > 0 ? weight : fallback;
	};
}

const medianDuration = (line: ShowSeasonProps[]) => {
	const known = line
		.map((slot) => slot.duration ?? 0)
		.filter((duration) => duration > 0)
		.sort((a, z) => a - z);
	if (!known.length) return DEFAULT_DURATION;
	const mid = known.length >> 1;
	return known.length % 2 ? known[mid] : (known[mid - 1] + known[mid]) / 2;
};

// a part-scored chain joins the opponent pool only once every part is scored
export function isBattleReady(
	show: Pick<ShowProps, "seasons" | "parts" | "status">,
): boolean {
	if (show.status === "Completed") return true;
	const rolled = rollupOf(show);
	return !rolled || rolled.scored === rolled.total;
}

export interface PartRollup {
	score: Score;
	scored: number;
	total: number;
}

// mu = Σwμ/Σw, phi = √(Σw²φ²)/Σw -- phi pools rather than averages
export function rollupOf(
	show: Pick<ShowProps, "seasons" | "parts">,
): PartRollup | null {
	// mirrors nodesRollup.js on the server -- CHANGE BOTH TOGETHER
	if (!show.parts) return null;
	// hidden parts are off the timelinE -- refused ova drops out free
	const line = timelineOf(show);
	if (!line.length) return null;
	const weigh = weigherOf(line);

	let sumW = 0;
	let sumWMu = 0;
	let sumW2Phi2 = 0;
	let scored = 0;

	for (const slot of line) {
		const score = partScoreOf(show, slot);
		if (!score) continue;
		const w = weigh(slot);
		scored++;
		sumW += w;
		sumWMu += w * score.mu;
		sumW2Phi2 += w * w * score.phi * score.phi;
	}

	if (!scored || sumW <= 0) return null;
	return {
		score: {
			mu: sumWMu / sumW,
			phi: Math.max(MIN_PHI, Math.sqrt(sumW2Phi2) / sumW),
		},
		scored,
		total: line.length,
	};
}
