import {
	BaseMediaProps,
	MediaStatus,
	SeriesJumpProps,
	SortState,
} from "@/types/media";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useTransition,
} from "react";
import { useScrollVisibility } from "./useScrollVisibility";
import { useScrollLock } from "./useScrollLock";
import { hasEscapeLayers } from "./useEscapeClose";
import { debounce } from "@/utils/debounce";
import { Score } from "@/lib/tierConfig";
import { createSession } from "@/lib/battleSession";
import { MODAL_EXIT_MS } from "@/app/components/ui/ModalMotion";

const LIT_HOLD_SLACK_MS = 60;

interface ManageMediaConfig<T extends BaseMediaProps> {
	items: T[];
	onAdd: (item: T) => Promise<T | undefined>;
	onRemove: (itemId: number) => Promise<void>;
	onUpdate: (
		itemId: number,
		updates: Partial<T>,
		indirectUpdate?: boolean,
		staged?: number,
	) => Promise<void>;
	// an edit to an item no card here owns
	onUpdateSoon: (itemId: number, updates: Partial<T>) => void;
	// the card's edits show in the list at once and are sent on flush
	onStage: (itemId: number, updates: Partial<T>, staged?: number) => number;
	onUnstage: (staged: number) => void;
	onRefresh?: (
		itemId: number,
		metadata: Partial<T>,
		indirect?: boolean,
	) => Promise<T | undefined>;
	// bc anime nodes can't be pitted against items
	isEligibleOpponent?: (item: T) => boolean;
}

// commit it on the way out
export function useCommitOnUnmount(commit: () => void) {
	const latest = useRef(commit);
	useEffect(() => {
		latest.current = commit;
	});
	useEffect(() => () => latest.current(), []);
}

export function useManageMedia<T extends BaseMediaProps>({
	items,
	onAdd,
	onRemove,
	onUpdate,
	onUpdateSoon,
	onStage,
	onUnstage,
	onRefresh,
	isEligibleOpponent,
}: ManageMediaConfig<T>) {
	const [statusFilter, setStatusFilter] = useState<MediaStatus | null>(null);
	const [sortConfig, setSortConfig] = useState<SortState<string> | null>(
		null,
	);
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [selected, setSelected] = useState<T | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	// what an add flow was opened for: a series jump knows the id it wants
	const [titleToUse, setTitleToUse] = useState<SeriesJumpProps | null>(null);
	const [activeModal, setActiveModal] = useState<
		"detailsModal" | "addModal" | null
	>(null);
	// a first score being placed -- over whatever is open, which stays put
	const [battle, setBattle] = useState<{ item: T; score: Score } | null>(
		null,
	);
	const pendingUpdates = useRef<Partial<T>>({});
	const pendingFor = useRef<number | null>(null);
	const stagedOp = useRef<number | null>(null);
	const selectedItem = useMemo(
		() =>
			selected
				? (items.find((i) => i.id === selected.id) ?? selected)
				: null,
		[items, selected],
	);
	const selectedId = useRef<number | null>(null);
	selectedId.current = selectedItem?.id ?? null;
	// used for mobile only
	const isMenuButtonsVisible = useScrollVisibility(30);

	//
	const debouncedSetQuery = useRef(
		debounce((value: string) => {
			setDebouncedQuery(value);
		}, 300),
	).current;
	// SEARCH
	const searchedItems = useMemo(() => {
		if (!debouncedQuery) return items;

		return items.filter((item) =>
			item.title.toLowerCase().trim().includes(debouncedQuery),
		);
	}, [items, debouncedQuery]);
	// FILTER
	const [isFilterPending, startTransition] = useTransition();
	const filteredItems = useMemo(() => {
		if (!statusFilter) return searchedItems;
		//
		return searchedItems.filter((item) => item.status === statusFilter);
	}, [searchedItems, statusFilter]);

	//
	const DATE_SORT_KEYS = ["dateCompleted", "dateReleased", "datePublished"];

	const handleSortConfig = (sortType: string) => {
		const isDateSort = DATE_SORT_KEYS.includes(sortType);
		setSortConfig((prev) => {
			if (!prev || prev.type !== sortType) {
				return { type: sortType, order: isDateSort ? "asc" : "desc" };
			} else if (prev.order === (isDateSort ? "asc" : "desc")) {
				return { type: sortType, order: isDateSort ? "desc" : "asc" };
			} else {
				return null;
			}
		});
	};

	const handleStatusFilterConfig = (status: MediaStatus) => {
		startTransition(() => {
			if (statusFilter === status) {
				setStatusFilter(null);
			} else {
				setStatusFilter(status);
			}
		});
	};

	const handleSearchQueryChange = (value: string) => {
		setSearchQuery(value);
		debouncedSetQuery(value.toLowerCase().trim());
	};

	const itemsRef = useRef(items);
	itemsRef.current = items;

	// push the batch to the db and start a fresh one
	const flushPending = useCallback(() => {
		const itemId = pendingFor.current;
		const op = stagedOp.current;
		const updates = pendingUpdates.current;
		pendingUpdates.current = {};
		pendingFor.current = null;
		stagedOp.current = null;
		const live = itemsRef.current.some((i) => i.id === itemId);
		if (itemId !== null && live && Object.keys(updates).length > 0)
			onUpdate(itemId, updates, undefined, op ?? undefined);
		else if (op !== null) onUnstage(op);
	}, [onUpdate, onUnstage]);

	const flushRef = useRef(flushPending);
	flushRef.current = flushPending;

	// a write that skips the queue
	const flushFor = useCallback(
		(itemId: number) => {
			if (pendingFor.current === itemId) flushPending();
		},
		[flushPending],
	);

	// an edit landing after the card closed or the page left has no later flush
	const cardOpen = useRef(false);
	const alive = useRef(true);
	cardOpen.current = activeModal === "detailsModal";

	// batch an update, flushing first if it belongs to a different item
	const queueUpdate = useCallback(
		(itemId: number, updates: Partial<T>) => {
			if (pendingFor.current !== null && pendingFor.current !== itemId) {
				flushPending();
			}
			//
			if (updates.score && pendingUpdates.current.score === null)
				flushPending();
			pendingFor.current = itemId;
			pendingUpdates.current = { ...pendingUpdates.current, ...updates };
			stagedOp.current = onStage(
				itemId,
				pendingUpdates.current,
				stagedOp.current ?? undefined,
			);
			if (!cardOpen.current || !alive.current)
				queueMicrotask(() => flushRef.current());
		},
		[flushPending, onStage],
	);

	//
	const dropQueued = useCallback(
		(itemId: number, keys: string[]) => {
			if (pendingFor.current !== itemId) return;
			for (const key of keys)
				delete pendingUpdates.current[key as keyof T];
			if (stagedOp.current === null) return;
			if (Object.keys(pendingUpdates.current).length)
				onStage(itemId, pendingUpdates.current, stagedOp.current);
			else {
				onUnstage(stagedOp.current);
				stagedOp.current = null;
				pendingFor.current = null;
			}
		},
		[onStage, onUnstage],
	);

	const handleItemClicked = useCallback(
		(item: T) => {
			// a series/DLC jump
			if (pendingFor.current !== null && pendingFor.current !== item.id)
				flushPending();
			setActiveModal("detailsModal");
			setSelected(item);
		},
		[flushPending],
	);

	//
	const writeEdit = useCallback(
		(itemId: number, updates: Partial<T>) => {
			if (itemId === selectedId.current || itemId === pendingFor.current)
				queueUpdate(itemId, updates);
			else onUpdateSoon(itemId, updates);
		},
		[queueUpdate, onUpdateSoon],
	);

	// a first score is placed against the rest
	const startBattle = useCallback(
		(item: T, score: Score, added = false) => {
			const done =
				score.mu >= 2000 ||
				createSession(
					itemsRef.current
						.filter(
							(i) =>
								i.score !== null &&
								i.id !== item.id &&
								(isEligibleOpponent?.(i) ?? true),
						)
						.map((i) => ({ id: i.id, score: i.score! })),
					{ id: item.id, score },
				).done;
			// an add already saved its score
			if (done) {
				if (!added) writeEdit(item.id, { score } as Partial<T>);
				return;
			}
			setBattle({ item, score });
		},
		[isEligibleOpponent, writeEdit],
	);

	const handleScoreFinal = useCallback(
		(finalScore: Score) => {
			if (battle)
				writeEdit(battle.item.id, { score: finalScore } as Partial<T>);
			setBattle(null);
		},
		[battle, writeEdit],
	);
	const closeBattle = useCallback(() => setBattle(null), []);

	//
	const handleOpponentUpdate = useCallback(
		(itemId: number, score: Score) => {
			// the battle's number is newer than one queued before it
			dropQueued(itemId, ["score"]);
			onUpdate(itemId, { score } as Partial<T>, true);
		},
		[dropQueued, onUpdate],
	);

	// the add modal
	const handleItemAdd = useCallback(
		async (item: T) => {
			const newItem = await onAdd(item);
			if (!newItem) return false;
			handleItemClicked(newItem);
			if (newItem.score) startBattle(newItem, newItem.score, true);
			return true;
		},
		[onAdd, startBattle, handleItemClicked],
	);

	// from inside an open card
	const handleWorkAdd = useCallback(
		async (item: T): Promise<T | undefined> => {
			const newItem = await onAdd(item);
			if (newItem?.score) startBattle(newItem, newItem.score, true);
			return newItem;
		},
		[onAdd, startBattle],
	);

	const handleItemUpdates = useCallback(
		async (
			itemId: number,
			updates?: Partial<T>,
			shouldDelete?: boolean,
		) => {
			if (shouldDelete) return await onRemove(itemId);
			if (!updates) return;
			// a draft committed after its row was deleted
			const target = itemsRef.current.find((i) => i.id === itemId);
			if (!target) return;
			if (updates.score && !target.score) {
				const { score, ...rest } = updates;
				if (Object.keys(rest).length)
					writeEdit(itemId, rest as Partial<T>);
				startBattle(target, score);
				return;
			}
			writeEdit(itemId, updates);
		},
		[onRemove, writeEdit, startBattle],
	);

	const handleItemRefresh = useCallback(
		async (metadata: Partial<T>, indirect?: boolean) => {
			const itemId = selectedId.current;
			if (itemId === null || !onRefresh) return;
			// drop undefined values
			const clean = Object.fromEntries(
				Object.entries(metadata).filter(([, v]) => v !== undefined),
			) as Partial<T>;
			if (Object.keys(clean).length === 0) return;
			// the refresh is newer than anything queued for these fields
			dropQueued(itemId, Object.keys(clean));
			// the rest goes first
			flushFor(itemId);
			await onRefresh(itemId, clean, indirect);
		},
		[onRefresh, dropQueued, flushFor],
	);

	// leaving the page sends a card's edits a beat later
	useEffect(() => {
		alive.current = true;
		return () => {
			alive.current = false;
			queueMicrotask(() => flushRef.current());
		};
	}, []);
	// a reload, closed tab or backgrounded phone runs no cleanups
	useEffect(() => {
		const away = () => {
			if (document.activeElement instanceof HTMLElement)
				document.activeElement.blur();
			flushRef.current();
		};
		// switching tabs only sends what's queued
		const hidden = () => {
			if (document.visibilityState === "hidden") flushRef.current();
		};
		window.addEventListener("pagehide", away);
		document.addEventListener("visibilitychange", hidden);
		return () => {
			window.removeEventListener("pagehide", away);
			document.removeEventListener("visibilitychange", hidden);
		};
	}, []);
	//
	useEffect(() => {
		if (activeModal !== "detailsModal") flushRef.current();
	}, [activeModal]);

	const handleModalClose = useCallback(() => {
		// push any pending update to db -- have only one update
		flushPending();
		// normal
		setActiveModal(null);
		// wait a frame before clearing state
		requestAnimationFrame(() => {
			setTitleToUse(null);
			setSelected(null);
		});
	}, [flushPending]);

	// when item comes from landing page
	const deepLinkUsed = useRef(false);
	useEffect(() => {
		if (deepLinkUsed.current || !items.length) return;
		const params = new URLSearchParams(window.location.search);
		const wanted = Number(params.get("open"));
		if (!wanted) return;

		deepLinkUsed.current = true;
		window.history.replaceState(null, "", window.location.pathname);
		const item = items.find((i) => i.id === wanted);
		//
		if (item) handleItemClicked(item);
	}, [items, handleItemClicked]);

	useEffect(() => {
		const handleEnter = (e: KeyboardEvent) => {
			const isDesktop = window.matchMedia("(min-width: 900px)").matches;
			if (!isDesktop) return;
			// if no modal is open and not typing in an input/textarea
			if (
				e.key === "Enter" &&
				!activeModal &&
				!battle &&
				// a card opened from elsewhere on the page/focused control, owns the key
				!hasEscapeLayers() &&
				!(
					e.target instanceof Element &&
					e.target.closest(
						"input, textarea, select, button, a, [contenteditable]",
					)
				)
			) {
				setActiveModal("addModal");
			}
		};
		//
		window.addEventListener("keydown", handleEnter);
		return () => window.removeEventListener("keydown", handleEnter);
	}, [activeModal, battle]);

	// keep listing row awake
	const [openItemId, setOpenItemId] = useState<number | null>(null);
	const litId =
		activeModal === "detailsModal" ? (selectedItem?.id ?? null) : null;
	if (litId !== null && litId !== openItemId) setOpenItemId(litId);
	//
	useEffect(() => {
		if (litId !== null) return;
		const done = setTimeout(
			() => setOpenItemId(null),
			MODAL_EXIT_MS + LIT_HOLD_SLACK_MS,
		);
		return () => clearTimeout(done);
	}, [litId]);

	useScrollLock(!!activeModal || !!battle);

	return {
		// items
		filteredItems,
		// states
		battle,
		sortConfig,
		titleToUse,
		activeModal,
		searchQuery,
		statusFilter,
		selectedItem,
		openItemId,
		setTitleToUse,
		setActiveModal,
		isFilterPending,
		isMenuButtonsVisible,
		// handlers
		flushFor,
		handleItemAdd,
		handleWorkAdd,
		handleScoreFinal,
		closeBattle,
		handleOpponentUpdate,
		handleSortConfig,
		handleModalClose,
		handleItemUpdates,
		handleItemRefresh,
		handleItemClicked,
		handleSearchQueryChange,
		handleStatusFilterConfig,
	};
}
