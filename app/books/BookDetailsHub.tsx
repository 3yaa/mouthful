"use client";
import { BookProps, BookSearchResult, DIFF_COLUMNS_BOOK } from "@/types/book";
import { MediaCoverProps, SeriesProps, SeriesTargetProps } from "@/types/media";
import { seriesNeighbours } from "@/utils/seriesRead";
import { useEffect, useState } from "react";
import { DesktopDetails } from "@/app/views/mediaDetails/DesktopDetails";
import { bookStatusOptions } from "@/utils/dropDownDetails";
import { MobileDetails } from "@/app/views/mediaDetails/MobileDetails";
import { TIER_PHI_THRESHOLD, getSeedMu, Tier } from "@/lib/tierConfig";
import { useScoreNudge } from "@/hooks/useScoreNudge";
import { useAddWait } from "@/hooks/useAddWait";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { PickList, useReloadPreview } from "@/hooks/useReloadPreview";
import { useBookSearch } from "@/hooks/external/useBookSearch";
import { mapBookAPIDatatoBook, pickBookSeries } from "./utils/bookMapping";
import { ShowMultBooks } from "./components/ShowMultBooks";
import { AnimatePresence } from "framer-motion";

export type BookAction =
	| { type: "closeModal" }
	| { type: "delete" }
	| {
			type: "changeStatus";
			payload: "Completed" | "Want to Read" | "Dropped";
	  }
	| { type: "resetScore" }
	| { type: "nudgeScore"; payload: "up" | "down" }
	| { type: "setInitialTier"; payload: Tier }
	| { type: "changeNote"; payload: string }
	| { type: "saveNote" }
	| { type: "seriesNav"; payload: "sequel" | "prequel" }
	| { type: "changeCover"; payload: "next" | "prev" }
	| { type: "clearSeriesMeta" }
	| { type: "refresh" }
	| { type: "confirmRefresh" }
	| { type: "cancelRefresh" }
	| { type: "pickCoverColor"; payload: string }
	| { type: "moreBooks" };

interface BookDetailsProps {
	book: BookProps;
	onClose: () => void;
	isLoading?: { isTrue: boolean; style: string; text: string };
	onUpdate: (
		bookId: number,
		updates?: Partial<BookProps>,
		takeAction?: boolean,
	) => void;
	addBook?: () => void | Promise<unknown>;
	showSequelPrequel?: (target: SeriesTargetProps) => void;
	isInList?: (target: SeriesTargetProps) => boolean;
	showBookInSeries?: (seriesDir: "left" | "right") => void;
	onShowMore?: () => void;
	onRefresh?: (metadata: Partial<BookProps>) => Promise<void>;
	//
	coverUrls?: MediaCoverProps[];
	coverIndex?: number;
	updateCoverIndex?: (newIndex: number) => void;
	updateCoverColor?: (color: string) => void;
}

// choices a book reload offers
type BookPicks = {
	covers: PickList<MediaCoverProps>;
	series: PickList<SeriesProps>;
};

// identity for the render path to read while nothing is staged
const NO_RESULTS: BookSearchResult[] = [];

export function BookDetails({
	onClose,
	book,
	onUpdate,
	addBook,
	isLoading,
	showBookInSeries, //when wiki gives more then 1 option
	showSequelPrequel,
	isInList,
	onShowMore,
	onRefresh,
	coverUrls,
	coverIndex,
	updateCoverIndex,
	updateCoverColor,
}: BookDetailsProps) {
	const [localNote, setLocalNote] = useState(book.note || "");
	const { searchForBooksMulti, loadBookByKey, isBookSearching } =
		useBookSearch();
	const [multResultsOpen, setMultResultsOpen] = useState(false);
	const reload = useReloadPreview<BookProps, BookPicks, BookSearchResult[]>({
		onRefresh,
		canLoad: !!book.key,
		// reload via key
		load: async () => {
			if (!book.key) return null;
			const response = await loadBookByKey(book.key);
			if (!response) return null;
			const mapped = mapBookAPIDatatoBook(response);
			const meta: Partial<BookProps> = {
				numPages: mapped.numPages,
				rating: mapped.rating,
				series: pickBookSeries(response.series),
			};
			const covers = response.covers ?? [];
			// start on the cover closest to the one already saved
			const startIdx = covers.findIndex((c) => c.url === book.cover?.url);
			return {
				meta,
				lists: {
					covers: {
						items: covers,
						index: startIdx >= 0 ? startIdx : 0,
					},
					series: { items: response.series ?? [], index: 0 },
				},
				extra: [],
			};
		},
		// apply the previewed cover + metadata
		toMeta: ({ meta, lists }) => {
			const next: Partial<BookProps> = { ...meta };
			if (lists.covers.items.length)
				next.cover = lists.covers.items[lists.covers.index];
			return next;
		},
		// the results panel belongs to the flow, so it closes with it
		onExit: () => setMultResultsOpen(false),
	});
	const { isRefreshing, isSelecting } = reload;
	const art = isSelecting
		? { covers: reload.list("covers") }
		: { covers: { items: coverUrls, index: coverIndex } };
	const stagedSeries = reload.list("series");
	const refreshResults = reload.preview?.extra ?? NO_RESULTS;
	// manual +/- 0.1 score tweaks -- phi tightens once, on close
	const { nudge: nudgeScore, commit: commitScoreNudge } = useScoreNudge(
		book,
		onUpdate,
	);

	const handleAction = (action: BookAction) => {
		switch (action.type) {
			// =========modal actions=============
			case "closeModal":
				handleModalClose();
				break;
			case "delete":
				handleDelete();
				break;
			// =========update actions=============
			case "changeStatus":
				handleStatusChange(action.payload);
				break;
			case "setInitialTier":
				onUpdate(book.id, {
					score: {
						mu: getSeedMu(action.payload),
						phi: TIER_PHI_THRESHOLD[action.payload],
					},
				});
				break;
			case "resetScore":
				onUpdate(book.id, { score: null });
				break;
			case "nudgeScore":
				nudgeScore(action.payload);
				break;
			case "changeNote":
				setLocalNote(action.payload);
				break;
			case "saveNote":
				handleSaveNote();
				break;
			case "changeCover":
				if (isSelecting) handleSelectCoverChange(action.payload);
				else handleCoverChange(action.payload);
				break;
			case "clearSeriesMeta":
				if (book.series) onUpdate(book.id, { series: null });
				break;
			// =========other actions=============
			case "seriesNav":
				handleSeriesOpen(action.payload);
				break;
			case "refresh":
				reload.refresh();
				break;
			case "confirmRefresh":
				reload.confirm();
				break;
			case "cancelRefresh":
				reload.cancel();
				break;
			case "pickCoverColor":
				handlePickCoverColor(action.payload);
				break;
			case "moreBooks":
				if (isSelecting) handleShowRefreshResults();
				else onShowMore?.();
				break;
		}
	};

	const handleShowRefreshResults = async () => {
		setMultResultsOpen(true);
		const q = [book.title, book.author].filter(Boolean).join(" ");
		const results = await searchForBooksMulti(q);
		reload.patch((p) => ({ ...p, extra: results || [] }));
	};

	const handlePickAnotherResult = async (candidate: BookSearchResult) => {
		setMultResultsOpen(false);
		await reload.runBusy(async () => {
			const full = await loadBookByKey(candidate.key);
			if (!full) return;
			const mapped = mapBookAPIDatatoBook(full);
			reload.patch((p) => ({
				...p,
				meta: {
					key: full.key,
					title: mapped.title,
					author: mapped.author,
					datePublished: mapped.datePublished,
					numPages: mapped.numPages,
					rating: mapped.rating,
					series: pickBookSeries(full.series),
				},
				lists: {
					covers: { items: full.covers ?? [], index: 0 },
					series: { items: full.series ?? [], index: 0 },
				},
			}));
		});
	};

	const handlePickCoverColor = (color: string) => {
		if (isSelecting) {
			reload.patch((p) => ({
				...p,
				lists: {
					...p.lists,
					covers: {
						...p.lists.covers,
						items: p.lists.covers.items.map((c, i) =>
							i === p.lists.covers.index ? { ...c, color } : c,
						),
					},
				},
			}));
		} else {
			updateCoverColor?.(color);
		}
	};

	const handleRefreshSeriesChange = (dir: "left" | "right") => {
		const { items, index } = stagedSeries;
		if (items.length < 2) return;
		const newIndex =
			dir === "left"
				? index === 0
					? items.length - 1
					: index - 1
				: index === items.length - 1
					? 0
					: index + 1;
		reload.patch((p) => ({
			...p,
			lists: {
				...p.lists,
				series: { ...p.lists.series, index: newIndex },
			},
			meta: {
				...p.meta,
				series: pickBookSeries(stagedSeries.items, newIndex),
			},
		}));
	};

	const handleSelectCoverChange = (dir: "next" | "prev") => {
		const total = art.covers.items?.length ?? 0;
		if (!total) return;
		reload.setListIndex("covers", (i) =>
			dir === "next" ? (i + 1) % total : i === 0 ? total - 1 : i - 1,
		);
	};

	const handleStatusChange = (value: string) => {
		const newStatus = value as "Completed" | "Want to Read";
		const statusLoad: Partial<BookProps> = {
			status: newStatus,
		};
		if (newStatus === "Completed") {
			statusLoad.dateCompleted = new Date();
		} else if (book.dateCompleted) {
			statusLoad.dateCompleted = null;
		}
		onUpdate(book.id, statusLoad);
	};

	const handleCoverChange = (dir: string) => {
		if (!updateCoverIndex || coverIndex === undefined || !coverUrls) {
			return;
		}
		//
		let newCoverIndex = coverIndex;
		if (dir === "next") {
			newCoverIndex = (coverIndex + 1) % coverUrls.length;
		} else if (dir === "prev") {
			newCoverIndex =
				coverIndex === 0 ? coverUrls.length - 1 : coverIndex - 1;
		}
		updateCoverIndex(newCoverIndex);
	};

	const handleSeriesOpen = (seriesDir: string) => {
		if (!showSequelPrequel) return;
		const { prev, next } = seriesNeighbours(book);
		const target = seriesDir === "sequel" ? next : prev;
		if (target) showSequelPrequel(target);
	};

	const handleSaveNote = () => {
		if (localNote !== book.note) {
			onUpdate(book.id, { note: localNote });
		}
	};

	const handleDelete = () => {
		onClose();
		const shouldDelete = true;
		onUpdate(book.id, undefined, shouldDelete);
	};

	const handleModalClose = () => {
		// fold the deferred phi drop into the update this close flushes
		commitScoreNudge();
		onClose();
	};
	useEscapeClose(handleModalClose);

	const { isSubmitting, submit: handleAddBook } = useAddWait(addBook);

	// need to reset local note
	useEffect(() => {
		setLocalNote(book.note || "");
		reload.cancel();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [book.id]);

	useEffect(() => {
		const handleLeave = (e: KeyboardEvent) => {
			if (e.key === "Enter") {
				const activeElement = document.activeElement;
				const isInTextarea = activeElement?.tagName === "TEXTAREA";
				const isInInput = activeElement?.tagName === "INPUT";
				if (!isInTextarea && !isInInput) {
					handleAddBook();
				}
			}
		};
		//
		window.addEventListener("keydown", handleLeave);
		return () => window.removeEventListener("keydown", handleLeave);
	}, [onClose, handleAddBook]);

	if (!book) return null;

	const displayLoading = isRefreshing
		? {
				isTrue: true,
				style: "h-8 w-8 border-emerald-400",
				text: "Reloading...",
			}
		: isLoading;

	// apply refresh to preview
	const previewBook = isSelecting
		? {
				...book,
				...reload.meta,
				cover: art.covers.items?.[art.covers.index ?? 0] ?? book.cover,
			}
		: book;

	return (
		<>
			<div className="lg:block hidden">
				<DesktopDetails
					item={previewBook}
					localNote={localNote}
					statusOptions={bookStatusOptions}
					mediaType="book"
					isLoading={displayLoading}
					isAdding={!!addBook}
					onAdd={handleAddBook}
					isSubmitting={isSubmitting}
					onClose={handleModalClose}
					onSeriesNav={
						isSelecting
							? stagedSeries.items.length > 1
								? handleRefreshSeriesChange
								: undefined
							: showBookInSeries
					}
					canRefresh={!!onRefresh}
					isInList={isInList}
					isSelecting={isSelecting}
					onAction={
						handleAction as (action: {
							type: string;
							payload?: unknown;
						}) => void
					}
					differentColumns={DIFF_COLUMNS_BOOK}
					coverUrls={art.covers.items}
					coverIndex={art.covers.index}
				/>
			</div>
			<div className="block lg:hidden">
				<MobileDetails
					item={previewBook}
					localNote={localNote}
					statusOptions={bookStatusOptions}
					mediaType="book"
					isLoading={displayLoading}
					isAdding={!!addBook}
					onAdd={handleAddBook}
					isSubmitting={isSubmitting}
					onClose={handleModalClose}
					onSeriesNav={
						isSelecting
							? stagedSeries.items.length > 1
								? handleRefreshSeriesChange
								: undefined
							: showBookInSeries
					}
					isInList={isInList}
					isSelecting={isSelecting}
					canRefresh={!!onRefresh}
					onAction={
						handleAction as (action: {
							type: string;
							payload?: unknown;
						}) => void
					}
					differentColumns={DIFF_COLUMNS_BOOK}
					coverUrls={art.covers.items}
					coverIndex={art.covers.index}
				/>
			</div>
			{/* PICK A DIFFERENT RESULT (refresh) */}
			<AnimatePresence>
				{multResultsOpen && (
					<ShowMultBooks
						key="mult-refresh"
						onClose={() => setMultResultsOpen(false)}
						books={refreshResults}
						prompt={book.title}
						onClickedBook={handlePickAnotherResult}
						isLoading={isBookSearching}
					/>
				)}
			</AnimatePresence>
		</>
	);
}
