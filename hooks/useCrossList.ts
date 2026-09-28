import { useCallback, useState } from "react";
import { BaseMediaProps } from "@/types/media";
import { Score } from "@/lib/tierConfig";
import { MediaDataConfig, useMediaData } from "./useMediaData";

// another hub's list, opened from inside this one
export function useCrossList<T extends BaseMediaProps>(
	config: MediaDataConfig<T>,
) {
	const { items, add, update, updatePart, remove } = useMediaData<T>(config);
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
				setBattle({ item: target, score: updates.score });
				return;
			}
			update(itemId, updates, true);
		},
		[items, update, remove],
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

	const finishBattle = useCallback(
		(score: Score) => {
			if (battle) update(battle.item.id, { score } as Partial<T>, true);
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
		handleUpdates,
		handleAdd,
	};
}
