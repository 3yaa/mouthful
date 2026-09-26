import Image from "next/image";
import { BattlerCover } from "./BattlerCover";
import { BaseMediaProps, isPrintMedia } from "@/types/media";
import { accentBezel, statusBezel } from "@/utils/styleUtils";
import { ModalBackdrop, ModalPanel } from "@/app/components/ui/ModalMotion";
import { actions, coverFor, ScoreBattlerUIProps } from "./shared";

export function ScoreBattlerDesktop<T extends BaseMediaProps>({
	selectedItem,
	itemFacing,
	mediaType,
	onPick,
}: ScoreBattlerUIProps<T>) {
	const coverSelectedItem = coverFor(selectedItem);
	const coverItemFacing = coverFor(itemFacing);
	const coverSwatch = selectedItem.cover?.color?.trim();

	const imgFit =
		mediaType === "game" || isPrintMedia(mediaType ?? "")
			? "object-cover"
			: "object-fill";

	return (
		<ModalBackdrop className="fixed inset-0 bg-linear-to-br from-black/50 via-black/60 to-black/80 backdrop-blur-md flex items-center justify-center z-20">
			<div className="fixed inset-0" />
			{/* BACKGROUND BORDER GRADIENT */}
			<ModalPanel
				className="rounded-[1.375rem] p-1.5 py-2 lg:min-w-215 lg:max-w-215"
				style={{
					background: coverSwatch
						? accentBezel(
								`color-mix(in srgb, white 22%, ${coverSwatch})`,
							)
						: statusBezel(selectedItem.status),
				}}
			>
				{/* ACTUAL DETAIL CARD */}
				<div className="bg-linear-to-br bg-[#121212] backdrop-blur-xl border border-zinc-800/50 rounded-2xl shadow-2xl w-full max-h-[calc(100vh-3rem)]">
					<div
						className={`flex justify-between px-5 py-3.5 border-0 rounded-2xl overflow-hidden`}
					>
						{/* LEFT */}
						<div
							className={`
									group relative rounded-xl select-none
									bg-[#1a1a1a] p-3.5 shadow-island
									focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
								`}
						>
							<div className="flex items-center justify-center max-w-62 max-h-93 overflow-hidden rounded-lg select-none">
								<BattlerCover
									src={coverSelectedItem}
									alt={selectedItem.title || "Untitled"}
									sizeClass="min-w-62 min-h-93"
									imgFit={imgFit}
								/>
							</div>
							{/* Inner vignette */}
							<div className="absolute -inset-1 pointer-events-none rounded-xl shadow-[inset_0_0_12px_rgba(0,0,0,0.4)]" />
							{/* gradient overlay */}
							<div
								className="absolute inset-0 left-3.5 top-3.5 max-w-62 max-h-93 rounded-lg pointer-events-none"
								style={{
									background:
										"linear-gradient(to bottom, transparent 0%, rgba(24,24,27,0) 50%, rgba(24,24,27,0.3) 100%)",
								}}
							/>
						</div>
						{/* MIDDLE */}
						<div className="flex flex-col justify-between items-center gap-5 shrink-0 select-none">
							<span className="text-xs font-semibold tracking-[0.2em] uppercase text-zinc-500/90 mt-3">
								vs
							</span>
							{/* flowah */}
							<Image
								src="/flower.png"
								alt="flower"
								width={240}
								height={360}
								unoptimized
								className="max-w-24"
							/>
							{/* ACTION BUTTONS */}
							<div className="flex flex-col">
								{actions.map((choice) => (
									<button
										key={choice}
										type="button"
										onClick={() => onPick(choice)}
										className="px-18 py-3 text-sm rounded-xl font-semibold uppercase tracking-[0.15em]transition-all duration-200 ease-out hover:scale-[1.02] active:scale-[0.98] cursor-pointer bg-[#1a1a1a] border-none shadow-island mb-2 text-zinc-300"
									>
										{choice === "same"
											? "Same Tier"
											: choice}
									</button>
								))}
							</div>
						</div>
						{/* RIGHT */}
						<div
							className={`
									group relative rounded-xl select-none
									bg-[#1a1a1a] p-3.5 shadow-island
									focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30
								`}
						>
							<div className="flex items-center justify-center max-w-62 max-h-93 overflow-hidden rounded-lg select-none">
								<BattlerCover
									src={coverItemFacing}
									alt={itemFacing?.title || "Untitled"}
									sizeClass="min-w-62 min-h-93"
									imgFit={imgFit}
								/>
							</div>
							{/* Inner vignette */}
							<div className="absolute -inset-1 pointer-events-none rounded-xl shadow-[inset_0_0_12px_rgba(0,0,0,0.4)]" />
							{/* gradient overlay */}
							<div
								className="absolute inset-0 left-3.5 top-3.5 max-w-62 max-h-93 rounded-lg pointer-events-none"
								style={{
									background:
										"linear-gradient(to bottom, transparent 0%, rgba(24,24,27,0) 50%, rgba(24,24,27,0.3) 100%)",
								}}
							/>
						</div>
					</div>
				</div>
			</ModalPanel>
		</ModalBackdrop>
	);
}
