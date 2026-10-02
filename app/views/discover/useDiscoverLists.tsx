"use client";
import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useMediaData } from "@/hooks/useMediaData";
import { useCrossList } from "@/hooks/useCrossList";
import { MOVIE_LIST, SHOW_LIST } from "@/hooks/mediaLists";
import {
	withPartPatch,
	type PartPatch,
} from "@/app/shows/utils/animePartMarks";
import { chainIdsOf } from "@/app/shows/utils/slotRef";
import type {
	ShowProps,
	ShowTargetProps,
	SeasonalAnimeProps,
} from "@/types/show";
import type { MovieProps } from "@/types/movie";
import type { SeriesJumpProps } from "@/types/media";
import { AddShow } from "@/app/shows/AddShow";
import { ShowDetails as ShowDetailsModal } from "@/app/shows/ShowDetailsHub";
import { AddMovie } from "@/app/movies/AddMovie";
import { MovieDetails } from "@/app/movies/MovieDetailsHub";

// load score dynamically
const ScoreBattlerHub = dynamic(
	() =>
		import("@/app/views/mediaDetails/shared/scoreBattler/ScoreBattlerHub").then(
			(m) => m.ScoreBattlerHub,
		),
	{ ssr: false },
);

const isMovie = (anime: SeasonalAnimeProps) => anime.format === "MOVIE";

const startYearOf = (date: string | null) =>
	date ? Number(date.slice(0, 4)) : null;

export function useDiscoverLists() {
	const [openShowId, setOpenShowId] = useState<number | null>(null);
	const [openMovieId, setOpenMovieId] = useState<number | null>(null);
	const [showTarget, setShowTarget] = useState<ShowTargetProps | null>(null);
	const [movieTarget, setMovieTarget] = useState<SeriesJumpProps | null>(
		null,
	);
	//
	const shows = useMediaData<ShowProps>(SHOW_LIST);
	const movies = useCrossList<MovieProps>(MOVIE_LIST);
	const openShow =
		openShowId != null
			? (shows.items.find((s) => s.id === openShowId) ?? null)
			: null;
	const openMovie =
		openMovieId != null
			? (movies.items.find((m) => m.id === openMovieId) ?? null)
			: null;

	// every part of an owned chain
	const showByAnilist = useMemo(() => {
		const owners = new Map<number, ShowProps>();
		for (const show of shows.items)
			for (const id of chainIdsOf(show)) owners.set(id, show);
		return owners;
	}, [shows.items]);

	const showOfTmdb = (tmdbId?: string | null) =>
		tmdbId ? shows.items.find((s) => s.tmdbId === tmdbId) : undefined;

	const movieOf = (tmdbId?: string | null, imdbId?: string | null) =>
		movies.items.find(
			(m) =>
				(!!tmdbId && m.tmdbId === tmdbId) ||
				(!!imdbId && m.imdbId === imdbId),
		);

	const ownedOfAnime = (anime: SeasonalAnimeProps) =>
		(isMovie(anime)
			? movieOf(anime.tmdbId, anime.imdbId)
			: showOfTmdb(anime.tmdbId)) ?? showByAnilist.get(anime.anilistId);

	const openAnime = (anime: SeasonalAnimeProps) => {
		const movie = isMovie(anime)
			? movieOf(anime.tmdbId, anime.imdbId)
			: undefined;
		const show = isMovie(anime)
			? showByAnilist.get(anime.anilistId)
			: ownedOfAnime(anime);
		if (movie) return setOpenMovieId(movie.id);
		if (show) return setOpenShowId(show.id);
		if (isMovie(anime))
			return setMovieTarget({ title: anime.title, id: anime.tmdbId });
		setShowTarget({
			title: anime.title,
			tmdbId: anime.tmdbId,
			anime: true,
			// a sequel's year is not its show's
			year:
				anime.tmdbId || anime.sequel
					? null
					: startYearOf(anime.startDate),
		});
	};

	const openShowCard = (card: { tmdbId: string; title: string }) => {
		const owned = showOfTmdb(card.tmdbId);
		if (owned) setOpenShowId(owned.id);
		else setShowTarget({ title: card.title, tmdbId: card.tmdbId });
	};

	const openMovieCard = (card: {
		tmdbId: string;
		title: string;
		imdbId?: string | null;
	}) => {
		const owned = movieOf(card.tmdbId, card.imdbId);
		if (owned) setOpenMovieId(owned.id);
		else setMovieTarget({ title: card.title, id: card.tmdbId });
	};

	const onShowUpdate = (id: number, updates?: Partial<ShowProps>) => {
		if (updates) shows.update(id, updates);
	};
	const onShowUpdatePart = (
		showId: number,
		anilistId: number,
		patch: PartPatch,
	) =>
		shows.updatePart(showId, anilistId, patch, (item) =>
			withPartPatch(item, anilistId, patch),
		);

	const modals = (
		<>
			{openShow && (
				<ShowDetailsModal
					show={openShow}
					onClose={() => setOpenShowId(null)}
					onUpdate={onShowUpdate}
					onUpdatePart={onShowUpdatePart}
					existingShows={shows.items}
					onAddWork={shows.add}
					existingMovies={movies.items}
					onMovieUpdate={movies.handleUpdates}
					onAddMovie={movies.handleAdd}
				/>
			)}

			{openMovie && (
				<MovieDetails
					movie={openMovie}
					onClose={() => setOpenMovieId(null)}
					onUpdate={movies.handleUpdates}
					existingMovies={movies.items}
					onAddWork={movies.handleAdd}
					existingShows={shows.items}
					onShowUpdate={onShowUpdate}
					onShowUpdatePart={onShowUpdatePart}
					onAddShow={shows.add}
				/>
			)}

			{showTarget && (
				<AddShow
					isOpen={true}
					targetFromAbove={showTarget}
					onClose={() => setShowTarget(null)}
					onDuplicate={(dup) => {
						const owned = showOfTmdb(dup.tmdbId);
						if (!owned) return false;
						setShowTarget(null);
						setOpenShowId(owned.id);
						return true;
					}}
					existingShows={shows.items}
					onAddWork={shows.add}
					existingMovies={movies.items}
					onMovieUpdate={movies.handleUpdates}
					onAddMovie={movies.handleAdd}
					onAddShow={async (s) => {
						const added = await shows.add(s);
						if (added) setOpenShowId(added.id);
					}}
				/>
			)}

			{movieTarget && (
				<AddMovie
					isOpen={true}
					targetFromAbove={movieTarget}
					onClose={() => setMovieTarget(null)}
					onDuplicate={(dup) => {
						const owned = movieOf(dup.tmdbId, dup.imdbId);
						if (!owned) return false;
						setMovieTarget(null);
						setOpenMovieId(owned.id);
						return true;
					}}
					// the film is a part of an anime chain
					onAnimeChain={(found) => {
						setMovieTarget(null);
						setShowTarget({
							title: found.showTitle ?? movieTarget.title,
							tmdbId: found.tmdbId,
							anime: true,
						});
					}}
					existingMovies={movies.items}
					onAddWork={movies.handleAdd}
					existingShows={shows.items}
					onShowUpdate={onShowUpdate}
					onShowUpdatePart={onShowUpdatePart}
					onAddShow={shows.add}
					onAddMovie={async (m) => {
						const added = await movies.handleAdd(m);
						if (added) setOpenMovieId(added.id);
					}}
				/>
			)}

			{/* SCORE BATTLER */}
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
						onOpponentUpdate={(id, score) =>
							movies.update(id, { score }, true)
						}
					/>
				)}
			</AnimatePresence>
		</>
	);

	return {
		showOfTmdb,
		movieOf,
		ownedOfAnime,
		openAnime,
		openShowCard,
		openMovieCard,
		modals,
	};
}
