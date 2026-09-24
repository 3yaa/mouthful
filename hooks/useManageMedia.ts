import {
	BaseMediaProps,
	MediaStatus,
	SeriesTargetProps,
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
import { debounce } from "@/utils/debounce";
import { Score } from "@/lib/tierConfig";
import { createSession } from "@/lib/battleSession";
import { MODAL_EXIT_MS } from "@/app/components/ui/ModalMotion";

const LIT_HOLD_SLACK_MS = 60;

interface ManageMediaConfig<T extends BaseMediaProps> {
	items: T[];
	onAdd: (item: T) => Promise<T>;
	onRemove: (itemId: number) => Promise<void>;
	onUpdate: (
		itemId: number,
		updates: Partial<T>,
		indirectUpdate?: boolean,
	) => Promise<void>;
	onRefresh?: (
		itemId: number,
		metadata: Partial<T>,
	) => Promise<T | undefined>;
	// bc anime nodes can't be pitted against items
	isEligibleOpponent?: (item: T) => boolean;
}

export function useManageMedia<T extends BaseMediaProps>({
	items,
	onAdd,
	onRemove,
	onUpdate,
	onRefresh,
	isEligibleOpponent,
}: ManageMediaConfig<T>) {
	const [statusFilter, setStatusFilter] = useState<MediaStatus | null>(null);
	const [sortConfig, setSortConfig] = useState<SortState<string> | null>(
		null,
	);
	const [debouncedQuery, setDebouncedQuery] = useState("");
	const [selectedItem, setSelectedItem] = useState<T | null>(null);
	const [searchQuery, setSearchQuery] = useState("");
	// what an add flow was opened for: a series jump knows the id it wants
	const [titleToUse, setTitleToUse] = useState<SeriesTargetProps | null>(
		null,
	);
	const [activeModal, setActiveModal] = useState<
		"detailsModal" | "addModal" | "scoreBattlerModal" | null
	>(null);
	const [tempScore, setTempScore] = useState<Score | null>(null);
	const pendingUpdates = useRef<Partial<T>>({});
	const pendingFor = useRef<number | null>(null);
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

	// push the batch to the db and start a fresh one
	const flushPending = useCallback(() => {
		const itemId = pendingFor.current;
		if (itemId !== null && Object.keys(pendingUpdates.current).length > 0) {
			onUpdate(itemId, pendingUpdates.current);
		}
		pendingUpdates.current = {};
		pendingFor.current = null;
	}, [onUpdate]);

	// batch an update, flushing first if it belongs to a different item
	const queueUpdate = useCallback(
		(itemId: number, updates: Partial<T>) => {
			if (pendingFor.current !== null && pendingFor.current !== itemId) {
				flushPending();
			}
			pendingFor.current = itemId;
			pendingUpdates.current = { ...pendingUpdates.current, ...updates };
		},
		[flushPending],
	);

	const handleItemClicked = useCallback((item: T) => {
		setActiveModal("detailsModal");
		setSelectedItem(item);
	}, []);

	const handleScoreFinal = useCallback(
		(finalScore: Score) => {
			if (!selectedItem?.id) return;
			setSelectedItem({ ...selectedItem, score: finalScore });
			queueUpdate(selectedItem.id, { score: finalScore } as Partial<T>);
			setTempScore(null);
			setActiveModal("detailsModal");
		},
		[selectedItem, queueUpdate],
	);

	// returns whether the battler took over
	const handleItemAdd = useCallback(
		async (item: T) => {
			const newItem = await onAdd(item);
			if (!newItem?.score) return false;
			setActiveModal("scoreBattlerModal");
			setSelectedItem(newItem);
			setTempScore(newItem.score);
			return true;
		},
		[onAdd],
	);

	const handleItemUpdates = useCallback(
		async (
			itemId: number,
			updates?: Partial<T>,
			shouldDelete?: boolean,
		) => {
			if (shouldDelete) return await onRemove(itemId);
			if (!updates) return;

			const isSelectedItem = itemId === selectedItem?.id;
			// on actor modal open different item
			const targetItem = isSelectedItem
				? selectedItem
				: items.find((i) => i.id === itemId);

			const isNewScore = updates.score && !targetItem?.score;

			if (isNewScore && updates.score && targetItem) {
				const skipScoreBattle =
					updates.score.mu >= 2000 ||
					createSession(
						items
							.filter(
								(i) =>
									i.score !== null &&
									i.id !== itemId &&
									(isEligibleOpponent?.(i) ?? true),
							)
							.map((i) => ({ id: i.id, score: i.score! })),
						{ id: itemId, score: updates.score },
					).done;
				//
				if (skipScoreBattle) {
					setSelectedItem({ ...targetItem, ...updates });
					queueUpdate(itemId, updates);
					return;
				}
				setSelectedItem(targetItem);
				setTempScore(updates.score);
				setActiveModal("scoreBattlerModal");
				return;
			}

			// for opponent updates
			if (!isSelectedItem) {
				const indirectUpdate = true;
				onUpdate(itemId, updates, indirectUpdate);
				return;
			}
			// normal update
			setSelectedItem({ ...selectedItem, ...updates });
			queueUpdate(itemId, updates);
		},
		[
			onRemove,
			onUpdate,
			selectedItem,
			items,
			queueUpdate,
			isEligibleOpponent,
		],
	);

	const handleItemRefresh = useCallback(
		async (metadata: Partial<T>) => {
			if (!selectedItem?.id || !onRefresh) return;
			// drop undefined values
			const clean = Object.fromEntries(
				Object.entries(metadata).filter(([, v]) => v !== undefined),
			) as Partial<T>;
			if (Object.keys(clean).length === 0) return;
			// reflect refreshed metadata in the open modal immediately
			setSelectedItem({ ...selectedItem, ...clean });
			await onRefresh(selectedItem.id, clean);
		},
		[selectedItem, onRefresh],
	);

	const handleModalClose = useCallback(() => {
		// push any pending update to db -- have only one update
		flushPending();
		// normal
		setActiveModal(null);
		// wait a frame before clearing state
		requestAnimationFrame(() => {
			setTitleToUse(null);
			setSelectedItem(null);
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
				!(
					e.target instanceof HTMLInputElement ||
					e.target instanceof HTMLTextAreaElement
				)
			) {
				setActiveModal("addModal");
			}
		};
		//
		window.addEventListener("keydown", handleEnter);
		return () => window.removeEventListener("keydown", handleEnter);
	}, [activeModal]);

	// keep listing row awake
	const [openItemId, setOpenItemId] = useState<number | null>(null);
	const modalOwnsAnItem =
		activeModal === "detailsModal" || activeModal === "scoreBattlerModal";
	const litId = modalOwnsAnItem ? (selectedItem?.id ?? null) : null;
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

	useScrollLock(!!activeModal);

	return {
		// items
		filteredItems,
		// states
		tempScore,
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
		setSelectedItem,
		isMenuButtonsVisible,
		// handlers
		handleItemAdd,
		handleScoreFinal,
		handleSortConfig,
		handleModalClose,
		handleItemUpdates,
		handleItemRefresh,
		handleItemClicked,
		handleSearchQueryChange,
		handleStatusFilterConfig,
	};
}
