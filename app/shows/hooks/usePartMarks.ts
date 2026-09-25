"use client";
import { useEffect, useState } from "react";
import { ShowProps, SlotIndex } from "@/types/show";
import { Score, Tier, TIER_PHI_THRESHOLD, getSeedMu } from "@/lib/tierConfig";
import { markOf, PartPatch } from "@/app/shows/utils/animePartMarks";
import {
	isAnimeRow,
	slotName,
	slotRefFor,
	stepWatchIndex,
} from "@/app/shows/utils/slotRef";
import { useScoreNudge } from "@/hooks/useScoreNudge";
import type { useSlotCursor } from "./useSlotCursor";

type Cursor = ReturnType<typeof useSlotCursor>;

export interface UsePartMarksOptions {
	show: ShowProps;
	cursor: Cursor;
	onUpdate: (
		showId: number,
		updates?: Partial<ShowProps>,
		takeAction?: boolean,
	) => void;
	// absent on add form
	onUpdatePart?: (
		showId: number,
		anilistId: number,
		patch: PartPatch,
	) => void | Promise<unknown>;
	// seeds a part score and hand it to the battler
	onPartBattle?: (showId: number, anilistId: number, seed: Score) => void;
	addShow?: boolean;
}

export function usePartMarks({
	show,
	cursor,
	onUpdate,
	onUpdatePart,
	onPartBattle,
	addShow,
}: UsePartMarksOptions) {
	const { line, realIndex, shownIndex } = cursor;

	const canMark = !addShow && !!onUpdatePart && !!onPartBattle;
	const canShowFranchise = canMark && isAnimeRow(show);
	const startsWhole = show.status === "Completed";
	const [franchiseView, setFranchiseView] = useState(startsWhole);

	// null means "the row", and every score/note write branches on it
	const partId =
		canShowFranchise && !franchiseView
			? (line[shownIndex]?.anilistId ?? null)
			: null;
	const mark = markOf(show, partId);

	// notes -- the part's when one is in view, the row's otherwise
	const note = partId != null ? (mark?.note ?? "") : (show.note ?? "");
	const noteSubject =
		partId != null
			? slotName(show, line[shownIndex], shownIndex)
			: undefined;

	// the franchise view belongs to the row it was opened on
	useEffect(() => {
		setFranchiseView(startsWhole);
	}, [show.id, startsWhole]);

	// where a mark is written from the card rather than by the battler
	const write = (anilistId: number, patch: PartPatch) =>
		onUpdatePart?.(show.id, anilistId, patch);

	// +/- 0.1 nudges, aimed at a part
	const { nudge, commit: commitNudge } = useScoreNudge(
		{ ...show, id: partId ?? show.id, score: mark?.score ?? null },
		(anilistId, updates) =>
			write(anilistId, { score: updates?.score ?? null }),
	);

	// part's own score
	const setTier = (anilistId: number, tier: Tier) => {
		onPartBattle?.(show.id, anilistId, {
			mu: getSeedMu(tier),
			phi: TIER_PHI_THRESHOLD[tier],
		});
	};

	// part's score clear
	const clearScore = (anilistId: number) => {
		write(anilistId, { score: null });
	};

	// part's own note
	const setNote = (anilistId: number, text: string) => {
		write(anilistId, { note: text || null });
	};

	//
	const setHidden = (anilistId: number, hidden: boolean) => {
		if (!!markOf(show, anilistId)?.hidden === hidden) return;
		//
		const isLeaving = (index: SlotIndex) =>
			line[index]?.anilistId === anilistId;
		// move the marker if on it
		const step = (from: SlotIndex, dir: "left" | "right") =>
			stepWatchIndex(line, from, dir);
		if (hidden && isLeaving(realIndex)) {
			const forward = step(realIndex, "right");
			const to = forward !== -1 ? forward : step(realIndex, "left");
			if (to !== -1)
				onUpdate(show.id, {
					...slotRefFor(show, to),
					curEpisode: 0,
				});
		}
		// browsing one is no different: there is nothing left to browse
		if (hidden && isLeaving(shownIndex)) cursor.clear();

		if (addShow) {
			onUpdate(show.id, {
				parts: {
					...(show.parts ?? {}),
					[String(anilistId)]: {
						...(show.parts?.[String(anilistId)] ?? { score: null }),
						hidden,
					},
				},
			});
			return;
		}
		write(anilistId, { hidden });
	};

	const toggleFranchise = () => {
		cursor.clear();
		setFranchiseView((was) => !was);
	};

	const exitFranchise = () => setFranchiseView(false);

	return {
		partId,
		mark,
		note,
		noteSubject,
		// undefined where the control has nothing to offer
		franchiseView: canShowFranchise ? franchiseView : undefined,
		toggleFranchise,
		exitFranchise,
		write,
		setTier,
		clearScore,
		setNote,
		setHidden,
		nudge,
		commitNudge,
	};
}
