"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { ModalBackdrop } from "@/app/components/ui/ModalMotion";
import { Tv, Brush, Loader2 } from "lucide-react";
import { ShowProps } from "@/types/show";
import { FIRST_SLOT, slotRefFor } from "./utils/slotRef";
import { mapNewShow, mapShowMeta } from "@/app/shows/utils/showMapping";
import { ShowDetails, type ShowDetailsProps } from "./ShowDetailsHub";
import { useShowSearch } from "@/hooks/external/useShowSearch";
import { findOnlyNamed, isRealTmdbId } from "@/utils/mediaMatch";

const DETECT_MODES = [
	{ key: "anime", label: "Anime", Icon: Brush },
	{ key: "show", label: "Show", Icon: Tv },
] as const;
type DetectMode = (typeof DETECT_MODES)[number]["key"];

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
	const [detectMode, setDetectMode] = useState<DetectMode | null>(null);
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
		setDetectMode(null);
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
		if (!titleFromAbove && !yearSearching) {
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
			detectMode ?? undefined,
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
	}, [searchForShow, detectMode, existingShows, titleFromAbove]);

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

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.stopPropagation();
			handleShowSearch();
		}
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
				<div className="bg-linear-to-b from-zinc-950/80 to-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-6 w-full max-w-xl mx-4 relative">
					<h2 className="text-xl font-semibold mb-4 text-zinc-300/90 flex justify-center items-center gap-2">
						<Tv className="w-5 h-5 text-zinc-300/90" />
						Search for New Show
					</h2>
					<div className="flex gap-3">
						<div className="relative w-full">
							<input
								type="text"
								ref={titleToSearch}
								placeholder="Search for show..."
								onKeyDown={handleKeyPress}
								disabled={isShowSearching}
								className="w-full rounded-lg px-4 py-3 pr-11 neu-raised focus:neu-pressed text-zinc-300/85 font-medium placeholder-zinc-500 outline-none transition-all duration-300 ease-out"
							/>
							{isShowSearching && (
								<Loader2 className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-500" />
							)}
						</div>
						{needYear && (
							<div className="">
								<input
									type="number"
									ref={yearToSearch}
									placeholder="Release Year"
									onKeyDown={handleKeyPress}
									disabled={isShowSearching}
									className="w-full rounded-lg px-4 py-3 neu-raised focus:neu-pressed text-zinc-300/85 font-medium placeholder-zinc-500 outline-none transition-all duration-300 ease-out"
								/>
							</div>
						)}
					</div>
					{needYear && (
						<div className="mt-3 flex gap-3">
							{DETECT_MODES.map(({ key, label, Icon }) => {
								const picked = (detectMode ?? "show") === key;
								return (
									<button
										key={key}
										type="button"
										onClick={() => setDetectMode(key)}
										disabled={isShowSearching}
										aria-pressed={picked}
										className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-bold tracking-wide transition-all duration-300 ease-out hover:cursor-pointer disabled:cursor-default disabled:opacity-45 ${
											picked
												? "neu-pressed text-zinc-200"
												: "neu-raised hover:neu-raised-hi active:scale-[0.99] text-zinc-400 hover:text-zinc-300"
										}`}
									>
										<Icon className="h-4 w-4" />
										{label}
									</button>
								);
							})}
						</div>
					)}
				</div>
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
