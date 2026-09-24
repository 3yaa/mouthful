import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useAuthFetch } from "../app/auth/hooks/useAuthFetch";
import {
	listState,
	loadList,
	NO_LIST,
	patchList,
	subscribeList,
} from "./mediaStore";

const STALE_AFTER = 120_000;
const NO_ROWS: never[] = [];

interface MediaDataConfig<T> {
	endpoint: string;
	extraFieldsToUpdate?: string[];
	requiredFieldsToPost: (keyof T)[];
	statusOrder: Record<string, number>;
}

export function useMediaData<T extends { id: number; status: string }>({
	endpoint,
	statusOrder,
	extraFieldsToUpdate,
	requiredFieldsToPost,
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

	// every write below still thinks in rows
	const setItems = useCallback(
		(fn: (rows: T[]) => T[]) => patchList<T>(endpoint, fn),
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
				const newItem = resJson.data;
				setItems((prev) => {
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
				return newItem;
			} catch (e) {
				console.error("Error adding " + endpoint, e);
			}
		},
		[authFetch, endpoint, requiredFieldsToPost, setItems],
	);

	// WRITE
	const optimisticWrite = useCallback(
		async ({
			itemId,
			merge,
			url,
			body,
			reconcile,
			resort = false,
			whileDoing,
		}: {
			itemId: number;
			// the row as it looks now
			merge: (item: T) => { next: T; before: Partial<T> };
			url: string;
			body: unknown;
			// what to keep
			reconcile?: (saved: T, current: T) => T;
			// status change move row between grps in listing
			resort?: boolean;
			// error log
			whileDoing: string;
		}): Promise<T | undefined> => {
			const ordered = (rows: T[]) =>
				resort
					? [...rows].sort(
							(a, b) =>
								(statusOrder[a.status] ?? 999) -
								(statusOrder[b.status] ?? 999),
						)
					: rows;

			// assigned inside the setter below
			let before: Partial<T> | null = null;
			try {
				setItems((prevItems) =>
					ordered(
						prevItems.map((item) => {
							if (item.id !== itemId) return item;
							const merged = merge(item);
							before = merged.before;
							return merged.next;
						}),
					),
				);

				const response = await authFetch(url, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(body),
				});
				if (!response.ok) {
					throw new Error(`HTTP error--status: ${response.status}`);
				}
				if (!reconcile) return;

				const saved = (await response.json())?.data as T | undefined;
				if (saved) {
					setItems((prevItems) =>
						prevItems.map((item) =>
							item.id === itemId ? reconcile(saved, item) : item,
						),
					);
				}
				return saved;
			} catch (e) {
				console.error(`${whileDoing} ${endpoint}`, e);
				// write failed -- stop claiming it did
				if (before) {
					const revert = before as Partial<T>;
					setItems((prevItems) =>
						ordered(
							prevItems.map((item) =>
								item.id === itemId
									? { ...item, ...revert }
									: item,
							),
						),
					);
				}
			}
		},
		[authFetch, endpoint, setItems, statusOrder],
	);

	// only the keys actually being written
	const sliceOf = (item: T, written: Partial<T>): Partial<T> =>
		Object.fromEntries(
			Object.keys(written).map((key) => [key, item[key as keyof T]]),
		) as Partial<T>;

	// UPDATE
	const update = useCallback(
		async (
			itemId: number,
			updates: Partial<T>,
			indirectUpdate?: boolean,
		) => {
			// only updates these
			const allowedFields = [
				"score",
				"status",
				"note",
				"dateCompleted",
				"indirectUpdate",
				...(extraFieldsToUpdate ?? []),
			];
			const invalidFields = Object.keys(updates).filter(
				(field) => !allowedFields.includes(field),
			);
			if (invalidFields.length > 0) {
				console.warn("Invalid fields attempted:", invalidFields);
				return;
			}
			//
			await optimisticWrite({
				itemId,
				merge: (item) => ({
					next: { ...item, ...updates },
					before: sliceOf(item, updates),
				}),
				url: `/api/${endpoint}/${itemId}`,
				body: { ...updates, indirectUpdate },
				// row movies between status groups -- listing has to re-sort
				resort: "status" in updates,
				whileDoing: "Error updating",
			});
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[endpoint, extraFieldsToUpdate, optimisticWrite],
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
				merge: (item) => ({
					next: apply(item),
					// only the marks move, so only the marks are put back
					before: {
						parts: (item as Record<string, unknown>).parts,
					} as unknown as Partial<T>,
				}),
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
		async (itemId: number) => {
			try {
				setDeleting(true);
				// update locally
				setItems((prevItems) => {
					return prevItems.filter((item) => item.id !== itemId);
				});
				// update db
				const url = `/api/${endpoint}/${itemId}`;
				const options = {
					method: "DELETE",
				};
				const response = await authFetch(url, options);
				if (!response.ok) {
					throw new Error(`HTTP error--status: ${response.status}`);
				}
			} catch (e) {
				console.error("Error deleting " + endpoint, e);
			} finally {
				setDeleting(false);
			}
		},
		[authFetch, endpoint, setItems],
	);

	// REFRESH
	const refresh = useCallback(
		(itemId: number, metadata: Partial<T>, indirect = false) =>
			optimisticWrite({
				itemId,
				merge: (item) => ({
					next: { ...item, ...metadata },
					before: sliceOf(item, metadata),
				}),
				url: `/api/${endpoint}/${itemId}/refresh`,
				body: indirect
					? { ...metadata, indirectUpdate: true }
					: metadata,
				reconcile: (saved) => saved,
				whileDoing: "Error refreshing",
			}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
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
		updatePart,
		refresh,
		remove,
		isProcessing,
	};
}
