import { MangaProps } from "@/types/manga";
import { getStatusBg, getStatusWaveColor } from "@/utils/styleUtils";
import { chapterLabel, chapterProgress } from "../utils/chapterProgress";

export function MangaProgressCount({ manga }: { manga: MangaProps }) {
	return (
		<span className="ml-auto shrink-0 text-[0.6875rem] font-medium tracking-wide tabular-nums text-zinc-400">
			{chapterLabel(manga)}
		</span>
	);
}

export function MangaProgressBarDesktop({ manga }: { manga: MangaProps }) {
	return (
		<div className="relative mt-1.5">
			{/* PROGRESS BAR */}
			<div className="w-full bg-zinc-800/80 rounded-md h-1 overflow-hidden">
				<div
					className={`${getStatusBg(manga.status)} h-1 transition-all duration-500 ease-out rounded-md relative overflow-hidden`}
					style={{ width: `${chapterProgress(manga)}%` }}
				>
					<div
						className="absolute inset-0"
						style={{
							background: `${getStatusWaveColor(manga.status)}`,
							animation: "wave 4s ease-in-out infinite",
							width: "200%",
						}}
					/>
				</div>
			</div>
		</div>
	);
}
