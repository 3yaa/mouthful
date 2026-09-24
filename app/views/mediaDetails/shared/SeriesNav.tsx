// FOR GAME/MOVIE/BOOK
import Image from "next/image";
import {
	BaseMediaProps,
	SeriesMediaProps,
	SeriesTargetProps,
} from "@/types/media";
import { GameProps } from "@/types/game";
import { seriesNeighbours, seriesPlace } from "@/utils/seriesRead";

interface SeriesNavProps {
	item: BaseMediaProps;
	mediaType: string;
	onAction: (action: { type: string; payload?: unknown }) => void;
	isInList?: (target: SeriesTargetProps) => boolean;
	accentColor?: string;
}

const ART_SRC = "/non-series-placeholder.png";

// vertical framing of the art
const ART_POSITION = "center 40%";

const ART_MASK = {
	maskImage: `url(${ART_SRC})`,
	WebkitMaskImage: `url(${ART_SRC})`,
	maskSize: "cover",
	WebkitMaskSize: "cover",
	maskPosition: ART_POSITION,
	WebkitMaskPosition: ART_POSITION,
	maskRepeat: "no-repeat",
	WebkitMaskRepeat: "no-repeat",
} as React.CSSProperties;

const TOP_FADE = "linear-gradient(to bottom, transparent 0%, #000 10%)";

const tint = (pct: number, into = "transparent") =>
	`color-mix(in srgb, var(--c) ${pct}%, ${into})`;

export function NotInListBadge() {
	return (
		<span
			title="Not in your list — opens the add flow"
			className="shrink-0 rounded-full border border-zinc-700/70 px-1 text-[0.6rem] leading-[1.15] font-semibold text-zinc-500/90"
		>
			+
		</span>
	);
}

export function SeriesNav({
	item,
	mediaType,
	onAction,
	isInList,
	accentColor,
}: SeriesNavProps) {
	const nav =
		mediaType === "game"
			? (() => {
					const g = item as unknown as GameProps;
					return {
						prev:
							g.dlcs && g.dlcIndex - 1 >= 0
								? {
										label: "Previous",
										name: g.dlcs[g.dlcIndex - 1].name,
										action: {
											type: "dlcNav",
											payload: "prev",
										},
									}
								: null,
						center: g.dlcIndex !== 0 ? String(g.dlcIndex) : null,
						next:
							g.dlcs && g.dlcIndex + 1 < g.dlcs.length
								? {
										label: "Next",
										name: g.dlcs[g.dlcIndex + 1].name,
										action: {
											type: "dlcNav",
											payload: "next",
										},
									}
								: null,
					};
				})()
			: (() => {
					// movies and books both step along a stored run
					const row = item as unknown as SeriesMediaProps;
					const { prev, next } = seriesNeighbours(row);
					return {
						prev: prev
							? {
									label: "Prequel",
									name: prev.title,
									target: prev,
									action: {
										type: "seriesNav",
										payload: "prequel",
									},
								}
							: null,
						center: seriesPlace(row),
						next: next
							? {
									label: "Sequel",
									name: next.title,
									target: next,
									action: {
										type: "seriesNav",
										payload: "sequel",
									},
								}
							: null,
					};
				})();

	const isMissing = (
		entry: { name?: string | null; target?: SeriesTargetProps } | null,
	) => !!entry?.target && !!isInList && !isInList(entry.target);
	const prevMissing = isMissing(nav.prev);
	const nextMissing = isMissing(nav.next);

	const nameStyle = (missing: boolean) =>
		`text-sm font-medium transition-colors duration-200 group-hover:underline group-hover:underline-offset-4 ${
			missing
				? "text-zinc-300/45 group-hover:text-zinc-300/70 group-hover:decoration-dotted group-hover:decoration-zinc-400/80"
				: "text-zinc-300/70 group-hover:text-zinc-300/85"
		}`;

	// show art if there is no series to step through
	if (!nav.prev && !nav.center && !nav.next) {
		const tinted = !!accentColor;
		return (
			<div className="-mt-2">
				<div
					className="flex justify-center select-none"
					aria-hidden="true"
				>
					<div className="relative w-full h-14 -mb-2.5">
						<div
							className="absolute inset-x-0 -top-1.5 -bottom-4 pointer-events-none"
							style={{
								WebkitMaskImage: TOP_FADE,
								maskImage: TOP_FADE,
							}}
						>
							<div
								className="absolute inset-0"
								style={
									{
										transform: "scaleY(-1)",
										// keeps the blend layers off the modal
										isolation: "isolate",
										opacity: tinted ? 0.92 : 0.7,
										"--c": accentColor,
									} as React.CSSProperties
								}
							>
								{/* AURA -- light spilling off the cloud */}
								{tinted && (
									<div
										className="absolute inset-0"
										style={{
											backgroundImage: `radial-gradient(58% 78% at 50% 62%, ${tint(
												34,
											)} 0%, ${tint(12)} 45%, transparent 74%)`,
										}}
									/>
								)}
								{/* SHAPE + SHADING */}
								<Image
									src={ART_SRC}
									alt=""
									fill
									sizes="(min-width: 1024px) 860px, 100vw"
									unoptimized
									className="object-cover"
									style={{
										objectPosition: ART_POSITION,
										filter: tinted
											? "grayscale(1) brightness(1.08) contrast(1.06)"
											: "grayscale(0.7)",
									}}
								/>
								{/* PAINT */}
								{tinted && (
									<div
										className="absolute inset-0"
										style={{
											backgroundImage: `linear-gradient(to bottom, ${tint(
												100,
											)} 0%, ${tint(92)} 45%, ${tint(78)} 100%)`,
											mixBlendMode: "multiply",
											...ART_MASK,
										}}
									/>
								)}
								{/* SHEEN */}
								{tinted && (
									<div
										className="absolute inset-0"
										style={{
											backgroundImage:
												"linear-gradient(to bottom, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.03) 45%, transparent 78%)",
											mixBlendMode: "plus-lighter",
											...ART_MASK,
										}}
									/>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="pt-2.5 border-t border-black/50 shadow-[inset_0_1px_0_rgba(255,255,255,0.045)] pr-2">
			<div className="grid grid-cols-[1fr_3rem_1fr] gap-3 w-full pr-1.5 select-none">
				<div className="truncate text-left">
					{nav.prev && (
						<div
							className="group flex flex-col hover:cursor-pointer"
							onClick={() => onAction(nav.prev!.action)}
						>
							<label className="text-xs font-medium text-zinc-500 block pointer-events-none">
								<span className="inline-flex items-center gap-1">
									<span>←</span>
									<span>{nav.prev.label}</span>
									{prevMissing && <NotInListBadge />}
								</span>
							</label>
							<span className={nameStyle(prevMissing)}>
								{nav.prev.name}
							</span>
						</div>
					)}
				</div>

				<div className="flex justify-center items-end pb-0.5">
					{nav.center && (
						<label className="text-xs font-semibold text-zinc-400/90 block">
							{nav.center}
						</label>
					)}
				</div>

				<div className="truncate text-right">
					{nav.next && (
						<div
							className="group flex flex-col hover:cursor-pointer"
							onClick={() => onAction(nav.next!.action)}
						>
							<label className="text-xs font-medium text-zinc-500 block pointer-events-none">
								<span className="inline-flex items-center gap-1">
									{nextMissing && <NotInListBadge />}
									<span>{nav.next.label}</span>
									<span>→</span>
								</span>
							</label>
							<span className={nameStyle(nextMissing)}>
								{nav.next.name}
							</span>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
