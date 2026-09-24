import { primeImage, type PrimeSpec } from "./imagePrime";

export type LogoMetric = { ratio: number; coverage: number; lines: number };

const MAX_LINES = 3;
export const LOGO_W = 342;
export const LOGO_H = 137;
const ASSUMED_COVERAGE = 0.35;
export const ASSUMED_METRIC: LogoMetric = {
	ratio: LOGO_W / LOGO_H,
	coverage: ASSUMED_COVERAGE,
	lines: 1,
};

// measured once per url and reused
const metrics = new Map<string, LogoMetric>();

// the logo <Image> carries no sizes, so next/image gives it a dpr srcset. it does
// set crossOrigin, because the frame is measured off the pixels
export const LOGO_SPEC: PrimeSpec = { width: LOGO_W, cors: true };

export const metricFor = (url: string): LogoMetric | undefined =>
	metrics.get(url);

// how much of the image is painted, and over how many lines of type
function inkStatsOf(img: HTMLImageElement): Omit<LogoMetric, "ratio"> | null {
	// downscale first
	const w = 128;
	const h = Math.max(
		1,
		Math.round((w * img.naturalHeight) / img.naturalWidth),
	);
	const canvas = document.createElement("canvas");
	canvas.width = w;
	canvas.height = h;
	const ctx = canvas.getContext("2d", { willReadFrequently: true });
	if (!ctx) return null;
	ctx.drawImage(img, 0, 0, w, h);

	// cross-origin pixels would taint the canvas
	let data: Uint8ClampedArray;
	try {
		data = ctx.getImageData(0, 0, w, h).data;
	} catch {
		return null;
	}

	const INK_ALPHA = 40;
	// columns that barely clip a serif would otherwise vote on the line count
	const MIN_INK_ROWS = Math.max(2, Math.round(h * 0.1));

	let ink = 0;
	// runs of ink down each column
	const runsPerColumn: number[] = [];
	for (let x = 0; x < w; x++) {
		let runs = 0;
		let inked = 0;
		let wasInk = false;
		for (let y = 0; y < h; y++) {
			const alpha = data[(y * w + x) * 4 + 3];
			ink += alpha / 255;
			const isInk = alpha > INK_ALPHA;
			if (isInk) {
				inked += 1;
				if (!wasInk) runs += 1;
			}
			wasInk = isInk;
		}
		if (inked >= MIN_INK_ROWS) runsPerColumn.push(runs);
	}

	const coverage = ink / (w * h);
	// a fully opaque rectangle means no alpha channel to read
	if (!(coverage > 0 && coverage < 0.97)) return null;

	runsPerColumn.sort((a, b) => a - b);
	const median = runsPerColumn[Math.floor(runsPerColumn.length / 2)] ?? 1;
	return { coverage, lines: Math.min(Math.max(median, 1), MAX_LINES) };
}

function metricOf(img: HTMLImageElement): LogoMetric | null {
	if (!img.naturalWidth || !img.naturalHeight) return null;
	return {
		ratio: img.naturalWidth / img.naturalHeight,
		// unreadable alpha still gets a frame, just a guessed one
		...(inkStatsOf(img) ?? {
			coverage: ASSUMED_COVERAGE,
			lines: ASSUMED_METRIC.lines,
		}),
	};
}

export function measureLogo(url: string, img: HTMLImageElement): void {
	if (metrics.has(url)) return;
	const metric = metricOf(img);
	if (metric) metrics.set(url, metric);
}

// fetch + measure ahead of the panel, so the title is framed when it opens
export function primeLogo(url: string | null | undefined): void {
	if (!url || metrics.has(url)) return;
	void primeImage(url, LOGO_SPEC, (img) => measureLogo(url, img));
}
