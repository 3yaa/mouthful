"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Clock } from "lucide-react";
import { glassBtn } from "@/app/components/ui/DetailsActionBtn";
import { useEscapeClose } from "@/hooks/useEscapeClose";
import { ChapterLength } from "@/types/manga";
import { CHAPTER_MINUTES } from "@/utils/timeSpent";

const LENGTHS: { value: ChapterLength; label: string }[] = [
	{ value: "short", label: "Short" },
	{ value: "medium", label: "Medium" },
	{ value: "long", label: "Long" },
];

const MOBILE_LOOK =
	"h-9 rounded-md bg-zinc-800/50 backdrop-blur-2xl active:scale-95 transition-transform duration-150";

// mounted only while open, so escape closes the menu before the card
function Menu({
	value,
	mobile,
	onPick,
	onClose,
}: {
	value: ChapterLength;
	mobile: boolean;
	onPick: (value: ChapterLength) => void;
	onClose: () => void;
}) {
	useEscapeClose(onClose);
	return (
		<div
			role="listbox"
			className={`absolute top-full z-30 mt-1.5 flex w-44 flex-col gap-0.5 p-1 shadow-[0_2px_12px_rgba(0,0,0,0.5)] ${
				mobile
					? "left-0 rounded-md bg-zinc-900/95 backdrop-blur-2xl"
					: "left-0 rounded-2xl bg-black/70 backdrop-blur-md"
			}`}
		>
			{LENGTHS.map((length) => {
				const picked = length.value === value;
				return (
					<button
						key={length.value}
						type="button"
						role="option"
						aria-selected={picked}
						onClick={(e) => {
							e.stopPropagation();
							onPick(length.value);
						}}
						className={`flex items-center justify-between gap-2 px-3 py-1.5 text-left text-sm font-semibold transition-colors duration-150 hover:cursor-pointer ${
							mobile ? "rounded" : "rounded-xl"
						} ${
							picked
								? "bg-white/15 text-white"
								: "text-zinc-300/80 hover:bg-white/10 hover:text-white"
						}`}
					>
						<span>{length.label}</span>
						<span className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 tabular-nums">
							{CHAPTER_MINUTES[length.value]} min
							<Check
								className={`h-3.5 w-3.5 ${picked ? "" : "invisible"}`}
							/>
						</span>
					</button>
				);
			})}
		</div>
	);
}

// add/reload
export function ChapterLengthField({
	value,
	onChange,
	mobile = false,
}: {
	value: ChapterLength;
	onChange: (value: ChapterLength) => void;
	mobile?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!open) return;
		const away = (e: PointerEvent) => {
			if (!ref.current?.contains(e.target as Node)) setOpen(false);
		};
		document.addEventListener("pointerdown", away);
		return () => document.removeEventListener("pointerdown", away);
	}, [open]);

	const label = LENGTHS.find((length) => length.value === value)?.label;
	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				onClick={() => setOpen((was) => !was)}
				aria-expanded={open}
				title="Chapter length"
				className={`flex items-center gap-1.5 pl-2 pr-2 text-sm font-semibold ${
					mobile
						? `${MOBILE_LOOK} ${open ? "text-zinc-100" : "text-slate-400"}`
						: `h-8 ${glassBtn({ on: open })}`
				}`}
			>
				<Clock className="h-4 w-4 shrink-0" strokeWidth={2.25} />
				<span>{label}</span>
				<ChevronDown
					className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
				/>
			</button>
			{open && (
				<Menu
					value={value}
					mobile={mobile}
					onPick={(picked) => {
						if (picked !== value) onChange(picked);
						setOpen(false);
					}}
					onClose={() => setOpen(false)}
				/>
			)}
		</div>
	);
}
