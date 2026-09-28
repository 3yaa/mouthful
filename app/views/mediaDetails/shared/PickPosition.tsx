import { ChevronLeft, ChevronRight } from "lucide-react";

const MAX_SEGMENTS = 12;

export function PickPosition({
	index,
	count,
	className = "",
}: {
	index: number;
	count: number;
	className?: string;
}) {
	return (
		<div
			className={`pointer-events-none flex items-center gap-1 rounded-full bg-black/45 px-2 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.45)] backdrop-blur-sm select-none ${className}`}
		>
			{count <= MAX_SEGMENTS ? (
				Array.from({ length: count }, (_, i) => (
					<span
						key={i}
						className={`h-1 w-3 rounded-full transition-colors duration-150 ${
							i === index ? "bg-white/90" : "bg-white/25"
						}`}
					/>
				))
			) : (
				<span className="px-0.5 text-[0.7rem] leading-none font-semibold tracking-wide text-zinc-200/90 tabular-nums">
					{index + 1}/{count}
				</span>
			)}
		</div>
	);
}

export function PickHalves({ inset = "px-1.5" }: { inset?: string }) {
	const half = (Icon: typeof ChevronLeft, side: string) => (
		<span className={`group/half flex flex-1 items-center ${side}`}>
			<span className="rounded-full bg-black/35 p-1 text-white/60 opacity-0 shadow-[0_2px_8px_rgba(0,0,0,0.4)] backdrop-blur-sm transition-[opacity,color,background-color] duration-150 group-hover/pick:opacity-100 group-hover/half:bg-black/55 group-hover/half:text-white">
				<Icon className="h-4.5 w-4.5" />
			</span>
		</span>
	);
	return (
		<div className={`absolute inset-0 flex ${inset}`}>
			{half(ChevronLeft, "justify-start")}
			{half(ChevronRight, "justify-end")}
		</div>
	);
}
