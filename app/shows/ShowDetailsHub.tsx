"use client";
import { ShowProps, SlotIndex } from "@/types/show";
import { DIFF_COLUMNS_SHOW } from "@/app/shows/utils/showDiffColumns";
import type { SeriesInfo } from "@/app/shows/utils/episodeRatings";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { DesktopDetails } from "@/app/views/mediaDetails/DesktopDetails";
import { showStatusOptions } from "@/utils/dropDownDetails";
import { MobileDetails } from "@/app/views/mediaDetails/MobileDetails";
import { TIER_PHI_THRESHOLD, getSeedMu, Score, Tier } from "@/lib/tierConfig";
import {
	activeLogoIndex,
	clearedFrom,
	stepLogoIndex,
	stepArtworkIndex,
} from "@/utils/artworkIndex";
import {
	activeCutsOf,
	isAnimeRow,
	clampToLine,
	findSlotIndex,
	slotIndexAt,
	slotIndexOf,
	slotRefFor,
	slotName,
	timelineOf,
	stepWatchIndex,
	mainOrdinalIndex,
	mainOrdinalAt,
	mainCount,
	episodeCountOf,
} from "@/app/shows/utils/slotRef";
import { markOf } from "@/app/shows/utils/animePartMarks";
import { useStudioCatalog } from "./hooks/useStudioCatalog";
import { useSlotCursor } from "./hooks/useSlotCursor";
import { usePartMarks } from "./hooks/usePartMarks";
import { useCastPanel } from "@/hooks/useCastPanel";
import { useScoreNudge } from "@/hooks/useScoreNudge";
import { useAddWait } from "@/hooks/useAddWait";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { PickList, useReloadPreview } from "@/hooks/useReloadPreview";
import { useWideCard } from "./hooks/useWideCard";
import {
	ActorWork,
	CastMember,
	fetchActorWorks,
	fetchShowCast,
} from "../../utils/getActorInfo";
import dynamic from "next/dynamic";
import { AnimatePresence } from "framer-motion";
import { AddShow } from "./AddShow";
import { AddMovie } from "@/app/movies/AddMovie";
import { useAuthFetch } from "@/app/auth/hooks/useAuthFetch";
import { MovieProps } from "@/types/movie";
import { MovieDetails } from "@/app/movies/MovieDetailsHub";
import { MediaStatus, SeriesTargetProps } from "@/types/media";
import { useShowSearch } from "@/hooks/external/useShowSearch";
import { mapShowMeta } from "./utils/showMapping";
import { isRealTmdbId, isSameName, normName } from "@/utils/mediaMatch";
import type { StudioWork } from "./utils/studioCatalog";
// load actor modal dynamically
const ActorItemsModal = dynamic(
	() => import("../components/ActorModal").then((m) => m.ActorItemsModal),
	{ ssr: false },
);
// load episode rating dynamically -- used for big desktop
const EpisodeRatingsModal = dynamic(
	() =>
		import("./components/EpisodeRatingsModal").then(
			(m) => m.EpisodeRatingsModal,
		),
	{ ssr: false },
);
// load episode rating dynamically -- used for small desktop
const EpisodeRatingsRail = dynamic(
	() =>
		import("./components/EpisodeRatingsRail").then(
			(m) => m.EpisodeRatingsRail,
		),
	{ ssr: false },
);
// anime slot breakdown
const AnimeChainRail = dynamic(
	() =>
		import("./components/animeChain/WatchOrder").then(
			(m) => m.AnimeChainRail,
		),
	{ ssr: false },
);
const AnimeChainModal = dynamic(
	() =>
		import("./components/animeChain/WatchOrder").then(
			(m) => m.AnimeChainModal,
		),
	{ ssr: false },
);
// studio work
const StudioCatalogModal = dynamic(
	() =>
		import("./components/StudioCatalogModal").then(
			(m) => m.StudioCatalogModal,
		),
	{ ssr: false },
);

export type ShowAction =
	| { type: "closeModal" }
	| { type: "delete" }
	| { type: "needYearField" }
	| {
			type: "changeStatus";
			payload: "Completed" | "Want to Watch" | "Dropped" | "Watching";
	  }
	| { type: "resetScore" }
	| { type: "nudgeScore"; payload: "up" | "down" }
	| { type: "setInitialTier"; payload: Tier }
	| { type: "changeNote"; payload: string }
	| { type: "saveNote" }
	| { type: "changeSeason"; payload: "left" | "right" }
	| { type: "changeEpisode"; payload: "left" | "right" }
	| { type: "clickSeasonInput" }
	| { type: "clickEpisodeInput" }
	| { type: "submitSeasonInput" }
	| { type: "submitEpisodeInput" }
	| { type: "changeSeasonInput"; payload: string }
	| { type: "changeEpisodeInput"; payload: string }
	| { type: "changeSeasonNum"; payload: SlotIndex }
	| { type: "changeEpisodeNum"; payload: number }
	| { type: "cast" }
	| { type: "refresh" }
	| { type: "confirmRefresh" }
	| { type: "cancelRefresh" }
	| { type: "changeLogo"; payload: "next" | "prev" }
	| { type: "clearLogo" }
	| { type: "changeCover"; payload: "next" | "prev" }
	| { type: "changeBackdrop"; payload: "next" | "prev" }
	| { type: "openRatings" }
	| { type: "openChain" }
	| { type: "viewSlot"; payload: SlotIndex | null }
	| { type: "commitView" }
	| { type: "hideSlot" }
	// mobile only
	| { type: "togglePosterSource" }
	| { type: "toggleFranchiseView" }
	| { type: "studioClick"; payload: string }
	| { type: "creatorClick"; payload: string };

export interface ShowDetailsProps {
	show: ShowProps;
	onClose: () => void;
	isLoading?: { isTrue: boolean; style: string; text: string };
	onUpdate: (
		showId: number,
		updates?: Partial<ShowProps>,
		takeAction?: boolean,
	) => void;
	addShow?: () => void | Promise<unknown>;
	existingShows?: ShowProps[];
	onAddWork?: (show: ShowProps) => Promise<unknown>;
	//
	existingMovies?: MovieProps[];
	onMovieUpdate?: (
		movieId: number,
		updates?: Partial<MovieProps>,
		takeAction?: boolean,
	) => void;
	onAddMovie?: (movie: MovieProps) => Promise<unknown>;
	// reload metadata from source (poster/backdrop, seasons, studio)
	onRefresh?: (metadata: Partial<ShowProps>) => Promise<void>;
	// a slot: score | note | skip
	onUpdatePart?: (
		showId: number,
		anilistId: number,
		patch: { score?: Score | null; note?: string | null; hidden?: boolean },
	) => void | Promise<unknown>;
	// seed a part's score and hand it to the battler
	onPartBattle?: (showId: number, anilistId: number, seed: Score) => void;
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
}

// the choices a show reload offers
type ShowArt = {
	logos: PickList<string>;
	posters: PickList<string>;
	backdrops: PickList<string>;
};
//
type CutMoves = ReadonlyMap<number, number>;

export function ShowDetails({
	onClose,
	show,
	onUpdate,
	addShow,
	isLoading,
	existingShows = [],
	existingMovies = [],
	onAddWork,
	onMovieUpdate,
	onAddMovie,
	onRefresh,
	onUpdatePart,
	onPartBattle,
	logoUrls,
	logoIndex,
	updateLogoIndex,
	posterUrls,
	posterIndex,
	updatePosterIndex,
	backdropUrls,
	backdropIndex,
	updateBackdropIndex,
}: ShowDetailsProps) {
	// the timeline, and the two positions on it: where you are | where your looking
	const cursor = useSlotCursor({ show, onUpdate });
	const {
		line: slotLine,
		count: seasonCount,
		realIndex,
		shownIndex,
		isBrowsing,
		viewedComplete,
	} = cursor;
	// what the card says about one entry rather than about the row
	const marks = usePartMarks({
		show,
		cursor,
		onUpdate,
		onUpdatePart,
		onPartBattle,
		addShow: !!addShow,
	});
	// null means the card is talking about the row
	const { partId } = marks;
	// notes
	const [localNote, setLocalNote] = useState(marks.note);
	// season/episode boxes -- open | typed
	const [editingMode, setEditingMode] = useState({
		season: false,
		episode: false,
	});
	const [inputValues, setInputValues] = useState<{
		season: number | "";
		episode: number | "";
	}>({
		season: realIndex + 1,
		episode: show.curEpisode,
	});
	//
	const reload = useReloadPreview<ShowProps, ShowArt, CutMoves>({
		onRefresh,
		canLoad: !!show.tmdbId,
		load: async () => {
			if (!show.tmdbId) return null;
			// anime only
			const cuts = activeCutsOf(show);
			const tv = await loadShowChain(show.tmdbId, undefined, true, cuts);
			if (!tv) return null;
			const meta: Partial<ShowProps> = mapShowMeta(tv);
			// imdbId (used for episode ratings) -- leave untouched
			delete meta.imdbId;
			delete meta.logoUrl;
			const seasons = meta.seasons;
			if (seasons && seasons.length) {
				// resolve the stored reference against the *rebuilt* array
				const nextShow = {
					...show,
					seasons,
					anilistId: meta.anilistId ?? show.anilistId,
				};
				const nextLine = timelineOf(nextShow);
				const si = slotIndexOf(nextShow);
				let ep = show.curEpisode;
				const maxEp = episodeCountOf(nextLine[si]);
				if (ep > maxEp) ep = maxEp;
				// a rebuilt anime chain can need a rewritten reference even when the position is unchanged
				Object.assign(meta, slotRefFor(nextShow, si));
				if (ep !== show.curEpisode) meta.curEpisode = ep;
			}
			return {
				meta,
				lists: {
					logos: { items: tv.logos ?? [], index: 0 },
					posters: { items: tv.posters ?? [], index: 0 },
					backdrops: { items: tv.backdrops ?? [], index: 0 },
				},
				extra: new Map(),
			};
		},
		toMeta: ({ meta, lists }) => ({
			...meta,
			logoUrl: lists.logos.items[lists.logos.index] ?? null,
			// posterUrl already tracks the picked poster
			...(lists.backdrops.items.length
				? {
						backdropUrl:
							lists.backdrops.items[lists.backdrops.index],
					}
				: {}),
		}),
		// follow the cuts the reload switched to
		onConfirmed: async ({ extra: moves }) => {
			for (const [from, to] of moves) {
				const mark = markOf(show, from);
				if (!mark) continue;
				await marks.write(to, {
					score: mark.score ?? null,
					note: mark.note ?? null,
					hidden: !!mark.hidden,
				});
				await marks.write(from, {
					score: null,
					note: null,
					hidden: false,
				});
			}
		},
	});
	const { isRefreshing, isSelecting, patchMeta } = reload;
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
	const [previewCuts, setPreviewCuts] = useState<number[]>([]);
	// companion panels
	// only an anilist row has an order worth listing
	const hasChain = isAnimeRow(show) && seasonCount > 0;
	const isWideCard = useWideCard();
	const [ratingsOpen, setRatingsOpen] = useState(false);
	const [chainOpen, setChainOpen] = useState(false);
	const [seriesInfo, setSeriesInfo] = useState<SeriesInfo | null>(null);
	// cast and creators
	const castPanel = useCastPanel();
	const [isCreatorView, setIsCreatorView] = useState(false);
	const [clickedCreator, setClickedCreator] = useState<string | null>(null);
	// handing off to another list
	const [pendingWork, setPendingWork] = useState<{
		title: string;
		media_type: ActorWork["media_type"];
		// tmdb id when the caller knew one -- a series jump does
		id?: string | null;
		// a jump off a movie card replaces it -- panel pick opens over it
		handsOff?: boolean;
	} | null>(null);
	const [selectedWorkItem, setSelectedWorkItem] = useState<
		{ type: "movie"; id: number } | { type: "tv"; id: number } | null
	>(null);
	//
	const { loadShowChain } = useShowSearch();
	const { authFetch } = useAuthFetch();

	const addedStatusById = useMemo(() => {
		const map = new Map<string, MediaStatus>();
		for (const m of existingMovies)
			if (isRealTmdbId(m.tmdbId)) map.set(`movie:${m.tmdbId}`, m.status);
		for (const s of existingShows)
			if (isRealTmdbId(s.tmdbId)) map.set(`tv:${s.tmdbId}`, s.status);
		return map;
	}, [existingMovies, existingShows]);

	// cross media movie
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
					return setSelectedWorkItem({
						type: "movie",
						id: existing.id,
					});
			} else {
				const existing = existingShows.find(
					(s) => s.tmdbId === String(work.id),
				);
				if (existing)
					return setSelectedWorkItem({
						type: "tv",
						id: existing.id,
					});
			}
			// work.id = the tmdb one
			setPendingWork({
				title: work.title,
				media_type: work.media_type,
				id: String(work.id),
			});
		},
		[existingMovies, existingShows],
	);

	// manual +/- 0.1 score tweaks -- phi tightens once, on close
	const { nudge: nudgeScore, commit: commitScoreNudge } = useScoreNudge(
		show,
		onUpdate,
	);
	const handleAction = (action: ShowAction) => {
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
				if (partId != null) {
					marks.setTier(partId, action.payload);
					break;
				}
				onUpdate(show.id, {
					score: {
						mu: getSeedMu(action.payload),
						phi: TIER_PHI_THRESHOLD[action.payload],
					},
				});
				break;
			case "resetScore":
				if (partId != null) {
					marks.clearScore(partId);
					break;
				}
				onUpdate(show.id, { score: null });
				break;
			case "nudgeScore":
				(partId != null ? marks.nudge : nudgeScore)(action.payload);
				break;
			case "changeNote":
				setLocalNote(action.payload);
				break;
			case "saveNote":
				handleSaveNote();
				break;
			// =========season/episode navigation=============
			case "changeSeason":
				handleSeasonChange(action.payload);
				break;
			case "changeEpisode":
				handleEpisodeChange(action.payload);
				break;
			// =========s/ep input editing=============
			case "clickSeasonInput":
				handleInputClick("season");
				break;
			case "clickEpisodeInput":
				handleInputClick("episode");
				break;
			case "changeSeasonInput":
				handleSeasonInputChange(action.payload);
				break;
			case "changeEpisodeInput":
				handleEpisodeInputChange(action.payload);
				break;
			case "submitSeasonInput":
				handleInputSubmit("season");
				break;
			case "submitEpisodeInput":
				handleInputSubmit("episode");
				break;
			case "changeEpisodeNum":
				onUpdate(show.id, {
					curEpisode: action.payload,
				});
				break;
			case "changeSeasonNum":
				cursor.moveTo(action.payload);
				break;
			case "cast":
				handleCast();
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
			case "clearLogo":
				handleClearLogo();
				break;
			case "changeLogo":
				handleLogoChange(action.payload);
				break;
			case "changeCover":
				handlePosterChange(action.payload);
				break;
			case "changeBackdrop":
				handleBackdropChange(action.payload);
				break;
			case "openRatings":
				setRatingsOpen((open) => !open);
				break;
			case "openChain":
				setChainOpen((open) => !open);
				break;
			case "viewSlot":
				marks.exitFranchise();
				cursor.browse(action.payload);
				break;
			case "commitView":
				cursor.commitView();
				break;
			case "hideSlot":
				handleHideSlot();
				break;
			case "toggleFranchiseView":
				marks.toggleFranchise();
				break;
			case "togglePosterSource":
				handleTogglePosterSource();
				break;
			case "studioClick":
				studio.open(action.payload);
				break;
			case "creatorClick":
				handleCreatorClick(action.payload);
				break;
		}
	};

	const findOwnedMovie = useCallback(
		(title: string, year?: number) => {
			const named = existingMovies.filter((m) => isSameName(m, title));
			return (
				named.find(
					(m) =>
						!year ||
						!m.dateReleased ||
						Math.abs(m.dateReleased - year) <= 1,
				) ?? named[0]
			);
		},
		[existingMovies],
	);

	// what a studio animated + alrdy owned
	const studio = useStudioCatalog({
		authFetch,
		existingShows,
		findOwnedMovie,
	});

	//
	const resolveMovie = (target: SeriesTargetProps) =>
		isRealTmdbId(target.id ?? undefined)
			? existingMovies.find(
					(m) => isRealTmdbId(m.tmdbId) && m.tmdbId === target.id,
				)
			: findOwnedMovie(target.title);

	const handleWorkSeriesNav = (target: SeriesTargetProps) => {
		const wanted = normName(target.title);
		const at = slotIndexAt(
			slotLine.findIndex(
				(slot, i) =>
					normName(slotName(show, slot, slotIndexAt(i))) === wanted,
			),
		);
		if (at !== -1) {
			setSelectedWorkItem(null);
			cursor.browse(at);
			return;
		}
		const owned = resolveMovie(target);
		if (owned) return setSelectedWorkItem({ type: "movie", id: owned.id });
		setSelectedWorkItem(null);
		setPendingWork({
			title: target.title,
			media_type: "movie",
			id: target.id,
			handsOff: true,
		});
	};

	// for anime only
	const handlePickCut = async (groupIds: number[], chosenId: number) => {
		if (!show.tmdbId) return;
		await reload.runBusy(async () => {
			if (isSelecting) {
				reload.patch((p) => {
					const from = groupIds.find(
						(id) => markOf(show, id) != null,
					);
					if (from == null) return p;
					const next = new Map(p.extra);
					// swapped back to where the mark already is
					if (from === chosenId) next.delete(from);
					else next.set(from, chosenId);
					return { ...p, extra: next };
				});
				const cuts = [
					...activeCutsOf({
						seasons: reload.meta.seasons ?? show.seasons,
					}).filter((id) => !groupIds.includes(id)),
					chosenId,
				];
				const tv = await loadShowChain(
					show.tmdbId,
					undefined,
					false,
					cuts,
				);
				if (!tv) return;
				const rebuilt = mapShowMeta(tv);
				patchMeta((prev) => {
					const next: Partial<ShowProps> = {
						...prev,
						seasons: rebuilt.seasons,
						anilistId:
							rebuilt.anilistId ??
							prev.anilistId ??
							show.anilistId,
					};
					// resolved against the chain it is about to be written against -- same as reload
					if (next.seasons?.length) {
						const nextShow = {
							...show,
							seasons: next.seasons,
							anilistId: next.anilistId,
						};
						const nextLine = timelineOf(nextShow);
						const at = slotIndexOf(nextShow);
						let ep = next.curEpisode ?? show.curEpisode;
						const maxEp = episodeCountOf(nextLine[at]);
						if (ep > maxEp) ep = maxEp;
						Object.assign(next, slotRefFor(nextShow, at));
						next.curEpisode = ep;
					}
					return next;
				});
				return;
			}

			// unsaved preview only: replace this grp's temp choice before another preview
			const cuts = [
				...previewCuts.filter((id) => !groupIds.includes(id)),
				chosenId,
			];
			setPreviewCuts(cuts);

			// graphCache is keyed without cuts
			const tv = await loadShowChain(show.tmdbId, undefined, false, cuts);
			if (!tv) return;
			const rebuilt = mapShowMeta(tv);
			//
			const patch: Partial<ShowProps> = {
				seasons: rebuilt.seasons,
				anilistId: rebuilt.anilistId,
			};
			//
			const seasons = patch.seasons;
			if (seasons?.length) {
				const nextShow = {
					...show,
					seasons,
					anilistId: patch.anilistId ?? show.anilistId,
				};
				const nextLine = timelineOf(nextShow);
				const survived = findSlotIndex(nextShow);
				if (survived !== -1) {
					const at = survived;
					Object.assign(patch, slotRefFor(nextShow, at));
					const maxEp = episodeCountOf(nextLine[at]);
					if (maxEp && (show.curEpisode ?? 0) > maxEp)
						patch.curEpisode = maxEp;
				} else {
					// part you were on is the one that just left
					const at = clampToLine(nextLine, realIndex);
					Object.assign(patch, slotRefFor(nextShow, at));
					patch.curEpisode = 0;
				}
			}
			if (onRefresh) await onRefresh(patch);
			else onUpdate(show.id, patch);
		});
	};

	// which poster part wears
	const handleTogglePosterSource = () => {
		const picking = isSelecting || !!addShow;
		const stored = isSelecting
			? (reload.meta.franchisePoster ?? show.franchisePoster)
			: show.franchisePoster;
		const wearsRow = picking ? stored !== false : !!stored;
		// reload writes nothing until applied
		if (isSelecting)
			patchMeta((prev) => ({ ...prev, franchisePoster: !wearsRow }));
		else onUpdate(show.id, { franchisePoster: !wearsRow });
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

	// load color of poster
	const handlePosterChange = (dir: "next" | "prev") => {
		const posters = art.posters;
		const total = posters.items?.length ?? 0;
		if (total < 2) return;
		if (isSelecting) {
			const next = stepArtworkIndex(posters.index ?? 0, dir, total);
			setArtIndex("posters", () => next);
			patchMeta((prev) => ({
				...prev,
				posterUrl: posters.items?.[next],
			}));
		} else {
			updatePosterIndex?.(stepArtworkIndex(posterIndex ?? 0, dir, total));
		}
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

	const handleCast = () => {
		setIsCreatorView(false);
		return castPanel.openCast(async () => {
			const { cast } = await fetchShowCast(
				Number(show.tmdbId),
				authFetch,
			);
			return cast;
		});
	};

	const handleActorClick = (member: CastMember) => {
		setIsCreatorView(false);
		return castPanel.openWorks(member, () =>
			fetchActorWorks(member.id, authFetch),
		);
	};

	//
	const handleCreatorClick = (name: string) => {
		if (!name) return;
		setClickedCreator(name);
		setIsCreatorView(true);
		return castPanel.openOnPerson(async () => {
			const { cast, creators } = await fetchShowCast(
				Number(show.tmdbId),
				authFetch,
			);
			// match the name that was clicked -- a show can have several
			const wanted = name.toLowerCase().trim();
			const member =
				creators.find((c) => c.name.toLowerCase().trim() === wanted) ??
				creators[0] ??
				null;
			return {
				cast,
				member,
				works: member
					? await fetchActorWorks(member.id, authFetch, "creator")
					: [],
			};
		});
	};

	// for anime
	const handleStudioPick = (work: StudioWork) => {
		const owned = studio.ownedWork(work);
		if (owned)
			return setSelectedWorkItem({
				type: owned.type,
				id: owned.row.id,
			});
		setPendingWork({
			title: work.base,
			media_type: work.format === "MOVIE" ? "movie" : "tv",
		});
	};

	const handleStatusChange = (value: string) => {
		const newStatus = value as "Completed" | "Want to Watch";
		const updatesViaStatus: Partial<ShowProps> = {
			status: newStatus,
		};
		if (newStatus === "Completed") {
			updatesViaStatus.dateCompleted = new Date();
			if (seasonCount) {
				// the last main part
				const last = mainOrdinalIndex(slotLine, mainCount(slotLine));
				if (last !== -1) {
					updatesViaStatus.curEpisode = episodeCountOf(
						slotLine[last],
					);
					Object.assign(updatesViaStatus, slotRefFor(show, last));
				}
			}
		} else if (show.dateCompleted) {
			updatesViaStatus.dateCompleted = null;
		}
		if (updatesViaStatus.curSeasonIndex !== undefined) cursor.clear();
		onUpdate(show.id, updatesViaStatus);
	};

	const handleSaveNote = () => {
		if (localNote === marks.note) return;
		if (partId != null) marks.setNote(partId, localNote);
		else onUpdate(show.id, { note: localNote });
	};

	const handleDelete = () => {
		onClose();
		const shouldDelete = true;
		onUpdate(show.id, undefined, shouldDelete);
	};

	const handleModalClose = () => {
		// fold the deferred phi drop into the update this close flushes
		commitScoreNudge();
		marks.commitNudge();
		onClose();
	};
	useEscapeClose(handleModalClose);

	const { isSubmitting, submit: handleAddShow } = useAddWait(addShow);

	const handleNeedYear = () => {
		const needYear = true;
		onUpdate(show.id, undefined, needYear);
	};

	const handleInputClick = (type: "season" | "episode") => {
		if (editingMode[type]) {
			setEditingMode({ season: false, episode: false });
			return;
		}
		//
		setEditingMode({
			season: type === "season",
			episode: type === "episode",
		});
		//
		setInputValues({
			season: mainOrdinalAt(slotLine, realIndex),
			episode: show.curEpisode,
		});
	};

	const handleInputSubmit = (type: "season" | "episode") => {
		if (!seasonCount) return;

		if (type === "season") {
			// A typed number counts main parts: "3" means season 3 | ovas sitting between not counted
			const mainTotal = mainCount(slotLine);
			// empty input
			let seasonNum =
				inputValues.season === ""
					? mainOrdinalAt(slotLine, realIndex)
					: inputValues.season;
			// force clamp top
			seasonNum = seasonNum > mainTotal ? mainTotal : seasonNum;
			const at = mainOrdinalIndex(slotLine, seasonNum);
			//
			if (seasonNum >= 1 && at !== -1) {
				setEditingMode({ ...editingMode, season: false });
				// landing on a part means none of it is watched yet
				cursor.moveTo(at, 0);
			} else {
				setInputValues({
					...inputValues,
					season: mainOrdinalAt(slotLine, realIndex),
				});
				setEditingMode({ ...editingMode, season: false });
			}
		} else if (type === "episode") {
			// empty input
			const typed =
				inputValues.episode === ""
					? show.curEpisode
					: inputValues.episode;
			setEditingMode({ ...editingMode, episode: false });
			if (!Number.isFinite(typed) || typed < 0) {
				setInputValues({ ...inputValues, episode: show.curEpisode });
				return;
			}
			// past part you are on goes into next
			let at = realIndex;
			let ep = typed;
			let max = episodeCountOf(slotLine[at]);
			while (ep > max) {
				const next = stepWatchIndex(slotLine, at, "right");
				// end of road
				if (next === -1 || max <= 0) {
					ep = Math.max(max, 0);
					break;
				}
				ep -= max;
				at = next;
				max = episodeCountOf(slotLine[at]);
			}
			//
			cursor.moveTo(at, ep);
		}
	};

	const handleSeasonInputChange = (value: string) => {
		// allow empty string so user can clear and retype
		if (value === "") {
			setInputValues({
				...inputValues,
				season: "",
			});
		} else {
			const numValue = parseInt(value);
			setInputValues({
				...inputValues,
				season: isNaN(numValue) ? "" : Math.max(1, numValue),
			});
		}
	};

	const handleEpisodeInputChange = (value: string) => {
		if (value === "") {
			setInputValues({
				...inputValues,
				episode: "",
			});
		} else {
			const numValue = parseInt(value);
			setInputValues({
				...inputValues,
				episode: isNaN(numValue) ? "" : Math.max(0, numValue),
			});
		}
	};

	const handleSeasonChange = (dir: string) => {
		if (!seasonCount) return;
		// arrow walk for normal and anime
		const seasonIndex = stepWatchIndex(
			slotLine,
			shownIndex,
			dir === "left" ? "left" : "right",
		);
		if (seasonIndex === -1) return;
		// look, do not move
		cursor.browse(seasonIndex);
	};

	// set the browsed part aside from the card, the way its row in the order would
	const handleHideSlot = () => {
		const slot = slotLine[shownIndex];
		if (!slot?.isSide || slot.anilistId == null) return;
		marks.setHidden(slot.anilistId, true);
	};

	const handleEpisodeChange = (dir: string) => {
		if (!seasonCount || isBrowsing) return;
		//
		let seasonIndex = realIndex;
		let curEp = show.curEpisode;
		const total = episodeCountOf(slotLine[seasonIndex]);
		//
		if (dir === "left") {
			if (curEp > 0) {
				curEp -= 1;
			} else {
				const prev = stepWatchIndex(slotLine, seasonIndex, "left");
				if (prev === -1) return;
				seasonIndex = prev;
				curEp = episodeCountOf(slotLine[prev]);
			}
		} else if (dir === "right") {
			if (curEp < total) {
				curEp += 1;
			} else {
				const next = stepWatchIndex(slotLine, seasonIndex, "right");
				if (next === -1) return;
				seasonIndex = next;
				curEp = 0;
			}
		}
		//
		cursor.moveTo(seasonIndex, curEp);
	};

	useEffect(() => {
		const handleLeave = (e: KeyboardEvent) => {
			if (e.key === "Enter") {
				const activeElement = document.activeElement;
				const isInTextarea = activeElement?.tagName === "TEXTAREA";
				const isInInput = activeElement?.tagName === "INPUT";
				const isInEditingMode =
					editingMode.season || editingMode.episode;
				if (!isInTextarea && !isInInput && !isInEditingMode) {
					handleAddShow();
				}
			}
		};
		//
		window.addEventListener("keydown", handleLeave);
		return () => window.removeEventListener("keydown", handleLeave);
	}, [onClose, editingMode, handleAddShow]);

	useEffect(() => {
		setInputValues({
			season: mainOrdinalAt(slotLine, shownIndex),
			episode: show.curEpisode,
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [show.curSeasonIndex, show.curEpisode, show.seasons, shownIndex]);

	// need to reset local note -- since changing show doesn't remount
	useEffect(() => {
		setLocalNote(marks.note);
		reload.cancel();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [show.id]);

	// note follows the entry the card is showing
	useEffect(() => {
		setLocalNote(marks.note);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [partId, marks.franchiseView]);

	if (!show) return null;

	// while previewing render new
	const previewShow = isSelecting ? { ...show, ...reload.meta } : show;

	// display only -- the slot's poster | studio | year beat the row's; writes go through `show`
	const viewRef = isBrowsing ? slotRefFor(previewShow, shownIndex) : {};
	const previewLine = isSelecting ? timelineOf(previewShow) : slotLine;
	const curSlot =
		previewLine[Math.min(shownIndex, Math.max(0, previewLine.length - 1))];
	const slotYear = Number(curSlot?.startDate?.slice(0, 4));
	// ...unless the row keeps its own -- the default flips while picking
	const posterPref = previewShow.franchisePoster;
	const wearsRowPoster =
		isSelecting || addShow ? posterPref !== false : !!posterPref;
	const slotMeta: Partial<ShowProps> = {
		...(curSlot?.posterUrl && !wearsRowPoster
			? { posterUrl: curSlot.posterUrl }
			: {}),
		...(slotYear ? { dateReleased: slotYear } : {}),
		...(partId != null ? { score: marks.mark?.score ?? null } : {}),
	};
	// unchanged rows keep their identity
	const displayShow =
		Object.keys(slotMeta).length || isBrowsing
			? { ...previewShow, ...viewRef, ...slotMeta }
			: previewShow;

	const displayLoading = isRefreshing
		? {
				isTrue: true,
				style: "h-8 w-8 border-emerald-400",
				text: "Reloading...",
			}
		: isLoading;

	// handing over to movie list
	const handedOff = !!selectedWorkItem || !!pendingWork?.handsOff;

	return (
		<>
			{!handedOff && (
				<div className="lg:block hidden">
					<DesktopDetails
						item={displayShow}
						localNote={localNote}
						noteSubject={marks.noteSubject}
						franchiseView={marks.franchiseView}
						statusOptions={showStatusOptions}
						isInList={(target) => !!resolveMovie(target)}
						isBrowsing={isBrowsing}
						viewedComplete={viewedComplete}
						mediaType="show"
						isLoading={displayLoading}
						isAdding={!!addShow}
						isSelecting={isSelecting}
						onAdd={handleAddShow}
						isSubmitting={isSubmitting}
						onClose={handleModalClose}
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
						differentColumns={DIFF_COLUMNS_SHOW}
						editingMode={editingMode}
						inputValues={inputValues}
						ratingsDocked={isWideCard && ratingsOpen}
						seriesInfo={seriesInfo}
						sidePanel={
							<AnimatePresence>
								{/* RATING RAIL */}
								{isWideCard && ratingsOpen && (
									<EpisodeRatingsRail
										key="ratings-rail"
										show={show}
										authFetch={authFetch}
										onSeries={setSeriesInfo}
									/>
								)}
								{/* WATCH ORDER RAIL */}
								{isWideCard && chainOpen && hasChain && (
									<AnimeChainRail
										key="rail"
										show={previewShow}
										onClose={() => setChainOpen(false)}
										onPickSlot={(index) =>
											handleAction({
												type: "viewSlot",
												payload: index,
											})
										}
										onWatchSlot={cursor.watchSlot}
										viewIndex={
											isBrowsing ? shownIndex : null
										}
										onPickCut={handlePickCut}
										canPickCut={!!addShow || isSelecting}
										onHide={(anilistId) =>
											marks.setHidden(anilistId, true)
										}
										onUnhide={(anilistId) =>
											marks.setHidden(anilistId, false)
										}
									/>
								)}
							</AnimatePresence>
						}
					/>
				</div>
			)}
			{!handedOff && (
				<div className="block lg:hidden">
					<MobileDetails
						item={displayShow}
						localNote={localNote}
						noteSubject={marks.noteSubject}
						franchiseView={marks.franchiseView}
						statusOptions={showStatusOptions}
						isInList={(target) => !!resolveMovie(target)}
						isBrowsing={isBrowsing}
						mediaType="show"
						isLoading={displayLoading}
						isAdding={!!addShow}
						isSelecting={isSelecting}
						onAdd={handleAddShow}
						isSubmitting={isSubmitting}
						onClose={handleModalClose}
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
						differentColumns={DIFF_COLUMNS_SHOW}
					/>
				</div>
			)}
			{/* ratings, when desktop is small */}
			<AnimatePresence>
				{!isWideCard && ratingsOpen && (
					<EpisodeRatingsModal
						key="ratings"
						show={show}
						onClose={() => setRatingsOpen(false)}
						authFetch={authFetch}
					/>
				)}
			</AnimatePresence>
			{/* watch order, when desktop is small */}
			<AnimatePresence>
				{!isWideCard && chainOpen && hasChain && (
					<AnimeChainModal
						key="chain"
						show={previewShow}
						onClose={() => setChainOpen(false)}
						onPickSlot={(index) =>
							handleAction({
								type: "viewSlot",
								payload: index,
							})
						}
						onWatchSlot={cursor.watchSlot}
						viewIndex={isBrowsing ? shownIndex : null}
						onPickCut={handlePickCut}
						canPickCut={!!addShow || isSelecting}
						onHide={(anilistId) => marks.setHidden(anilistId, true)}
						onUnhide={(anilistId) =>
							marks.setHidden(anilistId, false)
						}
					/>
				)}
			</AnimatePresence>
			{/* STUDIO WORKS */}
			<AnimatePresence>
				{studio.name && (
					<StudioCatalogModal
						key="studio"
						studioName={studio.name}
						catalog={studio.catalog}
						loading={studio.loading}
						sort={studio.sort}
						onSortChange={studio.setSort}
						onPageChange={studio.setPage}
						loadingMore={studio.loadingMore}
						onClose={studio.close}
						onPick={handleStudioPick}
						ownedStatus={(work) =>
							studio.ownedWork(work)?.row.status
						}
						isDropped={studio.isDropped}
					/>
				)}
			</AnimatePresence>
			{/* ACTOR WORKS */}
			<AnimatePresence>
				{castPanel.isOpen && (
					<ActorItemsModal
						key="cast"
						mediaTitle={show.title}
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
							setIsCreatorView(false);
						}}
						onMovieSortChange={castPanel.setSort}
						onWorkClick={handleWorkClick}
						addedStatusById={addedStatusById}
						isPersonView={isCreatorView}
						personName={clickedCreator ?? show.creator}
					/>
				)}
			</AnimatePresence>
			{/* ADD SHOW */}
			{pendingWork?.media_type === "tv" && (
				<AddShow
					isOpen={true}
					titleFromAbove={pendingWork.title}
					onClose={() => setPendingWork(null)}
					existingShows={existingShows}
					onAddShow={async (s) => {
						// route through the parent's data hook
						if (onAddWork) {
							await onAddWork(s);
						} else {
							await authFetch("/api/shows", {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify(s),
							});
						}
						setPendingWork(null);
					}}
				/>
			)}
			{/* OPENED SHOW (from actor modal) */}
			{selectedShow && (
				<ShowDetails
					show={selectedShow}
					onClose={() => setSelectedWorkItem(null)}
					onUpdate={onUpdate}
					onUpdatePart={onUpdatePart}
					existingShows={existingShows}
					existingMovies={existingMovies}
					onMovieUpdate={onMovieUpdate}
					onAddWork={onAddWork}
					onAddMovie={onAddMovie}
				/>
			)}
			{/* MOVIE DETAILS */}
			{selectedMovie && onMovieUpdate && (
				<MovieDetails
					movie={selectedMovie}
					onClose={() => setSelectedWorkItem(null)}
					onUpdate={onMovieUpdate}
					existingMovies={existingMovies}
					existingShows={existingShows}
					onShowUpdate={onUpdate}
					onShowUpdatePart={onUpdatePart}
					showSequelPrequel={handleWorkSeriesNav}
					onAddWork={onAddMovie}
					onAddShow={onAddWork}
				/>
			)}
			{/* MOVIE ADD */}
			{pendingWork?.media_type === "movie" && (
				<AddMovie
					isOpen
					targetFromAbove={{
						title: pendingWork.title,
						id: pendingWork.id,
					}}
					// if movie turns out to be an anime
					onAnimeChain={(found) =>
						setPendingWork({
							title: found.showTitle ?? "",
							media_type: "tv",
						})
					}
					existingShows={existingShows}
					onSeriesNav={(target) => {
						setPendingWork(null);
						handleWorkSeriesNav(target);
					}}
					onClose={() => {
						setPendingWork(null);
					}}
					existingMovies={existingMovies}
					onDuplicate={(dup) => {
						const owned =
							(dup.tmdbId
								? existingMovies.find(
										(m) => m.tmdbId === dup.tmdbId,
									)
								: undefined) ??
							(dup.imdbId
								? existingMovies.find(
										(m) => m.imdbId === dup.imdbId,
									)
								: undefined) ??
							findOwnedMovie(dup.title);
						if (!owned) return false;
						setPendingWork(null);
						setSelectedWorkItem({ type: "movie", id: owned.id });
						return true;
					}}
					onAddMovie={async (m) => {
						if (onAddMovie) await onAddMovie(m);
						else
							await authFetch("/api/movies", {
								method: "POST",
								headers: { "Content-Type": "application/json" },
								body: JSON.stringify(m),
							});
						setPendingWork(null);
					}}
				/>
			)}
		</>
	);
}
