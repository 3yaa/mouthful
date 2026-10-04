import { useCallback, useState } from "react";
import { BaseMediaProps } from "@/types/media";
import { Score } from "@/lib/tierConfig";
import { MediaDataConfig, useMediaData } from "./useMediaData";

// another hub's list, opened from inside this one
export function useCrossList<T extends BaseMediaProps>(
	config: MediaDataConfig<T>,
) {
	const { items, add, update, updateSoon, updatePart, remove } =
		useMediaData<T>(config);
	// a first score goes through the ringer
	const [battle, setBattle] = useState<{ item: T; score: Score } | null>(
		null,
	);

	const handleUpdates = useCallback(
		(itemId: number, updates?: Partial<T>, shouldDelete?: boolean) => {
			if (shouldDelete) {
				remove(itemId);
				return;
			}
			if (!updates) return;
			const target = items.find((item) => item.id === itemId);
			if (updates.score && target && !target.score) {
				const { score, ...rest } = updates;
				if (Object.keys(rest).length)
					updateSoon(itemId, rest as Partial<T>);
				setBattle({ item: target, score });
				return;
			}
			// the user's own edit, wherever the card was opened -- it counts as recent
			updateSoon(itemId, updates);
		},
		[items, updateSoon, remove],
	);

	// resolves to the new row for the card to open -- a scored one gets the battler
	const handleAdd = useCallback(
		async (item: T): Promise<T | undefined> => {
			const newItem: T | undefined = await add(item);
			if (newItem?.score)
				setBattle({ item: newItem, score: newItem.score });
			return newItem;
		},
		[add],
	);

	const closeBattle = useCallback(() => setBattle(null), []);
	// the items a battle was decided against no update
	const handleOpponentUpdate = useCallback(
		(itemId: number, score: Score) =>
			update(itemId, { score } as Partial<T>, true),
		[update],
	);

	const finishBattle = useCallback(
		(score: Score) => {
			if (battle) update(battle.item.id, { score } as Partial<T>);
			setBattle(null);
		},
		[battle, update],
	);

	return {
		items,
		update,
		updatePart,
		battle,
		closeBattle,
		finishBattle,
		handleOpponentUpdate,
		handleUpdates,
		handleAdd,
	};
}
