"use client";
import { useEffect, useState } from "react";
import { ShowProps, SlotIndex } from "@/types/show";
import {
	slotIndexOf,
	slotRefFor,
	timelineOf,
} from "@/app/shows/utils/slotRef";

// where looking
export interface UseSlotCursorOptions {
	show: ShowProps;
	onUpdate: (
		showId: number,
		updates?: Partial<ShowProps>,
		takeAction?: boolean,
	) => void;
}

export function useSlotCursor({ show, onUpdate }: UseSlotCursorOptions) {
	const line = timelineOf(show);
	const count = line.length;
	const realIndex = slotIndexOf(show);

	const [viewIndex, setViewIndex] = useState<SlotIndex | null>(null);
	// out of range is no cursor -- a rebuilt chain can be shorter than the original
	const shownIndex =
		viewIndex != null && viewIndex >= 0 && viewIndex < count
			? viewIndex
			: realIndex;
	// the arrows browse on every row
	const isBrowsing = shownIndex !== realIndex;
	const viewedComplete =
		isBrowsing && (show.status === "Completed" || shownIndex < realIndex);

	// belongs to the show you opened it on
	useEffect(() => {
		setViewIndex(null);
	}, [show.id]);

	// look at position without moving -- null stop browsing
	const browse = (index: SlotIndex | null) => setViewIndex(index);

	// stop browsing -- leaving the marker where it is
	const clear = () => setViewIndex(null);

	const moveTo = (index: SlotIndex, episode?: number) => {
		setViewIndex(null);
		onUpdate(show.id, {
			...slotRefFor(show, index),
			...(episode === undefined ? {} : { curEpisode: episode }),
		});
	};

	// rail version
	const watchSlot = (index: SlotIndex) => {
		if (index < 0 || index >= count) return;
		moveTo(index, 0);
	};

	// continue from here
	const commitView = () => {
		if (!isBrowsing || !show.seasons) return;
		moveTo(shownIndex, 0);
	};

	return {
		line,
		count,
		realIndex,
		shownIndex,
		isBrowsing,
		viewedComplete,
		browse,
		clear,
		moveTo,
		watchSlot,
		commitView,
	};
}
