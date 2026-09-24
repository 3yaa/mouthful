"use client";
import { useCallback, useState } from "react";
import { GameProps, IGDBInitProps, DIFF_COLUMNS_GAME } from "@/types/game";
import { useMediaData } from "@/hooks/useMediaData";
import { useManageMedia } from "@/hooks/useManageMedia";
import { useSortMedia } from "@/hooks/useSortMedia";
import { gameStatusOptions } from "@/utils/dropDownDetails";
import { AddGame } from "./AddGame";
import { GameDetails } from "./GameDetailsHub";
import { DesktopListing } from "@/app/views/mediaListing/DesktopListing";
import { MobileListing } from "@/app/views/mediaListing/MobileListing";
import { AddButton } from "../components/ui/AddButton";
import { isSameName } from "@/utils/mediaMatch";
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

export default function GameList() {
	const { items, add, update, refresh, remove, isProcessing } =
		useMediaData<GameProps>({
			endpoint: "games",
			requiredFieldsToPost: ["title", "status", "igdbId"],
			statusOrder: { Playing: 0, Completed: 1, Dropped: 2 },
		});

	const {
		filteredItems,
		sortConfig,
		statusFilter,
		searchQuery,
		selectedItem,
		openItemId,
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
		tempScore,
		handleScoreFinal,
		handleItemAdd,
	} = useManageMedia<GameProps>({
		onAdd: add,
		items: items,
		onRemove: remove,
		onUpdate: update,
		onRefresh: refresh,
	});

	const sortedGames = useSortMedia(
		filteredItems,
		sortConfig,
		DIFF_COLUMNS_GAME,
	);

	const handleGameRefresh = useCallback(
		async (metadata: Partial<GameProps>) => {
			if (!selectedItem) return;
			await handleItemRefresh(metadata);
			if (selectedItem.dlcIndex === 0 && metadata.dlcs) {
				const mainId = selectedItem.igdbId;
				const newDlcs = metadata.dlcs;
				const siblings = items.filter(
					(g) =>
						g.id !== selectedItem.id && g.dlcs?.[0]?.id === mainId,
				);
				await Promise.all(
					siblings.map((sib) => {
						// re-point each sibling's index in case the source reordered dlcs
						const idx = newDlcs.findIndex(
							(d) => d.id === sib.igdbId,
						);
						const payload: Partial<GameProps> =
							idx >= 0
								? { dlcs: newDlcs, dlcIndex: idx }
								: { dlcs: newDlcs };
						// indirect -- a background ordering sync shouldn't reorder the list
						return refresh(sib.id, payload, true);
					}),
				);
			}
		},
		[selectedItem, items, handleItemRefresh, refresh],
	);

	// for when searching for dlcs within details
	const [titleToAdd, setTitleToAdd] = useState<{
		dlcIndex: number;
		mainTitle: string;
		dlcs: IGDBInitProps[];
	} | null>(null);

	//
	const showDlc = useCallback(
		(targetIgdbId: number, dlcIndex: number, source: GameProps) => {
			if (!targetIgdbId) return;
			const targetGame = items.find(
				(game) => game.igdbId === targetIgdbId,
			);
			if (targetGame) {
				// owned -- hand it to the real details modal
				handleItemClicked(targetGame);
			} else if (source.dlcs) {
				// the base game
				const mainTitle =
					source.dlcs[0]?.name ?? source.mainTitle ?? source.title;
				setTitleToAdd({
					dlcIndex,
					mainTitle: mainTitle || "",
					dlcs: source.dlcs,
				});
				setActiveModal("addModal");
			}
		},
		[items, handleItemClicked, setActiveModal],
	);

	// override generic close to also clear titleToAdd
	const handleGameModalClose = useCallback(() => {
		handleModalClose();
		setTitleToAdd(null);
	}, [handleModalClose]);

	return (
		<div className="min-h-screen">
			<div className="lg:block hidden">
				<DesktopListing
					mediaItems={sortedGames}
					isProcessing={isProcessing}
					sortConfig={sortConfig}
					statusOptions={gameStatusOptions.map(
						(status) => status.value,
					)}
					curStatusFilter={statusFilter}
					mediaType="game"
					differentColumns={DIFF_COLUMNS_GAME}
					searchQuery={searchQuery}
					emptyListText="No games yet — add one!"
					openItemId={openItemId}
					onItemClicked={handleItemClicked}
					onSortConfig={handleSortConfig}
					onSearchChange={handleSearchQueryChange}
					onStatusFilter={handleStatusFilterConfig}
				/>
			</div>
			<div className="block lg:hidden">
				<MobileListing
					mediaItems={sortedGames}
					isProcessing={isProcessing || isFilterPending}
					sortConfig={sortConfig}
					statusOptions={gameStatusOptions.map(
						(status) => status.value,
					)}
					curStatusFilter={statusFilter}
					mediaType="game"
					differentColumns={DIFF_COLUMNS_GAME}
					searchQuery={searchQuery}
					emptyListText="No games yet — add one!"
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
					<AddGame
						key="add"
						isOpen={activeModal === "addModal"}
						onClose={handleGameModalClose}
						existingGames={items}
						onAddGame={handleItemAdd}
						titleFromAbove={titleToAdd}
						onDlcNav={showDlc}
						onDuplicate={(dup) => {
							const owned =
								(dup.igdbId
									? items.find((g) => g.igdbId === dup.igdbId)
									: undefined) ??
								items.find((g) => isSameName(g, dup.title));
							if (!owned) return false;
							setTitleToAdd(null);
							handleItemClicked(owned);
							return true;
						}}
					/>
				)}
			</AnimatePresence>
			{/* DETAILS MODAL */}
			<AnimatePresence>
				{activeModal === "detailsModal" && selectedItem && (
					<GameDetails
						key="details"
						game={selectedItem}
						onClose={handleGameModalClose}
						onUpdate={handleItemUpdates}
						onRefresh={handleGameRefresh}
						showDlc={showDlc}
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
							mediaType="game"
						/>
					)}
			</AnimatePresence>
		</div>
	);
}
