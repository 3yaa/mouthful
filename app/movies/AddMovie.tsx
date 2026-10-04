"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { ModalBackdrop } from "@/app/components/ui/ModalMotion";
import {
	SearchCard,
	SearchFields,
	SearchReason,
} from "@/app/components/ui/SearchCard";
import { Clapperboard } from "lucide-react";
import { MovieProps } from "@/types/movie";
import { SeriesJumpProps, SeriesTargetProps } from "@/types/media";
import { mapMetaToMovie } from "@/app/movies/utils/movieMapping";
import { MovieDetails, type MovieCrossMedia } from "./MovieDetailsHub";
import { useMovieSearch } from "@/hooks/external/useMovieSearch";
import { buildCover } from "@/utils/extractCoverPalette";
import { findOnlyNamed, isRealTmdbId } from "@/utils/mediaMatch";
import { useEscapeClose } from "@/hooks/useEscapeClose";

interface AddMovieProps extends MovieCrossMedia {
	isOpen: boolean;
	onClose: () => void;
	onAddMovie: (item: MovieProps) => void | Promise<boolean | void>;
	targetFromAbove?: SeriesJumpProps | null;
	onSeriesNav?: (jump: SeriesJumpProps) => void;
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
	...crossMedia
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
				const owned = existingShows.some(
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
		const tookOver = await onAddMovie(finalMovie as MovieProps);
		if (!tookOver) onClose();
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

	useEscapeClose(onClose);

	if (!isOpen) return null;

	return (
		<ModalBackdrop className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30">
			<div className="fixed inset-0" onClick={onClose} />
			{!targetFromAbove || needYear || isDupTitle ? (
				<SearchCard
					icon={Clapperboard}
					label="Search for New Movie"
					onLabelClick={toggleAdvanced}
					expanded={needYear}
					disabled={isMovieSearching}
				>
					<SearchFields
						titleRef={titleToSearch}
						placeholder="Search for movie..."
						onKeyDown={handleKeyPress}
						onInput={eraseErrMsg}
						searching={isMovieSearching}
						advanced={{
							open: needYear,
							yearRef: yearToSearch,
							toggle: {
								label: "Only movie",
								on: movieOnly,
								onChange: () => {
									eraseErrMsg();
									setMovieOnly((only) => !only);
								},
								hint: "Log it as a movie even when it sits on an anime chain",
							},
						}}
					/>
					<SearchReason text={isMovieSearching ? "" : failedReason} />
				</SearchCard>
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
					{...crossMedia}
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
