"use client";
import { DIFF_COLUMNS_MOVIE, MovieProps } from "@/types/movie";
import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { DesktopDetails } from "@/app/views/mediaDetails/DesktopDetails";
import { movieStatusOptions } from "@/utils/dropDownDetails";
import { MobileDetails } from "@/app/views/mediaDetails/MobileDetails";
import { TIER_PHI_THRESHOLD, getSeedMu, Tier } from "@/lib/tierConfig";
import {
	activeLogoIndex,
	clearedFrom,
	stepLogoIndex,
	stepArtworkIndex,
} from "@/utils/artworkIndex";
import { useCastPanel } from "@/hooks/useCastPanel";
import { useScoreNudge } from "@/hooks/useScoreNudge";
import { useAddWait } from "@/hooks/useAddWait";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { PickList, useReloadPreview } from "@/hooks/useReloadPreview";
import {
	ActorWork,
	CastMember,
	fetchActorWorks,
	fetchMovieCredits,
} from "../../utils/getActorInfo";
import dynamic from "next/dynamic";
import { AnimatePresence } from "framer-motion";
import { AddShow } from "@/app/shows/AddShow";
import { AddMovie } from "@/app/movies/AddMovie";
import { useAuthFetch } from "@/app/auth/hooks/useAuthFetch";
import { ShowProps } from "@/types/show";
import { ShowDetails } from "../shows/ShowDetailsHub";
import { MediaStatus, SeriesJumpProps, SeriesTargetProps } from "@/types/media";
import { useMovieSearch } from "@/hooks/external/useMovieSearch";
import {
	buildCover,
	cachedCover,
	extractCoverPalette,
} from "@/utils/extractCoverPalette";
import { isRealTmdbId } from "@/utils/mediaMatch";
import { seriesJump } from "@/utils/seriesRead";
import { useCommitOnUnmount } from "@/hooks/useManageMedia";
import { CardStack, useCardLayer } from "@/hooks/useCardStack";
// load actor modal dynamically
const ActorItemsModal = dynamic(
	() => import("../components/ActorModal").then((m) => m.ActorItemsModal),
	{ ssr: false },
);

const normalizeTitle = (title: string) =>
	title
		.toLowerCase()
		.trim()
		.replace(/^(the|a|an)\s+/, "");

export type MovieAction =
	| { type: "closeModal" }
	| { type: "delete" }
	| {
			type: "changeStatus";
			payload: "Completed" | "Want to Watch" | "Dropped";
	  }
	| { type: "resetScore" }
	| { type: "nudgeScore"; payload: "up" | "down" }
	| { type: "setInitialTier"; payload: Tier }
	| { type: "changeNote"; payload: string }
	| { type: "saveNote" }
	| { type: "seriesNav"; payload: "sequel" | "prequel" }
	| { type: "clearSeriesMeta" }
	| { type: "needYearField" }
	| { type: "refresh" }
	| { type: "confirmRefresh" }
	| { type: "cancelRefresh" }
	| { type: "cast" }
	| { type: "changeLogo"; payload: "next" | "prev" }
	| { type: "clearLogo" }
	| { type: "changeCover"; payload: "next" | "prev" }
	| { type: "changeBackdrop"; payload: "next" | "prev" }
	| { type: "pickCoverColor"; payload: string }
	| { type: "directorClick"; payload: string };

interface MovieDetailsProps {
	movie: MovieProps;
	onClose: () => void;
	isLoading?: { isTrue: boolean; style: string; text: string };
	onUpdate: (
		movieId: number,
		updates?: Partial<MovieProps>,
		takeAction?: boolean,
	) => void;
	addMovie?: () => void | Promise<unknown>;
	showSequelPrequel?: (jump: SeriesJumpProps) => void;
	isInList?: (target: SeriesTargetProps) => boolean;
	existingMovies: MovieProps[];
	onAddWork: (movie: MovieProps) => Promise<MovieProps | undefined>;
	onRefresh?: (metadata: Partial<MovieProps>) => Promise<void>;
	// legacy
	onBackfillTmdbId?: (movieId: number, tmdbId: string) => void;
	logoUrls?: string[];
	logoIndex?: number;
	updateLogoIndex?: (newIndex: number) => void;
	// artwork to cycle
	posterUrls?: string[];
	posterIndex?: number;
	updatePosterIndex?: (newIndex: number) => void;
	backdropUrls?: string[];
	backdropIndex?: number;
	updateBackdropIndex?: (newIndex: number) => void;
	// SHOW
	onShowUpdatePart?: (
		showId: number,
		anilistId: number,
		patch: { note?: string | null; hidden?: boolean },
	) => void | Promise<unknown>;
	onShowUpdate: (
		showId: number,
		updates?: Partial<ShowProps>,
		takeAction?: boolean,
	) => void;
	existingShows: ShowProps[];
	onAddShow: (show: ShowProps) => Promise<ShowProps | undefined>;
}

export type MovieCrossMedia = Pick<
	MovieDetailsProps,
	| "existingMovies"
	| "onAddWork"
	| "existingShows"
	| "onShowUpdate"
	| "onShowUpdatePart"
	| "onAddShow"
>;

// choices a movie reload offers
type MovieArt = {
	logos: PickList<string>;
	posters: PickList<string>;
	backdrops: PickList<string>;
};

export function MovieDetails({
	onClose,
	movie,
	onUpdate,
	addMovie,
	isLoading,
	showSequelPrequel,
	isInList,
	existingMovies,
	existingShows,
	onShowUpdate,
	onShowUpdatePart,
	onAddWork,
	onAddShow,
	onRefresh,
	onBackfillTmdbId,
	logoUrls,
	logoIndex,
	updateLogoIndex,
	posterUrls,
	posterIndex,
	updatePosterIndex,
	backdropUrls,
	backdropIndex,
	updateBackdropIndex,
}: MovieDetailsProps) {
	const [localNote, setLocalNote] = useState(movie.note || "");
	const { reloadMovie, searchForMovie } = useMovieSearch();
	const reload = useReloadPreview<MovieProps, MovieArt>({
		onRefresh,
		// legacy movies that doesn't have tmdbid are looked up by title
		canLoad: isRealTmdbId(movie.tmdbId) || !!movie.title,
		load: async () => {
			const hasTmdbId = isRealTmdbId(movie.tmdbId);
			// no tmdb id to look up -- resolve one by title first
			const reloaded = hasTmdbId
				? await reloadMovie(movie.tmdbId as string)
				: await searchForMovie(movie.title, movie.dateReleased, true);
			if (!reloaded || "isDuplicate" in reloaded) return null;
			// tmdbId is identity, left untouched
			const meta: Partial<MovieProps> = {
				cover: await buildCover(reloaded.poster_url),
				backdropUrl: reloaded.backdrop_url,
			};
			// legacy
			if (!hasTmdbId) {
				meta.tmdbId = reloaded.tmdb_id;
				meta.director = reloaded.director;
				meta.dateReleased = reloaded.released_date;
			}
			// reload can clear series
			meta.series = reloaded.series ?? null;
			meta.genres = reloaded.genres;
			meta.runtime = reloaded.runtime;
			if (reloaded.title) meta.title = reloaded.title;
			return {
				meta,
				lists: {
					logos: { items: reloaded.logos ?? [], index: 0 },
					posters: { items: reloaded.posters ?? [], index: 0 },
					backdrops: { items: reloaded.backdrops ?? [], index: 0 },
				},
			};
		},
		toMeta: ({ meta, lists }) => ({
			...meta,
			logoUrl: lists.logos.items[lists.logos.index] ?? null,
			// cover already tracks the picked poster
			...(lists.backdrops.items.length
				? {
						backdropUrl:
							lists.backdrops.items[lists.backdrops.index],
					}
				: {}),
		}),
	});
	const { isRefreshing, isSelecting, patchMeta, track } = reload;
	const setArtIndex = reload.setListIndex;
	const art = isSelecting
		? {
				logos: reload.list("logos"),
				posters: reload.list("posters"),
				backdrops: reload.list("backdrops"),
			}
		: {
				logos: { items: logoUrls, index: logoIndex },
				posters: { items: posterUrls, index: posterIndex },
				backdrops: { items: backdropUrls, index: backdropIndex },
			};
	// actor related
	const castPanel = useCastPanel();
	const closeCast = castPanel.close;
	// director related
	const [isDirectorView, setIsDirectorView] = useState(false);
	const [clickedDirector, setClickedDirector] = useState<string | null>(null);
	//
	// TITLE AND WHICH LIST
	const [pendingWork, setPendingWork] = useState<Pick<
		ActorWork,
		"title" | "media_type"
	> | null>(null);
	const [selectedWorkItem, setSelectedWorkItem] = useState<
		{ type: "movie"; id: number } | { type: "tv"; id: number } | null
	>(null);
	const { authFetch } = useAuthFetch();
	// cards opened from this one, and the way back to it
	const stack = useCardLayer("movie", movie.id, () => {
		closeCast();
		setSelectedWorkItem(null);
		setPendingWork(null);
	});
	const openWork = stack.open;

	const addedStatusById = useMemo(() => {
		const map = new Map<string, MediaStatus>();
		for (const m of existingMovies)
			if (isRealTmdbId(m.tmdbId)) map.set(`movie:${m.tmdbId}`, m.status);
		for (const s of existingShows)
			if (isRealTmdbId(s.tmdbId)) map.set(`tv:${s.tmdbId}`, s.status);
		return map;
	}, [existingMovies, existingShows]);

	// for legacy
	const backfilled = useRef<Set<number>>(new Set());
	useEffect(() => {
		if (!onBackfillTmdbId || castPanel.works.length === 0) return;
		const legacy = existingMovies.filter(
			(m) => !isRealTmdbId(m.tmdbId) && !backfilled.current.has(m.id),
		);
		if (legacy.length === 0) return;
		//
		for (const work of castPanel.works) {
			if (work.media_type !== "movie") continue;
			const workYear = parseInt(work.date?.slice(0, 4) ?? "");
			if (isNaN(workYear)) continue;
			const match = legacy.find(
				(m) =>
					m.dateReleased === workYear &&
					normalizeTitle(m.title) === normalizeTitle(work.title),
			);
			if (!match) continue;
			backfilled.current.add(match.id);
			onBackfillTmdbId(match.id, String(work.id));
		}
	}, [castPanel.works, existingMovies, onBackfillTmdbId]);

	const crossMedia: MovieCrossMedia = {
		existingMovies,
		onAddWork,
		existingShows,
		onShowUpdate,
		onShowUpdatePart,
		onAddShow,
	};
	const selectedMovie =
		selectedWorkItem?.type === "movie"
			? existingMovies.find((m) => m.id === selectedWorkItem.id)
			: undefined;

	const selectedShow =
		selectedWorkItem?.type === "tv"
			? existingShows.find((s) => s.id === selectedWorkItem.id)
			: undefined;

	const handleWorkClick = useCallback(
		(work: ActorWork) => {
			if (work.media_type === "movie") {
				const existing = existingMovies.find(
					(m) => m.tmdbId === String(work.id),
				);
				if (existing)
					return openWork(
						{ type: "movie", id: existing.id },
						setSelectedWorkItem,
					);
			} else {
				const existing = existingShows.find(
					(s) => s.tmdbId === String(work.id),
				);
				if (existing)
					return openWork(
						{ type: "tv", id: existing.id },
						setSelectedWorkItem,
					);
			}
			setPendingWork(work);
		},
		[existingMovies, existingShows, openWork],
	);

	// manual +/- 0.1 score tweaks -- phi tightens once, on close
	const { nudge: nudgeScore, commit: commitScoreNudge } = useScoreNudge(
		movie,
		onUpdate,
	);

	const handleAction = (action: MovieAction) => {
		switch (action.type) {
			// =========modal actions=============
			case "closeModal":
				handleModalClose();
				break;
			case "delete":
				handleDelete();
				break;
			case "needYearField":
				handleNeedYear();
				break;
			// =========update actions=============
			case "changeStatus":
				handleStatusChange(action.payload);
				break;
			case "setInitialTier":
				onUpdate(movie.id, {
					score: {
						mu: getSeedMu(action.payload),
						phi: TIER_PHI_THRESHOLD[action.payload],
					},
				});
				break;
			case "resetScore":
				onUpdate(movie.id, { score: null });
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
			case "clearSeriesMeta":
				if (movie.series) onUpdate(movie.id, { series: null });
				break;
			// =========other actions=============
			case "seriesNav":
				handleSeriesNav(action.payload);
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
			case "cast":
				handleCast();
				break;
			case "changeLogo":
				handleLogoChange(action.payload);
				break;
			case "clearLogo":
				handleClearLogo();
				break;
			case "changeCover":
				handlePosterChange(action.payload);
				break;
			case "changeBackdrop":
				handleBackdropChange(action.payload);
				break;
			case "pickCoverColor":
				handlePickCoverColor(action.payload);
				break;
			case "directorClick":
				handleDirectorClick(action.payload);
				break;
		}
	};

	//
	const handleLogoChange = (dir: "next" | "prev") => {
		const total = art.logos.items?.length ?? 0;
		if (total < 2) return;
		if (isSelecting)
			setArtIndex("logos", (i) => stepLogoIndex(i, dir, total));
		else updateLogoIndex?.(stepLogoIndex(logoIndex ?? 0, dir, total));
	};

	//
	const handleClearLogo = () => {
		const current = art.logos.index ?? 0;
		const next =
			current < 0 ? activeLogoIndex(current) : clearedFrom(current);
		if (isSelecting) setArtIndex("logos", () => next);
		else updateLogoIndex?.(next);
	};

	// the cover itself follows the index -- see the effect below
	const handlePosterChange = (dir: "next" | "prev") => {
		const total = art.posters.items?.length ?? 0;
		if (total < 2) return;
		if (isSelecting)
			setArtIndex("posters", (i) => stepArtworkIndex(i, dir, total));
		else
			updatePosterIndex?.(stepArtworkIndex(posterIndex ?? 0, dir, total));
	};

	const handleBackdropChange = (dir: "next" | "prev") => {
		const total = art.backdrops.items?.length ?? 0;
		if (total < 2) return;
		if (isSelecting)
			setArtIndex("backdrops", (i) => stepArtworkIndex(i, dir, total));
		else
			updateBackdropIndex?.(
				stepArtworkIndex(backdropIndex ?? 0, dir, total),
			);
	};

	//
	const stagedPoster = isSelecting
		? art.posters.items?.[art.posters.index ?? 0]
		: undefined;
	// every poster on offer has its colour read up front
	const offeredPosters = isSelecting ? art.posters.items : undefined;
	useEffect(() => {
		offeredPosters?.forEach((url) => extractCoverPalette(url));
	}, [offeredPosters]);
	// a colour picked while the new poster's own is still being read wins over it
	const pickedColor = useRef(false);
	useEffect(() => {
		if (!stagedPoster) return;
		pickedColor.current = false;
		// the picker reads the poster on screen, not the one being left
		const known = cachedCover(stagedPoster);
		patchMeta((prev) =>
			prev.cover?.url === stagedPoster
				? prev
				: { ...prev, cover: known ?? { url: stagedPoster, color: "" } },
		);
		if (known) return;
		let alive = true;
		track(buildCover(stagedPoster)).then((cover) => {
			if (!alive || !cover) return;
			patchMeta((prev) => ({
				...prev,
				cover:
					pickedColor.current && prev.cover?.url === cover.url
						? prev.cover
						: cover,
			}));
		});
		return () => {
			alive = false;
		};
	}, [stagedPoster, patchMeta, track]);

	// the picker only shows while adding or previewing a reload
	const handlePickCoverColor = (color: string) => {
		if (isSelecting) {
			pickedColor.current = true;
			patchMeta((prev) =>
				prev.cover
					? { ...prev, cover: { ...prev.cover, color } }
					: prev,
			);
			return;
		}
		if (movie.cover)
			onUpdate(movie.id, { cover: { ...movie.cover, color } });
	};

	const credits = () =>
		fetchMovieCredits(
			movie.tmdbId ?? "-1",
			movie.imdbId,
			movie.id,
			authFetch,
		);

	const handleCast = () => {
		setIsDirectorView(false);
		return castPanel.openCast(async () => (await credits()).cast);
	};

	const handleDirectorClick = (name: string) => {
		if (!name) return;
		setClickedDirector(name);
		setIsDirectorView(true);
		return castPanel.openOnPerson(async () => {
			const { cast, directors } = await credits();
			// match the name that was clicked -- a movie can have several
			const wanted = name.toLowerCase().trim();
			const member =
				directors.find((d) => d.name.toLowerCase().trim() === wanted) ??
				directors[0] ??
				null;
			return {
				cast,
				member,
				works: member
					? await fetchActorWorks(member.id, authFetch, "director")
					: [],
			};
		});
	};

	const handleActorClick = (member: CastMember) => {
		setIsDirectorView(false);
		return castPanel.openWorks(member, () =>
			fetchActorWorks(member.id, authFetch),
		);
	};

	const handleStatusChange = (value: string) => {
		const newStatus = value as "Completed" | "Want to Watch";
		const statusLoad: Partial<MovieProps> = {
			status: newStatus,
		};
		if (newStatus === "Completed") {
			statusLoad.dateCompleted = new Date();
		} else if (movie.dateCompleted) {
			statusLoad.dateCompleted = null;
		}
		onUpdate(movie.id, statusLoad);
	};

	// switches modal to new movie in series
	const handleSeriesNav = (seriesDir: "prequel" | "sequel") => {
		// a preview steps
		const row = isSelecting ? { ...movie, ...reload.meta } : movie;
		const from = {
			id: isRealTmdbId(row.tmdbId) ? row.tmdbId : null,
			title: row.title,
		};
		const jump = seriesJump(row, from, seriesDir);
		if (jump) showSequelPrequel?.(jump);
	};

	const handleSaveNote = () => {
		if (localNote !== (movie.note || "")) {
			onUpdate(movie.id, { note: localNote });
		}
	};
	useCommitOnUnmount(handleSaveNote);

	const handleDelete = () => {
		onClose();
		const shouldDelete = true;
		onUpdate(movie.id, undefined, shouldDelete);
	};

	const handleModalClose = () => {
		// fold the deferred phi drop into the update this close flushes
		commitScoreNudge();
		onClose();
	};
	useEscapeClose(() => (isSelecting ? reload.cancel() : handleModalClose()));

	// AddMovie.tsx -- goes back to search with year field
	const handleNeedYear = () => {
		const needYear = true;
		onUpdate(movie.id, undefined, needYear);
	};

	const { isSubmitting, submit: handleAddMovie } = useAddWait(addMovie);

	// need to reset local note
	useEffect(() => {
		setLocalNote(movie.note || "");
		reload.cancel();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [movie.id]);
	// another card open on the same movie
	useEffect(() => {
		setLocalNote(movie.note || "");
	}, [movie.note]);

	useEffect(() => {
		const handleLeave = (e: KeyboardEvent) => {
			if (e.key === "Enter") {
				const activeElement = document.activeElement;
				const isInTextarea = activeElement?.tagName === "TEXTAREA";
				const isInInput = activeElement?.tagName === "INPUT";
				if (!isInTextarea && !isInInput) {
					handleAddMovie();
				}
			}
		};
		//
		window.addEventListener("keydown", handleLeave);
		return () => window.removeEventListener("keydown", handleLeave);
	}, [onClose, handleAddMovie]);

	if (!movie) return null;

	// while previewing render new
	const previewMovie = isSelecting ? { ...movie, ...reload.meta } : movie;

	const displayLoading = isRefreshing
		? {
				isTrue: true,
				style: "h-8 w-8 border-emerald-400",
				text: "Reloading...",
			}
		: isLoading;

	return (
		<CardStack value={stack.layer}>
			<div className="lg:block hidden">
				<DesktopDetails
					item={previewMovie}
					isSelecting={isSelecting}
					localNote={localNote}
					statusOptions={movieStatusOptions}
					mediaType="movie"
					isLoading={displayLoading}
					isAdding={!!addMovie}
					onAdd={handleAddMovie}
					isSubmitting={isSubmitting}
					isInList={isInList}
					canRefresh={!!onRefresh}
					logoUrls={art.logos.items}
					logoIndex={art.logos.index}
					posterUrls={art.posters.items}
					posterIndex={art.posters.index}
					backdropUrls={art.backdrops.items}
					backdropIndex={art.backdrops.index}
					onAction={
						handleAction as (action: {
							type: string;
							payload?: unknown;
						}) => void
					}
					differentColumns={DIFF_COLUMNS_MOVIE}
				/>
			</div>
			<div className="block lg:hidden">
				<MobileDetails
					item={previewMovie}
					isSelecting={isSelecting}
					localNote={localNote}
					statusOptions={movieStatusOptions}
					mediaType="movie"
					isLoading={displayLoading}
					isAdding={!!addMovie}
					onAdd={handleAddMovie}
					isSubmitting={isSubmitting}
					onClose={handleModalClose}
					isInList={isInList}
					logoUrls={art.logos.items}
					logoIndex={art.logos.index}
					posterUrls={art.posters.items}
					posterIndex={art.posters.index}
					backdropUrls={art.backdrops.items}
					backdropIndex={art.backdrops.index}
					canRefresh={!!onRefresh}
					onAction={
						handleAction as (action: {
							type: string;
							payload?: unknown;
						}) => void
					}
					differentColumns={DIFF_COLUMNS_MOVIE}
				/>
			</div>
			<AnimatePresence>
				{castPanel.isOpen && (
					<ActorItemsModal
						key="cast"
						mediaTitle={movie.title}
						cast={castPanel.cast}
						castLoading={castPanel.castLoading}
						selectedActor={castPanel.actor}
						sortedWorks={castPanel.sortedWorks}
						actorLoading={castPanel.worksLoading}
						movieSort={castPanel.sort}
						onClose={castPanel.close}
						onActorClick={handleActorClick}
						onActorBack={() => {
							castPanel.clearActor();
							setIsDirectorView(false);
						}}
						onMovieSortChange={castPanel.setSort}
						onWorkClick={handleWorkClick}
						addedStatusById={addedStatusById}
						isPersonView={isDirectorView}
						personName={clickedDirector ?? movie.director}
					/>
				)}
			</AnimatePresence>
			{pendingWork?.media_type === "movie" && (
				<AddMovie
					isOpen={true}
					targetFromAbove={{ title: pendingWork.title }}
					// anime
					onAnimeChain={(found) =>
						setPendingWork({
							title: found.showTitle ?? "",
							media_type: "tv",
						})
					}
					onClose={() => setPendingWork(null)}
					{...crossMedia}
					onAddMovie={async (m) => {
						const added = await onAddWork(m);
						if (added)
							setSelectedWorkItem({
								type: "movie",
								id: added.id,
							});
						setPendingWork(null);
					}}
				/>
			)}
			{selectedMovie && (
				<MovieDetails
					movie={selectedMovie}
					onClose={() => setSelectedWorkItem(null)}
					onUpdate={onUpdate}
					{...crossMedia}
				/>
			)}
			{/* SHOW STUFF */}
			{selectedShow && (
				<ShowDetails
					show={selectedShow}
					onClose={() => setSelectedWorkItem(null)}
					onUpdate={onShowUpdate}
					onUpdatePart={onShowUpdatePart}
					existingShows={existingShows}
					existingMovies={existingMovies}
					onMovieUpdate={onUpdate}
					onAddWork={onAddShow}
					onAddMovie={onAddWork}
				/>
			)}
			{pendingWork?.media_type === "tv" && (
				<AddShow
					isOpen={true}
					targetFromAbove={{ title: pendingWork.title }}
					onClose={() => setPendingWork(null)}
					existingShows={existingShows}
					onAddWork={onAddShow}
					existingMovies={existingMovies}
					onMovieUpdate={onUpdate}
					onAddMovie={onAddWork}
					onAddShow={async (s) => {
						const added = await onAddShow(s);
						if (added)
							setSelectedWorkItem({ type: "tv", id: added.id });
						setPendingWork(null);
					}}
				/>
			)}
		</CardStack>
	);
}
