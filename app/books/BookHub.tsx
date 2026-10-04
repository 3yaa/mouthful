"use client";
import { useCallback, useState } from "react";
import { BookProps } from "@/types/book";
import { DIFF_COLUMNS_BOOK } from "@/types/book";
import { useMediaData } from "@/hooks/useMediaData";
import { BOOK_LIST } from "@/hooks/mediaLists";
import { useManageMedia } from "@/hooks/useManageMedia";
import { useSortMedia } from "@/hooks/useSortMedia";
import { bookStatusOptions } from "@/utils/dropDownDetails";
import { AddBook } from "./AddBook";
import { BookDetails } from "./BookDetailsHub";
import { DesktopListing } from "@/app/views/mediaListing/DesktopListing";
import { MobileListing } from "@/app/views/mediaListing/MobileListing";
import { AddButton } from "../components/ui/AddButton";
import { isSameName } from "@/utils/mediaMatch";
import { SeriesJumpProps, SeriesProps, SeriesTargetProps } from "@/types/media";
import { backfillRuns } from "@/utils/seriesRead";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
// load score dynamically
const ScoreBattlerHub = dynamic(
	() =>
		import("../views/mediaDetails/shared/scoreBattler/ScoreBattlerHub").then(
			(m) => m.ScoreBattlerHub,
		),
	{ ssr: false },
);

export default function BookHub() {
	// GET DATA FROM DB
	const {
		items,
		add,
		update,
		updateSoon,
		stage,
		unstage,
		refresh,
		remove,
		isProcessing,
	} = useMediaData<BookProps>(BOOK_LIST);

	// MANAGEMENT OF STATES
	const {
		battle,
		filteredItems,
		sortConfig,
		statusFilter,
		searchQuery,
		selectedItem,
		openItemId,
		titleToUse,
		setTitleToUse,
		activeModal,
		setActiveModal,
		isMenuButtonsVisible,
		isFilterPending,
		handleSortConfig,
		handleStatusFilterConfig,
		handleModalClose,
		handleItemClicked,
		handleSearchQueryChange,
		handleItemUpdates,
		handleItemRefresh,
		handleScoreFinal,
		closeBattle,
		handleOpponentUpdate,
		handleItemAdd,
	} = useManageMedia<BookProps>({
		onAdd: add,
		items: items,
		onRemove: remove,
		onUpdate: update,
		onUpdateSoon: updateSoon,
		onStage: stage,
		onUnstage: unstage,
		onRefresh: refresh,
	});

	// MANAGES ANY SORTS
	const sortedBooks = useSortMedia(
		filteredItems,
		sortConfig,
		DIFF_COLUMNS_BOOK,
	);

	// item a series jump points at
	const findOwned = useCallback(
		(target: SeriesTargetProps) =>
			target.id
				? items.find((book) => book.key === target.id)
				: items.find((book) => isSameName(book, target.title)),
		[items],
	);

	const isInList = useCallback(
		(target: SeriesTargetProps) => !!findOwned(target),
		[findOwned],
	);

	// runs a jump offers the book it lands on -- previewed
	const [landing, setLanding] = useState<{
		id: number;
		runs: SeriesProps[];
	} | null>(null);

	// sequel/prequel navigation
	const showSequelPrequel = useCallback(
		(jump: SeriesJumpProps) => {
			const owned = findOwned(jump);
			if (!owned) {
				setTitleToUse(jump);
				setActiveModal("addModal");
				return;
			}
			const runs = jump.hop ? backfillRuns(owned.series, jump.hop) : [];
			setLanding(runs.length ? { id: owned.id, runs } : null);
			handleItemClicked(owned);
		},
		[findOwned, handleItemClicked, setTitleToUse, setActiveModal],
	);

	return (
		<div className="min-h-screen">
			<div className="lg:block hidden">
				<DesktopListing
					mediaItems={sortedBooks}
					isProcessing={isProcessing}
					sortConfig={sortConfig}
					statusOptions={bookStatusOptions.map(
						(status) => status.value,
					)}
					curStatusFilter={statusFilter}
					mediaType="book"
					differentColumns={DIFF_COLUMNS_BOOK}
					searchQuery={searchQuery}
					emptyListText="No books yet — add one!"
					openItemId={openItemId}
					onItemClicked={handleItemClicked}
					onSortConfig={handleSortConfig}
					onSearchChange={handleSearchQueryChange}
					onStatusFilter={handleStatusFilterConfig}
				/>
			</div>
			<div className="block lg:hidden">
				<MobileListing
					mediaItems={sortedBooks}
					isProcessing={isProcessing || isFilterPending}
					sortConfig={sortConfig}
					statusOptions={bookStatusOptions.map(
						(status) => status.value,
					)}
					curStatusFilter={statusFilter}
					mediaType="book"
					differentColumns={DIFF_COLUMNS_BOOK}
					searchQuery={searchQuery}
					emptyListText="No books yet — add one!"
					onItemClicked={handleItemClicked}
					onSortConfig={handleSortConfig}
					onStatusFilter={handleStatusFilterConfig}
					onSearchChange={handleSearchQueryChange}
				/>
			</div>
			{/* ADD BUTTON */}
			<AddButton
				onClick={() => setActiveModal("addModal")}
				isVisible={isMenuButtonsVisible}
			/>
			{/* ADD MODAL */}
			<AnimatePresence>
				{activeModal === "addModal" && (
					<AddBook
						key="add"
						isOpen={activeModal === "addModal"}
						onClose={handleModalClose}
						existingBooks={items}
						onAddBook={handleItemAdd}
						targetFromAbove={titleToUse}
						onSeriesNav={showSequelPrequel}
						isInList={isInList}
						onDuplicate={(dup) => {
							const owned =
								(dup.key
									? items.find((b) => b.key === dup.key)
									: undefined) ??
								items.find((b) => isSameName(b, dup.title));
							if (!owned) return false;
							setTitleToUse(null);
							handleItemClicked(owned);
							return true;
						}}
					/>
				)}
			</AnimatePresence>
			{/* DETAILS MODAL */}
			<AnimatePresence>
				{activeModal === "detailsModal" && selectedItem && (
					<BookDetails
						key="details"
						book={selectedItem}
						onClose={handleModalClose}
						onUpdate={handleItemUpdates}
						onRefresh={handleItemRefresh}
						showSequelPrequel={showSequelPrequel}
						landingRuns={
							landing?.id === selectedItem.id
								? landing.runs
								: undefined
						}
						onLandingStaged={() => setLanding(null)}
						isInList={isInList}
					/>
				)}
			</AnimatePresence>
			{/* SCORE BATTLER */}
			<AnimatePresence>
				{battle && (
					<ScoreBattlerHub
						key={`battler-${battle.item.id}`}
						mediaType="book"
						items={items}
						initialScore={battle.score}
						selectedItem={battle.item}
						onClose={closeBattle}
						onScoreFinal={handleScoreFinal}
						onOpponentUpdate={handleOpponentUpdate}
					/>
				)}
			</AnimatePresence>
		</div>
	);
}
