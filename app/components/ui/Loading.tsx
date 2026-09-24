"use client";

interface LoadingProps {
	customStyle: string; //border
	customBg?: string;
	text?: string;
	isMobile?: boolean;
}

// every spinner picks up where the last one left off
const inPhase = (el: HTMLDivElement | null) => {
	if (el) el.style.animationDelay = `-${Date.now() % 1000}ms`;
};

export function Loading({
	customBg = "bg-[#121212]",
	customStyle,
	text,
	isMobile = false,
}: LoadingProps) {
	return (
		<div
			className={`${
				isMobile ? "fixed" : "absolute"
			} inset-0 lg:rounded-2xl flex items-center justify-center z-20 font-semibold ${customBg}`}
		>
			<div className="flex flex-col items-center gap-3">
				<div
					ref={inPhase}
					className={`animate-spin rounded-full border-b-2 shrink-0 ${customStyle}`}
				></div>
				{text && <span className="text-zinc-300 text-sm">{text}</span>}
			</div>
		</div>
	);
}
