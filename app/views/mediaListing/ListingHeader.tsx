"use client";
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { ListSubset } from "@/types/media";
import { useReportListingBar } from "@/app/components/RouteFlash";
import { pluralOf } from "@/utils/formattingUtils";

type SortColumn = { label: string; sortKey: string };

export function ListingHeader({
	mediaType,
	count,
	differentColumns,
	sortConfig,
	onSortConfig,
	badge,
	subset,
}: {
	mediaType: string;
	count?: number;
	differentColumns: [SortColumn, SortColumn];
	sortConfig?: { type: string; order: "asc" | "desc" } | null;
	onSortConfig?: (sortKey: string) => void;
	badge?: ReactNode;
	subset?: ListSubset;
}) {
	// tells the route cover it can come off
	useReportListingBar();
	const columns: { key: string; label: string }[] = [
		{ key: "title", label: "Title" },
		{ key: "score", label: "Score" },
		{
			key: differentColumns[0].sortKey,
			label: differentColumns[0].label,
		},
		{
			key: differentColumns[1].sortKey,
			label: differentColumns[1].label,
		},
		{ key: "dateCompleted", label: "Completed" },
	];

	return (
		<div className="sticky top-0 z-10 w-full">
			<div className="relative max-w-full mx-auto flex items-center gap-4 px-4 py-2 bg-zinc-900/75 backdrop-blur-xl border-x border-b border-zinc-800/50 rounded-b-lg select-none">
				{badge}
				{/* media type + count */}
				{subset ? (
					<button
						type="button"
						onClick={subset.onToggle}
						title={
							subset.on
								? `Show all ${pluralOf(mediaType)}`
								: `Show only ${subset.name}`
						}
						className="group/kind flex items-baseline gap-2 shrink-0 hover:cursor-pointer"
					>
						<motion.span
							key={subset.on ? subset.name : mediaType}
							initial={{ opacity: 0, y: 3 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ duration: 0.22, ease: "easeOut" }}
							className={`text-[0.6875rem] font-bold tracking-[0.22em] uppercase transition-colors duration-200 ${
								subset.on
									? "text-zinc-100"
									: "text-zinc-400 group-hover/kind:text-zinc-200"
							}`}
						>
							{subset.on ? subset.name : pluralOf(mediaType)}
						</motion.span>
						<span className="text-[0.75rem] font-mono text-zinc-500 tracking-tight">
							{count ?? "_"}
						</span>
					</button>
				) : (
					<div className="flex items-baseline gap-2 shrink-0">
						<span className="text-[0.6875rem] font-bold tracking-[0.22em] uppercase text-zinc-400">
							{pluralOf(mediaType)}
						</span>
						<span className="text-[0.75rem] font-mono text-zinc-500 tracking-tight">
							{count ?? "_"}
						</span>
					</div>
				)}
				{/* sort options pushed right */}
				<div className="flex items-center gap-0 ml-auto">
					{columns.map(({ key, label }, i, arr) => {
						const active = sortConfig?.type === key;
						return (
							<div key={key} className="flex items-center">
								<button
									onClick={() => onSortConfig?.(key)}
									// inert while the list is still coming
									disabled={!onSortConfig}
									className={`flex items-center gap-1 px-3 py-0.5 text-[0.75rem] font-medium tracking-wide transition-all duration-200 ${
										onSortConfig ? "cursor-pointer" : ""
									} ${
										active
											? "text-zinc-100"
											: `text-zinc-500 ${onSortConfig ? "hover:text-zinc-300" : ""}`
									}`}
								>
									{active &&
										(sortConfig?.order === "desc" ? (
											<ChevronDown className="w-3 h-3 text-zinc-500" />
										) : (
											<ChevronUp className="w-3 h-3 text-zinc-500" />
										))}
									{label}
								</button>
								{i < arr.length - 1 && (
									<span className="text-zinc-700 text-xs select-none">
										|
									</span>
								)}
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
