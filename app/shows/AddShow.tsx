"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { ModalBackdrop } from "@/app/components/ui/ModalMotion";
import { Tv } from "lucide-react";
import { SearchCard, SearchFields } from "@/app/components/ui/SearchCard";
import { ShowProps } from "@/types/show";
import { FIRST_SLOT, slotRefFor } from "./utils/slotRef";
import { mapNewShow, mapShowMeta } from "@/app/shows/utils/showMapping";
import { ShowDetails, type ShowDetailsProps } from "./ShowDetailsHub";
import { useShowSearch } from "@/hooks/external/useShowSearch";
import { findOnlyNamed, isRealTmdbId } from "@/utils/mediaMatch";

// used in AddShow -- for movie items
type CrossMedia = Pick<
	ShowDetailsProps,
	"existingMovies" | "onMovieUpdate" | "onAddMovie"
>;

interface AddShowProps extends CrossMedia {
	isOpen: boolean;
	onClose: () => void;
	existingShows: ShowProps[];
	onAddShow: (item: ShowProps) => void | Promise<boolean | void>;
	onDuplicate?: (dup: { title: string; tmdbId?: string }) => boolean;
	titleFromAbove?: string;
}

export function AddShow({
	isOpen,
	onClose,
	onAddShow,
	onDuplicate,
	existingShows,
	titleFromAbove,
	...crossMedia
}: AddShowProps) {
	const [needYear, setNeedYear] = useState(false);
	const [anime, setAnime] = useState(false);
	const [activeModal, setActiveModal] = useState<"showDetails" | null>(null);
	//
	const titleToSearch = useRef<HTMLInputElement>(null);
	const yearToSearch = useRef<HTMLInputElement>(null);
	//
	const [newShow, setNewShow] = useState<Partial<ShowProps>>({});
	//
	const [logoUrls, setLogoUrls] = useState<string[]>([]);
	const [logoIndex, setLogoIndex] = useState(0);
	//
	const [posterUrls, setPosterUrls] = useState<string[]>([]);
	const [posterIndex, setPosterIndex] = useState(0);
	const [backdropUrls, setBackdropUrls] = useState<string[]>([]);
	const [backdropIndex, setBackdropIndex] = useState(0);
	//
	const { searchForShow, isShowSearching } = useShowSearch();

	const reset = useCallback(() => {
		setNeedYear(false);
		setAnime(false);
		//
		setActiveModal(null);
		setNewShow({});
		setLogoUrls([]);
		setLogoIndex(0);
		setPosterUrls([]);
		setPosterIndex(0);
		setBackdropUrls([]);
		setBackdropIndex(0);
		if (titleToSearch.current) {
			titleToSearch.current.value = "";
			titleToSearch.current.focus();
		}
		if (yearToSearch.current) {
			yearToSearch.current.value = "";
		}
	}, []);

	const handleTitleSearch = useCallback(async (): Promise<
		| { isDuplicate: true; title: string; tmdbId?: string }
		| { tmdbId: string }
		| null
	> => {
		const titleSearching = titleToSearch.current?.value.trim();
		if (!titleSearching) return null;
		const yearSearchingStr = yearToSearch.current?.value.trim();
		const yearSearching = yearSearchingStr
			? parseInt(yearSearchingStr, 10)
			: undefined;
		//
		if (!titleFromAbove && !needYear) {
			const owned = findOnlyNamed(existingShows, titleSearching);
			if (owned) {
				return {
					isDuplicate: true,
					title: owned.title,
					tmdbId: isRealTmdbId(owned.tmdbId)
						? owned.tmdbId
						: undefined,
				};
			}
		}
		//
		const showBare = await searchForShow(
			titleSearching,
			yearSearching,
			needYear && anime ? "anime" : undefined,
		);
		if (showBare && "isDuplicate" in showBare) {
			return {
				isDuplicate: true,
				title: showBare.title,
				tmdbId: showBare.tmdbId,
			};
		}
		if (!showBare) return null;
		//
		const mapped = {
			...mapNewShow(showBare),
			...mapShowMeta(showBare),
		};
		setNewShow({
			...mapped,
			...slotRefFor(mapped, FIRST_SLOT),
			status: "Want to Watch",
		});
		setLogoUrls(showBare.logos ?? []);
		setLogoIndex(0);
		setPosterUrls(showBare.posters ?? []);
		setPosterIndex(0);
		setBackdropUrls(showBare.backdrops ?? []);
		setBackdropIndex(0);
		return { tmdbId: showBare.tmdbId };
	}, [searchForShow, anime, existingShows, titleFromAbove, needYear]);

	// read poster color
	useEffect(() => {
		const url = posterUrls[posterIndex];
		if (!url) return;
		setNewShow((prev) => ({ ...prev, posterUrl: url }));
	}, [posterUrls, posterIndex]);

	const handleShowSearch = useCallback(async () => {
		if (titleFromAbove) setActiveModal("showDetails");
		const bareShow = await handleTitleSearch();
		//
		if (bareShow && "isDuplicate" in bareShow) {
			setActiveModal(null);
			if (onDuplicate?.(bareShow)) return;
			onClose();
			return;
		}
		// nothing found
		if (!bareShow?.tmdbId) {
			setNeedYear(true);
			setActiveModal(null);
			return;
		}
		setActiveModal("showDetails");
	}, [handleTitleSearch, onDuplicate, onClose, titleFromAbove]);

	const handleShowDetailsUpdates = useCallback(
		async (
			_id: number,
			updates?: Partial<ShowProps>,
			needYear?: boolean,
		) => {
			if (needYear) {
				setActiveModal(null);
				setNeedYear(true);
				setTimeout(() => {
					yearToSearch.current?.focus();
				}, 0);
				return;
			}
			setNewShow((prev) => ({ ...prev, ...updates }));
		},
		[],
	);

	const handleShowAdd = async () => {
		let isStatus = newShow.status;
		if (!isStatus) {
			isStatus = "Want to Watch";
		}
		const finalShow = {
			...newShow,
			status: isStatus,
			// text title then null not undefined
			...(logoUrls.length
				? { logoUrl: logoUrls[logoIndex] ?? null }
				: {}),
			// posterUrl already tracks the picked poster
			...(backdropUrls.length
				? { backdropUrl: backdropUrls[backdropIndex] }
				: {}),
		};
		const isBattling = await onAddShow(finalShow as ShowProps);
		if (!isBattling) onClose();
	};

	const handleShowDetailsClose = () => {
		reset();
		setActiveModal(null);
		if (titleFromAbove) {
			onClose();
		}
	};

	//
	const toggleAdvanced = () => {
		const open = !needYear;
		setNeedYear(open);
		if (!open) setAnime(false);
		const hasTitle = !!titleToSearch.current?.value.trim();
		setTimeout(() => {
			(open && hasTitle ? yearToSearch : titleToSearch).current?.focus();
		}, 0);
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key !== "Enter") return;
		e.stopPropagation();
		// nothing to search yet
		if (!titleToSearch.current?.value.trim()) {
			if (!needYear) toggleAdvanced();
			return;
		}
		handleShowSearch();
	};

	// reset on both because sometimes when opening some ui artificate
	useEffect(() => {
		reset();
	}, [isOpen, reset]);

	// for when to search show without modal
	useEffect(() => {
		if (titleFromAbove) {
			if (titleToSearch.current) {
				titleToSearch.current.value = titleFromAbove;
			}
			handleShowSearch();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [titleFromAbove]);

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
		<ModalBackdrop className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30">
			<div className="fixed inset-0" onClick={onClose} />
			{!titleFromAbove || needYear ? (
				<SearchCard
					icon={Tv}
					label="Search for New Show"
					onLabelClick={toggleAdvanced}
					expanded={needYear}
					disabled={isShowSearching}
				>
					<SearchFields
						titleRef={titleToSearch}
						placeholder="Search for show..."
						onKeyDown={handleKeyPress}
						searching={isShowSearching}
						advanced={{
							open: needYear,
							yearRef: yearToSearch,
							toggle: {
								label: "Anime",
								on: anime,
								onChange: () => setAnime((on) => !on),
								hint: "Search it as anime - off lets the search detect it",
							},
						}}
					/>
				</SearchCard>
			) : (
				<input
					type="text"
					ref={titleToSearch}
					disabled
					style={{ display: "none" }}
				/>
			)}
			{activeModal === "showDetails" && (
				<ShowDetails
					show={newShow as ShowProps}
					onClose={handleShowDetailsClose}
					onUpdate={handleShowDetailsUpdates}
					addShow={handleShowAdd}
					existingShows={existingShows}
					{...crossMedia}
					isLoading={{
						isTrue: isShowSearching,
						style: "h-8 w-8 border-emerald-400",
						text: "Searching...",
					}}
					logoUrls={logoUrls}
					logoIndex={logoIndex}
					updateLogoIndex={setLogoIndex}
					posterUrls={posterUrls}
					posterIndex={posterIndex}
					updatePosterIndex={setPosterIndex}
					backdropUrls={backdropUrls}
					backdropIndex={backdropIndex}
					updateBackdropIndex={setBackdropIndex}
				/>
			)}
		</ModalBackdrop>
	);
}
