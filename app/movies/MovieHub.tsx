"use client";
import { useCallback, useMemo, useState } from "react";
import { MovieProps } from "@/types/movie";
import { isSameName } from "@/utils/mediaMatch";
import { DIFF_COLUMNS_MOVIE } from "@/types/movie";
import { useMediaData } from "@/hooks/useMediaData";
import { useCrossList } from "@/hooks/useCrossList";
import { useSeriesJump } from "@/hooks/useSeriesJump";
import { MOVIE_LIST, SHOW_LIST } from "@/hooks/mediaLists";
import { useManageMedia } from "@/hooks/useManageMedia";
import { useSortMedia } from "@/hooks/useSortMedia";
import { movieStatusOptions } from "@/utils/dropDownDetails";
import { AddMovie } from "./AddMovie";
import { AddShow } from "@/app/shows/AddShow";
import { MovieDetails } from "./MovieDetailsHub";
import { ShowDetails } from "@/app/shows/ShowDetailsHub";
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
import { ShowProps } from "@/types/show";
import { isBattleReady, withPartPatch } from "@/app/shows/utils/animePartMarks";

export default function MoviesHub() {
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
	} = useMediaData<MovieProps>(MOVIE_LIST);

	// IN-CASE NEED SHOW DATA
	const shows = useCrossList<ShowProps>(SHOW_LIST);
	// same pool the shows hub battles against
	const showPool = useMemo(
		() => shows.items.filter(isBattleReady),
		[shows.items],
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
		refreshItem,
		battle,
		handleScoreFinal,
		closeBattle,
		handleOpponentUpdate,
		handleItemAdd,
		handleWorkAdd,
	} = useManageMedia<MovieProps>({
		onAdd: add,
		items: items,
		onRemove: remove,
		onUpdate: update,
		onUpdateSoon: updateSoon,
		onStage: stage,
		onUnstage: unstage,
		onRefresh: refresh,
	});

	const sortedMovies = useSortMedia(
		filteredItems,
		sortConfig,
		DIFF_COLUMNS_MOVIE,
	);

	const [chainShowTitle, setChainShowTitle] = useState<string | null>(null);
	// an anime part's mark, from any show card opened here
	const { updatePart: updateShowPart } = shows;
	const handleShowPart = useCallback(
		(
			showId: number,
			anilistId: number,
			patch: Parameters<typeof withPartPatch>[2],
		) =>
			updateShowPart(showId, anilistId, patch, (item) =>
				withPartPatch(item, anilistId, patch),
			),
		[updateShowPart],
	);
	// the chain show once it's added
	const [chainShowId, setChainShowId] = useState<number | null>(null);
	const chainShow =
		chainShowId != null
			? shows.items.find((s) => s.id === chainShowId)
			: undefined;

	// sequel/prequel navigation
	const { isInList, jump: showSequelPrequel } = useSeriesJump({
		items,
		idOf: (movie) => movie.tmdbId,
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
						onMovieRefresh={refreshItem}
						onShowRefresh={shows.handleRefresh}
						existingMovies={items}
						onAddWork={handleWorkAdd}
						existingShows={shows.items}
						onShowUpdate={shows.handleUpdates}
						onShowUpdatePart={handleShowPart}
						onAddShow={shows.handleAdd}
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
						onMovieRefresh={refreshItem}
						onShowRefresh={shows.handleRefresh}
						onUpdate={handleItemUpdates}
						onRefresh={handleItemRefresh}
						showSequelPrequel={showSequelPrequel}
						isInList={isInList}
						existingMovies={items}
						onAddWork={handleWorkAdd}
						//
						existingShows={shows.items}
						onShowUpdate={shows.handleUpdates}
						onShowUpdatePart={handleShowPart}
						onAddShow={shows.handleAdd}
					/>
				)}
			</AnimatePresence>
			{/* THE SHOW A MOVIE TURNED OUT TO BELONG TO */}
			<AnimatePresence>
				{chainShowTitle && (
					<AddShow
						key="chain-show"
						isOpen
						targetFromAbove={{ title: chainShowTitle }}
						existingShows={shows.items}
						onAddWork={shows.handleAdd}
						existingMovies={items}
						onMovieUpdate={handleItemUpdates}
						onAddMovie={handleWorkAdd}
						onAddShow={async (s) => {
							const added = await shows.handleAdd(s);
							if (added) setChainShowId(added.id);
						}}
						onClose={() => setChainShowTitle(null)}
					/>
				)}
			</AnimatePresence>
			<AnimatePresence>
				{/* steps aside while a movie of its own takes the screen */}
				{chainShow && !activeModal && (
					<ShowDetails
						key="chain-show-details"
						show={chainShow}
						onClose={() => setChainShowId(null)}
						onRefresh={(meta) =>
							shows.handleRefresh(chainShow.id, meta)
						}
						onShowRefresh={shows.handleRefresh}
						onMovieRefresh={refreshItem}
						onUpdate={shows.handleUpdates}
						onUpdatePart={handleShowPart}
						existingShows={shows.items}
						onAddWork={shows.handleAdd}
						existingMovies={items}
						onMovieUpdate={handleItemUpdates}
						onAddMovie={handleWorkAdd}
					/>
				)}
			</AnimatePresence>
			{/* SCORE BATTLER */}
			<AnimatePresence>
				{battle && (
					<ScoreBattlerHub
						key={`battler-${battle.item.id}`}
						mediaType="movie"
						items={items}
						initialScore={battle.score}
						selectedItem={battle.item}
						onClose={closeBattle}
						onScoreFinal={handleScoreFinal}
						onOpponentUpdate={handleOpponentUpdate}
					/>
				)}
			</AnimatePresence>
			{/* SCORE BATTLER -- cross media (a show opened from an actor) */}
			<AnimatePresence>
				{shows.battle && (
					<ScoreBattlerHub
						key="show-battler"
						mediaType="show"
						items={showPool}
						initialScore={shows.battle.score}
						selectedItem={shows.battle.item}
						onClose={shows.closeBattle}
						onScoreFinal={shows.finishBattle}
						onOpponentUpdate={shows.handleOpponentUpdate}
					/>
				)}
			</AnimatePresence>
		</div>
	);
}
