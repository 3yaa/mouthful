import {
	SlidersHorizontal,
	ChartNoAxesColumn,
	Settings2,
	ChevronDown,
	ChevronUp,
	Circle,
	Search,
} from "lucide-react";
import { BaseMediaProps, MediaStatus, ColumnConfig } from "@/types/media";
import { useNav } from "../../components/NavContext";
import { useEffect, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Loading } from "../../components/ui/Loading";
import { MobileItem } from "./MobileItem";
import { pluralOf, statusLabel } from "@/utils/formattingUtils";

// default row sizes
const ROW_FALLBACK = 133;
const GAME_ROW_FALLBACK = 160;

interface MobileListingProps<T extends BaseMediaProps> {
	mediaItems: T[];
	isProcessing: boolean;
	sortConfig: { type: string; order: "asc" | "desc" } | null;
	statusOptions: MediaStatus[];
	curStatusFilter: MediaStatus | null;
	mediaType: string;
	differentColumns: [ColumnConfig<T>, ColumnConfig<T>];
	emptyListText: string;
	// search
	searchQuery: string;
	onItemClicked: (item: T) => void;
	onSortConfig: (sortKey: string) => void;
	onStatusFilter: (status: MediaStatus) => void;
	onSearchChange: (searchVal: string) => void;
}

export function MobileListing<T extends BaseMediaProps>({
	mediaItems,
	isProcessing,
	sortConfig,
	statusOptions,
	curStatusFilter,
	mediaType,
	differentColumns,
	emptyListText,
	searchQuery,
	onItemClicked,
	onSortConfig,
	onStatusFilter,
	onSearchChange,
}: MobileListingProps<T>) {
	const { isNavOpen } = useNav();
	const parentRef = useRef<HTMLDivElement>(null);
	const searchBarRef = useRef<HTMLInputElement>(null);
	const [openSortOption, setOpenSortOption] = useState(false);
	const [openStatusOption, setOpenStatusOption] = useState(false);
	const [searchOpen, setSearchOpen] = useState(false);
	const [rowEstimate, setRowEstimate] = useState(
		mediaType === "game" ? GAME_ROW_FALLBACK : ROW_FALLBACK,
	);
	//
	const virtualizer = useWindowVirtualizer({
		count: mediaItems.length,
		estimateSize: () => rowEstimate,
		overscan: 5,
		measureElement: (element) =>
			element?.getBoundingClientRect().height ?? rowEstimate,
		//  mid-commit flushSync
		useFlushSync: false,
	});

	const sortOptions = [
		{ label: "Title", sortKey: "title" },
		{ label: "Score", sortKey: "score" },
		{
			label: differentColumns[0].label,
			sortKey: differentColumns[0].sortKey,
		},
		{
			label: differentColumns[1].label,
			sortKey: differentColumns[1].sortKey,
		},
		{ label: "Date Completed", sortKey: "dateCompleted" },
	];

	const handleItemClicked = (item: T) => {
		if (openSortOption || openStatusOption) {
			setOpenSortOption(false);
			setOpenStatusOption(false);
			return;
		}
		onItemClicked(item);
	};

	const handleSearchOpen = () => {
		setOpenSortOption(false);
		setOpenStatusOption(false);
		setSearchOpen(true);
		// focus inside the tap gesture so the keyboard actually comes up
		searchBarRef.current?.focus();
	};

	const handleSearchClose = () => {
		onSearchChange("");
		setSearchOpen(false);
		searchBarRef.current?.blur();
	};

	//
	useEffect(() => {
		const update = () => {
			const row = document.querySelector("[data-index]");
			const measured = row?.getBoundingClientRect().height;
			// a hair of slack, or a sub-pixel difference re-renders forever
			if (measured)
				setRowEstimate((held) =>
					Math.abs(held - measured) > 1 ? measured : held,
				);
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

	return (
		<div className="w-full mx-auto tracking-tight ">
			{/* HEADING */}
			<div className="sticky left-0 right-0 top-0 z-10 bg-zinc-900/35 backdrop-blur-xl shadow-lg border-b border-zinc-700/20 select-none rounded-b-md px-3 will-change-transform">
				{/* CONTROLS ROW */}
				<div
					className={`
						flex justify-between items-center
						transition-all duration-300 ease-out
						${
							searchOpen
								? "opacity-0 scale-95 pointer-events-none"
								: "opacity-100 scale-100"
						}
					`}
				>
					{/* STATUS FILTER */}
					<div
						className="relative py-3 px-5"
						onClick={() => {
							setOpenStatusOption(!openStatusOption);
							setOpenSortOption(false);
						}}
					>
						<div
							className={`
	              relative z-20 transition-all duration-300 ease-out rounded-md
	              ${openStatusOption ? "bg-zinc-800/60 p-2 -m-2" : ""}
	            `}
						>
							<Settings2
								className={`
	                w-5 h-5 transition-all duration-300 ease-out cursor-pointer
	                ${
						openStatusOption
							? "text-zinc-200 rotate-90 scale-110"
							: "text-zinc-400 rotate-0 scale-100"
					}
	              `}
							/>
						</div>

						{/* STATUS FILTER OPTIONS */}
						<div
							className={`
	              fixed left-2 mt-2 min-w-44 bg-zinc-900/95 backdrop-blur-xl
	              border border-zinc-700/40 rounded-lg shadow-2xl overflow-hidden
	              origin-top-left z-10
	              transition-all duration-300 ease-out
	              ${
						openStatusOption
							? "opacity-100 scale-100 translate-y-0"
							: "opacity-0 scale-95 -translate-y-2 pointer-events-none"
					}
	            `}
						>
							{statusOptions.map((status, index) => (
								<div
									key={status}
									className={`
	                  flex items-center justify-between px-4 py-3 text-zinc-300 text-sm active:scale-98
										${index !== statusOptions.length - 1 ? "border-b border-zinc-800/60" : ""}
	                  ${curStatusFilter === status ? "bg-zinc-800/40" : ""}
	                `}
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
										className={`
	                  transition-all duration-200 ease-out
	                  ${
							curStatusFilter === status
								? "scale-100 opacity-100"
								: "scale-75 opacity-40"
						}
	                `}
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

					{/* STAT + SEARCH */}
					<div className="flex items-center gap-3">
						<div className="flex items-center gap-1 text-slate-400 text-sm font-medium">
							<ChartNoAxesColumn className="w-4 h-4 text-slate-500" />
							<span>{mediaItems.length} Entries</span>
						</div>
						<button
							type="button"
							aria-label={"Search " + pluralOf(mediaType)}
							onClick={(e) => {
								e.stopPropagation();
								handleSearchOpen();
							}}
							className="p-1 -m-1 text-zinc-400 active:scale-90 transition-transform duration-200"
						>
							<Search className="w-4.5 h-4.5" />
						</button>
					</div>

					{/* SORT */}
					<div
						className="relative py-3 px-5"
						onClick={() => {
							setOpenSortOption(!openSortOption);
							setOpenStatusOption(false);
						}}
					>
						<div
							className={`
	              relative z-20 transition-all duration-300 ease-out rounded-md
	              ${openSortOption ? "bg-zinc-800/60 p-2 -m-2" : ""}
	            `}
						>
							<SlidersHorizontal
								className={`
	                w-5 h-5 transition-all duration-300 ease-out cursor-pointer
	                ${
						openSortOption
							? "text-zinc-200 rotate-90 scale-110"
							: "text-zinc-400 rotate-0 scale-100"
					}
	              `}
							/>
						</div>
						{/* SORT OPTIONS */}
						<div
							className={`
	              fixed right-2 mt-2 min-w-48 bg-zinc-900/95 backdrop-blur-xl
	              border border-zinc-700/40 rounded-lg shadow-2xl overflow-hidden
	              origin-top-right z-10
	              transition-all duration-300 ease-out
	              ${
						openSortOption
							? "opacity-100 scale-100 translate-y-0"
							: "opacity-0 scale-95 -translate-y-2 pointer-events-none"
					}
	            `}
						>
							{sortOptions.map((sort, index) => (
								<div
									key={sort.sortKey}
									className={`
	                  flex items-center justify-between px-4 py-3 text-zinc-300 text-sm
	                  transition-all duration-200 ease-out cursor-pointer
	                  hover:bg-zinc-800/60 hover:text-zinc-100 active:scale-98
	                  ${index !== 4 ? "border-b border-zinc-800/60" : ""}
	                  ${sortConfig?.type === sort.sortKey ? "bg-zinc-800/40" : ""}
	                `}
									style={{
										transitionDelay: openSortOption
											? `${index * 30}ms`
											: "0ms",
									}}
									onClick={() => onSortConfig(sort.sortKey)}
								>
									<span className="font-medium">
										{sort.label}
									</span>
									<div
										className={`
	                  transition-all duration-200 ease-out
	                  ${
							sortConfig?.type === sort.sortKey
								? "scale-100 opacity-100"
								: "scale-0 opacity-0"
						}
	                `}
									>
										{sortConfig?.type === sort.sortKey &&
											(sortConfig?.order === "desc" ? (
												<ChevronDown className="w-4 h-4 text-zinc-400" />
											) : (
												<ChevronUp className="w-4 h-4 text-zinc-400" />
											))}
									</div>
								</div>
							))}
						</div>
					</div>
				</div>
				{/* SEARCH BAR */}
				<div
					className={`
						absolute inset-0 flex items-center gap-2 px-4
						transition-all duration-300 ease-out
						${
							searchOpen
								? "opacity-100 scale-100"
								: "opacity-0 scale-95 pointer-events-none"
						}
					`}
				>
					<Search className="w-4 h-4 text-zinc-400/75 shrink-0" />
					<input
						type="text"
						ref={searchBarRef}
						value={searchQuery}
						onChange={(e) => onSearchChange(e.target.value)}
						onFocus={() => setSearchOpen(true)}
						onBlur={() => !searchQuery && setSearchOpen(false)}
						onKeyDown={(e) =>
							e.key === "Enter" && searchBarRef.current?.blur()
						}
						placeholder={"Search " + pluralOf(mediaType) + "..."}
						enterKeyHint="search"
						autoCapitalize="off"
						autoCorrect="off"
						spellCheck={false}
						className="flex-1 min-w-0 bg-transparent py-3 text-sm text-zinc-100 font-medium placeholder-zinc-500 focus:outline-none"
					/>
					<span className="text-xs font-mono text-zinc-500 shrink-0">
						{mediaItems.length}
					</span>
					<button
						type="button"
						aria-label="Clear search"
						onClick={handleSearchClose}
						className="px-1 text-zinc-400 text-xs active:scale-90 transition-transform duration-200"
					>
						✕
					</button>
				</div>
			</div>
			{/* LOADER */}
			{isProcessing && (
				<div className="relative bg-black/20 backdrop-blur-lg">
					<Loading
						customStyle="mt-72 h-12 w-12 border-zinc-500/40"
						text=""
					/>
				</div>
			)}
			{/* EMPTY */}
			{!isProcessing && mediaItems.length === 0 && (
				<div className="text-center py-12">
					<p className="text-zinc-500 italic text-lg">
						{emptyListText}
					</p>
				</div>
			)}
			{/* LISTING */}
			{!isProcessing && mediaItems.length > 0 && (
				<div ref={parentRef} className="w-full">
					<div
						style={{
							height: `${virtualizer.getTotalSize()}px`,
							width: "100%",
							position: "relative",
						}}
					>
						{virtualizer.getVirtualItems().map((virtualItem) => {
							const item = mediaItems[virtualItem.index];
							return (
								<div
									key={item.id}
									ref={virtualizer.measureElement}
									data-index={virtualItem.index}
									style={{
										position: "absolute",
										top: 0,
										left: 0,
										width: "100%",
										transform: `translateY(${virtualItem.start}px)`,
									}}
								>
									<MobileItem
										item={item}
										isNavOpen={isNavOpen}
										mediaType={mediaType}
										differentColumns={differentColumns}
										onClick={handleItemClicked}
									/>
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}
