"use client";
import { useEffect, useRef } from "react";
import { extractCoverPalette } from "@/utils/extractCoverPalette";
import {
	primeSequence,
	type PrimeSpec,
} from "@/app/views/mediaDetails/shared/imagePrime";

export type PrimeTrack = {
	urls?: string[];
	index?: number;
	spec: PrimeSpec;
	enabled: boolean;
	// tmdb and igdb art carries no color
	palette?: boolean;
};

const DESKTOP = "(min-width: 64rem)";
const NEIGHBOURS = 3;

function isMetered(): boolean {
	const conn = (
		navigator as Navigator & {
			connection?: { saveData?: boolean; effectiveType?: string };
		}
	).connection;
	if (!conn) return false;
	return (
		!!conn.saveData ||
		conn.effectiveType === "2g" ||
		conn.effectiveType === "slow-2g"
	);
}

// warm the picker's candidates
export function useArtworkPrime(
	view: "desktop" | "mobile",
	tracks: PrimeTrack[],
): void {
	const latest = useRef(tracks);
	latest.current = tracks;

	// the urls decide
	const key = tracks
		.map((track) =>
			track.enabled
				? `${track.urls?.length ?? 0}:${track.urls?.[0] ?? ""}`
				: "",
		)
		.join("|");

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (window.matchMedia(DESKTOP).matches !== (view === "desktop")) return;

		const cancels: Array<() => void> = [];
		const limit = isMetered() ? NEIGHBOURS : undefined;
		const start = () => {
			for (const track of latest.current) {
				if (!track.enabled) continue;
				cancels.push(
					primeSequence(track.urls, track.index ?? 0, track.spec, {
						limit,
						// the swatch reads a rung of its own, so warm that too
						after: track.palette
							? (url) => void extractCoverPalette(url)
							: undefined,
					}),
				);
			}
		};

		// never race the panel's own first paint
		const idle = typeof window.requestIdleCallback === "function";
		const handle = idle
			? window.requestIdleCallback(start, { timeout: 1200 })
			: window.setTimeout(start, 300);

		return () => {
			if (idle) window.cancelIdleCallback(handle);
			else window.clearTimeout(handle);
			for (const cancel of cancels) cancel();
		};
	}, [key, view]);
}
