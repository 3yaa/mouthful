"use client";
import { useCallback } from "react";
import { MangaProps } from "@/types/manga";
import { DIFF_COLUMNS_MANGA } from "@/types/manga";
import { useMediaData } from "@/hooks/useMediaData";
import { MANGA_LIST } from "@/hooks/mediaLists";
import { useManageMedia } from "@/hooks/useManageMedia";
import { useSortMedia } from "@/hooks/useSortMedia";
import { mangaStatusOptions } from "@/utils/dropDownDetails";
import { AddManga } from "./AddManga";
import { MangaDetails } from "./MangaDetailsHub";
import { DesktopListing } from "@/app/views/mediaListing/DesktopListing";
import { MobileListing } from "@/app/views/mediaListing/MobileListing";
import { AddButton } from "../components/ui/AddButton";
import { isSameName } from "@/utils/mediaMatch";
import { SeriesJumpProps, SeriesTargetProps } from "@/types/media";
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

export default function MangaHub() {
	// GET DATA FROM DB
	const { items, add, update, refresh, remove, isProcessing } =
		useMediaData<MangaProps>(MANGA_LIST);

	// MANAGEMENT OF STATES
	const {
		tempScore,
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
		handleItemAdd,
	} = useManageMedia<MangaProps>({
		onAdd: add,
		items: items,
		onRemove: remove,
		onUpdate: update,
		onRefresh: refresh,
	});

	// MANAGES ANY SORTS
	const sortedManga = useSortMedia(
		filteredItems,
		sortConfig,
		DIFF_COLUMNS_MANGA,
	);

	// item a series jump points at
	const findOwned = useCallback(
		(target: SeriesTargetProps) =>
			target.id
				? items.find((manga) => String(manga.anilistId) === target.id)
				: items.find((manga) => isSameName(manga, target.title)),
		[items],
	);

	const isInList = useCallback(
		(target: SeriesTargetProps) => !!findOwned(target),
		[findOwned],
	);

	// sequel/prequel navigation
	const showSequelPrequel = useCallback(
		(jump: SeriesJumpProps) => {
			const owned = findOwned(jump);
			if (!owned) {
				setTitleToUse(jump);
				setActiveModal("addModal");
				return;
			}
			const filled = jump.hop && backfillRuns(owned.series, jump.hop)[0];
			if (filled) update(owned.id, { series: filled }, true);
			handleItemClicked(filled ? { ...owned, series: filled } : owned);
		},
		[findOwned, handleItemClicked, setTitleToUse, setActiveModal, update],
	);

	return (
		<div className="min-h-screen">
			<div className="lg:block hidden">
				<DesktopListing
					mediaItems={sortedManga}
					isProcessing={isProcessing}
					sortConfig={sortConfig}
					statusOptions={mangaStatusOptions.map(
						(status) => status.value,
					)}
					curStatusFilter={statusFilter}
					mediaType="manga"
					differentColumns={DIFF_COLUMNS_MANGA}
					searchQuery={searchQuery}
					emptyListText="No manga yet - add one!"
					openItemId={openItemId}
					onItemClicked={handleItemClicked}
					onSortConfig={handleSortConfig}
					onSearchChange={handleSearchQueryChange}
					onStatusFilter={handleStatusFilterConfig}
				/>
			</div>
			<div className="block lg:hidden">
				<MobileListing
					mediaItems={sortedManga}
					isProcessing={isProcessing || isFilterPending}
					sortConfig={sortConfig}
					statusOptions={mangaStatusOptions.map(
						(status) => status.value,
					)}
					curStatusFilter={statusFilter}
					mediaType="manga"
					differentColumns={DIFF_COLUMNS_MANGA}
					searchQuery={searchQuery}
					emptyListText="No manga yet - add one!"
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
					<AddManga
						key="add"
						isOpen={activeModal === "addModal"}
						onClose={handleModalClose}
						existingManga={items}
						onAddManga={handleItemAdd}
						targetFromAbove={titleToUse}
						onSeriesNav={showSequelPrequel}
						isInList={isInList}
						onDuplicate={(dup) => {
							const owned =
								(dup.anilistId
									? items.find(
											(m) =>
												m.anilistId === dup.anilistId,
										)
									: undefined) ??
								items.find((m) => isSameName(m, dup.title));
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
					<MangaDetails
						key="details"
						manga={selectedItem}
						existingManga={items}
						onClose={handleModalClose}
						onUpdate={handleItemUpdates}
						onRefresh={handleItemRefresh}
						showSequelPrequel={showSequelPrequel}
						isInList={isInList}
					/>
				)}
			</AnimatePresence>
			{/* SCORE BATTLER */}
			<AnimatePresence>
				{activeModal === "scoreBattlerModal" &&
					selectedItem &&
					tempScore && (
						<ScoreBattlerHub
							key="battler"
							mediaType="manga"
							items={items}
							initialScore={tempScore}
							onClose={() => {
								setActiveModal("detailsModal");
							}}
							selectedItem={selectedItem}
							onScoreFinal={handleScoreFinal}
							onOpponentUpdate={(id, score) =>
								handleItemUpdates(id, { score })
							}
						/>
					)}
			</AnimatePresence>
		</div>
	);
}
