import { ShowProps } from "@/types/show";
import { getStatusBg, getStatusWaveColor } from "@/utils/styleUtils";
import { calcCurProgress } from "../utils/progressCalc";
import {
	episodeCountOf,
	slotBadge,
	slotIndexOf,
	timelineOf,
} from "../utils/slotRef";

export function ShowProgressCount({ show }: { show: ShowProps }) {
	const line = timelineOf(show);
	const at = slotIndexOf(show);
	return (
		<span className="ml-auto shrink-0 text-[0.6875rem] font-medium tracking-wide tabular-nums text-zinc-400">
			{`${slotBadge(line, at)} · E${show.curEpisode ?? "-"}/${episodeCountOf(line[at])}`}
		</span>
	);
}

export function ShowProgressBarDesktop({ show }: { show: ShowProps }) {
	const line = timelineOf(show);
	const at = slotIndexOf(show);
	const slot = line[at];
	const totalEps = episodeCountOf(slot);

	return (
		<div className="relative mt-1.5">
			{/* PROGRESS BAR */}
			<div className="w-full bg-zinc-800/80 rounded-md h-1 overflow-hidden">
				<div
					className={`${getStatusBg(show.status)} h-1 transition-all duration-500 ease-out rounded-md relative overflow-hidden`}
					style={{
						width: `${
							line.length && totalEps
								? calcCurProgress(line, at, show.curEpisode)
								: 100
						}%`,
					}}
				>
					<div
						className="absolute inset-0"
						style={{
							background: `${getStatusWaveColor(show.status)}`,
							animation: "wave 4s ease-in-out infinite",
							width: "200%",
						}}
					/>
				</div>
			</div>
		</div>
	);
}
