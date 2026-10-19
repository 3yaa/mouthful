"use client";
import { useCallback, useRef } from "react";
import {
	SeriesJumpProps,
	SeriesMediaProps,
	SeriesProps,
	SeriesTargetProps,
} from "@/types/media";
import { isSameName } from "@/utils/mediaMatch";
import { backfillRuns } from "@/utils/seriesRead";

type JumpRow = SeriesMediaProps & { id: number; title: string };

interface SeriesJumpOptions<T extends JumpRow> {
	items: T[];
	// the source id a neighbour link carries
	idOf: (row: T) => string | null | undefined;
	// the link back a landing row was missing -- written indirectly so Recent stays put
	saveSeries: (rowId: number, series: SeriesProps) => void;
	openOwned: (row: T) => void;
	openAdd: (jump: SeriesJumpProps) => void;
}

// prequel/sequel jumps for any card stack: owned rows open, the rest start the add flow
export function useSeriesJump<T extends JumpRow>(
	options: SeriesJumpOptions<T>,
) {
	const optsRef = useRef(options);
	optsRef.current = options;
	const { items } = options;

	const findOwned = useCallback(
		(target: SeriesTargetProps) =>
			target.id
				? items.find((row) => optsRef.current.idOf(row) === target.id)
				: items.find((row) => isSameName(row, target.title)),
		[items],
	);

	const isInList = useCallback(
		(target: SeriesTargetProps) => !!findOwned(target),
		[findOwned],
	);

	const jump = useCallback(
		(jump: SeriesJumpProps) => {
			const { saveSeries, openOwned, openAdd } = optsRef.current;
			const owned = findOwned(jump);
			if (!owned) return openAdd(jump);
			const filled = jump.hop && backfillRuns(owned.series, jump.hop)[0];
			if (filled) saveSeries(owned.id, filled);
			openOwned(filled ? { ...owned, series: filled } : owned);
		},
		[findOwned],
	);

	return { findOwned, isInList, jump };
}
