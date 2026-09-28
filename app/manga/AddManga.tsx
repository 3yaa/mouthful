"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { ModalBackdrop } from "@/app/components/ui/ModalMotion";
import { BookOpen } from "lucide-react";
import {
	SearchCard,
	SearchFields,
	SearchReason,
} from "@/app/components/ui/SearchCard";
//
import { MangaProps, MangaSearchResult } from "@/types/manga";
import { SeriesJumpProps, SeriesTargetProps } from "@/types/media";
//
import { mapMangaAPIDatatoManga } from "@/app/manga/utils/mangaMapping";
//
import { MangaDetails } from "./MangaDetailsHub";
import { ShowMultManga } from "./components/ShowMultManga";
import { AnimatePresence } from "framer-motion";
//
import { useMangaSearch } from "@/hooks/external/useMangaSearch";
import { findOnlyNamed } from "@/utils/mediaMatch";
import { useEscapeClose } from "@/hooks/useEscapeClose";

interface AddMangaProps {
	isOpen: boolean;
	onClose: () => void;
	existingManga: MangaProps[];
	// resolves true when the score battler took over the flow
	onAddManga: (item: MangaProps) => void | Promise<boolean | void>;
	targetFromAbove?: SeriesJumpProps | null;
	// keeps prequel/sequel jumps alive while previewing an unadded manga
	onSeriesNav?: (jump: SeriesJumpProps) => void;
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
			// dup logic --- NEEDS TO BE ABOVE EMPTY LOGIC CAUSE RESPONSE IS EMPTY
			if (response && "isDuplicate" in response) {
				handleDuplicate(response);
				return;
			}
			// empty
			if (!response?.anilist_id || !response.title) {
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
		const tookOver = await onAddManga(newManga as MangaProps);
		if (!tookOver) onClose();
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

	useEscapeClose(onClose);

	if (!isOpen) return null;

	return (
		<ModalBackdrop className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30">
			<div className="fixed inset-0" onClick={onClose} />
			{!targetFromAbove || !!failedReason ? (
				<SearchCard icon={BookOpen} label="Search for New Manga">
					<SearchFields
						titleRef={titleToSearch}
						placeholder="Search for manga..."
						onKeyDown={handleKeyPress}
						onInput={eraseErrMsg}
						searching={isMangaSearching}
					/>
					<SearchReason text={isMangaSearching ? "" : failedReason} />
				</SearchCard>
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
					updateCoverPage={(page: number) =>
						setNewManga((prev) =>
							prev.cover
								? { ...prev, cover: { ...prev.cover, page } }
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
