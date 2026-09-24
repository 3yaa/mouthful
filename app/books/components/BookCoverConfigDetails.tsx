import { MediaCoverProps } from "@/types/media";
import { isResizable } from "@/utils/image-loader";
import Image from "next/image";

interface BookCoverConfigProps {
	coverUrl?: string;
	title: string;
	coverUrls?: MediaCoverProps[];
	coverIndex?: number;
	className?: string;
	onLoad?: () => void;
	height?: number;
	width?: number;
	sizes?: string;
	quality?: number;
}

export function BookCoverConfig({
	coverUrl,
	title,
	coverUrls,
	coverIndex,
	onLoad,
	className,
	width,
	height,
	sizes,
	quality,
}: BookCoverConfigProps) {
	return (
		<>
			{coverIndex !== undefined &&
			coverUrls !== undefined &&
			coverUrls[coverIndex] ? (
				<Image
					src={coverUrls[coverIndex].url}
					alt={title || "Untitled"}
					width={width}
					height={height}
					sizes={sizes}
					quality={quality}
					unoptimized={!isResizable(coverUrls[coverIndex].url)}
					className={className}
					onLoad={onLoad}
					draggable={false}
				/>
			) : coverUrl && coverUrl.trim() !== "" ? (
				<Image
					src={coverUrl}
					alt={title || "Untitled"}
					width={width}
					height={height}
					sizes={sizes}
					quality={quality}
					unoptimized={!isResizable(coverUrl)}
					className={className}
					onLoad={onLoad}
					draggable={false}
				/>
			) : (
				<div className="min-w-62 min-h-93 bg-linear-to-br from-zinc-700 to-zinc-800 border border-zinc-600/30" />
			)}
		</>
	);
}
