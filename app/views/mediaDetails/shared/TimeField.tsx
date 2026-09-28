"use client";

import { useEffect, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { glassBtn } from "@/app/components/ui/DetailsActionBtn";
import { formatMinutes, parseMinutes } from "@/utils/timeSpent";

// the mobile bar's plates
const MOBILE_LOOK =
	"h-9 rounded-md bg-zinc-800/50 backdrop-blur-2xl active:scale-95 transition-transform duration-150";

// add/reload
export function TimeField({
	minutes,
	onChange,
	mobile = false,
}: {
	minutes: number | null;
	onChange: (minutes: number) => void;
	mobile?: boolean;
}) {
	const [draft, setDraft] = useState<string | null>(null);
	const [rejected, setRejected] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);
	const isEditing = draft !== null;

	useEffect(() => {
		if (isEditing) inputRef.current?.select();
	}, [isEditing]);

	const commit = () => {
		if (draft === null) return;
		const parsed = parseMinutes(draft);
		if (draft.trim() && parsed === null) {
			setRejected(true);
			return inputRef.current?.focus();
		}
		if (parsed !== null && parsed !== minutes) onChange(parsed);
		setDraft(null);
	};

	return (
		<div
			className={`flex items-center gap-1.5 pl-2 pr-2.5 text-sm font-semibold tabular-nums ${
				mobile
					? `${MOBILE_LOOK} ${isEditing ? "text-zinc-100" : "text-slate-400"}`
					: `h-8 ${isEditing ? `${glassBtn({ on: true })} cursor-text` : glassBtn()}`
			} ${rejected ? "text-red-300!" : ""}`}
			onClick={() => {
				if (!isEditing) setDraft(minutes ? formatMinutes(minutes) : "");
			}}
			title={isEditing ? "15h, 15h 30m, 90m or 15:30" : "Set the time"}
		>
			<Clock className="h-4 w-4 shrink-0" strokeWidth={2.25} />
			{isEditing ? (
				<input
					ref={inputRef}
					value={draft}
					onChange={(e) => {
						setDraft(e.target.value);
						setRejected(false);
					}}
					onKeyDown={(e) => {
						e.stopPropagation();
						if (e.key === "Enter") commit();
						if (e.key === "Escape") {
							setDraft(null);
							setRejected(false);
						}
					}}
					onBlur={() => {
						if (rejected) {
							setDraft(null);
							setRejected(false);
						} else commit();
					}}
					placeholder="15h"
					spellCheck={false}
					autoComplete="off"
					className="w-16 bg-transparent text-zinc-100 outline-none placeholder:text-zinc-500"
				/>
			) : (
				<span>{minutes ? formatMinutes(minutes) : "-"}</span>
			)}
		</div>
	);
}
