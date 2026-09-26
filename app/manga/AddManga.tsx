"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { ModalBackdrop } from "@/app/components/ui/ModalMotion";
import { Loader2, BookOpen } from "lucide-react";
//
import { MangaProps, MangaSearchResult } from "@/types/manga";
import { SeriesTargetProps } from "@/types/media";
//
import { mapMangaAPIDatatoManga } from "@/app/manga/utils/mangaMapping";
//
import { MangaDetails } from "./MangaDetailsHub";
import { ShowMultManga } from "./components/ShowMultManga";
import { AnimatePresence } from "framer-motion";
//
import { useMangaSearch } from "@/hooks/external/useMangaSearch";
import { findOnlyNamed } from "@/utils/mediaMatch";

interface AddMangaProps {
	isOpen: boolean;
	onClose: () => void;
	existingManga: MangaProps[];
	// resolves true when the score battler took over the flow
	onAddManga: (item: MangaProps) => void | Promise<boolean | void>;
	targetFromAbove?: SeriesTargetProps | null;
	// keeps prequel/sequel jumps alive while previewing an unadded manga
	onSeriesNav?: (target: SeriesTargetProps) => void;
	isInList?: (target: SeriesTargetProps) => boolean;
	onDuplicate?: (dup: { title: string; anilistId?: number }) => boolean;
}

export function AddManga({
	isOpen,
	onClose,
	onAddManga,
	existingManga,
	targetFromAbove,
	onSeriesNav,
	isInList,
	onDuplicate,
}: AddMangaProps) {
	//failure reasons && their fixes -- for user
	const [failedReason, setFailedReason] = useState("");
	//
	const [activeModal, setActiveModal] = useState<
		"mangaDetails" | "multOptions" | null
	>(null);
	//
	const titleToSearch = useRef<HTMLInputElement>(null);
	const [isDupTitle, setIsDupTitle] = useState(false);
	//
	const [newManga, setNewManga] = useState<Partial<MangaProps>>({});
	// multi-result picker
	const [allNewManga, setAllNewManga] = useState<MangaSearchResult[]>([]);
	//
	const {
		searchForManga,
		searchForMangaMulti,
		loadMangaById,
		isMangaSearching,
	} = useMangaSearch();

	const reset = useCallback(() => {
		setFailedReason("");
		setIsDupTitle(false);
		//
		setActiveModal(null);
		setNewManga({});
		setAllNewManga([]);
		if (titleToSearch.current) {
			titleToSearch.current.value = "";
			titleToSearch.current.focus();
		}
	}, []);

	// a title already on file
	const handleDuplicate = useCallback(
		(dup: { title: string; anilistId?: number }) => {
			setActiveModal(null);
			// go to it
			if (onDuplicate?.(dup)) return;
			setFailedReason(`Already Have Manga: ${dup.title}`);
			setIsDupTitle(true);
		},
		[onDuplicate],
	);

	const handleMangaSearch = useCallback(
		async (knownId?: string) => {
			if (targetFromAbove) setActiveModal("mangaDetails");
			//
			const titleSearching = titleToSearch.current?.value.trim();
			if (!titleSearching) return null;
			//
			if (!targetFromAbove && !knownId) {
				const owned = findOnlyNamed(existingManga, titleSearching);
				if (owned) {
					handleDuplicate({
						title: owned.title,
						anilistId: owned.anilistId,
					});
					return;
				}
			}
			//
			const response = await searchForManga(titleSearching, knownId);
			// error
			if (!response) return null;
			// dup logic --- NEEDS TO BE ABOVE EMPTY LOGIC CAUSE RESPONSE IS EMPTY
			if ("isDuplicate" in response) {
				handleDuplicate(response);
				return;
			}
			// empty
			if (!response.anilist_id || !response.title) {
				setFailedReason("Could Not Find Manga.");
				setActiveModal(null);
				return;
			}
			//save manga
			setNewManga({
				...mapMangaAPIDatatoManga(response),
				status: "Want to Read",
				curChapter: 0,
			});
			setActiveModal("mangaDetails");
		},
		[searchForManga, handleDuplicate, existingManga, targetFromAbove],
	);

	const handleShowMore = useCallback(async () => {
		const q = titleToSearch.current?.value.trim();
		if (!q) return;
		setActiveModal("multOptions");
		const results = await searchForMangaMulti(q);
		setAllNewManga(results || []);
	}, [searchForMangaMulti]);

	// picked a specific result -- fetch its full record and show it
	const handlePickFromMultManga = useCallback(
		async (candidate: MangaSearchResult) => {
			setActiveModal("mangaDetails");
			const full = await loadMangaById(candidate.anilist_id);
			if (!full) {
				setFailedReason("Could Not Load Manga.");
				setActiveModal(null);
				return;
			}
			setNewManga({
				...mapMangaAPIDatatoManga(full),
				status: "Want to Read",
				curChapter: 0,
			});
		},
		[loadMangaById],
	);

	const handleMangaDetailsUpdates = useCallback(
		async (_mangaId: number, updates?: Partial<MangaProps>) => {
			setNewManga((prev) => ({ ...prev, ...updates }));
		},
		[],
	);

	const handleMangaAdd = async () => {
		// double check not adding duplicate
		if (newManga.anilistId && isDupTitle) {
			return;
		}
		// only close when the battler did not take over -- closing would clear item scoring
		const isBattling = await onAddManga(newManga as MangaProps);
		if (!isBattling) onClose();
	};

	const handleMangaDetailsClose = () => {
		reset();
		setActiveModal(null);
		if (targetFromAbove) {
			onClose();
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.stopPropagation();
			handleMangaSearch();
		}
	};

	const eraseErrMsg = () => {
		if (failedReason) {
			setFailedReason("");
			setIsDupTitle(false);
		}
	};

	//reset on both because sometimes when opening some ui artificate
	useEffect(() => {
		reset();
	}, [isOpen, reset]);

	// for when to search manga without modal
	useEffect(() => {
		if (targetFromAbove) {
			if (titleToSearch.current) {
				titleToSearch.current.value = targetFromAbove.title;
			}
			handleMangaSearch(targetFromAbove.id ?? undefined);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [targetFromAbove?.id, targetFromAbove?.title]);

	useEffect(() => {
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onClose();
			}
		};
		//
		window.addEventListener("keydown", handleEscape);
		return () => window.removeEventListener("keydown", handleEscape);
	}, [onClose]);

	if (!isOpen) return null;

	return (
		<ModalBackdrop className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
			<div className="fixed inset-0" onClick={onClose} />
			{!targetFromAbove || !!failedReason ? (
				<div className="bg-linear-to-b from-zinc-950/80 to-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-6 w-full max-w-xl mx-4 relative">
					<h2 className="text-xl font-semibold mb-4 text-zinc-300/90 flex justify-center items-center gap-2">
						<BookOpen className="w-5 h-5 text-zinc-300/90" />
						Search for New Manga
					</h2>
					<div className="flex gap-3">
						<div className="relative w-full">
							<input
								type="text"
								ref={titleToSearch}
								placeholder="Search for manga..."
								onKeyDown={handleKeyPress}
								onInput={eraseErrMsg}
								disabled={isMangaSearching}
								className="w-full bg-zinc-800/50 border border-zinc-800/50 rounded-xl px-4 py-3 pr-11 text-zinc-300 font-medium placeholder-zinc-400 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-900/50 outline-none transition-all duration-200 shadow-lg shadow-black/20"
							/>
							{isMangaSearching && (
								<Loader2 className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-500" />
							)}
						</div>
					</div>
					<div className="flex justify-between mx-2">
						{failedReason && !isMangaSearching && (
							<div className="mt-3 text-zinc-400 text-sm font-medium">
								{failedReason}
							</div>
						)}
					</div>
				</div>
			) : (
				<input
					type="text"
					ref={titleToSearch}
					disabled
					style={{ display: "none" }}
				/>
			)}
			{activeModal === "mangaDetails" && (
				<MangaDetails
					manga={newManga as MangaProps}
					existingManga={existingManga}
					onClose={handleMangaDetailsClose}
					onUpdate={handleMangaDetailsUpdates}
					addManga={handleMangaAdd}
					isLoading={{
						isTrue: isMangaSearching,
						style: "h-8 w-8 border-emerald-400",
						text: "Searching...",
					}}
					showSequelPrequel={onSeriesNav}
					isInList={isInList}
					onShowMore={handleShowMore}
					updateCoverColor={(color: string) =>
						setNewManga((prev) =>
							prev.cover
								? { ...prev, cover: { ...prev.cover, color } }
								: prev,
						)
					}
				/>
			)}
			<AnimatePresence>
				{activeModal === "multOptions" && (
					<ShowMultManga
						key="mult"
						onClose={() => setActiveModal("mangaDetails")}
						manga={allNewManga}
						prompt={titleToSearch.current?.value || ""}
						onClickedManga={handlePickFromMultManga}
						isLoading={isMangaSearching}
					/>
				)}
			</AnimatePresence>
		</ModalBackdrop>
	);
}
