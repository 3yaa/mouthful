import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Portal } from "@/utils/portal";
import { ModalBackdrop, ModalPanel } from "@/app/components/ui/ModalMotion";

interface CreditNamesProps {
	names: string[];
	// only when theres somewhere to go -- also what makes the ... open the full list
	onPick?: (name: string) => void;
	// heading over that list -- "Directors", "Studios"
	label?: string;
	pickTitle?: string;
	width?: string;
	limit?: number;
}

export function CreditNames({
	names,
	onPick,
	label,
	pickTitle,
	width = "max-w-60",
	limit,
}: CreditNamesProps) {
	const [picking, setPicking] = useState(false);
	const containerRef = useRef<HTMLSpanElement>(null);
	const probeRef = useRef<HTMLSpanElement>(null);
	const dotsRef = useRef<HTMLElement | null>(null);
	const [shownCount, setShownCount] = useState(names.length);
	const [cutName, setCutName] = useState<string | null>(null);

	//
	const key = names.join("|");

	useLayoutEffect(() => {
		const container = containerRef.current;
		const probe = probeRef.current;
		if (!container || !probe) return;

		const measure = () => {
			// the room at max-w, not the current content
			const cap = parseFloat(getComputedStyle(container).maxWidth);
			if (Number.isFinite(cap)) container.style.width = `${cap}px`;
			const full = container.clientWidth;
			container.style.width = "";
			const max = Math.min(limit ?? names.length, names.length);
			// everything fits -- no dots, no dropping
			probe.textContent = names.join(", ");
			if (
				names.length < 2 ||
				(max === names.length && probe.scrollWidth <= full)
			) {
				setShownCount(names.length);
				setCutName(null);
				return;
			}
			// the ...
			const reserved = (dotsRef.current?.offsetWidth ?? 12) + 4;
			const available = full - reserved;
			// floored at one
			let count = Math.min(max, names.length - 1);
			while (count > 1) {
				probe.textContent = names.slice(0, count).join(", ");
				if (probe.scrollWidth <= available) break;
				count--;
			}
			setShownCount(count);
			// even one whole name is too wide
			const [lead] = names;
			probe.textContent = lead;
			if (count > 1 || probe.scrollWidth <= available) {
				setCutName(null);
				return;
			}
			let lo = 1;
			let hi = lead.length - 1;
			while (lo < hi) {
				const mid = Math.ceil((lo + hi) / 2);
				probe.textContent = lead.slice(0, mid).trimEnd();
				if (probe.scrollWidth <= available) lo = mid;
				else hi = mid - 1;
			}
			setCutName(lead.slice(0, lo).trimEnd());
		};

		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(container);
		return () => observer.disconnect();
		// `key` stands in for `names`
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key, limit]);

	const shown = names.slice(0, shownCount);
	const hidden = names.slice(shownCount);
	const overflow = hidden.length;

	return (
		<>
			<span
				ref={containerRef}
				className={`relative inline-flex items-center min-w-0 ${cutName ? "" : "gap-px"} ${width}`}
			>
				<span
					ref={probeRef}
					aria-hidden
					className="absolute left-0 top-0 invisible whitespace-nowrap pointer-events-none"
				/>
				<span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
					{shown.map((name, i) => (
						<span key={name}>
							{i > 0 && ", "}
							{onPick ? (
								<span
									className="hover:text-zinc-200 hover:underline hover:underline-offset-4 hover:cursor-pointer transition-colors duration-200"
									onClick={() => onPick(name)}
									title={cutName ? name : pickTitle}
								>
									{cutName ?? name}
								</span>
							) : (
								<span title={cutName ? name : undefined}>
									{cutName ?? name}
								</span>
							)}
						</span>
					))}
				</span>
				{overflow > 0 &&
					(onPick ? (
						<button
							ref={dotsRef as React.Ref<HTMLButtonElement>}
							type="button"
							onClick={() => setPicking(true)}
							title={`${overflow} more - see all`}
							aria-label={`${overflow} more - see all`}
							className="shrink-0 leading-none font-semibold text-zinc-500 hover:text-zinc-200 cursor-pointer transition-colors duration-200"
						>
							…
						</button>
					) : (
						<span
							ref={dotsRef as React.Ref<HTMLSpanElement>}
							title={hidden.join(", ")}
							className="shrink-0 leading-none font-semibold text-zinc-500"
						>
							…
						</span>
					))}
			</span>
			<Portal>
				<AnimatePresence>
					{picking && (
						<CreditPicker
							label={label}
							names={names}
							onClose={() => setPicking(false)}
							onPick={(name) => {
								setPicking(false);
								onPick?.(name);
							}}
						/>
					)}
				</AnimatePresence>
			</Portal>
		</>
	);
}

// the full list behind the ... -- only open here
function CreditPicker({
	names,
	label,
	onPick,
	onClose,
}: {
	names: string[];
	label?: string;
	onPick: (name: string) => void;
	onClose: () => void;
}) {
	return (
		<ModalBackdrop
			className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-30 p-4"
			onClick={onClose}
		>
			<ModalPanel
				className="w-full max-w-64 rounded-2xl bg-zinc-950 border border-zinc-800/50 shadow-2xl shadow-black/80 overflow-hidden"
				onClick={(e) => e.stopPropagation()}
			>
				{label && (
					<p className="px-4 pt-3.5 pb-2 text-[0.625rem] uppercase tracking-[0.18em] text-zinc-400/60 font-semibold">
						{label}
					</p>
				)}
				<div className="pb-2">
					{names.map((name) => (
						<button
							key={name}
							type="button"
							onClick={() => onPick(name)}
							className="w-full text-left px-4 py-2 text-sm font-medium text-zinc-300/85 hover:bg-zinc-800/60 hover:text-zinc-100 cursor-pointer transition-colors duration-200"
						>
							{name}
						</button>
					))}
				</div>
			</ModalPanel>
		</ModalBackdrop>
	);
}
