"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Transition } from "framer-motion";
import { ModalBackdrop } from "@/app/components/ui/ModalMotion";
import { Clapperboard, Loader2 } from "lucide-react";
import { MovieProps } from "@/types/movie";
import { ShowProps } from "@/types/show";
import { SeriesTargetProps } from "@/types/media";
import { mapMetaToMovie } from "@/app/movies/utils/movieMapping";
import { MovieDetails } from "./MovieDetailsHub";
import { useMovieSearch } from "@/hooks/external/useMovieSearch";
import { buildCover } from "@/utils/coverColor";
import { findOnlyNamed, isRealTmdbId } from "@/utils/mediaMatch";

// same curve as the watch-order drawer
const REVEAL: Transition = {
	duration: 0.34,
	ease: [0.16, 1, 0.3, 1],
	opacity: { duration: 0.2 },
};

interface AddMovieProps {
	isOpen: boolean;
	onClose: () => void;
	existingMovies: MovieProps[];
	onAddMovie: (item: MovieProps) => void | Promise<boolean | void>;
	targetFromAbove?: SeriesTargetProps | null;
	existingShows?: ShowProps[];
	onSeriesNav?: (target: SeriesTargetProps) => void;
	isInList?: (target: SeriesTargetProps) => boolean;
	onDuplicate?: (dup: {
		title: string;
		tmdbId?: string;
		imdbId?: string;
	}) => boolean;
	// if movie is apart of an anime
	onAnimeChain?: (found: {
		showTitle: string | null;
		tmdbId: string;
		parts: number;
	}) => void;
}

export function AddMovie({
	isOpen,
	onClose,
	onAddMovie,
	existingMovies,
	targetFromAbove,
	existingShows,
	onSeriesNav,
	isInList,
	onDuplicate,
	onAnimeChain,
}: AddMovieProps) {
	//failure reasons && their fixes -- for user
	const [failedReason, setFailedReason] = useState("");
	//
	const [needYear, setNeedYear] = useState(false);
	const [activeModal, setActiveModal] = useState<"movieDetails" | null>(null);
	//
	const titleToSearch = useRef<HTMLInputElement>(null);
	const yearToSearch = useRef<HTMLInputElement>(null);
	const [isDupTitle, setIsDupTitle] = useState(false);
	//
	const [newMovie, setNewMovie] = useState<Partial<MovieProps>>({});
	//
	const [logoUrls, setLogoUrls] = useState<string[]>([]);
	const [logoIndex, setLogoIndex] = useState(0);
	//
	const [posterUrls, setPosterUrls] = useState<string[]>([]);
	const [posterIndex, setPosterIndex] = useState(0);
	const [backdropUrls, setBackdropUrls] = useState<string[]>([]);
	const [backdropIndex, setBackdropIndex] = useState(0);
	//
	const { searchForMovie, isMovieSearching } = useMovieSearch();
	// just your normal movie
	const [movieOnly, setMovieOnly] = useState(false);
	const reduced = useReducedMotion();

	const reset = useCallback(() => {
		setFailedReason("");
		setIsDupTitle(false);
		setNeedYear(false);
		setMovieOnly(false);
		//
		setActiveModal(null);
		setNewMovie({});
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

	//
	const handleDuplicate = useCallback(
		(dup: { title: string; tmdbId?: string; imdbId?: string }) => {
			setActiveModal(null);
			if (onDuplicate?.(dup)) return;
			setFailedReason(`Already Have Movie: ${dup.title}`);
			setIsDupTitle(true);
			// dups open up need year pipe
			setNeedYear(true);
			setTimeout(() => {
				yearToSearch.current?.focus();
			}, 0);
		},
		[onDuplicate],
	);

	const handleMovieSearch = useCallback(
		async (knownTmdbId?: string) => {
			if (targetFromAbove) setActiveModal("movieDetails");
			//
			const titleSearching = titleToSearch.current?.value.trim();
			if (!titleSearching) return;
			const yearSearchingStr = yearToSearch.current?.value.trim();
			const yearSearching = yearSearchingStr
				? parseInt(yearSearchingStr, 10)
				: undefined;
			//
			if (!targetFromAbove && !knownTmdbId && !needYear) {
				const owned = findOnlyNamed(existingMovies, titleSearching);
				if (owned) {
					handleDuplicate({
						title: owned.title,
						tmdbId: isRealTmdbId(owned.tmdbId)
							? owned.tmdbId
							: undefined,
						imdbId: owned.imdbId,
					});
					return;
				}
			}
			//
			const movieData = await searchForMovie(
				titleSearching,
				yearSearching,
				undefined,
				movieOnly,
				knownTmdbId,
			);
			// dup logic --- NEEDS TO BE ABOVE EMPTY LOGIC CAUSE REPSONSE IS EMPTY
			if (movieData && "isDuplicate" in movieData) {
				handleDuplicate(movieData);
				return;
			}
			// empty
			if (!movieData?.imdbId || !movieData.title) {
				setFailedReason("Could Not Find Movie.");
				setNeedYear(true);
				setActiveModal(null);
				setTimeout(() => {
					yearToSearch.current?.focus();
				}, 0);
				return;
			}
			//
			const placed = movieOnly ? undefined : movieData.animeMovie;
			if (placed?.kind === "show" && onAnimeChain) {
				//
				const owned = (existingShows ?? []).some(
					(show) => String(show.tmdbId) === placed.tmdbId,
				);
				if (owned) {
					setActiveModal(null);
					setIsDupTitle(true);
					setNeedYear(true);
					setFailedReason(
						`Part of ${placed.showTitle ?? "a show"} - already in Shows, scored on that watch order.`,
					);
					setTimeout(() => {
						yearToSearch.current?.focus();
					}, 0);
					return;
				}
				onAnimeChain(placed);
				return;
			}
			//format movie
			const mappedMovie = mapMetaToMovie(movieData);
			setNewMovie({
				...mappedMovie,
				series: movieData.series ?? null,
			});
			setLogoUrls(movieData.logos ?? []);
			setLogoIndex(0);
			setPosterUrls(movieData.posters ?? []);
			setPosterIndex(0);
			setBackdropUrls(movieData.backdrops ?? []);
			setBackdropIndex(0);
			setActiveModal("movieDetails");
		},
		[
			searchForMovie,
			handleDuplicate,
			onAnimeChain,
			existingMovies,
			existingShows,
			movieOnly,
			targetFromAbove,
			needYear,
		],
	);

	//
	useEffect(() => {
		const url = posterUrls[posterIndex];
		if (!url) return;
		let alive = true;
		buildCover(url).then((cover) => {
			if (alive && cover) setNewMovie((prev) => ({ ...prev, cover }));
		});
		return () => {
			alive = false;
		};
	}, [posterUrls, posterIndex]);

	const handleMovieDetailsUpdates = useCallback(
		async (
			_movieId: number,
			updates?: Partial<MovieProps>,
			needYearField?: boolean,
		) => {
			if (needYearField) {
				setActiveModal(null);
				setNeedYear(true);
				setTimeout(() => {
					yearToSearch.current?.focus();
				}, 0);
				return;
			}
			setNewMovie((prev) => ({ ...prev, ...updates }));
		},
		[],
	);

	const handleMovieAdd = async () => {
		// double check not adding duplicate
		if (newMovie.imdbId && isDupTitle) {
			return;
		}
		let isStatus = newMovie.status;
		if (!isStatus) {
			isStatus = "Want to Watch";
		}
		const finalMovie = {
			...newMovie,
			status: isStatus,
			// when logo text set to null
			...(logoUrls.length
				? { logoUrl: logoUrls[logoIndex] ?? null }
				: {}),
			// cover already tracks the picked poster
			...(backdropUrls.length
				? { backdropUrl: backdropUrls[backdropIndex] }
				: {}),
		};
		const isBattling = await onAddMovie(finalMovie as MovieProps);
		if (!isBattling) onClose();
	};

	const handleMovieDetailsClose = () => {
		reset();
		setActiveModal(null);
		if (targetFromAbove) {
			onClose();
		}
	};

	// the year + only-movie row -- focus goes to whichever field is still empty
	const toggleAdvanced = () => {
		const open = !needYear;
		setNeedYear(open);
		if (!open) setMovieOnly(false);
		const hasTitle = !!titleToSearch.current?.value.trim();
		setTimeout(() => {
			(open && hasTitle ? yearToSearch : titleToSearch).current?.focus();
		}, 0);
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key !== "Enter") return;
		// on the switch, Enter searches instead of flipping it back
		e.preventDefault();
		e.stopPropagation();
		// nothing to search yet -- enter opens the row instead
		if (!titleToSearch.current?.value.trim()) {
			if (!needYear) toggleAdvanced();
			return;
		}
		handleMovieSearch();
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

	// for when to search movie without modal
	useEffect(() => {
		if (targetFromAbove) {
			if (titleToSearch.current) {
				titleToSearch.current.value = targetFromAbove.title;
			}
			// reset for jump
			if (yearToSearch.current) {
				yearToSearch.current.value = "";
			}
			handleMovieSearch(targetFromAbove.id ?? undefined);
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

	const shownReason = isMovieSearching ? "" : failedReason;
	const yearShut = reduced
		? { opacity: 0 }
		: { width: 0, marginLeft: 0, opacity: 0 };
	const yearOpen = reduced
		? { opacity: 1 }
		: { width: "11rem", marginLeft: "0.75rem", opacity: 1 };
	const rowShut = reduced ? { opacity: 0 } : { height: 0, opacity: 0 };
	const rowOpen = reduced ? { opacity: 1 } : { height: "auto", opacity: 1 };

	return (
		<ModalBackdrop className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30">
			<div className="fixed inset-0" onClick={onClose} />
			{!targetFromAbove || needYear || isDupTitle ? (
				<div className="bg-linear-to-b from-zinc-950/80 to-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-6 w-full max-w-xl mx-4 relative">
					<h2 className="mb-4 flex justify-center">
						<button
							type="button"
							onClick={toggleAdvanced}
							disabled={isMovieSearching}
							aria-expanded={needYear}
							className="flex items-center gap-2 rounded-lg text-xl font-semibold text-zinc-300/90 transition-colors duration-200 ease-out hover:cursor-pointer hover:text-zinc-100 disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-400"
						>
							<Clapperboard className="w-5 h-5" />
							Search for New Movie
						</button>
					</h2>
					<div className="flex">
						<div className="relative min-w-0 flex-1">
							<input
								type="text"
								ref={titleToSearch}
								placeholder="Search for movie..."
								onKeyDown={handleKeyPress}
								onInput={eraseErrMsg}
								disabled={isMovieSearching}
								className={`w-full bg-zinc-800/50 border border-zinc-800/50 rounded-xl px-4 py-3 text-zinc-300 font-medium placeholder-zinc-400 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-900/50 outline-none transition-all duration-200 shadow-lg shadow-black/20 ${
									!needYear
										? "pr-11"
										: isMovieSearching
											? "pr-37.75"
											: "pr-31.75"
								}`}
							/>
							{isMovieSearching && (
								<Loader2
									className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-500 ${
										needYear ? "right-31.25" : "right-4"
									}`}
								/>
							)}
						</div>
						<AnimatePresence initial={false}>
							{needYear && (
								<motion.div
									key="year"
									initial={yearShut}
									animate={yearOpen}
									exit={yearShut}
									transition={REVEAL}
									className="order-2 ml-3 w-44 shrink-0 overflow-clip"
								>
									<input
										type="number"
										ref={yearToSearch}
										placeholder="Release Year"
										onKeyDown={handleKeyPress}
										onInput={eraseErrMsg}
										disabled={isMovieSearching}
										className="w-full bg-zinc-800/50 border border-zinc-800/50 rounded-xl px-4 py-3 text-zinc-300 font-medium placeholder-zinc-400 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-900/50 outline-none transition-all duration-200"
									/>
								</motion.div>
							)}
						</AnimatePresence>
						<AnimatePresence initial={false}>
							{needYear && (
								<motion.button
									key="only"
									type="button"
									role="switch"
									aria-checked={movieOnly}
									initial={{ opacity: 0, x: 6 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: 6 }}
									transition={REVEAL}
									onMouseDown={(e) => e.preventDefault()}
									onClick={() => {
										eraseErrMsg();
										setMovieOnly((only) => !only);
									}}
									onKeyDown={handleKeyPress}
									disabled={isMovieSearching}
									title="Log it as a movie even when it sits on an anime chain"
									className={`relative order-1 mr-2.75 -ml-28.75 flex w-26 shrink-0 items-center justify-center gap-1.5 self-center rounded-lg py-1.5 text-xs font-semibold tracking-wide outline-none transition-colors duration-200 ease-out hover:cursor-pointer focus-visible:text-zinc-200 disabled:cursor-default disabled:opacity-50 ${
										movieOnly
											? "neu-carved-in text-blue-300"
											: "neu-carved hover:neu-carved-hi text-zinc-500 hover:text-zinc-300"
									}`}
								>
									<span
										className={`h-1.5 w-1.5 rounded-full transition-colors duration-200 ${
											movieOnly
												? "bg-blue-300"
												: "bg-zinc-600"
										}`}
									/>
									Only movie
								</motion.button>
							)}
						</AnimatePresence>
					</div>
					<AnimatePresence initial={false}>
						{shownReason && (
							<motion.div
								key="reason"
								initial={rowShut}
								animate={rowOpen}
								exit={rowShut}
								transition={REVEAL}
								className="overflow-clip"
							>
								<p className="pt-3 pl-4.25 text-sm font-medium text-zinc-400">
									{shownReason}
								</p>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			) : (
				<input
					type="text"
					ref={titleToSearch}
					disabled
					style={{ display: "none" }}
				/>
			)}
			{activeModal === "movieDetails" && (
				<MovieDetails
					movie={newMovie as MovieProps}
					onClose={handleMovieDetailsClose}
					onUpdate={handleMovieDetailsUpdates}
					addMovie={handleMovieAdd}
					existingMovies={existingMovies}
					existingShows={existingShows}
					showSequelPrequel={onSeriesNav}
					isInList={isInList}
					isLoading={{
						isTrue: isMovieSearching,
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
