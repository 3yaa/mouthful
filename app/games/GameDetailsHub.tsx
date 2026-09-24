"use client";
import { DIFF_COLUMNS_GAME, GameProps } from "@/types/game";
import { useEffect, useState } from "react";
import { gameStatusOptions } from "@/utils/dropDownDetails";
import { DesktopDetails } from "@/app/views/mediaDetails/DesktopDetails";
import { MobileDetails } from "@/app/views/mediaDetails/MobileDetails";
import { TIER_PHI_THRESHOLD, getSeedMu, Tier } from "@/lib/tierConfig";
import {
	activeLogoIndex,
	clearedFrom,
	stepLogoIndex,
} from "@/utils/artworkIndex";
import { useScoreNudge } from "@/hooks/useScoreNudge";
import { useAddWait } from "@/hooks/useAddWait";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { useGameSearch } from "@/hooks/external/useGameSearch";
import { PickList, useReloadPreview } from "@/hooks/useReloadPreview";
import { mapIGDBDataToGame, mapIGDBDlcsDataToGame } from "./utils/gameMapping";
import { buildCover } from "@/utils/coverColor";

export type GameAction =
	| { type: "closeModal" }
	| { type: "delete" }
	| { type: "changeStatus"; payload: "Playing" | "Completed" | "Dropped" }
	| { type: "resetScore" }
	| { type: "nudgeScore"; payload: "up" | "down" }
	| { type: "setInitialTier"; payload: Tier }
	| { type: "changeNote"; payload: string }
	| { type: "saveNote" }
	| { type: "dlcNav"; payload: "next" | "prev" }
	| { type: "needYearField" }
	| { type: "refresh" }
	| { type: "confirmRefresh" }
	| { type: "cancelRefresh" }
	| { type: "pickCoverColor"; payload: string }
	| { type: "changeBackdrop"; payload: "next" | "prev" }
	| { type: "changeLogo"; payload: "next" | "prev" }
	| { type: "clearLogo" };

interface GameDetailsProps {
	game: GameProps;
	onClose: () => void;
	isLoading?: { isTrue: boolean; style: string; text: string };
	onUpdate: (
		gameId: number,
		updates?: Partial<GameProps>,
		takeAction?: boolean,
	) => void;
	addGame?: () => void | Promise<unknown>;
	showDlc?: (igdbId: number, dlcIndex: number, source: GameProps) => void;
	// reload metadata from source (poster/backdrop, studio, dlcs)
	onRefresh?: (metadata: Partial<GameProps>) => Promise<void>;
	//
	backdropUrls?: string[];
	backdropIndex?: number;
	updateBackdropIndex?: (newIndex: number) => void;
	logoUrls?: string[];
	logoIndex?: number;
	updateLogoIndex?: (newIndex: number) => void;
}

// choices a game reload offers
type GameArt = {
	logos: PickList<string>;
	backdrops: PickList<string>;
};

export function GameDetails({
	onClose,
	game,
	onUpdate,
	addGame,
	isLoading,
	showDlc,
	onRefresh,
	backdropUrls,
	backdropIndex,
	updateBackdropIndex,
	logoUrls,
	logoIndex,
	updateLogoIndex,
}: GameDetailsProps) {
	const [localNote, setLocalNote] = useState(game.note || "");
	const { reloadGame } = useGameSearch();
	const reload = useReloadPreview<GameProps, GameArt>({
		onRefresh,
		canLoad: !!game.igdbId,
		// reloaded by igdbId -- reloads dlcs and all dlc in list
		load: async () => {
			if (!game.igdbId) return null;
			const data = await reloadGame(game.igdbId, game.title);
			if (!data) return null;
			const meta: Partial<GameProps> = {};
			if (game.dlcIndex === 0) {
				const mapped = mapIGDBDataToGame(data);
				meta.cover = await buildCover(mapped.cover?.url);
				meta.dlcs = mapped.dlcs;
			} else {
				const mapped = mapIGDBDlcsDataToGame(
					data,
					game.mainTitle || "",
				);
				meta.cover = await buildCover(mapped.cover?.url);
				// reorder dlc based on reload
				const mainIgdbId = game.dlcs?.[0]?.id;
				if (mainIgdbId) {
					const mainData = await reloadGame(mainIgdbId);
					if (mainData) {
						const newDlcs = mapIGDBDataToGame(mainData).dlcs;
						meta.dlcs = newDlcs;
						const idx =
							newDlcs?.findIndex((d) => d.id === game.igdbId) ??
							-1;
						if (idx >= 0) meta.dlcIndex = idx;
					}
				}
			}
			const backdrops =
				data.screenshot_urls?.map((ss) => ss.ss_url).filter(Boolean) ??
				[];
			return {
				meta,
				lists: {
					logos: { items: data.logos ?? [], index: 0 },
					backdrops: { items: backdrops, index: 0 },
				},
			};
		},
		// apply the previewed backdrop + metadata
		toMeta: ({ meta, lists }) => {
			const next: Partial<GameProps> = { ...meta };
			if (lists.backdrops.items.length) {
				next.backdropUrl = lists.backdrops.items[lists.backdrops.index];
			}
			// null when want text title
			if (lists.logos.items.length) {
				next.logoUrl = lists.logos.items[lists.logos.index] ?? null;
			}
			return next;
		},
	});
	const { isRefreshing, isSelecting, patchMeta } = reload;
	const setArtIndex = reload.setListIndex;
	const art = isSelecting
		? {
				logos: reload.list("logos"),
				backdrops: reload.list("backdrops"),
			}
		: {
				logos: { items: logoUrls, index: logoIndex },
				backdrops: { items: backdropUrls, index: backdropIndex },
			};

	// manual +/- 0.1 score tweaks -- phi tightens once, on close
	const { nudge: nudgeScore, commit: commitScoreNudge } = useScoreNudge(
		game,
		onUpdate,
	);

	const handleAction = (action: GameAction) => {
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
				onUpdate(game.id, {
					score: {
						mu: getSeedMu(action.payload),
						phi: TIER_PHI_THRESHOLD[action.payload],
					},
				});
				break;
			case "resetScore":
				onUpdate(game.id, { score: null });
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
			case "changeBackdrop":
				if (isSelecting) handleSelectBackdropChange(action.payload);
				else handleCoverChange(action.payload);
				break;
			// =========other actions=============
			case "dlcNav": // switches modal to DLC
				hanldeDlcOpen(action.payload);
				break;
			case "refresh":
				reload.refresh();
				break;
			case "confirmRefresh":
				reload.confirm();
				break;
			case "changeLogo":
				handleLogoChange(action.payload);
				break;
			case "clearLogo":
				handleClearLogo();
				break;
			case "pickCoverColor":
				handlePickCoverColor(action.payload);
				break;
			case "cancelRefresh":
				reload.cancel();
				break;
		}
	};

	// cycle the previewed backdrop while in refresh selection mode
	const handleSelectBackdropChange = (dir: "next" | "prev") => {
		const total = art.backdrops.items?.length ?? 0;
		if (!total) return;
		setArtIndex("backdrops", (i) =>
			dir === "next" ? (i + 1) % total : i === 0 ? total - 1 : i - 1,
		);
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

	// the picker only shows while adding or previewing a reload
	const handlePickCoverColor = (color: string) => {
		if (isSelecting) {
			patchMeta((prev) =>
				prev.cover
					? { ...prev, cover: { ...prev.cover, color } }
					: prev,
			);
			return;
		}
		if (game.cover) onUpdate(game.id, { cover: { ...game.cover, color } });
	};

	const handleStatusChange = (value: string) => {
		const newStatus = value as "Playing" | "Completed";
		const statusLoad: Partial<GameProps> = {
			status: newStatus,
		};
		if (newStatus === "Completed") {
			statusLoad.dateCompleted = new Date();
		} else if (game.dateCompleted) {
			statusLoad.dateCompleted = null;
		}
		onUpdate(game.id, statusLoad);
	};

	const hanldeDlcOpen = (dir: string) => {
		if (!showDlc || !game.dlcs) return;
		const dlcIndex = dir === "next" ? game.dlcIndex + 1 : game.dlcIndex - 1;
		const targetIgdbId = game.dlcs[dlcIndex]?.id;
		if (!targetIgdbId) return;
		showDlc(targetIgdbId, dlcIndex, game);
	};

	const handleSaveNote = () => {
		if (localNote !== game.note) {
			onUpdate(game.id, { note: localNote });
		}
	};

	const handleDelete = () => {
		onClose();
		const shouldDelete = true;
		onUpdate(game.id, undefined, shouldDelete);
	};

	const handleModalClose = () => {
		// fold the deferred phi drop into the update this close flushes
		commitScoreNudge();
		onClose();
	};
	useEscapeClose(handleModalClose);

	const handleNeedYear = () => {
		const needYear = true;
		onUpdate(game.id, undefined, needYear);
	};

	const { isSubmitting, submit: handleAddGame } = useAddWait(addGame);

	const handleCoverChange = (dir: string) => {
		if (
			!updateBackdropIndex ||
			backdropIndex === undefined ||
			!backdropUrls
		) {
			return;
		}
		//
		let newCoverIndex = backdropIndex;
		if (dir === "next") {
			newCoverIndex = (backdropIndex + 1) % backdropUrls.length;
		} else if (dir === "prev") {
			newCoverIndex =
				backdropIndex === 0
					? backdropUrls.length - 1
					: backdropIndex - 1;
		}
		updateBackdropIndex(newCoverIndex);
	};

	// need to reset local note
	useEffect(() => {
		setLocalNote(game.note || "");
		reload.cancel();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [game.id]);

	useEffect(() => {
		const handleLeave = (e: KeyboardEvent) => {
			if (e.key === "Enter") {
				const activeElement = document.activeElement;
				const isInTextarea = activeElement?.tagName === "TEXTAREA";
				const isInInput = activeElement?.tagName === "INPUT";
				if (!isInTextarea && !isInInput) {
					handleAddGame();
				}
			}
		};
		//
		window.addEventListener("keydown", handleLeave);
		return () => window.removeEventListener("keydown", handleLeave);
	}, [onClose, handleAddGame]);

	if (!game) return null;

	const displayLoading = isRefreshing
		? {
				isTrue: true,
				style: "h-8 w-8 border-emerald-400",
				text: "Reloading...",
			}
		: isLoading;

	//  apply refresh on preview
	const previewGame = isSelecting
		? {
				...game,
				...reload.meta,
				cover: reload.meta.cover ?? game.cover,
			}
		: game;

	return (
		<>
			<div className="lg:block hidden">
				<DesktopDetails
					item={previewGame}
					localNote={localNote}
					statusOptions={gameStatusOptions}
					mediaType="game"
					isLoading={displayLoading}
					isAdding={!!addGame}
					onAdd={handleAddGame}
					isSubmitting={isSubmitting}
					onClose={handleModalClose}
					canRefresh={!!onRefresh}
					isSelecting={isSelecting}
					onAction={
						handleAction as (action: {
							type: string;
							payload?: unknown;
						}) => void
					}
					differentColumns={DIFF_COLUMNS_GAME}
					backdropUrls={art.backdrops.items}
					backdropIndex={art.backdrops.index}
					logoUrls={art.logos.items}
					logoIndex={art.logos.index}
				/>
			</div>
			<div className="block lg:hidden">
				<MobileDetails
					item={previewGame}
					localNote={localNote}
					statusOptions={gameStatusOptions}
					mediaType="game"
					isLoading={displayLoading}
					isAdding={!!addGame}
					onAdd={handleAddGame}
					isSubmitting={isSubmitting}
					onClose={handleModalClose}
					isSelecting={isSelecting}
					logoUrls={art.logos.items}
					logoIndex={art.logos.index}
					backdropUrls={art.backdrops.items}
					backdropIndex={art.backdrops.index}
					canRefresh={!!onRefresh}
					onAction={
						handleAction as (action: {
							type: string;
							payload?: unknown;
						}) => void
					}
					differentColumns={DIFF_COLUMNS_GAME}
				/>
			</div>
		</>
	);
}
