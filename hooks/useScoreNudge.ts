import { useCallback, useEffect, useRef } from "react";
import { BaseMediaProps } from "@/types/media";
import { nudgeMu } from "@/lib/tierConfig";
import { sharpenConfidence } from "@/lib/glicko";
import { useCommitOnUnmount } from "./useManageMedia";

// manual +/- 0.1 nudges on an already-scored item -- phi only saves once
export function useScoreNudge<T extends BaseMediaProps>(
	item: T,
	onUpdate: (itemId: number, updates?: Partial<T>) => void,
) {
	const pending = useRef<{ id: number; startPhi: number; mu: number } | null>(
		null,
	);

	const nudge = useCallback(
		(dir: "up" | "down") => {
			if (!item.score) return;
			const open =
				pending.current?.id === item.id ? pending.current : null;
			const mu = nudgeMu(open ? open.mu : item.score.mu, dir);
			const startPhi = open ? open.startPhi : item.score.phi;
			pending.current = { id: item.id, startPhi, mu };
			// phi stays put until commit
			onUpdate(item.id, { score: { mu, phi: startPhi } } as Partial<T>);
		},
		[item, onUpdate],
	);

	const commit = useCallback(() => {
		const open = pending.current;
		pending.current = null;
		if (!open) return;
		onUpdate(open.id, {
			score: { mu: open.mu, phi: sharpenConfidence(open.startPhi) },
		} as Partial<T>);
	}, [onUpdate]);

	// the modal swaps items in place on sequel/prequel nav
	useEffect(() => {
		if (pending.current && pending.current.id !== item.id) commit();
	}, [item.id, commit]);

	// a reset, a battle or the server's rollup moved the score
	const mu = item.score?.mu;
	useEffect(() => {
		const open = pending.current;
		if (open && open.id === item.id && open.mu !== mu)
			pending.current = null;
	}, [item.id, mu]);

	// a card that goes away without its close handler still settles up
	useCommitOnUnmount(commit);

	return { nudge, commit };
}
