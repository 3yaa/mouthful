"use client";
import { useMemo } from "react";
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
import { useSeriesJump } from "@/hooks/useSeriesJump";
import { AnimatePresence } from "framer-motion";
import { withPages } from "../components/ui/MangaBackdrop";
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
	} = useMediaData<MangaProps>(MANGA_LIST);

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
	} = useManageMedia<MangaProps>({
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
	const sortedManga = useSortMedia(
		filteredItems,
		sortConfig,
		DIFF_COLUMNS_MANGA,
	);
	const pagedManga = useMemo(() => withPages(sortedManga), [sortedManga]);

	// sequel/prequel navigation
	const { isInList, jump: showSequelPrequel } = useSeriesJump({
		items,
		idOf: (manga) => (manga.anilistId ? String(manga.anilistId) : null),
		saveSeries: (id, series) => update(id, { series }, true),
		openOwned: handleItemClicked,
		openAdd: (jump) => {
			setTitleToUse(jump);
			setActiveModal("addModal");
		},
	});

	return (
		<div className="min-h-screen">
			<div className="lg:block hidden">
				<DesktopListing
					mediaItems={pagedManga}
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
					mediaItems={pagedManga}
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
				{battle && (
					<ScoreBattlerHub
						key={`battler-${battle.item.id}`}
						mediaType="manga"
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
