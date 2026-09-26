"use client";
import {
	MangaProps,
	MangaSearchResult,
	DIFF_COLUMNS_MANGA,
} from "@/types/manga";
import { MediaCoverProps, SeriesTargetProps } from "@/types/media";
import { seriesNeighbours } from "@/utils/seriesRead";
import { useEffect, useState } from "react";
import { DesktopDetails } from "@/app/views/mediaDetails/DesktopDetails";
import { mangaStatusOptions } from "@/utils/dropDownDetails";
import { MobileDetails } from "@/app/views/mediaDetails/MobileDetails";
import { TIER_PHI_THRESHOLD, getSeedMu, Tier } from "@/lib/tierConfig";
import { useScoreNudge } from "@/hooks/useScoreNudge";
import { useAddWait } from "@/hooks/useAddWait";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { PickList, useReloadPreview } from "@/hooks/useReloadPreview";
import { useMangaSearch } from "@/hooks/external/useMangaSearch";
import { mapMangaAPIDatatoManga } from "./utils/mangaMapping";
import { ShowMultManga } from "./components/ShowMultManga";
import { useAuthorCatalog } from "./hooks/useAuthorCatalog";
import { AuthorWork } from "./utils/authorCatalog";
import { useAuthFetch } from "@/app/auth/hooks/useAuthFetch";
import { AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
// author work
const AuthorCatalogModal = dynamic(
	() =>
		import("./components/AuthorCatalogModal").then(
			(m) => m.AuthorCatalogModal,
		),
	{ ssr: false },
);

export type MangaAction =
	| { type: "closeModal" }
	| { type: "delete" }
	| {
			type: "changeStatus";
			payload: "Reading" | "Want to Read" | "Completed" | "Dropped";
	  }
	| { type: "resetScore" }
	| { type: "nudgeScore"; payload: "up" | "down" }
	| { type: "setInitialTier"; payload: Tier }
	| { type: "changeNote"; payload: string }
	| { type: "saveNote" }
	| { type: "changeChapter"; payload: "left" | "right" }
	| { type: "clickChapterInput" }
	| { type: "changeChapterInput"; payload: string }
	| { type: "submitChapterInput" }
	| { type: "changeChapterNum"; payload: number }
	| { type: "seriesNav"; payload: "sequel" | "prequel" }
	| { type: "clearSeriesMeta" }
	| { type: "refresh" }
	| { type: "confirmRefresh" }
	| { type: "cancelRefresh" }
	| { type: "pickCoverColor"; payload: string }
	| { type: "moreResults" }
	| { type: "authorClick"; payload: string };

interface MangaDetailsProps {
	manga: MangaProps;
	existingManga: MangaProps[];
	onClose: () => void;
	isLoading?: { isTrue: boolean; style: string; text: string };
	onUpdate: (
		mangaId: number,
		updates?: Partial<MangaProps>,
		takeAction?: boolean,
	) => void;
	addManga?: () => void | Promise<unknown>;
	showSequelPrequel?: (target: SeriesTargetProps) => void;
	isInList?: (target: SeriesTargetProps) => boolean;
	onShowMore?: () => void;
	onRefresh?: (metadata: Partial<MangaProps>) => Promise<void>;
	updateCoverColor?: (color: string) => void;
}

// anilist serves one cover, but the reload still stages it to pick a colour off
type MangaPicks = {
	covers: PickList<MediaCoverProps>;
};

// identity for the render path to read while nothing is staged
const NO_RESULTS: MangaSearchResult[] = [];

export function MangaDetails({
	onClose,
	manga,
	existingManga,
	onUpdate,
	addManga,
	isLoading,
	showSequelPrequel,
	isInList,
	onShowMore,
	onRefresh,
	updateCoverColor,
}: MangaDetailsProps) {
	const [localNote, setLocalNote] = useState(manga.note || "");
	const [isEditingChapter, setIsEditingChapter] = useState(false);
	const [chapterInput, setChapterInput] = useState<number | "">(
		manga.curChapter ?? 0,
	);
	const { searchForMangaMulti, loadMangaById, isMangaSearching } =
		useMangaSearch();
	const [multResultsOpen, setMultResultsOpen] = useState(false);
	const { authFetch } = useAuthFetch();
	const author = useAuthorCatalog({ authFetch, existingManga });
	const reload = useReloadPreview<
		MangaProps,
		MangaPicks,
		MangaSearchResult[]
	>({
		onRefresh,
		canLoad: !!manga.anilistId,
		// reload via anilist id
		load: async () => {
			if (!manga.anilistId) return null;
			const response = await loadMangaById(manga.anilistId);
			if (!response) return null;
			const mapped = mapMangaAPIDatatoManga(response);
			const meta: Partial<MangaProps> = {
				chapters: mapped.chapters,
				rating: mapped.rating,
				series: mapped.series,
			};
			// the same art keeps the colour already picked off it
			const cover =
				response.cover?.url === manga.cover?.url
					? manga.cover
					: response.cover;
			return {
				meta,
				lists: {
					covers: { items: cover ? [cover] : [], index: 0 },
				},
				extra: [],
			};
		},
		// apply the previewed cover + metadata
		toMeta: ({ meta, lists }) => {
			const next: Partial<MangaProps> = { ...meta };
			if (lists.covers.items.length)
				next.cover = lists.covers.items[lists.covers.index];
			return next;
		},
		// the results panel belongs to the flow, so it closes with it
		onExit: () => setMultResultsOpen(false),
	});
	const { isRefreshing, isSelecting } = reload;
	const stagedCovers = reload.list("covers");
	const refreshResults = reload.preview?.extra ?? NO_RESULTS;
	// manual +/- 0.1 score tweaks -- phi tightens once, on close
	const { nudge: nudgeScore, commit: commitScoreNudge } = useScoreNudge(
		manga,
		onUpdate,
	);

	const handleAction = (action: MangaAction) => {
		switch (action.type) {
			// =========modal actions=============
			case "closeModal":
				handleModalClose();
				break;
			case "delete":
				handleDelete();
				break;
			// =========update actions=============
			case "changeStatus":
				handleStatusChange(action.payload);
				break;
			case "setInitialTier":
				onUpdate(manga.id, {
					score: {
						mu: getSeedMu(action.payload),
						phi: TIER_PHI_THRESHOLD[action.payload],
					},
				});
				break;
			case "resetScore":
				onUpdate(manga.id, { score: null });
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
				if (manga.series) onUpdate(manga.id, { series: null });
				break;
			// =========chapter progress=============
			case "changeChapter":
				handleChapterStep(action.payload);
				break;
			case "clickChapterInput":
				handleChapterInputClick();
				break;
			case "changeChapterInput":
				handleChapterInputChange(action.payload);
				break;
			case "submitChapterInput":
				handleChapterInputSubmit();
				break;
			case "changeChapterNum":
				writeChapter(action.payload);
				break;
			// =========other actions=============
			case "seriesNav":
				handleSeriesOpen(action.payload);
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
			case "pickCoverColor":
				handlePickCoverColor(action.payload);
				break;
			case "moreResults":
				if (isSelecting) handleShowRefreshResults();
				else onShowMore?.();
				break;
			case "authorClick":
				author.open(action.payload);
				break;
		}
	};

	const handleShowRefreshResults = async () => {
		setMultResultsOpen(true);
		const results = await searchForMangaMulti(manga.title);
		reload.patch((p) => ({ ...p, extra: results || [] }));
	};

	const handlePickAnotherResult = async (candidate: MangaSearchResult) => {
		setMultResultsOpen(false);
		await reload.runBusy(async () => {
			const full = await loadMangaById(candidate.anilist_id);
			if (!full) return;
			const mapped = mapMangaAPIDatatoManga(full);
			reload.patch((p) => ({
				...p,
				meta: {
					anilistId: mapped.anilistId,
					title: mapped.title,
					author: mapped.author,
					datePublished: mapped.datePublished,
					chapters: mapped.chapters,
					rating: mapped.rating,
					series: mapped.series,
				},
				lists: {
					covers: {
						items: full.cover ? [full.cover] : [],
						index: 0,
					},
				},
			}));
		});
	};

	const handlePickCoverColor = (color: string) => {
		if (isSelecting) {
			reload.patch((p) => ({
				...p,
				lists: {
					...p.lists,
					covers: {
						...p.lists.covers,
						items: p.lists.covers.items.map((c, i) =>
							i === p.lists.covers.index ? { ...c, color } : c,
						),
					},
				},
			}));
		} else {
			updateCoverColor?.(color);
		}
	};

	const handleStatusChange = (value: string) => {
		const newStatus = value as MangaProps["status"];
		const statusLoad: Partial<MangaProps> = {
			status: newStatus,
		};
		if (newStatus === "Completed") {
			statusLoad.dateCompleted = new Date();
			// finishing a serial with a known end puts you on its last chapter
			if (manga.chapters) statusLoad.curChapter = manga.chapters;
		} else if (manga.dateCompleted) {
			statusLoad.dateCompleted = null;
		}
		onUpdate(manga.id, statusLoad);
	};

	// a running serial has no ceiling
	const clampChapter = (chapter: number) =>
		Math.max(
			0,
			manga.chapters != null ? Math.min(chapter, manga.chapters) : chapter,
		);

	const writeChapter = (chapter: number) => {
		const next = clampChapter(chapter);
		if (next !== (manga.curChapter ?? 0))
			onUpdate(manga.id, { curChapter: next });
	};

	const handleChapterStep = (dir: string) => {
		const curChapter = manga.curChapter ?? 0;
		writeChapter(dir === "left" ? curChapter - 1 : curChapter + 1);
	};

	const handleChapterInputClick = () => {
		if (isEditingChapter) {
			setIsEditingChapter(false);
			return;
		}
		setChapterInput(manga.curChapter ?? 0);
		setIsEditingChapter(true);
	};

	const handleChapterInputChange = (value: string) => {
		// allow empty string so user can clear and retype
		if (value === "") {
			setChapterInput("");
		} else {
			const numValue = parseInt(value);
			setChapterInput(isNaN(numValue) ? "" : Math.max(0, numValue));
		}
	};

	const handleChapterInputSubmit = () => {
		setIsEditingChapter(false);
		// empty input
		if (chapterInput === "") {
			setChapterInput(manga.curChapter ?? 0);
			return;
		}
		writeChapter(chapterInput);
	};

	// what they made -- owned opens in place, the rest goes to the add flow
	const handleAuthorPick = (work: AuthorWork) => {
		author.close();
		showSequelPrequel?.({ id: String(work.anilistId), title: work.title });
	};

	const handleSeriesOpen = (seriesDir: string) => {
		if (!showSequelPrequel) return;
		const { prev, next } = seriesNeighbours(manga);
		const target = seriesDir === "sequel" ? next : prev;
		if (target) showSequelPrequel(target);
	};

	const handleSaveNote = () => {
		if (localNote !== manga.note) {
			onUpdate(manga.id, { note: localNote });
		}
	};

	const handleDelete = () => {
		onClose();
		const shouldDelete = true;
		onUpdate(manga.id, undefined, shouldDelete);
	};

	const handleModalClose = () => {
		// fold the deferred phi drop into the update this close flushes
		commitScoreNudge();
		onClose();
	};
	useEscapeClose(handleModalClose);

	const { isSubmitting, submit: handleAddManga } = useAddWait(addManga);

	// need to reset local note
	useEffect(() => {
		setLocalNote(manga.note || "");
		setIsEditingChapter(false);
		reload.cancel();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [manga.id]);

	useEffect(() => {
		setChapterInput(manga.curChapter ?? 0);
	}, [manga.curChapter]);

	useEffect(() => {
		const handleLeave = (e: KeyboardEvent) => {
			if (e.key === "Enter") {
				const activeElement = document.activeElement;
				const isInTextarea = activeElement?.tagName === "TEXTAREA";
				const isInInput = activeElement?.tagName === "INPUT";
				if (!isInTextarea && !isInInput && !isEditingChapter) {
					handleAddManga();
				}
			}
		};
		//
		window.addEventListener("keydown", handleLeave);
		return () => window.removeEventListener("keydown", handleLeave);
	}, [onClose, handleAddManga, isEditingChapter]);

	if (!manga) return null;

	const displayLoading = isRefreshing
		? {
				isTrue: true,
				style: "h-8 w-8 border-emerald-400",
				text: "Reloading...",
			}
		: isLoading;

	// apply refresh to preview
	const previewManga = isSelecting
		? {
				...manga,
				...reload.meta,
				cover: stagedCovers.items[stagedCovers.index] ?? manga.cover,
			}
		: manga;

	return (
		<>
			<div className="lg:block hidden">
				<DesktopDetails
					item={previewManga}
					localNote={localNote}
					statusOptions={mangaStatusOptions}
					mediaType="manga"
					isLoading={displayLoading}
					isAdding={!!addManga}
					onAdd={handleAddManga}
					isSubmitting={isSubmitting}
					onClose={handleModalClose}
					canRefresh={!!onRefresh}
					isInList={isInList}
					isSelecting={isSelecting}
					onAction={
						handleAction as (action: {
							type: string;
							payload?: unknown;
						}) => void
					}
					differentColumns={DIFF_COLUMNS_MANGA}
					isEditingChapter={isEditingChapter}
					chapterInput={chapterInput}
				/>
			</div>
			<div className="block lg:hidden">
				<MobileDetails
					item={previewManga}
					localNote={localNote}
					statusOptions={mangaStatusOptions}
					mediaType="manga"
					isLoading={displayLoading}
					isAdding={!!addManga}
					onAdd={handleAddManga}
					isSubmitting={isSubmitting}
					onClose={handleModalClose}
					isInList={isInList}
					isSelecting={isSelecting}
					canRefresh={!!onRefresh}
					onAction={
						handleAction as (action: {
							type: string;
							payload?: unknown;
						}) => void
					}
					differentColumns={DIFF_COLUMNS_MANGA}
					isEditingChapter={isEditingChapter}
					chapterInput={chapterInput}
				/>
			</div>
			{/* AUTHOR WORKS */}
			<AnimatePresence>
				{author.name && (
					<AuthorCatalogModal
						key="author"
						authorName={author.name}
						catalog={author.catalog}
						loading={author.loading}
						sort={author.sort}
						onSortChange={author.setSort}
						onPageChange={author.setPage}
						loadingMore={author.loadingMore}
						onClose={author.close}
						onPick={handleAuthorPick}
						ownedStatus={(work) => author.ownedWork(work)?.status}
					/>
				)}
			</AnimatePresence>
			{/* PICK A DIFFERENT RESULT (refresh) */}
			<AnimatePresence>
				{multResultsOpen && (
					<ShowMultManga
						key="mult-refresh"
						onClose={() => setMultResultsOpen(false)}
						manga={refreshResults}
						prompt={manga.title}
						onClickedManga={handlePickAnotherResult}
						isLoading={isMangaSearching}
					/>
				)}
			</AnimatePresence>
		</>
	);
}
