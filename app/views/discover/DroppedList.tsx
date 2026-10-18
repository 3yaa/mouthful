"use client";
import { useState, type CSSProperties } from "react";
import Image from "next/image";
import { ChevronRight, Leaf, Users, type LucideIcon } from "lucide-react";
import { getStatusBorderColor } from "@/utils/styleUtils";
import type { DroppedTitle, MediaStatus } from "@/types/media";

export interface DroppedRow {
	key: string;
	title: string;
	posterUrl: string | null;
	score: number | null;
	votes?: number | null;
	// imdb has no entry at all
	unlisted?: boolean;
	status?: MediaStatus;
	onClick: () => void;
}

export interface DroppedGroup {
	label: string;
	rows: DroppedRow[];
	icon: LucideIcon;
	folded?: boolean;
}

// minVotes is the floor the server ranked by
export function tmdbDroppedGroups(
	titles: DroppedTitle[],
	minVotes: number | null,
	icon: LucideIcon,
	rowOf: (
		title: DroppedTitle,
	) => Pick<DroppedRow, "status" | "unlisted" | "onClick">,
): DroppedGroup[] {
	const toRow = (t: DroppedTitle): DroppedRow => ({
		key: t.tmdbId,
		title: t.title,
		posterUrl: t.poster_url,
		score: t.imdbRating,
		votes: t.votes,
		...rowOf(t),
	});
	return [
		{
			label: minVotes ? `Under ${minVotes} votes` : "Few votes",
			rows: titles.filter((t) => t.votes != null).map(toRow),
			icon,
		},
		{
			label: "No rating",
			rows: titles.filter((t) => t.votes == null).map(toRow),
			icon,
			folded: true,
		},
	];
}

function Row({ row, icon: Icon }: { row: DroppedRow; icon: LucideIcon }) {
	const leaf =
		row.score != null
			? "text-emerald-300/75 fill-emerald-300/15"
			: row.unlisted
				? "text-red-400/75 fill-red-400/15"
				: "text-blue-400/75 fill-blue-400/15";
	return (
		<button
			type="button"
			onClick={row.onClick}
			className="group flex w-full min-w-0 items-center gap-2.5 rounded-lg p-1.5 text-left outline-none cursor-pointer transition-colors duration-200 hover:bg-zinc-800/40 focus-visible:bg-zinc-800/60"
		>
			<span className="relative flex h-12 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-zinc-900">
				{row.posterUrl ? (
					<Image
						src={row.posterUrl}
						alt=""
						fill
						sizes="2rem"
						className="object-cover"
					/>
				) : (
					<Icon
						className="h-3.5 w-3.5 text-zinc-700"
						strokeWidth={1.5}
					/>
				)}
				{row.status && (
					<span
						className={`pointer-events-none absolute inset-0 rounded-md border-2 ${getStatusBorderColor(row.status)}`}
					/>
				)}
			</span>
			<span className="min-w-0 flex-1">
				<span className="block truncate text-[0.75rem] font-semibold leading-snug text-zinc-400 transition-colors duration-200 group-hover:text-zinc-200 group-focus-visible:text-zinc-200">
					{row.title}
				</span>
				<span className="mt-1 flex items-center gap-1.5 text-[0.6875rem] tabular-nums">
					<Leaf
						aria-label={
							row.score != null
								? undefined
								: row.unlisted
									? "Not on IMDb"
									: "No rating yet"
						}
						className={`h-2.5 w-2.5 shrink-0 ${leaf}`}
						strokeWidth={2}
					/>
					{row.score != null && (
						<span className="font-bold tracking-tight text-zinc-300">
							{row.score.toFixed(1)}
						</span>
					)}
					{row.votes != null && (
						<span className="flex items-center gap-0.5 text-zinc-500">
							<Users className="h-2.5 w-2.5" strokeWidth={2} />
							{row.votes}
							<span className="sr-only"> votes</span>
						</span>
					)}
				</span>
			</span>
		</button>
	);
}

const SECTION_GRID =
	"grid grid-cols-1 gap-x-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

const HEAD =
	"flex items-center gap-2 px-1.5 pb-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.14em] text-zinc-500";

function Group({
	group,
	layout,
}: {
	group: DroppedGroup;
	layout: "rail" | "section";
}) {
	const [open, setOpen] = useState(!group.folded);
	const head = (
		<>
			<span>{group.label}</span>
			<span className="tabular-nums text-zinc-600">
				{group.rows.length}
			</span>
			{group.folded && (
				<ChevronRight
					className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
					strokeWidth={2.25}
				/>
			)}
		</>
	);
	return (
		<section>
			{group.folded ? (
				<button
					type="button"
					aria-expanded={open}
					onClick={() => setOpen((o) => !o)}
					className={`${HEAD} cursor-pointer transition-colors duration-200 hover:text-zinc-300`}
				>
					{head}
				</button>
			) : (
				<h2 className={HEAD}>{head}</h2>
			)}
			{open && (
				<div
					className={
						layout === "rail" ? "flex flex-col" : SECTION_GRID
					}
				>
					{group.rows.map((row) => (
						<Row key={row.key} row={row} icon={group.icon} />
					))}
				</div>
			)}
		</section>
	);
}

export function DroppedList({
	groups,
	layout,
}: {
	groups: DroppedGroup[];
	layout: "rail" | "section";
}) {
	const shown = groups.filter((g) => g.rows.length > 0);
	if (shown.length === 0) return null;
	return (
		<div className="flex flex-col gap-4">
			{shown.map((g) => (
				<Group key={g.label} group={g} layout={layout} />
			))}
		</div>
	);
}

// rows in the shape of the real ones, each with its own shimmer
export function DroppedListSkeleton({
	layout,
}: {
	layout: "rail" | "section";
}) {
	return (
		<div aria-hidden>
			<div className={HEAD}>
				<span className="invisible">0</span>
				<span className="h-2 w-24 rounded-sm bg-zinc-800/60" />
			</div>
			<div className={layout === "rail" ? "flex flex-col" : SECTION_GRID}>
				{Array.from({ length: 8 }, (_, i) => (
					<div
						key={i}
						className="discover-shimmer flex items-center gap-2.5 rounded-lg p-1.5"
						style={
							{
								"--shimmer-delay": `${i * 0.07}s`,
							} as CSSProperties
						}
					>
						<span className="h-12 w-8 shrink-0 rounded-md bg-zinc-900" />
						<span className="min-w-0 flex-1">
							<span className="block h-2.5 w-4/5 rounded-sm bg-zinc-800/60" />
							<span className="mt-2 block h-2 w-1/3 rounded-sm bg-zinc-800/40" />
						</span>
					</div>
				))}
			</div>
		</div>
	);
}
