"use client";
import { ShowProps } from "@/types/show";
import { DIFF_COLUMNS_SHOW } from "./utils/showDiffColumns";
import { useCallback, useMemo, useState } from "react";
import { useMediaData } from "@/hooks/useMediaData";
import { useCrossList } from "@/hooks/useCrossList";
import { MANGA_LIST, MOVIE_LIST, SHOW_LIST } from "@/hooks/mediaLists";
import { useManageMedia } from "@/hooks/useManageMedia";
import { useSortMedia } from "@/hooks/useSortMedia";
import { showStatusOptions } from "@/utils/dropDownDetails";
import { AddShow } from "./AddShow";
import { ShowDetails } from "./ShowDetailsHub";
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
import { MovieProps } from "@/types/movie";
import { MangaProps } from "@/types/manga";
import { isAnimeRow } from "./utils/slotRef";
import type { PartBattle } from "./hooks/usePartMarks";
import {
	isBattleReady,
	PartPatch,
	withPartPatch,
} from "./utils/animePartMarks";

export default function ShowHub() {
	const {
		items,
		add,
		update,
		updateSoon,
		stage,
		unstage,
		updatePart,
		refresh,
		remove,
		isProcessing,
	} = useMediaData<ShowProps>(SHOW_LIST);

	// part of an anime chain, mid-battle
	const [partBattle, setPartBattle] = useState<PartBattle | null>(null);

	// IN-CASE NEED MOVIE DATA
	const movies = useCrossList<MovieProps>(MOVIE_LIST);
	// an anime's source
	const manga = useCrossList<MangaProps>(MANGA_LIST);

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
		battle,
		handleScoreFinal,
		closeBattle,
		handleOpponentUpdate,
		handleItemAdd,
		handleWorkAdd,
		flushFor,
	} = useManageMedia<ShowProps>({
		onAdd: add,
		items: items,
		onRemove: remove,
		onUpdate: update,
		onUpdateSoon: updateSoon,
		onStage: stage,
		onUnstage: unstage,
		onRefresh: refresh,
		isEligibleOpponent: isBattleReady,
	});

	// avaliable in the battler
	const opponentPool = useMemo(() => items.filter(isBattleReady), [items]);

	// a row edit still queued was made first
	const handleUpdatePart = useCallback(
		(showId: number, anilistId: number, patch: PartPatch) => {
			flushFor(showId);
			return updatePart(showId, anilistId, patch, (item) =>
				withPartPatch(item, anilistId, patch),
			);
		},
		[updatePart, flushFor],
	);

	const [animeOnly, setAnimeOnly] = useState(false);
	const shownShows = useMemo(
		() => (animeOnly ? filteredItems.filter(isAnimeRow) : filteredItems),
		[filteredItems, animeOnly],
	);
	const animeSubset = useMemo(
		() => ({
			name: "anime",
			on: animeOnly,
			onToggle: () => setAnimeOnly((on) => !on),
		}),
		[animeOnly],
	);

	const sortedShows = useSortMedia(shownShows, sortConfig, DIFF_COLUMNS_SHOW);

	return (
		<div className="min-h-screen">
			<div className="lg:block hidden">
				<DesktopListing
					mediaItems={sortedShows}
					isProcessing={isProcessing}
					sortConfig={sortConfig}
					statusOptions={showStatusOptions.map(
						(status) => status.value,
					)}
					curStatusFilter={statusFilter}
					mediaType="show"
					differentColumns={DIFF_COLUMNS_SHOW}
					searchQuery={searchQuery}
					emptyListText={
						animeOnly
							? "No anime yet - add one!"
							: "No shows yet — add one!"
					}
					subset={animeSubset}
					openItemId={openItemId}
					onItemClicked={handleItemClicked}
					onSortConfig={handleSortConfig}
					onSearchChange={handleSearchQueryChange}
					onStatusFilter={handleStatusFilterConfig}
				/>
			</div>
			<div className="block lg:hidden">
				<MobileListing
					mediaItems={sortedShows}
					isProcessing={isProcessing || isFilterPending}
					sortConfig={sortConfig}
					statusOptions={showStatusOptions.map(
						(status) => status.value,
					)}
					curStatusFilter={statusFilter}
					mediaType="show"
					differentColumns={DIFF_COLUMNS_SHOW}
					searchQuery={searchQuery}
					emptyListText={
						animeOnly
							? "No anime yet - add one!"
							: "No shows yet — add one!"
					}
					subset={animeSubset}
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
					<AddShow
						key="add"
						isOpen={activeModal === "addModal"}
						onClose={handleModalClose}
						existingShows={items}
						onAddShow={handleItemAdd}
						onAddWork={handleWorkAdd}
						onDuplicate={(dup) => {
							const owned =
								(dup.tmdbId
									? items.find(
											(s) =>
												String(s.tmdbId) === dup.tmdbId,
										)
									: undefined) ??
								items.find((s) => isSameName(s, dup.title));
							if (!owned) return false;
							setTitleToUse(null);
							handleItemClicked(owned);
							return true;
						}}
						targetFromAbove={
							titleToUse ? { title: titleToUse.title } : null
						}
						existingMovies={movies.items}
						onMovieUpdate={movies.handleUpdates}
						onAddMovie={movies.handleAdd}
						existingManga={manga.items}
						onMangaUpdate={manga.handleUpdates}
						onAddManga={manga.handleAdd}
					/>
				)}
			</AnimatePresence>
			{/* DETAILS MODAL */}
			<AnimatePresence>
				{activeModal === "detailsModal" && selectedItem && (
					<ShowDetails
						key="details"
						show={selectedItem}
						onClose={handleModalClose}
						onUpdate={handleItemUpdates}
						onRefresh={handleItemRefresh}
						onUpdatePart={handleUpdatePart}
						onPartBattle={setPartBattle}
						existingShows={items}
						onAddWork={handleWorkAdd}
						//
						existingMovies={movies.items}
						onMovieUpdate={movies.handleUpdates}
						onAddMovie={movies.handleAdd}
						existingManga={manga.items}
						onMangaUpdate={manga.handleUpdates}
						onAddManga={manga.handleAdd}
					/>
				)}
			</AnimatePresence>
			{/* SCORE BATTLER */}
			<AnimatePresence>
				{battle && (
					<ScoreBattlerHub
						key={`battler-${battle.item.id}`}
						mediaType="show"
						items={opponentPool}
						initialScore={battle.score}
						selectedItem={battle.item}
						onClose={closeBattle}
						onScoreFinal={handleScoreFinal}
						onOpponentUpdate={handleOpponentUpdate}
					/>
				)}
			</AnimatePresence>
			{/* SCORE BATTLER -- anime node */}
			<AnimatePresence>
				{partBattle && (
					<ScoreBattlerHub
						key="part-battler"
						mediaType="show"
						items={opponentPool}
						initialScore={partBattle.seed}
						selectedItem={partBattle.item}
						onClose={() => setPartBattle(null)}
						onScoreFinal={(score) => {
							partBattle.onFinal(score);
							setPartBattle(null);
						}}
						onOpponentUpdate={handleOpponentUpdate}
					/>
				)}
			</AnimatePresence>
			{/* SCORE BATTLER -- cross media (a movie opened from an actor) */}
			<AnimatePresence>
				{movies.battle && (
					<ScoreBattlerHub
						key="movie-battler"
						mediaType="movie"
						items={movies.items}
						initialScore={movies.battle.score}
						selectedItem={movies.battle.item}
						onClose={movies.closeBattle}
						onScoreFinal={movies.finishBattle}
						onOpponentUpdate={movies.handleOpponentUpdate}
					/>
				)}
			</AnimatePresence>
			{/* SCORE BATTLER -- cross media (the manga an anime adapts) */}
			<AnimatePresence>
				{manga.battle && (
					<ScoreBattlerHub
						key="manga-battler"
						mediaType="manga"
						items={manga.items}
						initialScore={manga.battle.score}
						selectedItem={manga.battle.item}
						onClose={manga.closeBattle}
						onScoreFinal={manga.finishBattle}
						onOpponentUpdate={manga.handleOpponentUpdate}
					/>
				)}
			</AnimatePresence>
		</div>
	);
}
