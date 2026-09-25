import { Settings2, Circle, Search } from "lucide-react";
import { BaseMediaProps, MediaStatus, ColumnConfig } from "@/types/media";
import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { DesktopItem } from "./DesktopItem";
import { BadgeLink } from "./ShowsBadge";
import { ListingHeader } from "./ListingHeader";
import { useFlash } from "@/app/components/RouteFlash";
import { LISTING_COLUMN, ListingLoader } from "./ListingSkeleton";
import { statusLabel } from "@/utils/formattingUtils";

// default row size before measurement
const ROW_FALLBACK = 127;

interface DesktopListingProps<T extends BaseMediaProps> {
	mediaItems: T[];
	isProcessing: boolean;
	// sort/filter
	sortConfig: { type: string; order: "asc" | "desc" } | null;
	statusOptions: MediaStatus[];
	curStatusFilter: MediaStatus | null;
	// [0]: author | [1]: dateReleased
	differentColumns: [ColumnConfig<T>, ColumnConfig<T>];
	// search
	searchQuery: string;
	//
	mediaType: string;
	emptyListText: string;
	openItemId?: number | null;
	// callbacks
	onItemClicked: (item: T) => void;
	onSortConfig: (sortKey: string) => void;
	onSearchChange: (searchVal: string) => void;
	onStatusFilter: (Status: MediaStatus) => void;
}

export function DesktopListing<T extends BaseMediaProps>({
	mediaItems,
	isProcessing,
	sortConfig,
	statusOptions,
	curStatusFilter,
	differentColumns,
	searchQuery,
	mediaType,
	emptyListText,
	openItemId,
	onItemClicked,
	onSortConfig,
	onSearchChange,
	onStatusFilter,
}: DesktopListingProps<T>) {
	const parentRef = useRef<HTMLDivElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const [listTop, setListTop] = useState(0);
	const [searchOpen, setSearchOpen] = useState(false);
	const flash = useFlash();
	const searchBarRef = useRef<HTMLInputElement>(null);
	const statusFilterRef = useRef<HTMLDivElement>(null);
	const [openStatusOption, setOpenStatusOption] = useState(false);
	const [rowEstimate, setRowEstimate] = useState(ROW_FALLBACK);
	//
	const virtualizer = useVirtualizer({
		count: mediaItems.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => rowEstimate,
		overscan: 5,
		measureElement: (element) =>
			element?.getBoundingClientRect().height ?? rowEstimate,
		//
		useFlushSync: false,
		scrollMargin: listTop,
	});
	//
	const ranks = useMemo(() => {
		if (sortConfig?.type !== "score") {
			return mediaItems.map((_, i) => i + 1);
		}

		const result: number[] = [];
		let currentRank = 1;

		for (let i = 0; i < mediaItems.length; i++) {
			if (i === 0) {
				result.push(currentRank);
				continue;
			}

			const prevScore = mediaItems[i - 1].score?.mu;
			const curScore = mediaItems[i].score?.mu;

			if (
				prevScore != null &&
				curScore != null &&
				prevScore === curScore
			) {
				result.push(result[i - 1]);
			} else {
				currentRank = i + 1;
				result.push(currentRank);
			}
		}

		return result;
	}, [mediaItems, sortConfig]);

	// whats on screen now
	const onScreen = useRef<{ index: number; start: number; size: number }[]>(
		[],
	);
	onScreen.current = virtualizer.getVirtualItems();

	//
	const [hoverOn, setHoverOn] = useState(true);
	useEffect(() => {
		const scroller = parentRef.current;
		if (!scroller) return;

		// the cursor's offset from the top of the scroller
		let from = -1;
		let over: number | null = null;
		let settle: ReturnType<typeof setTimeout> | null = null;

		const rowAt = (offset: number) => {
			const hit = onScreen.current.find(
				(v) => offset >= v.start && offset < v.start + v.size,
			);
			return hit ? hit.index : null;
		};

		const open = () => {
			if (settle) clearTimeout(settle);
			settle = null;
			setHoverOn((on) => on || true);
		};

		const onScroll = () => {
			// once the list stops, hover is the cursor's again
			if (settle) clearTimeout(settle);
			settle = setTimeout(open, 110);
			if (from < 0) return;
			const now = rowAt(from + scroller.scrollTop);
			if (now !== null && now === over) return;
			over = now;
			setHoverOn((on) => (on ? false : on));
		};

		const onMove = (e: MouseEvent) => {
			from = e.clientY - scroller.getBoundingClientRect().top;
			over = rowAt(from + scroller.scrollTop);
			open();
		};

		scroller.addEventListener("scroll", onScroll, { passive: true });
		window.addEventListener("mousemove", onMove, { passive: true });
		return () => {
			scroller.removeEventListener("scroll", onScroll);
			window.removeEventListener("mousemove", onMove);
			if (settle) clearTimeout(settle);
		};
	}, [isProcessing, mediaItems.length]);

	//
	useEffect(() => {
		const update = () => {
			const top = listRef.current?.offsetTop ?? 0;
			setListTop((held) => (Math.abs(held - top) > 1 ? top : held));
			//
			const row = parentRef.current?.querySelector("[data-index]");
			const measured = row?.getBoundingClientRect().height;
			if (measured) {
				// a hair of slack, or a sub-pixel difference re-renders forever
				setRowEstimate((held) =>
					Math.abs(held - measured) > 1 ? measured : held,
				);
				return;
			}
			const root =
				parseFloat(
					getComputedStyle(document.documentElement).fontSize,
				) || 16;
			setRowEstimate((ROW_FALLBACK / 16) * root);
		};
		// once now, for the fallback, and once after the first paint, when there is a row to read
		update();
		const frame = requestAnimationFrame(update);
		window.addEventListener("resize", update);
		return () => {
			cancelAnimationFrame(frame);
			window.removeEventListener("resize", update);
		};
	}, [mediaItems.length]);

	// use / to open search
	useEffect(() => {
		const handleKeyPress = (e: KeyboardEvent) => {
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement
			) {
				return;
			}
			//
			if (e.key === "/") {
				if (!searchOpen) {
					setSearchOpen(true);
					e.preventDefault();
				}
			}
		};
		//
		window.addEventListener("keydown", handleKeyPress);
		return () => window.removeEventListener("keydown", handleKeyPress);
	}, [searchOpen]);

	// focused once the bar is open
	useEffect(() => {
		if (searchOpen) searchBarRef.current?.focus();
	}, [searchOpen]);

	// if click outside
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (
				openStatusOption &&
				statusFilterRef.current &&
				!statusFilterRef.current.contains(e.target as Node)
			) {
				setOpenStatusOption(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () =>
			document.removeEventListener("mousedown", handleClickOutside);
	}, [openStatusOption]);

	return (
		<div ref={parentRef} className="relative h-screen overflow-auto">
			<div
				className={`${LISTING_COLUMN} mx-auto min-h-full flex flex-col`}
			>
				{/* STATUS FILTER */}
				<div
					className="fixed left-1 p-2 px-2.5 bg-linear-to-br from-zinc-900/80 to-zinc-950 border-zinc-700/50 shadow-lg shadow-black rounded-lg"
					ref={statusFilterRef}
					onClick={() => {
						setOpenStatusOption(!openStatusOption);
					}}
				>
					<div
						className={`relative z-20 transition-all duration-300 ease-out rounded-md ${
							openStatusOption ? "bg-zinc-800/60 p-2 -m-2" : ""
						}`}
					>
						<Settings2
							className={`w-5 h-5 transition-all duration-300 ease-out cursor-pointer ${
								openStatusOption
									? "text-zinc-300 rotate-90 scale-110"
									: "text-zinc-400 rotate-0 scale-100"
							}`}
						/>
					</div>
					{/* STATUS FILTER OPTIONS */}
					<div
						className={`fixed left-0 mt-2 min-w-44 bg-linear-to-br from-zinc-900/95 to-zinc-950 backdrop-blur-xl border border-zinc-800/40 rounded-lg shadow-2xl overflow-hidden origin-top-left z-10 transition-all duration-300 ease-out ${
							openStatusOption
								? "opacity-100 scale-100 translate-y-0"
								: // laid out even when faded -- still eats the wheel
									"invisible opacity-0 scale-95 -translate-y-2 pointer-events-none"
						}`}
					>
						{statusOptions.map((status, index) => (
							<div
								key={status}
								className={`flex items-center justify-between px-4 py-3 text-zinc-300 text-sm transition-all duration-200 ease-out cursor-pointer hover:bg-zinc-800/60 hover:text-zinc-100 active:scale-98 ${
									index !== statusOptions.length - 1
										? "border-b border-zinc-800/80"
										: ""
								} ${curStatusFilter === status ? "bg-zinc-800/40" : ""}`}
								style={{
									transitionDelay: openStatusOption
										? `${index * 30}ms`
										: "0ms",
								}}
								onClick={() => {
									onStatusFilter(status);
									setOpenStatusOption(false);
								}}
							>
								<span className="font-medium">
									{statusLabel(status)}
								</span>
								<div
									className={`transition-all duration-200 ease-out ${
										curStatusFilter === status
											? "scale-100 opacity-100"
											: "scale-75 opacity-40"
									}`}
								>
									{curStatusFilter === status ? (
										<div className="relative w-5 h-5">
											<Circle className="w-5 h-5 text-blue-400 absolute" />
											<div className="w-3 h-3 bg-blue-400/90 rounded-full absolute top-1 left-1 animate-pulse" />
										</div>
									) : (
										<Circle className="w-5 h-5 text-gray-500" />
									)}
								</div>
							</div>
						))}
					</div>
				</div>
				{/* SEARCH BUTTON/BAR */}
				<div className="fixed top-1 right-1 z-20">
					<div className="relative">
						{/* SEARCH BUTTON */}
						<div
							className={`flex items-center gap-2 bg-linear-to-bl from-zinc-900/80 to-zinc-950 border-zinc-700/50 shadow-lg shadow-black rounded-lg transition-all duration-300 ease-out ${
								searchOpen
									? "w-72 px-3 py-2"
									: "w-9 h-9 px-0 py-0 cursor-pointer hover:bg-zinc-800/70"
							}`}
							onClick={() => {
								if (!searchOpen) setSearchOpen(true);
							}}
						>
							<Search
								className={`w-4 h-4 text-zinc-400/75 font-bold shrink-0 transition-all duration-300 ${
									searchOpen ? "ml-0" : "ml-2.5"
								}`}
							/>
							{/* SEARCH BAR */}
							<input
								type="text"
								ref={searchBarRef}
								value={searchQuery}
								onFocus={() => setSearchOpen(true)}
								onChange={(e) => {
									onSearchChange(e.target.value);
								}}
								onKeyDown={(e) => {
									if (e.key !== "Escape") return;
									e.stopPropagation();
									onSearchChange("");
									setSearchOpen(false);
									searchBarRef.current?.blur();
								}}
								onBlur={() =>
									!searchQuery && setSearchOpen(false)
								}
								placeholder={"Search " + mediaType + "s..."}
								className={`bg-transparent text-sm text-zinc-100 font-medium placeholder-zinc-500 focus:outline-none flex-1 transition-all duration-300 ${
									searchOpen
										? "w-full opacity-100 pointer-events-auto"
										: "w-0 opacity-0 pointer-events-none"
								}`}
							/>
							{searchOpen && (
								<button
									onClick={(e) => {
										e.stopPropagation();
										onSearchChange("");
										setSearchOpen(false);
									}}
									className="text-zinc-400 hover:text-zinc-200 text-xs transition-colors hover:cursor-pointer"
								>
									✕
								</button>
							)}
						</div>
					</div>
				</div>
				{/* HEADING */}
				<ListingHeader
					mediaType={mediaType}
					count={isProcessing ? undefined : mediaItems.length}
					differentColumns={differentColumns}
					sortConfig={sortConfig}
					onSortConfig={onSortConfig}
					badge={
						mediaType === "show" && (
							<BadgeLink
								href="/shows/discover"
								title="Browse shows"
								className="absolute -right-14 top-0"
								onClick={() => flash()}
							/>
						)
					}
				/>
				{/* LOADER */}
				{isProcessing && <ListingLoader />}
				{/* NO MEDIA */}
				{!isProcessing && mediaItems.length === 0 && (
					<div className="text-center py-12">
						<p className="text-zinc-400 italic text-lg">
							{emptyListText}
						</p>
					</div>
				)}
				{/* LISTING */}
				{!isProcessing && mediaItems.length > 0 && (
					<div ref={listRef} className="w-full">
						<div
							data-hover={hoverOn ? "" : undefined}
							style={{
								height: `${virtualizer.getTotalSize()}px`,
								width: "100%",
								position: "relative",
							}}
						>
							{virtualizer
								.getVirtualItems()
								.map((virtualItem) => {
									const item = mediaItems[virtualItem.index];
									return (
										<div
											key={item.id}
											data-index={virtualItem.index}
											ref={virtualizer.measureElement}
											style={{
												position: "absolute",
												top: 0,
												left: 0,
												width: "100%",
												transform: `translateY(${virtualItem.start - virtualizer.options.scrollMargin}px)`,
											}}
										>
											<DesktopItem
												item={item}
												index={virtualItem.index}
												total={mediaItems.length}
												rank={ranks[virtualItem.index]}
												isOpen={item.id === openItemId}
												mediaType={mediaType}
												onClick={onItemClicked}
												differentColumns={
													differentColumns
												}
											/>
										</div>
									);
								})}
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
