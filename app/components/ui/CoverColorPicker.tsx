"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Palette, Loader2 } from "lucide-react";
import { extractCoverPalette } from "@/utils/extractCoverPalette";
import { glassBtn } from "./DetailsActionBtn";

// original color
const defaultColorCache = new Map<string, string>();

interface CoverColorPickerProps {
	coverUrl?: string;
	currentColor?: string;
	onPick: (color: string) => void;
	// desktop add/reload wear the art pickers' glass
	glass?: boolean;
}

const norm = (c?: string) => c?.toLowerCase();

export function CoverColorPicker({
	coverUrl,
	currentColor,
	onPick,
	glass = false,
}: CoverColorPickerProps) {
	const [open, setOpen] = useState(false);
	const [colors, setColors] = useState<string[]>([]);
	const [loading, setLoading] = useState(false);
	// capture the cover's default colour once, cached by url across remounts
	const [defaultColor] = useState(() => {
		if (coverUrl && currentColor && !defaultColorCache.has(coverUrl)) {
			defaultColorCache.set(coverUrl, currentColor);
		}
		return (coverUrl && defaultColorCache.get(coverUrl)) || currentColor;
	});

	// Pull the palette before the click
	const started = useRef(false);
	const warm = useCallback(() => {
		if (!coverUrl || started.current) return;
		started.current = true;
		setLoading(true);
		extractCoverPalette(coverUrl)
			.then(setColors)
			.finally(() => setLoading(false));
	}, [coverUrl]);

	useEffect(() => {
		// a new cover invalidates the warm-up, not just the result
		started.current = false;
		setColors([]);

		type IdleWindow = typeof window & {
			requestIdleCallback?: (cb: () => void) => number;
			cancelIdleCallback?: (handle: number) => void;
		};
		const w = window as IdleWindow;
		if (w.requestIdleCallback) {
			const handle = w.requestIdleCallback(warm);
			return () => w.cancelIdleCallback?.(handle);
		}
		// safari has no requestIdleCallback -- yield past first paint instead
		const timer = setTimeout(warm, 200);
		return () => clearTimeout(timer);
	}, [coverUrl, warm]);

	const toggle = (e: React.MouseEvent) => {
		e.stopPropagation();
		if (open) {
			setOpen(false);
			return;
		}
		setOpen(true);
		// already warm in the common case; this only matters if the idle callback has not fired yet
		warm();
	};

	if (!coverUrl) return null;

	// default first, then extracted colours minus any that match the default
	const extras = colors.filter((c) => norm(c) !== norm(defaultColor));

	const swatch = (c: string, isDefault: boolean) => {
		const isActive = norm(c) === norm(currentColor);
		return (
			<button
				key={c + (isDefault ? "-d" : "")}
				onClick={() => onPick(c)}
				title={isDefault ? `${c} (default)` : c}
				className={`h-5 w-5 rounded-full transition-transform hover:scale-110 hover:cursor-pointer ${
					isActive
						? "ring-2 ring-white ring-offset-1 ring-offset-zinc-900 "
						: ""
				}${
					isDefault
						? "border border-white/40"
						: isActive
							? ""
							: "ring-1 ring-white/20"
				}`}
				style={{ backgroundColor: c }}
			/>
		);
	};

	return (
		<div className="relative" onClick={(e) => e.stopPropagation()}>
			<button
				onClick={toggle}
				onPointerEnter={warm}
				title="Cover colors"
				className={
					glass
						? `p-1.5 ${glassBtn({ on: open })}`
						: `py-1.5 px-2 rounded-lg bg-zinc-800/50 hover:bg-emerald-600/20 hover:cursor-pointer transition-all group ${
								open ? "bg-emerald-600/20" : ""
							}`
				}
			>
				<Palette
					className={`w-5 h-5 transition-colors ${
						glass
							? ""
							: open
								? "text-emerald-400"
								: "text-gray-400 group-hover:text-emerald-400"
					}`}
				/>
			</button>
			{open && (
				<div
					className={`absolute right-full top-1/2 -translate-y-1/2 mr-1.5 z-20 flex items-center gap-1.5 px-2 py-1.5 ${
						glass
							? "rounded-full bg-black/45 shadow-[0_2px_8px_rgba(0,0,0,0.45)] backdrop-blur-sm"
							: "rounded-lg bg-zinc-900/95 backdrop-blur-md border border-zinc-800/60 shadow-xl"
					}`}
				>
					{defaultColor && swatch(defaultColor, true)}
					{loading ? (
						<Loader2 className="w-4 h-4 text-zinc-300 animate-spin" />
					) : (
						extras.map((c) => swatch(c, false))
					)}
					{!loading && !defaultColor && extras.length === 0 && (
						<span className="text-[0.7rem] text-zinc-400 px-1 whitespace-nowrap">
							No colors
						</span>
					)}
				</div>
			)}
		</div>
	);
}
