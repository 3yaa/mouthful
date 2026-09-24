"use client";
import Image from "next/image";
import {
	Fragment,
	useCallback,
	useEffect,
	useReducer,
	useRef,
	useState,
} from "react";
import { corsMode, isResizable } from "@/utils/image-loader";
import {
	ASSUMED_METRIC,
	LOGO_H,
	LOGO_W,
	type LogoMetric,
	measureLogo,
	metricFor,
} from "./logoMetrics";

// sizing for logo
const SIZES = {
	lg: { ink: 13.82, minWidth: 6.72, maxWidth: 17.28, maxHeight: 4.8 },
	sm: { ink: 7.23, minWidth: 4.875, maxWidth: 12.8125, maxHeight: 3.625 },
};

//
const TITLE_FILL =
	"bg-linear-to-b from-zinc-100 via-zinc-100/90 to-zinc-400/90 bg-clip-text text-transparent [background-repeat:repeat-y]";
const TITLE_RELIEF = "drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]";
const TITLE_BASE = `font-display uppercase ${TITLE_FILL} ${TITLE_RELIEF} text-balance break-words font-bold`;
//

export const TITLE_TEXT = {
	lg: `${TITLE_BASE} text-center max-w-full text-[2.4rem] leading-[1.1] [background-size:100%_1.1em] tracking-[0.03em]`,
	lgScreen: `${TITLE_BASE} text-center max-w-full text-[2rem] leading-[1.2] [background-size:100%_1.2em] tracking-[0.08em] [text-indent:0.16em]`,
	sm: `${TITLE_BASE} text-center max-w-full text-[1.7rem] leading-[1.12] [background-size:100%_1.12em] font-medium tracking-[0.06em] [text-indent:0.06em] min-w-0`,
};

//
const SERIES_HALO =
	"[text-shadow:0_0_3px_rgba(0,0,0,0.95),0_1px_4px_rgba(0,0,0,0.8),0_0_14px_rgba(0,0,0,0.5)]";
const SERIES_BASE = `font-display uppercase font-normal ${SERIES_HALO} text-balance break-words`;
//

export const SERIES_TEXT = {
	lg: `${SERIES_BASE} text-center max-w-full mb-0.5 text-[0.95rem] leading-[1.5] tracking-[0.25em] text-zinc-200/80`,
	lgScreen: `${SERIES_BASE} text-center max-w-full mb-0.5 text-[0.85rem] leading-[1.5] tracking-[0.28em] text-zinc-400/75`,
	sm: `${SERIES_BASE} text-center max-w-full -mt-2.5 text-[0.7rem] leading-[1.4] tracking-[0.26em] text-zinc-400/75`,
};

// for anime
export const SLOT_TEXT = {
	lg: `${SERIES_BASE} text-center max-w-full mt-1 text-[0.9rem] leading-[1.5] tracking-[0.3em] text-zinc-200/90`,
	sm: `${SERIES_BASE} text-center max-w-full mt-1.5 text-[0.72rem] leading-[1.4] tracking-[0.28em] text-zinc-300/85`,
};

const widthFor = (
	{ ratio, coverage, lines }: LogoMetric,
	size: keyof typeof SIZES,
) => {
	const { ink, minWidth, maxWidth, maxHeight } = SIZES[size];
	// inkPerLine = w * (w / ratio) * coverage / lines, solved for w
	const ideal = Math.sqrt((ink * lines * ratio) / coverage);
	const ceiling = Math.min(maxWidth, maxHeight * ratio);
	// rem out, so keep the fraction a subpixel step at any root size
	return Math.round(Math.min(Math.max(ideal, minWidth), ceiling) * 100) / 100;
};

// A title breaks at its subtitle colon before anywhere else
function titleParts(title: string): string[] {
	const at = title.indexOf(":");
	if (at <= 0 || at >= title.length - 1) return [title];
	return [title.slice(0, at + 1), title.slice(at + 1).trim()];
}

function widestLine(el: HTMLElement): number | null {
	const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
	const rects: DOMRect[] = [];
	for (let node = walker.nextNode(); node; node = walker.nextNode()) {
		// the separator between parts would pad the end of a line
		if (!node.textContent?.trim()) continue;
		const textRange = document.createRange();
		textRange.selectNodeContents(node);
		rects.push(...Array.from(textRange.getClientRects()));
	}
	if (!rects.length) return null;

	const lines: { top: number; left: number; right: number }[] = [];
	for (const rect of rects
		.filter((r) => r.width > 0)
		.sort((a, b) => a.top - b.top)) {
		const line = lines[lines.length - 1];
		// same line if it starts within half a row of the one before it
		if (line && rect.top - line.top < rect.height * 0.5) {
			line.left = Math.min(line.left, rect.left);
			line.right = Math.max(line.right, rect.right);
		} else {
			lines.push({ top: rect.top, left: rect.left, right: rect.right });
		}
	}
	if (!lines.length) return null;
	return Math.ceil(Math.max(...lines.map((l) => l.right - l.left)));
}

function StatusWave({
	color,
	width,
	isBook,
	isLogo,
}: {
	color: string;
	width?: number;
	isBook: boolean;
	isLogo?: boolean;
}) {
	const spacing = isLogo
		? "mt-3 -mb-1"
		: isBook
			? "mt-1.5 mb-1"
			: "mt-1 mb-1";

	return (
		<div
			className={`bg-zinc-800 rounded-full h-0.75 overflow-hidden mx-auto max-w-full ${spacing}`}
			style={{ width: width ?? "100%" }}
		>
			<div className="bg-zinc-900 h-0.75 w-full rounded-full relative overflow-hidden">
				<div
					className="absolute inset-0"
					style={{
						background: color,
						animation: "wave 6s ease-in-out infinite",
						width: "200%",
					}}
				/>
			</div>
		</div>
	);
}

interface MediaTitleProps {
	title: string;
	subtitle?: string | null;
	copyTitle?: string | null;
	logoUrl?: string | null;
	isBook: boolean;
	size: keyof typeof SIZES;
	textClass: string;
	className?: string;
	underlineColor?: string;
}

export function MediaTitle({
	title,
	subtitle,
	copyTitle,
	logoUrl,
	size,
	textClass,
	className = "",
	underlineColor,
	isBook,
}: MediaTitleProps) {
	const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
	const [, remeasured] = useReducer((n: number) => n + 1, 0);
	const [revealAnyway, setRevealAnyway] = useState(false);
	useEffect(() => {
		setRevealAnyway(false);
		if (!logoUrl) return;
		const timer = setTimeout(() => setRevealAnyway(true), 1500);
		return () => clearTimeout(timer);
	}, [logoUrl]);

	const handleError = useCallback(
		() => setBrokenUrl(logoUrl ?? null),
		[logoUrl],
	);

	// clicking either puts it into clipboard
	const copyName = useCallback(() => {
		navigator.clipboard
			?.writeText(copyTitle ?? [title, subtitle].filter(Boolean).join(" "))
			.catch(() => {});
	}, [copyTitle, title, subtitle]);

	const showsText = !logoUrl || brokenUrl === logoUrl;
	const textRef = useRef<HTMLDivElement | null>(null);
	// longest rendered line
	const [lineWidth, setLineWidth] = useState<number | undefined>(undefined);

	useEffect(() => {
		const el = textRef.current;
		if (!showsText || !el) return;

		const measure = () => {
			const widest = widestLine(el);
			if (widest !== null) setLineWidth(widest);
		};
		measure();

		// the display face swaps in after first paint and the fluid root
		// rescales the type with the viewport -- both move the line ends
		document.fonts?.ready.then(measure).catch(() => {});
		const observer = new ResizeObserver(measure);
		observer.observe(el);
		return () => observer.disconnect();
	}, [showsText, title, textClass]);

	if (showsText) {
		return (
			<div className={`flex flex-col max-w-full ${className}`}>
				<div
					ref={textRef}
					onClick={copyName}
					className={`${textClass} cursor-pointer select-none`}
				>
					{titleParts(title || "Untitled").map((part, i) => (
						<Fragment key={i}>
							{i > 0 && " "}
							<span className="inline-block max-w-full">
								{part}
							</span>
						</Fragment>
					))}
				</div>
				{underlineColor && (
					<StatusWave
						color={underlineColor}
						width={lineWidth}
						isBook={isBook}
					/>
				)}
			</div>
		);
	}

	// real size is only known after the load
	const measured = metricFor(logoUrl);

	// decoded before the reveal, so the frame never eases open on a blank box.
	const reveal = (img: HTMLImageElement) => {
		const measure = () => {
			measureLogo(logoUrl, img);
			// only when this instance is still showing the guess
			if (!measured && metricFor(logoUrl)) remeasured();
		};
		if (img.decode) img.decode().then(measure, measure);
		else measure();
	};

	const frame = measured ?? ASSUMED_METRIC;
	const frameWidth = widthFor(frame, size);
	const sizing = {
		width: `${frameWidth}rem`,
		height: `${Math.round((frameWidth / frame.ratio) * 100) / 100}rem`,
	};

	return (
		<div className={`w-fit max-w-full ${className}`}>
			<Image
				src={logoUrl}
				alt={title || "Untitled"}
				width={LOGO_W}
				height={LOGO_H}
				unoptimized={!isResizable(logoUrl)}
				crossOrigin={corsMode(logoUrl)}
				priority
				onLoad={(e) => reveal(e.currentTarget)}
				onClick={copyName}
				onError={handleError}
				draggable={false}
				style={{
					...sizing,
					opacity: measured || revealAnyway ? 1 : 0,
					transition:
						"opacity 150ms ease-out, width 220ms ease-out, height 220ms ease-out",
				}}
				className="block max-w-full object-contain cursor-pointer select-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]"
			/>
			{underlineColor && (
				<StatusWave color={underlineColor} isBook={isBook} isLogo />
			)}
		</div>
	);
}
