import { BaseMediaProps, MediaStatus } from "@/types/media";
import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { isResizable } from "@/utils/image-loader";
import { getStatusBg, getStatusWaveColor } from "@/utils/styleUtils";
import { getDisplayScore } from "@/lib/tierConfig";
import { ShowProps } from "@/types/show";
import { calcCurProgress } from "@/app/shows/utils/progressCalc";
import {
	episodeCountOf,
	progressLabel,
	slotIndexOf,
	timelineOf,
} from "@/app/shows/utils/slotRef";

// score badge rule
const scoreLabel = (mu?: number) => {
	if (!mu) return "–";
	const score = getDisplayScore(mu);
	return score === 10 ? "10" : score.toFixed(1);
};

function timeAgo(date: Date): string {
	const diff = Date.now() - new Date(date).getTime();
	const mins = Math.floor(diff / 60000);
	if (mins < 1) return "just now";
	if (mins < 60) return `${mins}m ago`;
	const hrs = Math.floor(mins / 60);
	if (hrs < 24) return `${hrs}h ago`;
	const days = Math.floor(hrs / 24);
	if (days < 30) return `${days}d ago`;
	const months = Math.floor(days / 30);
	return `${months}mo ago`;
}

function Poster({ item }: { item: BaseMediaProps }) {
	return (
		<div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-zinc-900 p-0.5 shadow-island sm:h-18 sm:w-14">
			{item.imageUrl ? (
				<Image
					src={item.imageUrl}
					alt={item.title}
					className="h-full w-full rounded-sm object-cover transition-transform duration-300 ease-out group-hover/card:scale-[1.06]"
					width={112}
					height={168}
					sizes="56px"
					unoptimized={!isResizable(item.imageUrl)}
				/>
			) : (
				<div className="h-full w-full rounded-sm neu-carved" />
			)}
		</div>
	);
}

// the moving half of a track
function StatusWave({ status }: { status: MediaStatus }) {
	return (
		<div
			className="absolute inset-0"
			style={{
				background: getStatusWaveColor(status),
				animation: "wave 4s ease-in-out infinite",
				width: "200%",
			}}
		/>
	);
}

function StatusTrack({
	status,
	progress,
}: {
	status: MediaStatus;
	progress: number | null;
}) {
	if (progress == null)
		return (
			<div
				className={`relative mt-0.5 h-0.75 w-full overflow-hidden rounded-full ${getStatusBg(
					status,
				)}`}
			>
				<StatusWave status={status} />
			</div>
		);

	return (
		<div className="mt-0.5 h-0.75 w-full overflow-hidden rounded-full bg-zinc-800/80">
			<div
				className={`relative h-full overflow-hidden rounded-full transition-all duration-500 ease-out ${getStatusBg(
					status,
				)}`}
				style={{ width: `${progress}%` }}
			>
				<StatusWave status={status} />
			</div>
		</div>
	);
}

// show only
function showProgressOf(item: BaseMediaProps) {
	const show = item as unknown as ShowProps;
	const line = timelineOf(show);
	if (!line.length) return { progress: 100, label: null };

	const at = slotIndexOf(show);
	const totalEps = episodeCountOf(line[at]);
	return {
		// an airing part announces no count -- nothing to divide into
		progress: totalEps
			? calcCurProgress(line, at, show.curEpisode ?? 0)
			: 100,
		label: progressLabel(line, at, show.curEpisode),
	};
}

export function RecentItems({
	items,
	mediaType,
	href,
	onNavigate,
}: {
	items: BaseMediaProps[];
	mediaType: string;
	// the libray the row belongs to
	href: string;
	onNavigate?: () => void;
}) {
	if (!items || items.length === 0) return null;

	const isShow = mediaType === "shows";

	return (
		<ul className="flex flex-col gap-2">
			{items.map((item) => {
				const { progress, label } = isShow
					? showProgressOf(item)
					: { progress: null, label: null };

				return (
					<li key={item.id}>
						<Link
							href={item.id ? `${href}?open=${item.id}` : href}
							onNavigate={onNavigate}
							className="group/card relative flex items-center gap-3 rounded-lg neu-carved p-2 transition-[background-color,box-shadow,transform] duration-200 ease-out hover:neu-carved-hi hover:cursor-pointer active:translate-y-px active:neu-carved-in active:duration-75 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400"
						>
							<Poster item={item} />
							{/* title | score */}
							<div className="flex min-w-0 flex-1 flex-col justify-center">
								<div className="flex items-center justify-between">
									<p
										className="min-w-0 truncate text-sm leading-snug font-semibold text-zinc-300 transition-colors duration-200 ease-out group-hover/card:text-zinc-100 sm:text-base"
										title={item.title}
									>
										{item.title}
									</p>
									<span className="shrink-0 -my-1.25 rounded-md neu-carved p-1.25 px-2 text-center text-xs font-bold text-zinc-300/75 tabular-nums transition-[opacity,transform] duration-200 ease-out group-hover/card:translate-x-1 group-hover/card:opacity-0 min-w-[4ch] sm:text-[0.8125rem]">
										{scoreLabel(item.score?.mu)}
									</span>
								</div>
								{/* update time */}
								<div className="flex items-baseline justify-between gap-2 mb-1">
									<p className="text-zinc-500/90 text-sm font-semibold">
										{item.lastUpdated
											? timeAgo(item.lastUpdated)
											: "–"}
									</p>
									{label && (
										<span className="shrink-0 text-[0.6875rem] font-medium tracking-wide text-zinc-400 tabular-nums transition-[opacity,transform] duration-200 ease-out group-hover/card:translate-x-1 group-hover/card:opacity-0 pr-1 pt-1">
											{label}
										</span>
									)}
								</div>
								<StatusTrack
									status={item.status}
									progress={progress}
								/>
							</div>
							<ChevronRight
								aria-hidden
								strokeWidth={2.25}
								className="pointer-events-none absolute top-2/5 right-3 h-5.5 w-5.5 -translate-x-1.5 -translate-y-1/2 text-zinc-400 opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover/card:translate-x-0 group-hover/card:opacity-100 group-active/card:translate-x-0.5"
							/>
						</Link>
					</li>
				);
			})}
		</ul>
	);
}
