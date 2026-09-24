"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { ModalBackdrop } from "@/app/components/ui/ModalMotion";
import { AnimatePresence } from "framer-motion";
import { Gamepad2, Loader2 } from "lucide-react";
//
import { GameProps, IGDBInitProps, IGDBProps } from "@/types/game";
//
import {
	mapIGDBDataToGame,
	mapIGDBDlcsDataToGame,
} from "@/app/games/utils/gameMapping";
//
import { GameDetails } from "./GameDetailsHub";
import { ShowMultGames } from "./components/ShowMultGames";
//
import { useGameSearch } from "@/hooks/external/useGameSearch";
import { buildCover } from "@/utils/coverColor";
import { findOnlyNamed } from "@/utils/mediaMatch";

interface AddGameProps {
	isOpen: boolean;
	onClose: () => void;
	existingGames: GameProps[];
	// resolves true when the score battler took over the flow
	onAddGame: (item: GameProps) => void | Promise<boolean | void>;
	titleFromAbove?: {
		dlcIndex: number;
		mainTitle: string;
		dlcs: IGDBInitProps[];
	} | null;
	// keeps dlc jumps alive while previewing an unadded game
	onDlcNav?: (igdbId: number, dlcIndex: number, source: GameProps) => void;
	onDuplicate?: (dup: { title: string; igdbId?: number }) => boolean;
}

const GAMELIMIT = 10;

export function AddGame({
	isOpen,
	onClose,
	onAddGame,
	existingGames,
	titleFromAbove,
	onDlcNav,
	onDuplicate,
}: AddGameProps) {
	//failure reasons && their fixes -- for user
	const [failedReason, setFailedReason] = useState("");
	//
	const [activeModal, setActiveModal] = useState<
		"gameDetails" | "multOptions" | null
	>(null);
	//
	const titleToSearch = useRef<HTMLInputElement>(null);
	const [isDupTitle, setIsDupTitle] = useState(false);
	//
	const [allNewGames, setAllNewGames] = useState<IGDBProps[]>([]);
	const [newGame, setNewGame] = useState<Partial<GameProps>>({});
	const [backdropUrls, setBackdropUrls] = useState<string[]>([]);
	const [backdropIndex, setBackdropIndex] = useState(0);
	//
	const [logoUrls, setLogoUrls] = useState<string[]>([]);
	const [logoIndex, setLogoIndex] = useState(0);
	//
	const {
		searchForGame,
		searchForGameDlc,
		searchForGameLogos,
		isGameSearching,
	} = useGameSearch();

	const reset = useCallback(() => {
		setFailedReason("");
		setIsDupTitle(false);
		//
		setBackdropUrls([]);
		setBackdropIndex(0);
		//
		setLogoUrls([]);
		setLogoIndex(0);
		//
		setActiveModal(null);
		setAllNewGames([]);
		setNewGame({});
		if (titleToSearch.current) {
			titleToSearch.current.value = "";
			titleToSearch.current.focus();
		}
	}, []);

	// igdb gives no cover colour
	const applyCoverColor = useCallback(async (url?: string) => {
		const cover = await buildCover(url);
		if (cover) setNewGame((prev) => ({ ...prev, cover }));
	}, []);

	const handleTitleSearch = useCallback(async () => {
		const titleSearching = titleToSearch.current?.value.trim();
		if (!titleSearching) return null;
		//
		if (!titleFromAbove) {
			const owned = findOnlyNamed(existingGames, titleSearching);
			if (owned) {
				return {
					isDuplicate: true,
					title: owned.title,
					igdbId: owned.igdbId,
				};
			}
		}
		//
		const response = await searchForGame(titleSearching, GAMELIMIT);
		if (response && "isDuplicate" in response) {
			return {
				isDuplicate: true,
				title: response.title,
				igdbId: response.igdbId,
			};
		}
		const mainGame = response?.[0];
		if (!mainGame) return null;
		//
		setBackdropUrls(mainGame.screenshot_urls?.map((ss) => ss.ss_url) || []);
		//
		setLogoUrls(mainGame.logos ?? []);
		setLogoIndex(0);
		setNewGame({ ...mapIGDBDataToGame(mainGame), status: "Playing" });
		setAllNewGames(response);
		applyCoverColor(mainGame.cover_url);
		return {
			title: mainGame.title,
			igdbId: mainGame.igdbId,
		};
	}, [searchForGame, applyCoverColor, existingGames, titleFromAbove]);

	const handleGameSearch = useCallback(async () => {
		if (titleFromAbove) setActiveModal("gameDetails");
		//
		const response = await handleTitleSearch();
		// dup logic --- NEEDS TO BE ABOVE EMPTY LOGIC CAUSE REPSONSE IS EMPTY
		if (response && "isDuplicate" in response) {
			setActiveModal(null);
			// go to it
			if (onDuplicate?.(response)) return;
			setFailedReason(`Already Have Game: ${response.title}`);
			setIsDupTitle(true);
			return;
		}
		// empty logic
		if (!response?.igdbId || !response.title) {
			setFailedReason("Could Not Find Game.");
			setActiveModal(null);
			return;
		}
		setActiveModal("gameDetails");
	}, [handleTitleSearch, onDuplicate, titleFromAbove]);

	const handleDlcTitleSearch = useCallback(
		async (igdbId: number) => {
			// make call
			const response = await searchForGameDlc(igdbId);
			if (response && "isDuplicate" in response) {
				return {
					isDuplicate: true,
					title: response.title,
					igdbId: response.igdbId,
				};
			}
			const mainDlc = response?.[0];
			if (!mainDlc) return null;
			//
			const mappedData = mapIGDBDlcsDataToGame(
				mainDlc,
				titleFromAbove?.mainTitle || "",
			);
			setBackdropUrls(
				mainDlc.screenshot_urls?.map((ss) => ss.ss_url) || [],
			);
			// reset for serise jump
			setBackdropIndex(0);
			setLogoUrls([]);
			setLogoIndex(0);
			setNewGame((prev) => ({
				...prev,
				...mappedData,
				logoUrl: undefined,
				status: "Playing",
			}));
			applyCoverColor(mainDlc.cover_url);
		},
		[searchForGameDlc, titleFromAbove, applyCoverColor],
	);

	const handleDlcSearch = useCallback(async () => {
		setActiveModal("gameDetails");
		//
		const selectedDlc = titleFromAbove?.dlcs[titleFromAbove.dlcIndex];
		const { igdbId, title } = {
			igdbId: selectedDlc?.id,
			title: selectedDlc?.name,
		};
		if (!igdbId || !title) {
			setFailedReason("igdbId error for dlc details.");
			setActiveModal(null);
			return;
		}
		//
		const response = await handleDlcTitleSearch(igdbId);
		//check for duplicate
		if (response && "isDuplicate" in response) {
			setActiveModal(null);
			// go to it
			if (onDuplicate?.(response)) return;
			setFailedReason(`Already Have Game: ${response.title}`);
			setIsDupTitle(true);
			return;
		}
		setNewGame((prev) => ({
			...prev,
			...{
				mainTitle: titleFromAbove?.mainTitle,
				dlcIndex: titleFromAbove?.dlcIndex,
				dlcs: titleFromAbove?.dlcs,
			},
		}));
	}, [titleFromAbove, handleDlcTitleSearch, onDuplicate]);

	const handlePickFromMultGames = useCallback(
		(game: IGDBProps) => {
			try {
				setBackdropUrls(
					game.screenshot_urls?.map((ss) => ss.ss_url) || [],
				);
				setBackdropIndex(0);
				setNewGame({ ...mapIGDBDataToGame(game), status: "Playing" });
				applyCoverColor(game.cover_url);
				// need to clear first and then set for the new game
				setLogoUrls([]);
				setLogoIndex(0);
				searchForGameLogos(game.title).then((logos) => {
					setLogoUrls(logos);
					setNewGame((prev) =>
						prev.igdbId === game.igdbId
							? { ...prev, logoUrl: logos[0] ?? undefined }
							: prev,
					);
				});
			} finally {
				setActiveModal("gameDetails");
			}
		},
		[applyCoverColor, searchForGameLogos],
	);

	const handleGameDetailsUpdates = useCallback(
		async (
			_gameId: number,
			updates?: Partial<GameProps>,
			showMore?: boolean,
		) => {
			if (showMore) {
				setActiveModal("multOptions");
				return;
			}
			setNewGame((prev) => ({ ...prev, ...updates }));
		},
		[],
	);

	const handleGameAdd = async () => {
		// double check not adding duplicate
		if (newGame.igdbId && isDupTitle) {
			return;
		}
		//
		let isStatus = newGame.status;
		if (!isStatus) {
			isStatus = "Playing";
		}
		const finalGame = {
			...newGame,
			backdropUrl: backdropUrls[backdropIndex],
			status: isStatus,
			// empty on logo dislike
			...(logoUrls.length
				? { logoUrl: logoUrls[logoIndex] ?? null }
				: {}),
		};
		// only close when the battler did not take over
		const isBattling = await onAddGame(finalGame as GameProps);
		if (!isBattling) onClose();
	};

	const handleGameDetailsClose = () => {
		reset();
		setActiveModal(null);
		if (titleFromAbove) {
			onClose();
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.stopPropagation();
			handleGameSearch();
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

	// for when to search game without modal
	useEffect(() => {
		if (titleFromAbove) {
			handleDlcSearch();
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
		<ModalBackdrop className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
			{/* maybe not allow user to close modal as new game coming? */}
			<div className="fixed inset-0" onClick={onClose} />
			{!titleFromAbove ? (
				<div className="bg-linear-to-b from-zinc-950/80 to-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-6 w-full max-w-xl mx-4 relative">
					<h2 className="text-xl font-semibold mb-4 text-zinc-300/90 flex justify-center items-center gap-2">
						<Gamepad2 className="w-5 h-5 text-zinc-300/90" />
						Search for New Game
					</h2>
					<div className="flex gap-3">
						<div className="relative w-full">
							<input
								type="text"
								ref={titleToSearch}
								placeholder="Search for game..."
								onKeyDown={handleKeyPress}
								onInput={eraseErrMsg}
								disabled={isGameSearching}
								className="w-full bg-zinc-800/50 border border-zinc-800/50 rounded-xl px-4 py-3 pr-11 text-zinc-300 font-medium placeholder-zinc-400 focus:border-zinc-800 focus:ring-1 focus:ring-zinc-900/50 outline-none transition-all duration-200 shadow-lg shadow-black/20"
							/>
							{isGameSearching && (
								<Loader2 className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-500" />
							)}
						</div>
					</div>
					<div className="flex justify-between mx-2">
						{failedReason && !isGameSearching && (
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
			{activeModal === "gameDetails" && (
				<GameDetails
					game={newGame as GameProps}
					onClose={handleGameDetailsClose}
					onUpdate={handleGameDetailsUpdates}
					addGame={handleGameAdd}
					showDlc={onDlcNav}
					isLoading={{
						isTrue: isGameSearching,
						style: "h-8 w-8 border-emerald-400",
						text: "Searching...",
					}}
					backdropUrls={backdropUrls}
					backdropIndex={backdropIndex}
					updateBackdropIndex={(newIndex: number) =>
						setBackdropIndex(newIndex)
					}
					logoUrls={logoUrls}
					logoIndex={logoIndex}
					updateLogoIndex={setLogoIndex}
				/>
			)}
			<AnimatePresence>
				{activeModal === "multOptions" && (
					<ShowMultGames
						key="mult"
						onClose={() => setActiveModal("gameDetails")}
						games={allNewGames}
						prompt={titleToSearch.current?.value || ""}
						onClickedGame={handlePickFromMultGames}
						isLoading={isGameSearching}
					/>
				)}
			</AnimatePresence>
		</ModalBackdrop>
	);
}
