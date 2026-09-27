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

	// resolves true when the battler took over
	const handleAdd = useCallback(
		async (item: T) => {
			const newItem = await add(item);
			if (!newItem?.score) return false;
			setBattle({ item: newItem, score: newItem.score });
			return true;
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
