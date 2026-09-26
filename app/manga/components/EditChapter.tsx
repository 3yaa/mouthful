import { ChevronLeft, ChevronRight } from "lucide-react";
import { MangaProps } from "@/types/manga";
import {
	FIELD_LABEL,
	SCORE_SUB_BTN,
	getStatusBg,
	getStatusTextColor,
	getStatusWaveColor,
} from "@/utils/styleUtils";
import {
	NAME_TYPE,
	ProgressInput,
	RING,
} from "@/app/shows/components/EditProgressDetail";
import { chapterTotal } from "../utils/chapterProgress";

const ICON = "w-4 h-4 text-zinc-300/80 group-active:text-zinc-200/80";
// the status | score split above, so the two plates sit under them
const LEFT_COL = "flex-[0.77] lg:min-w-41.25";
const RIGHT_COL = "flex-[0.865] lg:min-w-48.75";
const PLATE =
	"flex min-w-0 items-center rounded-lg neu-raised-firm py-1.5 px-3 select-none";
// no last chapter yet -- the bar runs on and fades rather than claiming an end
const OPEN_END = "linear-gradient(to right, black 45%, transparent)";

interface EditChapterProps {
	item: MangaProps;
	isEditing: boolean;
	inputValue: number | "";
	onAction: (action: { type: string; payload?: unknown }) => void;
}

export function EditChapter({
	item,
	isEditing,
	inputValue,
	onAction,
}: EditChapterProps) {
	const curChapter = item.curChapter ?? 0;
	const total = item.chapters;
	const isRunning = !total;
	const atEnd = !!total && curChapter >= total;
	const readShare = total ? Math.min(100, (curChapter / total) * 100) : 100;

	return (
		<div className="space-y-1.5 mb-2 w-[94%] mx-auto">
			<label className={FIELD_LABEL}>Progress</label>
			<div className="flex gap-4">
				{/* CHAPTER */}
				<div className={`${LEFT_COL} ${PLATE} justify-between gap-2`}>
					<span
						className={`mt-0.5 min-w-0 truncate pl-1 text-[0.9375rem] text-zinc-300/70 font-bold hover:cursor-pointer ${RING}`}
						role={isEditing ? undefined : "button"}
						tabIndex={isEditing ? undefined : 0}
						title="Type a chapter"
						onClick={() => onAction({ type: "clickChapterInput" })}
						onKeyDown={(e) => {
							if (isEditing) return;
							if (e.key !== "Enter" && e.key !== " ") return;
							e.preventDefault();
							onAction({ type: "clickChapterInput" });
						}}
					>
						<span className={`${NAME_TYPE} text-zinc-300/75 mr-2`}>
							Ch:
						</span>
						{isEditing ? (
							<ProgressInput
								value={inputValue}
								min={0}
								max={total ?? Number.MAX_SAFE_INTEGER}
								onChange={(payload) =>
									onAction({ type: "changeChapterInput", payload })
								}
								onSubmit={() =>
									onAction({ type: "submitChapterInput" })
								}
								onCancel={() =>
									onAction({ type: "clickChapterInput" })
								}
							/>
						) : (
							<span
								className={`underline ${getStatusTextColor(item.status)}`}
							>
								{curChapter}
							</span>
						)}
						<span>/{chapterTotal(total)}</span>
					</span>
					<div className="flex h-8 shrink-0 items-center gap-1.5">
						<button
							className={`group ${SCORE_SUB_BTN}`}
							onClick={() =>
								onAction({ type: "changeChapter", payload: "left" })
							}
							disabled={curChapter === 0}
							title="Back a chapter"
						>
							<ChevronLeft className={ICON} />
						</button>
						<button
							className={`group ${SCORE_SUB_BTN}`}
							onClick={() =>
								onAction({ type: "changeChapter", payload: "right" })
							}
							disabled={atEnd}
							title="Next chapter"
						>
							<ChevronRight className={ICON} />
						</button>
					</div>
				</div>
				{/* HOW FAR IN */}
				<div
					className={`${RIGHT_COL} ${PLATE} gap-3`}
					title={
						isRunning
							? "Still releasing -- no last chapter yet"
							: `${curChapter} of ${total} chapters read`
					}
				>
					<div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800/80">
						<div
							className={`${getStatusBg(item.status)} relative h-full overflow-hidden rounded-full transition-[width] duration-500 ease-out`}
							style={{
								width: `${readShare}%`,
								maskImage: isRunning ? OPEN_END : undefined,
								WebkitMaskImage: isRunning ? OPEN_END : undefined,
							}}
						>
							<div
								className="absolute inset-0"
								style={{
									background: getStatusWaveColor(item.status),
									animation: "wave 4s ease-in-out infinite",
									width: "200%",
								}}
							/>
						</div>
					</div>
					<span className="mt-0.5 shrink-0 pr-1 text-[0.9375rem] font-bold tabular-nums text-zinc-300/70">
						{isRunning ? "Ongoing" : `${Math.round(readShare)}%`}
					</span>
				</div>
			</div>
		</div>
	);
}
