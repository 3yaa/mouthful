"use client";
import { useEffect, useState } from "react";
import { BaseMediaProps } from "@/types/media";
import { ShowProps } from "@/types/show";
import { slotPoster } from "@/app/shows/utils/slotRef";
import { extractCoverPalette } from "@/utils/extractCoverPalette";

// franchise or season poster
export function rowCoverSrc(item: BaseMediaProps, mediaType: string) {
	return (
		item.cover?.url ??
		(mediaType === "show"
			? slotPoster(item as unknown as ShowProps)
			: item.posterUrl)
	);
}

// the colour a row's poster casts
export function useRowLight(
	item: BaseMediaProps | undefined,
	mediaType: string,
	enabled = true,
): string | undefined {
	const stored = item?.cover?.color || undefined;
	const src = item && !stored ? rowCoverSrc(item, mediaType) : null;
	const [read, setRead] = useState<{ src: string; color?: string }>();

	useEffect(() => {
		if (!enabled || !src) return;
		let live = true;
		// max 6 shares the colour picker's cache entry
		void extractCoverPalette(src, 6).then(([color]) => {
			if (live) setRead({ src, color });
		});
		return () => {
			live = false;
		};
	}, [enabled, src]);

	return stored ?? (read && read.src === src ? read.color : undefined);
}
