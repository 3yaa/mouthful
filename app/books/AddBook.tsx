"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { ModalBackdrop } from "@/app/components/ui/ModalMotion";
import { Book, Loader2 } from "lucide-react";
//
import { BookProps, BookSearchResult } from "@/types/book";
import { MediaCoverProps, SeriesProps, SeriesTargetProps } from "@/types/media";
//
import {
	mapBookAPIDatatoBook,
	pickBookSeries,
} from "@/app/books/utils/bookMapping";
//
import { BookDetails } from "./BookDetailsHub";
import { ShowMultBooks } from "./components/ShowMultBooks";
import { AnimatePresence } from "framer-motion";
//
import { useBookSearch } from "@/hooks/external/useBookSearch";
import { findOnlyNamed } from "@/utils/mediaMatch";

interface AddBookProps {
	isOpen: boolean;
	onClose: () => void;
	existingBooks: BookProps[];
	// resolves true when the score battler took over the flow
	onAddBook: (item: BookProps) => void | Promise<boolean | void>;
	targetFromAbove?: SeriesTargetProps | null;
	// keeps prequel/sequel jumps alive while previewing an unadded book
	onSeriesNav?: (target: SeriesTargetProps) => void;
	isInList?: (target: SeriesTargetProps) => boolean;
	onDuplicate?: (dup: { title: string; key?: string }) => boolean;
}

export function AddBook({
	isOpen,
	onClose,
	onAddBook,
	existingBooks,
	targetFromAbove,
	onSeriesNav,
	isInList,
	onDuplicate,
}: AddBookProps) {
	//failure reasons && their fixes -- for user
	const [failedReason, setFailedReason] = useState("");
	//
	const [activeModal, setActiveModal] = useState<
		"bookDetails" | "multOptions" | null
	>(null);
	//
	const titleToSearch = useRef<HTMLInputElement>(null);
	const [isDupTitle, setIsDupTitle] = useState(false);
	//
	const [newBook, setNewBook] = useState<Partial<BookProps>>({});
	const [series, setSeries] = useState<SeriesProps[]>([]);
	const [seriesIndex, setSeriesIndex] = useState(0);
	//
	const [covers, setCovers] = useState<MediaCoverProps[]>([]);
	const [coverIndex, setCoverIndex] = useState(0);
	// multi-result picker
	const [allNewBooks, setAllNewBooks] = useState<BookSearchResult[]>([]);
	//
	const {
		searchForBooks,
		searchForBooksMulti,
		loadBookByKey,
		isBookSearching,
	} = useBookSearch();

	const reset = useCallback(() => {
		setFailedReason("");
		setIsDupTitle(false);
		//
		setActiveModal(null);
		setNewBook({});
		setCovers([]);
		setCoverIndex(0);
		setAllNewBooks([]);
		if (titleToSearch.current) {
			titleToSearch.current.value = "";
			titleToSearch.current.focus();
		}
	}, []);

	// a title already on file
	const handleDuplicate = useCallback(
		(dup: { title: string; key?: string }) => {
			setActiveModal(null);
			// go to it
			if (onDuplicate?.(dup)) return;
			setFailedReason(`Already Have Book: ${dup.title}`);
			setIsDupTitle(true);
		},
		[onDuplicate],
	);

	const handleBookSearch = useCallback(
		async (knownKey?: string) => {
			if (targetFromAbove) setActiveModal("bookDetails");
			//
			const titleSearching = titleToSearch.current?.value.trim();
			if (!titleSearching) return null;
			//
			if (!targetFromAbove && !knownKey) {
				const owned = findOnlyNamed(existingBooks, titleSearching);
				if (owned) {
					handleDuplicate({ title: owned.title, key: owned.key });
					return;
				}
			}
			//
			const response = await searchForBooks(titleSearching, knownKey);
			// error
			if (!response) return null;
			// dup logic --- NEEDS TO BE ABOVE EMPTY LOGIC CAUSE RESPONSE IS EMPTY
			if ("isDuplicate" in response) {
				handleDuplicate(response);
				return;
			}
			// empty
			if (!response.key || !response.title) {
				setFailedReason("Could Not Find Book.");
				setActiveModal(null);
				return;
			}
			//save books
			setCovers(response.covers || []);
			setNewBook({
				...mapBookAPIDatatoBook(response),
				status: "Want to Read",
				series: pickBookSeries(response.series),
			}); //main
			setSeries(response.series);
			setSeriesIndex(0);
			setCovers(response.covers);
			// reset for series jump
			setCoverIndex(0);
			setActiveModal("bookDetails");
		},
		[searchForBooks, handleDuplicate, existingBooks, targetFromAbove],
	);

	const handleShowMore = useCallback(async () => {
		const q = titleToSearch.current?.value.trim();
		if (!q) return;
		setActiveModal("multOptions");
		const results = await searchForBooksMulti(q);
		setAllNewBooks(results || []);
	}, [searchForBooksMulti]);

	// picked a specific result -- fetch its full record and show it
	const handlePickFromMultBooks = useCallback(
		async (candidate: BookSearchResult) => {
			setActiveModal("bookDetails");
			const full = await loadBookByKey(candidate.key);
			if (!full) {
				setFailedReason("Could Not Load Book.");
				setActiveModal(null);
				return;
			}
			setSeries(full.series || []);
			setSeriesIndex(0);
			setCovers(full.covers || []);
			setCoverIndex(0);
			setNewBook({
				...mapBookAPIDatatoBook(full),
				status: "Want to Read",
				series: pickBookSeries(full.series),
			});
		},
		[loadBookByKey],
	);

	const handleBookDetailsUpdates = useCallback(
		async (_bookId: number, updates?: Partial<BookProps>) => {
			setNewBook((prev) => ({ ...prev, ...updates }));
		},
		[],
	);

	const handleBookAdd = async () => {
		// double check not adding duplicate
		if (newBook.key && isDupTitle) {
			return;
		}

		const finalBook = {
			...newBook,
			cover: covers[coverIndex],
			series: pickBookSeries(series, seriesIndex),
		};
		// only close when the battler did not take over -- closing would clear item scoring
		const isBattling = await onAddBook(finalBook as BookProps);
		if (!isBattling) onClose();
	};

	const handleSeriesChange = useCallback(
		(option: "left" | "right") => {
			// loop
			const newSeriesIndex = ((direction: "left" | "right") => {
				const length = series.length;
				if (direction === "left") {
					return seriesIndex === 0 ? length - 1 : seriesIndex - 1;
				}
				return seriesIndex === length - 1 ? 0 : seriesIndex + 1;
			})(option);
			// series mapping
			setSeriesIndex(newSeriesIndex);
			setNewBook((prev) => ({
				...prev,
				series: pickBookSeries(series, newSeriesIndex),
			}));
		},
		[series, seriesIndex],
	);

	const handleBookDetailsClose = () => {
		reset();
		setActiveModal(null);
		if (targetFromAbove) {
			onClose();
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.stopPropagation();
			handleBookSearch();
		}
	};

	const eraseErrMsg = () => {
		if (failedReason) {
			setFailedReason("");
			setIsDupTitle(false);
		}
	};

	//reset on both because sometimes when opening some ui artificate
	useEffect(() => {
		reset();
	}, [isOpen, reset]);

	// for when to search book without modal
	useEffect(() => {
		if (targetFromAbove) {
			if (titleToSearch.current) {
				titleToSearch.current.value = targetFromAbove.title;
			}
			handleBookSearch(targetFromAbove.id ?? undefined);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [targetFromAbove?.id, targetFromAbove?.title]);

	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};
		//
		window.addEventListener("keydown", handleEscape);
		return () => window.removeEventListener("keydown", handleEscape);
	}, [onClose]);

	if (!isOpen) return null;

	return (
		<ModalBackdrop className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
			{/* maybe not allow user to close modal as new book coming? */}
			<div className="fixed inset-0" onClick={onClose} />
			{!targetFromAbove || !!failedReason ? (
				<div className="bg-linear-to-b from-zinc-950/80 to-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-6 w-full max-w-xl mx-4 relative">
					<h2 className="text-xl font-semibold mb-4 text-zinc-300/90 flex justify-center items-center gap-2">
						<Book className="w-5 h-5 text-zinc-300/90" />
						Search for New Book
					</h2>
					<div className="flex gap-3">
						<div className="relative w-full">
							<input
								type="text"
								ref={titleToSearch}
								placeholder="Search for book..."
								onKeyDown={handleKeyPress}
								onInput={eraseErrMsg}
								disabled={isBookSearching}
								className="w-full bg-zinc-800/50 border border-zinc-800/50 rounded-xl px-4 py-3 pr-11 text-zinc-300 font-medium placeholder-zinc-400 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-900/50 outline-none transition-all duration-200 shadow-lg shadow-black/20"
							/>
							{isBookSearching && (
								<Loader2 className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-500" />
							)}
						</div>
					</div>
					<div className="flex justify-between mx-2">
						{failedReason && !isBookSearching && (
							<div className="mt-3 text-zinc-400 text-sm font-medium">
								{failedReason}
							</div>
						)}
					</div>
				</div>
			) : (
				<input
					type="text"
					ref={titleToSearch}
					disabled
					style={{ display: "none" }}
				/>
			)}
			{activeModal === "bookDetails" && (
				<BookDetails
					book={newBook as BookProps}
					onClose={handleBookDetailsClose}
					onUpdate={handleBookDetailsUpdates}
					addBook={handleBookAdd}
					isLoading={{
						isTrue: isBookSearching,
						style: "h-8 w-8 border-emerald-400",
						text: "Searching...",
					}}
					showBookInSeries={
						series.length > 1 ? handleSeriesChange : undefined
					}
					showSequelPrequel={onSeriesNav}
					isInList={isInList}
					onShowMore={handleShowMore}
					coverUrls={covers}
					coverIndex={coverIndex}
					updateCoverIndex={(newIndex: number) =>
						setCoverIndex(newIndex)
					}
					updateCoverColor={(color: string) =>
						setCovers((prev) =>
							prev.map((c, i) =>
								i === coverIndex ? { ...c, color } : c,
							),
						)
					}
				/>
			)}
			<AnimatePresence>
				{activeModal === "multOptions" && (
					<ShowMultBooks
						key="mult"
						onClose={() => setActiveModal("bookDetails")}
						books={allNewBooks}
						prompt={titleToSearch.current?.value || ""}
						onClickedBook={handlePickFromMultBooks}
						isLoading={isBookSearching}
					/>
				)}
			</AnimatePresence>
		</ModalBackdrop>
	);
}
