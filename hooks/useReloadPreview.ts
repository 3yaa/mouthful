"use client";
import { useCallback, useRef, useState } from "react";

// one pickable list + the choice made in it
export type PickList<T> = { items: T[]; index: number };

type ListMap = Record<string, PickList<unknown>>;

export type ReloadPreview<TMeta, TLists extends ListMap, TExtra = undefined> = {
	meta: Partial<TMeta>;
	lists: TLists;
	// shows cuts, a book's alternative search etc
	extra: TExtra;
};

export type ReloadPreviewInit<
	TMeta,
	TLists extends ListMap,
	TExtra = undefined,
> = {
	meta: Partial<TMeta>;
	lists: TLists;
	extra?: TExtra;
};

export interface UseReloadPreviewOptions<
	TMeta,
	TLists extends ListMap,
	TExtra = undefined,
> {
	onRefresh?: (meta: Partial<TMeta>) => Promise<void> | void;
	load: () => Promise<
		ReloadPreviewInit<TMeta, TLists, TExtra> | null | undefined
	>;
	// false when has nothing to look itself up by
	canLoad?: boolean;
	// what converts choices into real fields on confirm
	toMeta?: (preview: ReloadPreview<TMeta, TLists, TExtra>) => Partial<TMeta>;
	onExit?: () => void;
	onConfirmed?: (
		preview: ReloadPreview<TMeta, TLists, TExtra>,
	) => Promise<void> | void;
}

const EMPTY_ITEMS: unknown[] = [];
Object.freeze(EMPTY_ITEMS);
const EMPTY_LIST: PickList<unknown> = Object.freeze({
	items: EMPTY_ITEMS,
	index: 0,
});
const EMPTY_META = Object.freeze({});

export function useReloadPreview<
	TMeta,
	TLists extends ListMap,
	TExtra = undefined,
>(options: UseReloadPreviewOptions<TMeta, TLists, TExtra>) {
	type Preview = ReloadPreview<TMeta, TLists, TExtra>;

	const [preview, setPreviewState] = useState<Preview | null>(null);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const optsRef = useRef(options);
	optsRef.current = options;
	const previewRef = useRef<Preview | null>(preview);
	previewRef.current = preview;
	const busyRef = useRef(false);

	const setBusy = useCallback((value: boolean) => {
		busyRef.current = value;
		setIsRefreshing(value);
	}, []);

	const commit = useCallback((next: Preview | null) => {
		previewRef.current = next;
		setPreviewState(next);
	}, []);

	// hold the busy flag for a load that happens while a preview is alrdy open
	const runBusy = useCallback(
		async <T>(fn: () => Promise<T>): Promise<T | undefined> => {
			if (busyRef.current) return undefined;
			setBusy(true);
			try {
				return await fn();
			} finally {
				setBusy(false);
			}
		},
		[setBusy],
	);

	const refresh = useCallback(async () => {
		const { onRefresh, load, canLoad } = optsRef.current;
		if (!onRefresh || busyRef.current || previewRef.current) return;
		if (canLoad === false) return;
		setBusy(true);
		try {
			const next = await load();
			if (!next) return;
			commit({
				meta: next.meta,
				lists: next.lists,
				extra: next.extra as TExtra,
			});
		} finally {
			setBusy(false);
		}
	}, [commit, setBusy]);

	const cancel = useCallback(() => {
		commit(null);
		optsRef.current.onExit?.();
	}, [commit]);

	const confirm = useCallback(async () => {
		const { onRefresh, toMeta, onConfirmed } = optsRef.current;
		const staged = previewRef.current;
		if (!onRefresh || !staged) return;
		// built before teardown
		const meta = toMeta ? toMeta(staged) : staged.meta;
		commit(null);
		optsRef.current.onExit?.();
		if (Object.keys(meta).length) await onRefresh(meta);
		await onConfirmed?.(staged);
	}, [commit]);

	const patch = useCallback((fn: (p: Preview) => Preview) => {
		setPreviewState((p) => (p ? fn(p) : p));
	}, []);

	const patchMeta = useCallback(
		(fn: (meta: Partial<TMeta>) => Partial<TMeta>) => {
			setPreviewState((p) => (p ? { ...p, meta: fn(p.meta) } : p));
		},
		[],
	);

	const setListIndex = useCallback(
		<K extends keyof TLists>(key: K, next: (index: number) => number) => {
			setPreviewState((p) =>
				p
					? {
							...p,
							lists: {
								...p.lists,
								[key]: {
									...p.lists[key],
									index: next(p.lists[key].index),
								},
							},
						}
					: p,
			);
		},
		[],
	);

	//
	const list = <K extends keyof TLists>(key: K): TLists[K] =>
		(preview?.lists[key] ?? EMPTY_LIST) as TLists[K];

	return {
		preview,
		isSelecting: !!preview,
		isRefreshing,
		meta: (preview?.meta ?? EMPTY_META) as Partial<TMeta>,
		list,
		refresh,
		confirm,
		cancel,
		patch,
		patchMeta,
		setListIndex,
		runBusy,
	};
}
