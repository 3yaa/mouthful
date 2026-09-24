"use client";
import imageLoader, { corsMode, isResizable } from "@/utils/image-loader";

// next.config's imageSizes + deviceSizes -- mirrored, the config is server-side
const ALL_SIZES = [92, 154, 185, 300, 342, 500, 640, 780, 1080, 1280];
const SMALLEST_DEVICE = 640;
//
const MAX_IN_FLIGHT = 3;
// mirrors the <Image> that will render the url
export type PrimeSpec = { width: number; sizes?: string; cors?: boolean };
// keyed by spec too
const primed = new Set<string>();
//
const snap = (width: number) =>
	ALL_SIZES.find((rung) => rung >= width) ?? ALL_SIZES[ALL_SIZES.length - 1];

// next/image's own rule: a vw sizes trims the low rungs, a fixed one keeps all
function candidates({ width, sizes }: PrimeSpec) {
	if (!sizes)
		return {
			widths: [...new Set([width, width * 2].map(snap))],
			kind: "x" as const,
		};
	const vw = [...sizes.matchAll(/(^|\s)(1?\d?\d)vw/g)].map((at) =>
		Number(at[2]),
	);
	if (!vw.length) return { widths: ALL_SIZES, kind: "w" as const };
	const floor = SMALLEST_DEVICE * (Math.min(...vw) / 100);
	return {
		widths: ALL_SIZES.filter((rung) => rung >= floor),
		kind: "w" as const,
	};
}

// the loader is what snaps 640 onto w780
export function srcsetFor(url: string, spec: PrimeSpec): string {
	const { widths, kind } = candidates(spec);
	return widths
		.map(
			(width, at) =>
				`${imageLoader({ src: url, width })} ${kind === "w" ? width : at + 1}${kind}`,
		)
		.join(", ");
}

// resolves once the browser is done
export function primeImage(
	url: string | null | undefined,
	spec: PrimeSpec,
	onLoad?: (img: HTMLImageElement) => void,
): Promise<void> {
	if (typeof window === "undefined" || !url) return Promise.resolve();
	const key = `${url}|${spec.width}|${spec.sizes ?? ""}|${spec.cors ? 1 : 0}`;
	if (primed.has(key)) return Promise.resolve();
	primed.add(key);

	return new Promise((resolve) => {
		const img = new window.Image();
		// has to be set before the request goes out or the canvas taints
		if (spec.cors) img.crossOrigin = corsMode(url) ?? null;
		img.fetchPriority = "low";
		img.onload = () => {
			onLoad?.(img);
			resolve();
		};
		img.onerror = () => {
			primed.delete(key);
			resolve();
		};

		if (isResizable(url)) {
			const { widths } = candidates(spec);
			if (spec.sizes) img.sizes = spec.sizes;
			img.srcset = srcsetFor(url, spec);
			img.src = imageLoader({
				src: url,
				width: widths[widths.length - 1],
			});
		} else {
			// hardcover expose no size api
			img.src = url;
		}
	});
}

// active first, then out both ways
function outward(total: number, active: number): number[] {
	const seen = new Set<number>();
	const order: number[] = [];
	const push = (index: number) => {
		const at = ((index % total) + total) % total;
		if (seen.has(at)) return;
		seen.add(at);
		order.push(at);
	};
	push(active);
	for (let step = 1; order.length < total; step++) {
		push(active + step);
		push(active - step);
	}
	return order;
}

type PrimeOptions = { limit?: number; after?: (url: string) => void };

// returns the cancel
export function primeSequence(
	urls: string[] | undefined,
	active: number,
	spec: PrimeSpec,
	{ limit, after }: PrimeOptions = {},
): () => void {
	if (typeof window === "undefined" || !urls?.length) return () => {};
	const queue = outward(urls.length, active)
		.slice(0, limit ?? urls.length)
		.map((at) => urls[at])
		.filter(Boolean);

	let stopped = false;
	const pump = async () => {
		while (!stopped) {
			const url = queue.shift();
			if (!url) return;
			await primeImage(url, spec);
			if (!stopped) after?.(url);
		}
	};
	for (
		let worker = 0;
		worker < Math.min(MAX_IN_FLIGHT, queue.length);
		worker++
	)
		void pump();

	return () => {
		stopped = true;
		queue.length = 0;
	};
}
