import React, { useEffect, useRef, useState } from "react";
import { slotSubtitle, titleCase } from "@/app/shows/utils/animeTitles";
import { FIRST_SLOT, slotIndexAt } from "@/app/shows/utils/slotRef";
import { SlotIndex } from "@/types/show";

interface Season {
	// tmdb seasons only
	season_number?: number;
	episode_count: number;
	// anilist slots only
	title?: string | null;
	number?: string | null;
	isSide?: boolean;
	format?: string | null;
}

interface MobileProgressPickerProps {
	isOpen: boolean;
	seasons: Season[];
	// strips franchise name back off an anilist title
	showTitle?: string;
	showTitleAlt?: string | null;
	slotIndex?: SlotIndex;
	curEpisode?: number;
	onClose: () => void;
	onEpisodeChange: (episode: number) => void;
	onSeasonIndexChange: (slotIndex: SlotIndex) => void;
}

export function MobileProgressPicker({
	isOpen,
	seasons,
	showTitle,
	showTitleAlt,
	slotIndex,
	curEpisode,
	onClose,
	onEpisodeChange,
	onSeasonIndexChange,
}: MobileProgressPickerProps) {
	const [selectedSeasonIndex, setSelectedSeasonIndex] = useState<SlotIndex>(
		slotIndex ?? FIRST_SLOT,
	);
	const [selectedEpisode, setSelectedEpisode] = useState(curEpisode ?? 1);
	const [isClosing, setIsClosing] = useState(false);
	const seasonScrollRef = useRef<HTMLDivElement>(null);
	const episodeScrollRef = useRef<HTMLDivElement>(null);

	// reset selection when picker opens
	useEffect(() => {
		if (isOpen) {
			setSelectedSeasonIndex(slotIndex ?? FIRST_SLOT);
			setSelectedEpisode(curEpisode ?? 1);
			setIsClosing(false);
		}
	}, [isOpen, slotIndex, curEpisode]);

	// auto-scroll to selected
	useEffect(() => {
		if (isOpen && seasonScrollRef.current) {
			const selectedButton = seasonScrollRef.current.querySelector(
				`[data-season="${selectedSeasonIndex}"]`,
			) as HTMLElement;
			if (selectedButton) {
				setTimeout(() => {
					selectedButton.scrollIntoView({
						behavior: "smooth",
						block: "center",
					});
				}, 100);
			}
		}
	}, [isOpen, selectedSeasonIndex]);

	useEffect(() => {
		if (isOpen && episodeScrollRef.current) {
			const selectedButton = episodeScrollRef.current.querySelector(
				`[data-episode="${selectedEpisode}"]`,
			) as HTMLElement;
			if (selectedButton) {
				setTimeout(() => {
					selectedButton.scrollIntoView({
						behavior: "smooth",
						block: "center",
					});
				}, 100);
			}
		}
	}, [isOpen, selectedEpisode, selectedSeasonIndex]);

	const handleClose = () => {
		setIsClosing(true);
		setTimeout(() => {
			setIsClosing(false);
			onClose();
		}, 150);
	};

	if (!isOpen || seasons.length === 0) return null;

	// anilist slots know what they are called
	const seasonOptions = seasons.map((s, idx) => {
		// anime parts carry `number`; tmdb seasons carry `season_number`
		const number = s.number ?? s.season_number;
		const named = slotSubtitle(s.title, showTitle, showTitleAlt);
		return {
			index: slotIndexAt(idx),
			isSide: !!s.isSide,
			numbered: number != null,
			kind: (s.format ?? "OVA").replace(/_/g, " "),
			label: titleCase(
				named ??
					(number != null
						? `Season ${number}`
						: (s.title ?? "Special")),
			),
		};
	});

	const selected = seasons[selectedSeasonIndex];
	const episodeOptions = Array.from(
		{ length: selected?.episode_count ?? 0 },
		(_, i) => i,
	);

	return (
		<>
			{/* Backdrop */}
			<div
				className={`fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
					isClosing ? "opacity-0" : "opacity-100"
				}`}
				onClick={handleClose}
			/>

			{/* Bottom Sheet */}
			<div
				className={`fixed inset-x-0 bottom-0 z-50 transition-transform duration-300 ease-out ${
					isClosing ? "translate-y-full" : "translate-y-0"
				}`}
			>
				<div className="bg-zinc-950 rounded-t-3xl border-t border-zinc-900/50 shadow-2xl">
					{/* Handle */}
					<div className="pt-3 pb-4 flex justify-center">
						<div className="w-12 h-1 bg-zinc-700/80 rounded-full"></div>
					</div>

					{/* Content */}
					<div className="px-5 pb-1">
						<h3 className="text-base font-semibold text-zinc-100 mb-2 text-center">
							Update Progress
						</h3>

						{/* Scrollable Pickers */}
						<div className="flex gap-3 h-56 mb-5">
							{/* Season Picker */}
							<div className="flex flex-col flex-1">
								<span className="text-zinc-500 text-sm font-medium mb-2.5 text-center">
									Season
								</span>
								<div
									ref={seasonScrollRef}
									className="overflow-y-auto no-scrollbar flex-1 space-y-1.5 relative mask-gradient"
								>
									{seasonOptions.map((s) => (
										<button
											key={s.index}
											data-season={s.index}
											onClick={() => {
												setSelectedSeasonIndex(s.index);
												setSelectedEpisode(1);
												onSeasonIndexChange(s.index);
											}}
											className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.98] ${
												s.index === selectedSeasonIndex
													? "bg-zinc-700 text-zinc-50"
													: s.isSide
														? "bg-zinc-800/20 text-zinc-500 active:bg-zinc-800/40"
														: "bg-zinc-800/40 text-zinc-400 active:bg-zinc-800/60"
											}`}
										>
											<span className="flex items-center justify-center gap-1.5 px-2">
												<span className="min-w-0 truncate">
													{s.label}
												</span>
												{!s.numbered && (
													<span className="shrink-0 rounded-full border border-current/30 px-1.5 text-[0.6rem] uppercase tracking-wider opacity-70">
														{s.kind}
													</span>
												)}
											</span>
										</button>
									))}
								</div>
							</div>

							{/* Episode Picker */}
							<div className="flex flex-col flex-1">
								<span className="text-zinc-500 text-sm font-medium mb-2.5 text-center">
									Episode
								</span>
								<div
									ref={episodeScrollRef}
									className="overflow-y-auto no-scrollbar flex-1 space-y-1.5 relative mask-gradient"
								>
									{episodeOptions.map((episode) => (
										<button
											key={episode}
											data-episode={episode}
											onClick={() => {
												setSelectedEpisode(episode);
												onEpisodeChange(episode);
												setTimeout(() => {
													handleClose();
												}, 10);
											}}
											className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.98] ${
												episode === selectedEpisode
													? "bg-zinc-700 text-zinc-50"
													: "bg-zinc-800/40 text-zinc-400 active:bg-zinc-800/60"
											}`}
										>
											Episode {episode}
										</button>
									))}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
