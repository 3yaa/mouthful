import { BattlerCover } from "./BattlerCover";
import { BaseMediaProps } from "@/types/media";
import { actions, coverFor, ScoreBattlerUIProps } from "./shared";
import { getStatusBg, getStatusWaveColor } from "@/utils/styleUtils";
import { useScrollLock } from "@/hooks/useScrollLock";
import { X } from "lucide-react";

export function ScoreBattlerMobile<T extends BaseMediaProps>({
	selectedItem,
	itemFacing,
	// curScore,
	onPick,
	onCancel,
	mediaType,
}: ScoreBattlerUIProps<T>) {
	useScrollLock();

	const coverItemFacing = coverFor(itemFacing);

	return (
		<div className="fixed inset-0 z-30 bg-zinc-950 flex flex-col justify-between overflow-y-auto">
			<div className="pb-10">
				<div className="relative w-full overflow-hidden bg-zinc-900/40">
					<BattlerCover
						src={coverItemFacing}
						alt={itemFacing.title || "Untitled"}
						sizeClass="w-full aspect-2/3"
					/>
					<div className="absolute bottom-0 left-0 w-full h-20 bg-linear-to-t from-zinc-950 to-transparent pointer-events-none" />
					<button
						type="button"
						onClick={onCancel}
						title="Stop comparing"
						className="absolute top-1.5 left-1.5 bg-zinc-800/50 backdrop-blur-2xl p-2 rounded-md active:scale-95 transition-transform duration-150"
					>
						<X className="w-5 h-5 text-zinc-300" />
					</button>
				</div>
			</div>

			<div className="flex flex-col items-center gap-0.5 px-5 -mt-5">
				<span className="text-xl font-bold text-zinc-300 text-center">
					{itemFacing.title}
				</span>
				<span className="text-xs uppercase tracking-[0.2em] text-zinc-500 my-1 italic">
					vs
				</span>
				<span className="text-xl font-bold text-zinc-300 text-center">
					{selectedItem.title}
				</span>
				<div className="my-3 w-full rounded-md h-1 overflow-hidden">
					<div
						className={`${getStatusBg(selectedItem.status)} h-1 transition-all duration-500 ease-out rounded-md overflow-hidden relative`}
					>
						<div
							className="absolute inset-0"
							style={{
								background: getStatusWaveColor(
									selectedItem.status,
								),
								animation: "wave 4s ease-in-out infinite",
								width: "200%",
							}}
						/>
					</div>
				</div>
			</div>

			<div
				className={`flex flex-col px-4 pb-8 ${mediaType !== "game" ? "pt-3" : ""}`}
			>
				{actions.map((choice) => (
					<button
						key={choice}
						type="button"
						onClick={() => onPick(choice)}
						className="w-full min-h-12 px-18 py-3 text-sm rounded-xl font-semibold uppercase tracking-[0.15em] transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] cursor-pointer bg-[#1a1a1a] border-none shadow-island mb-2 text-zinc-300"
					>
						{choice === "same" ? "Same Tier" : choice}
					</button>
				))}
			</div>
		</div>
	);
}
