import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Portal } from "@/utils/portal";
import { ModalBackdrop, ModalPanel } from "@/app/components/ui/ModalMotion";

interface CreditNamesProps {
	names: string[];
	// only when theres somewhere to go -- also what makes +n open the full list
	onPick?: (name: string) => void;
	// heading over that list -- "Directors", "Studios"
	label?: string;
	pickTitle?: string;
	width?: string;
}

export function CreditNames({
	names,
	onPick,
	label,
	pickTitle,
	width = "max-w-60",
}: CreditNamesProps) {
	const [picking, setPicking] = useState(false);
	const containerRef = useRef<HTMLSpanElement>(null);
	const probeRef = useRef<HTMLSpanElement>(null);
	const dotsRef = useRef<HTMLElement | null>(null);
	const [shownCount, setShownCount] = useState(names.length);

	//
	const key = names.join("|");

	useLayoutEffect(() => {
		const container = containerRef.current;
		const probe = probeRef.current;
		if (!container || !probe) return;

		const measure = () => {
			const full = container.clientWidth;
			// everything fits -- no dots, no dropping
			probe.textContent = names.join(", ");
			if (probe.scrollWidth <= full) {
				setShownCount(names.length);
				return;
			}
			// the ...
			const reserved = (dotsRef.current?.offsetWidth ?? 22) + 6;
			const available = full - reserved;
			// floored at one
			let count = Math.max(1, names.length - 1);
			while (count > 1) {
				probe.textContent = names.slice(0, count).join(", ");
				if (probe.scrollWidth <= available) break;
				count--;
			}
			setShownCount(count);
		};

		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(container);
		return () => observer.disconnect();
		// `key` stands in for `names`
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key]);

	const shown = names.slice(0, shownCount);
	const hidden = names.slice(shownCount);
	const overflow = hidden.length;

	return (
		<>
			<span
				ref={containerRef}
				className={`relative inline-flex items-center gap-1 min-w-0 ${width}`}
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
									title={pickTitle}
								>
									{name}
								</span>
							) : (
								name
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
							className="shrink-0 leading-none text-[0.8em] font-semibold tabular-nums text-zinc-500 hover:text-zinc-200 cursor-pointer transition-colors duration-200"
						>
							+{overflow}
						</button>
					) : (
						<span
							ref={dotsRef as React.Ref<HTMLSpanElement>}
							title={hidden.join(", ")}
							className="shrink-0 leading-none text-[0.8em] font-semibold tabular-nums text-zinc-500"
						>
							+{overflow}
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

// the full list behind a +n -- only CreditNames opens it
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
