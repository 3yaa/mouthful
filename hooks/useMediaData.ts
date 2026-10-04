import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useAuthFetch } from "../app/auth/hooks/useAuthFetch";
import {
	beginOp,
	dropOp,
	inLane,
	listsGeneration,
	listState,
	loadList,
	NO_LIST,
	onDropLists,
	reviseOp,
	settleOp,
	subscribeList,
} from "./mediaStore";
import { reportFailure } from "./saveFailures";

const STALE_AFTER = 120_000;
const NO_ROWS: never[] = [];
// how long a card no hub queues for waits for more edits before sending them as one
const SOON_MS = 800;

type Soon = {
	updates: Record<string, unknown>;
	staged: number;
	timer: ReturnType<typeof setTimeout>;
	send: (updates: Record<string, unknown>, staged: number) => void;
};
const soon = new Map<string, Soon>();
const sendSoon = (key: string) => {
	const batch = soon.get(key);
	if (!batch) return;
	soon.delete(key);
	clearTimeout(batch.timer);
	batch.send(batch.updates, batch.staged);
};
// signing out drops what was still gathering
onDropLists(() => {
	for (const batch of soon.values()) clearTimeout(batch.timer);
	soon.clear();
});
// a hidden or closing page has no later
let watchingSoon = false;
const watchSoon = () => {
	if (watchingSoon || typeof window === "undefined") return;
	watchingSoon = true;
	const all = () => [...soon.keys()].forEach(sendSoon);
	window.addEventListener("pagehide", all);
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "hidden") all();
	});
};

export interface MediaDataConfig<T> {
	endpoint: string;
	extraFieldsToUpdate?: string[];
	requiredFieldsToPost: (keyof T)[];
	statusOrder: Record<string, number>;
	// what an edit looks like before the server answers
	mergeUpdate?: (item: T, updates: Partial<T>) => T;
	// what of the server's answer to an edit to keep
	reconcileUpdate?: (saved: T, current: T, sent: Partial<T>) => T;
}

export function useMediaData<
	T extends { id: number; status: string; title?: string },
>({
	endpoint,
	statusOrder,
	extraFieldsToUpdate,
	requiredFieldsToPost,
	mergeUpdate,
	reconcileUpdate,
}: MediaDataConfig<T>) {
	const { authFetch } = useAuthFetch();
	// the list as the store holds it
	const held = useSyncExternalStore(
		useCallback((fn) => subscribeList(endpoint, fn), [endpoint]),
		useCallback(() => listState(endpoint), [endpoint]),
		() => NO_LIST,
	);
	const items = (held.rows ?? NO_ROWS) as T[];
	const [deleting, setDeleting] = useState(false);
	const isProcessing = held.rows === null || deleting;

	// whether the row is still in the list -- an unloaded list can't say no
	const isHeld = useCallback(
		(itemId: number) => {
			const rows = listState(endpoint).rows as T[] | null;
			return !rows || rows.some((i) => i.id === itemId);
		},
		[endpoint],
	);

	// what a failed write is called in the toast
	const labelOf = useCallback(
		(itemId: number) =>
			((listState(endpoint).rows ?? []) as T[]).find(
				(i) => i.id === itemId,
			)?.title ?? "a change",
		[endpoint],
	);

	// READ
	const load = useCallback(
		() =>
			loadList(endpoint, async () => {
				const response = await authFetch(`/api/${endpoint}`);
				if (!response.ok) {
					throw new Error(`HTTP error--status: ${response.status}`);
				}
				return (await response.json()).data || [];
			}),
		[authFetch, endpoint],
	);

	// CREATE
	const add = useCallback(
		async (item: T) => {
			// req data
			if (requiredFieldsToPost.some((field) => !item[field])) return;
			//
			try {
				const url = `/api/${endpoint}`;
				const options = {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(item),
				};
				const response = await authFetch(url, options);
				if (!response.ok) {
					throw new Error(`HTTP error--status: ${response.status}`);
				}
				//
				const resJson = await response.json();
				const newItem: T = resJson.data;
				// already saved
				const op = beginOp<T>(endpoint, (prev) => {
					if (prev.some((m) => m.id === newItem.id)) return prev;
					// find the first index of status group
					const firstIndexOfStatus = prev.findIndex(
						(m) => m.status === newItem.status,
					);
					// if no status group
					if (firstIndexOfStatus === -1) {
						return [newItem, ...prev];
					}
					// insert at the beginning of status group
					return [
						...prev.slice(0, firstIndexOfStatus),
						newItem,
						...prev.slice(firstIndexOfStatus),
					];
				});
				settleOp(endpoint, op);
				return newItem;
			} catch (e) {
				console.error("Error adding " + endpoint, e);
				reportFailure(item.title ?? "it", undefined, "add");
			}
		},
		[authFetch, endpoint, requiredFieldsToPost],
	);

	// WRITE
	const optimisticWrite = useCallback(
		async function write({
			itemId,
			merge,
			url,
			body,
			reconcile,
			resort = false,
			whileDoing,
			keepalive = false,
			staged,
		}: {
			itemId: number;
			// the row as it looks now
			merge: (item: T) => T;
			url: string;
			body: unknown;
			// what to keep
			reconcile?: (saved: T, current: T) => T;
			// status change move row between grps in listing
			resort?: boolean;
			// error log
			whileDoing: string;
			// small bodies only (64KB cap)
			keepalive?: boolean;
			staged?: number;
		}): Promise<T | undefined> {
			const ordered = (rows: T[]) =>
				resort
					? [...rows].sort(
							(a, b) =>
								(statusOrder[a.status] ?? 999) -
								(statusOrder[b.status] ?? 999),
						)
					: rows;
			const onRow = (fn: (item: T) => T) => (rows: T[]) =>
				rows.map((item) => (item.id === itemId ? fn(item) : item));
			// a row that's gone takes no writes
			if (!isHeld(itemId)) {
				if (staged !== undefined) dropOp(endpoint, staged);
				return;
			}
			// they go first
			const key = `${endpoint}:${itemId}`;
			if (soon.has(key) && soon.get(key)!.staged !== staged)
				sendSoon(key);

			const apply = (rows: T[]) => ordered(onRow(merge)(rows));
			const generation = listsGeneration();
			const op = staged ?? beginOp<T>(endpoint, apply);
			if (staged !== undefined) reviseOp<T>(endpoint, staged, apply);
			try {
				// one item's writes reach the server in the order they were made
				const response = await inLane(`${endpoint}:${itemId}`, () =>
					authFetch(url, {
						method: "PATCH",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(body),
						keepalive,
					}),
				);
				if (!response.ok) {
					throw new Error(`HTTP error--status: ${response.status}`);
				}
				const saved = reconcile
					? ((await response.json())?.data as T | undefined)
					: undefined;
				settleOp<T>(
					endpoint,
					op,
					saved && reconcile
						? onRow((item) => reconcile(saved, item))
						: undefined,
				);
				return saved;
			} catch (e) {
				console.error(`${whileDoing} ${endpoint}`, e);
				// write failed
				dropOp(endpoint, op);
				// nothing to offer
				if (generation !== listsGeneration()) return;
				reportFailure(labelOf(itemId), () => {
					write({
						itemId,
						merge,
						url,
						body,
						reconcile,
						resort,
						whileDoing,
						keepalive,
					});
				});
			}
		},
		[authFetch, endpoint, statusOrder, labelOf, isHeld],
	);

	const allowedFields = [
		"score",
		"status",
		"note",
		"dateCompleted",
		"indirectUpdate",
		...(extraFieldsToUpdate ?? []),
	];
	const mergeOf = (updates: Partial<T>) => (item: T) =>
		mergeUpdate ? mergeUpdate(item, updates) : { ...item, ...updates };

	// UPDATE
	const update = useCallback(
		async (
			itemId: number,
			updates: Partial<T>,
			indirectUpdate?: boolean,
			staged?: number,
		) => {
			const invalidFields = Object.keys(updates).filter(
				(field) => !allowedFields.includes(field),
			);
			if (invalidFields.length > 0) {
				console.warn("Invalid fields attempted:", invalidFields);
				if (staged !== undefined) dropOp(endpoint, staged);
				return;
			}
			//
			await optimisticWrite({
				itemId,
				merge: mergeOf(updates),
				url: `/api/${endpoint}/${itemId}`,
				body: { ...updates, indirectUpdate },
				reconcile: reconcileUpdate
					? (saved, current) =>
							reconcileUpdate(saved, current, updates)
					: undefined,
				// row movies between status groups -- listing has to re-sort
				resort: "status" in updates,
				whileDoing: "Error updating",
				// a card's edits are often sent as the page goes away
				keepalive: true,
				staged,
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			endpoint,
			extraFieldsToUpdate,
			optimisticWrite,
			mergeUpdate,
			reconcileUpdate,
		],
	);

	// an edit shown in the list now and sent later by update(), or dropped by unstage()
	const stage = useCallback(
		(itemId: number, updates: Partial<T>, staged?: number) => {
			const apply = (rows: T[]) => {
				const next = rows.map((item) =>
					item.id === itemId ? mergeOf(updates)(item) : item,
				);
				return "status" in updates
					? [...next].sort(
							(a, b) =>
								(statusOrder[a.status] ?? 999) -
								(statusOrder[b.status] ?? 999),
						)
					: next;
			};
			if (staged === undefined) return beginOp<T>(endpoint, apply);
			reviseOp<T>(endpoint, staged, apply);
			return staged;
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[endpoint, statusOrder, mergeUpdate],
	);
	const unstage = useCallback(
		(staged: number) => dropOp(endpoint, staged),
		[endpoint],
	);

	// an edit from a card no hub queues for -- shown now, sent once the presses stop
	const updateSoon = useCallback(
		(itemId: number, updates: Partial<T>) => {
			if (!isHeld(itemId)) return;
			watchSoon();
			const key = `${endpoint}:${itemId}`;
			const was = soon.get(key);
			if (was) clearTimeout(was.timer);
			const merged = { ...(was?.updates ?? {}), ...updates };
			soon.set(key, {
				updates: merged,
				staged: stage(itemId, merged as Partial<T>, was?.staged),
				send: (batch, staged) =>
					update(itemId, batch as Partial<T>, undefined, staged),
				timer: setTimeout(() => sendSoon(key), SOON_MS),
			});
		},
		[endpoint, stage, update, isHeld],
	);

	// PART UPDATE -- {for show mean one node not whole item}
	const updatePart = useCallback(
		(
			itemId: number,
			partId: number,
			patch: object,
			// node
			apply: (item: T) => T,
		) =>
			optimisticWrite({
				itemId,
				merge: apply,
				url: `/api/${endpoint}/${itemId}/parts/${partId}`,
				body: patch,
				// merge
				reconcile: (saved, current) => {
					const row = saved as unknown as Record<string, unknown>;
					return { ...current, parts: row.parts, score: row.score };
				},
				whileDoing: "Error updating a part of",
			}),
		[endpoint, optimisticWrite],
	);

	// DELETE
	const remove = useCallback(
		async function removeRow(itemId: number) {
			const label = labelOf(itemId);
			// edits waiting on a row that's going are moot
			const waiting = soon.get(`${endpoint}:${itemId}`);
			if (waiting) {
				clearTimeout(waiting.timer);
				soon.delete(`${endpoint}:${itemId}`);
				dropOp(endpoint, waiting.staged);
			}
			const op = beginOp<T>(endpoint, (rows) =>
				rows.filter((item) => item.id !== itemId),
			);
			try {
				setDeleting(true);
				const response = await inLane(`${endpoint}:${itemId}`, () =>
					authFetch(`/api/${endpoint}/${itemId}`, {
						method: "DELETE",
					}),
				);
				if (!response.ok) {
					throw new Error(`HTTP error--status: ${response.status}`);
				}
				settleOp(endpoint, op);
			} catch (e) {
				console.error("Error deleting " + endpoint, e);
				dropOp(endpoint, op);
				reportFailure(label, () => removeRow(itemId), "delete");
			} finally {
				setDeleting(false);
			}
		},
		[authFetch, endpoint, labelOf],
	);

	// REFRESH
	const refresh = useCallback(
		(itemId: number, metadata: Partial<T>, indirect = false) =>
			optimisticWrite({
				itemId,
				merge: (item) => ({ ...item, ...metadata }),
				url: `/api/${endpoint}/${itemId}/refresh`,
				body: indirect
					? { ...metadata, indirectUpdate: true }
					: metadata,
				reconcile: (saved) => saved,
				whileDoing: "Error refreshing",
			}),
		[endpoint, optimisticWrite],
	);

	// what is held shows at once; the ask behind it only replaces it if it comes back
	useEffect(() => {
		const { rows, at } = listState(endpoint);
		if (rows === null || Date.now() - at > STALE_AFTER) load();
	}, [endpoint, load]);
	return {
		items,
		add,
		update,
		updateSoon,
		stage,
		unstage,
		updatePart,
		refresh,
		remove,
		isProcessing,
	};
}
