"use client";
import { createContext, useCallback, useContext, useMemo, useRef } from "react";

export type CardKind = "movie" | "tv" | "manga";

type CardLayer = {
	kind: CardKind;
	id: number;
	parent: CardLayer | null;
	collapse: () => void;
};

const CardStackContext = createContext<CardLayer | null>(null);
export const CardStack = CardStackContext.Provider;

export function useCardLayer(kind: CardKind, id: number, collapse: () => void) {
	const parent = useContext(CardStackContext);
	const latest = useRef(collapse);
	latest.current = collapse;
	const layer = useMemo<CardLayer>(
		() => ({ kind, id, parent, collapse: () => latest.current() }),
		[kind, id, parent],
	);

	// opening an item already open further down takes you back to it instead
	const open = useCallback(
		<W extends { type: CardKind; id: number }>(
			work: W,
			show: (work: W) => void,
		) => {
			for (let at: CardLayer | null = layer; at; at = at.parent)
				if (at.kind === work.type && at.id === work.id)
					return at.collapse();
			show(work);
		},
		[layer],
	);

	return { layer, open };
}
