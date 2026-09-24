import Image from "next/image";
import type { CSSProperties, ReactNode } from "react";

interface PosterCardProps {
	src: string | null;
	alt: string;
	fallback: ReactNode;
	footer: ReactNode;
	badge?: ReactNode;
	onClick?: () => void;
	sizes?: string;
	// border and shadow are per-usage
	className?: string;
	style?: CSSProperties;
	zoomOnHover?: boolean;
}

export function PosterCard({
	src,
	alt,
	fallback,
	footer,
	badge,
	onClick,
	sizes = "(max-width: 1024px) 20vw, 12vw",
	className = "",
	style,
	zoomOnHover = false,
}: PosterCardProps) {
	return (
		<div
			onClick={onClick}
			style={style}
			className={`group/card bg-linear-to-b from-zinc-900 to-zinc-950 rounded-lg border overflow-hidden ${
				onClick ? "cursor-pointer" : ""
			} ${className}`}
		>
			<div className="relative aspect-2/3 bg-zinc-900 overflow-hidden">
				{badge}
				{src ? (
					<Image
						src={src}
						alt={alt}
						fill
						draggable={false}
						sizes={sizes}
						className={`object-cover select-none ${
							zoomOnHover
								? "group-hover/card:scale-[1.04] transition-transform duration-500 ease-out"
								: ""
						}`}
					/>
				) : (
					<div className="w-full h-full flex items-center justify-center bg-linear-to-br from-zinc-800 to-zinc-900 text-zinc-600 text-xl font-light select-none">
						{fallback}
					</div>
				)}
			</div>
			<div className="h-px bg-linear-to-r from-transparent via-zinc-700/40 to-transparent" />
			{footer}
		</div>
	);
}
