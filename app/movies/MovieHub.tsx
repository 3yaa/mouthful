"use client";
import { useCallback, useState } from "react";
import { MovieProps } from "@/types/movie";
import { isRealTmdbId, isSameName } from "@/utils/mediaMatch";
import { SeriesTargetProps } from "@/types/media";
import { DIFF_COLUMNS_MOVIE } from "@/types/movie";
import { useMediaData } from "@/hooks/useMediaData";
import { useManageMedia } from "@/hooks/useManageMedia";
import { useSortMedia } from "@/hooks/useSortMedia";
import { movieStatusOptions } from "@/utils/dropDownDetails";
import { AddMovie } from "./AddMovie";
import { AddShow } from "@/app/shows/AddShow";
import { MovieDetails } from "./MovieDetailsHub";
import { DesktopListing } from "@/app/views/mediaListing/DesktopListing";
import { MobileListing } from "@/app/views/mediaListing/MobileListing";
import { AddButton } from "../components/ui/AddButton";
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
import { Score } from "@/lib/tierConfig";
import { ShowProps } from "@/types/show";
import { withPartPatch } from "@/app/shows/utils/animePartMarks";

export default function MoviesHub() {
	const { items, add, update, refresh, remove, isProcessing } =
		useMediaData<MovieProps>({
			endpoint: "movies",
			requiredFieldsToPost: ["title", "status", "imdbId"],
			statusOrder: { "Want to Watch": 0, Completed: 1, Dropped: 2 },
			extraFieldsToUpdate: ["series"],
		});

	// IN-CASE NEED SHOW DATA
	const {
		items: showItems,
		add: showAdd,
		update: showUpdate,
		updatePart: showUpdatePart,
		remove: showRemove,
	} = useMediaData<ShowProps>({
		endpoint: "shows",
		requiredFieldsToPost: ["title", "status", "tmdbId"],
		statusOrder: {
			Watching: 0,
			"Want to Watch": 1,
			Completed: 2,
			Dropped: 3,
		},
		extraFieldsToUpdate: ["curSeasonIndex", "curEpisode"],
	});

	// SHOW BATTLER
	const [showBattle, setShowBattle] = useState<{
		item: ShowProps;
		score: Score;
	} | null>(null);

	const handleShowUpdates = useCallback(
		(
			showId: number,
			updates?: Partial<ShowProps>,
			shouldDelete?: boolean,
		) => {
			if (shouldDelete) {
				showRemove(showId);
				return;
			}
			if (!updates) return;
			const target = showItems.find((s) => s.id === showId);
			// go through the ringer
			if (updates.score && target && !target.score) {
				setShowBattle({ item: target, score: updates.score });
				return;
			}
			showUpdate(showId, updates, true);
		},
		[showItems, showUpdate, showRemove],
	);

	const {
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
		tempScore,
		handleScoreFinal,
		handleItemAdd,
	} = useManageMedia<MovieProps>({
		onAdd: add,
		items: items,
		onRemove: remove,
		onUpdate: update,
		onRefresh: refresh,
	});

	const sortedMovies = useSortMedia(
		filteredItems,
		sortConfig,
		DIFF_COLUMNS_MOVIE,
	);

	const handleBackfillTmdbId = useCallback(
		(movieId: number, tmdbId: string) => {
			refresh(movieId, { tmdbId } as Partial<MovieProps>, true);
		},
		[refresh],
	);

	const [chainShowTitle, setChainShowTitle] = useState<string | null>(null);

	// adding a show from a movie's actor modal
	const handleShowAdd = useCallback(
		async (show: ShowProps) => {
			const newItem = await showAdd(show);
			if (!newItem?.score) return false;
			setShowBattle({ item: newItem, score: newItem.score });
			return true;
		},
		[showAdd],
	);

	const findOwned = useCallback(
		(target: SeriesTargetProps) =>
			isRealTmdbId(target.id ?? undefined)
				? items.find(
						(movie) =>
							isRealTmdbId(movie.tmdbId) &&
							movie.tmdbId === target.id,
					)
				: items.find((movie) => isSameName(movie, target.title)),
		[items],
	);

	const isInList = useCallback(
		(target: SeriesTargetProps) => !!findOwned(target),
		[findOwned],
	);

	// sequel/prequel navigation
	const showSequelPrequel = useCallback(
		(target: SeriesTargetProps) => {
			const owned = findOwned(target);
			if (owned) {
				// owned -- hand it to the real details modal
				handleItemClicked(owned);
			} else {
				setTitleToUse(target);
				setActiveModal("addModal");
			}
		},
		[findOwned, handleItemClicked, setTitleToUse, setActiveModal],
	);

	return (
		<div className="min-h-screen">
			<div className="lg:block hidden">
				<DesktopListing
					mediaItems={sortedMovies}
					isProcessing={isProcessing}
					sortConfig={sortConfig}
					statusOptions={movieStatusOptions.map(
						(status) => status.value,
					)}
					curStatusFilter={statusFilter}
					mediaType="movie"
					differentColumns={DIFF_COLUMNS_MOVIE}
					searchQuery={searchQuery}
					emptyListText="No movies yet — add one!"
					openItemId={openItemId}
					onItemClicked={handleItemClicked}
					onSortConfig={handleSortConfig}
					onSearchChange={handleSearchQueryChange}
					onStatusFilter={handleStatusFilterConfig}
				/>
			</div>
			<div className="block lg:hidden">
				<MobileListing
					mediaItems={sortedMovies}
					isProcessing={isProcessing || isFilterPending}
					sortConfig={sortConfig}
					statusOptions={movieStatusOptions.map(
						(status) => status.value,
					)}
					curStatusFilter={statusFilter}
					mediaType="movie"
					differentColumns={DIFF_COLUMNS_MOVIE}
					searchQuery={searchQuery}
					emptyListText="No movies yet — add one!"
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
					<AddMovie
						key="add"
						isOpen={activeModal === "addModal"}
						onClose={handleModalClose}
						existingMovies={items}
						existingShows={showItems}
						onAddMovie={handleItemAdd}
						targetFromAbove={titleToUse}
						onSeriesNav={showSequelPrequel}
						isInList={isInList}
						onAnimeChain={(found) => {
							handleModalClose();
							setChainShowTitle(found.showTitle);
						}}
						onDuplicate={(dup) => {
							const owned =
								(dup.tmdbId
									? items.find((m) => m.tmdbId === dup.tmdbId)
									: undefined) ??
								(dup.imdbId
									? items.find((m) => m.imdbId === dup.imdbId)
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
					<MovieDetails
						key="details"
						movie={selectedItem}
						onClose={handleModalClose}
						onUpdate={handleItemUpdates}
						onRefresh={handleItemRefresh}
						onBackfillTmdbId={handleBackfillTmdbId}
						showSequelPrequel={showSequelPrequel}
						isInList={isInList}
						existingMovies={items}
						onAddWork={handleItemAdd}
						//
						existingShows={showItems}
						onShowUpdate={handleShowUpdates}
						onShowUpdatePart={(showId, anilistId, patch) =>
							showUpdatePart(showId, anilistId, patch, (item) =>
								withPartPatch(item, anilistId, patch),
							)
						}
						onAddShow={handleShowAdd}
					/>
				)}
			</AnimatePresence>
			{/* THE SHOW A MOVIE TURNED OUT TO BELONG TO */}
			<AnimatePresence>
				{chainShowTitle && (
					<AddShow
						key="chain-show"
						isOpen
						titleFromAbove={chainShowTitle}
						existingShows={showItems}
						onAddShow={handleShowAdd}
						onClose={() => setChainShowTitle(null)}
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
							mediaType="movie"
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
			{/* SCORE BATTLER -- cross media (a show opened from an actor) */}
			<AnimatePresence>
				{showBattle && (
					<ScoreBattlerHub
						key="show-battler"
						mediaType="show"
						items={showItems}
						initialScore={showBattle.score}
						selectedItem={showBattle.item}
						onClose={() => setShowBattle(null)}
						onScoreFinal={(score) => {
							showUpdate(showBattle.item.id, { score }, true);
							setShowBattle(null);
						}}
						onOpponentUpdate={(id, score) =>
							showUpdate(id, { score }, true)
						}
					/>
				)}
			</AnimatePresence>
		</div>
	);
}
