"use client";
import { useSyncExternalStore } from "react";
import type { KeyboardEvent, ReactNode, Ref } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { Transition } from "framer-motion";
import { Loader2, type LucideIcon } from "lucide-react";

// same curve as the watch-order drawer
const REVEAL: Transition = {
	duration: 0.34,
	ease: [0.16, 1, 0.3, 1],
	opacity: { duration: 0.2 },
};

const FIELD =
	"rounded-lg neu-raised text-zinc-300/85 font-medium outline-none transition-all duration-300 ease-out";

// tailwind's sm -- below it the year drops under the title
const WIDE = "(min-width: 40rem)";
const subscribeWide = (onChange: () => void) => {
	const list = window.matchMedia(WIDE);
	list.addEventListener("change", onChange);
	return () => list.removeEventListener("change", onChange);
};
const isWide = () => window.matchMedia(WIDE).matches;
// only mounts after a click, so nothing to flash
const isWideOnServer = () => true;

// every key in every state, so crossing the breakpoint leaves nothing stale
const YEAR_WIDE_SHUT = {
	width: 0,
	marginLeft: 0,
	marginTop: 0,
	height: "auto",
	opacity: 0,
};
const YEAR_WIDE_OPEN = {
	width: "9rem",
	marginLeft: "0.75rem",
	marginTop: 0,
	height: "auto",
	opacity: 1,
};
const YEAR_NARROW_SHUT = {
	width: "100%",
	marginLeft: 0,
	marginTop: 0,
	height: 0,
	opacity: 0,
};
const YEAR_NARROW_OPEN = {
	width: "100%",
	marginLeft: 0,
	marginTop: "0.75rem",
	height: "auto",
	opacity: 1,
};

// shared by the real switch and its invisible spacer, so both measure the same
const TOGGLE_BOX =
	"flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium";

interface SearchCardProps {
	icon: LucideIcon;
	label: string;
	// movie/show
	onLabelClick?: () => void;
	expanded?: boolean;
	disabled?: boolean;
	children: ReactNode;
}

export function SearchCard({
	icon: Icon,
	label,
	onLabelClick,
	expanded,
	disabled,
	children,
}: SearchCardProps) {
	return (
		<div className="bg-linear-to-b from-zinc-950/80 to-zinc-900/50 backdrop-blur-xl border border-zinc-800/50 rounded-2xl p-6 w-full max-w-xl mx-4 relative">
			<h2 className="mb-4 flex justify-center">
				{onLabelClick ? (
					<button
						type="button"
						onClick={onLabelClick}
						disabled={disabled}
						aria-expanded={expanded}
						className="flex items-center gap-2 rounded-lg text-xl font-semibold text-zinc-300/90 transition-colors duration-200 ease-out hover:cursor-pointer hover:text-zinc-100 disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-zinc-400"
					>
						<Icon className="w-5 h-5" />
						{label}
					</button>
				) : (
					<span className="flex items-center gap-2 text-xl font-semibold text-zinc-300/90">
						<Icon className="w-5 h-5" />
						{label}
					</span>
				)}
			</h2>
			{children}
		</div>
	);
}

interface SearchToggle {
	label: string;
	on: boolean;
	onChange: () => void;
	hint: string;
}

interface SearchFieldsProps {
	titleRef: Ref<HTMLInputElement>;
	placeholder: string;
	onKeyDown: (e: KeyboardEvent) => void;
	onInput?: () => void;
	searching: boolean;
	// movie/show only: the year field plus one switch inside the title
	advanced?: {
		open: boolean;
		yearRef: Ref<HTMLInputElement>;
		toggle: SearchToggle;
	};
}

export function SearchFields({
	titleRef,
	placeholder,
	onKeyDown,
	onInput,
	searching,
	advanced,
}: SearchFieldsProps) {
	const reduced = useReducedMotion();
	const wide = useSyncExternalStore(subscribeWide, isWide, isWideOnServer);
	const open = !!advanced?.open;
	const yearShut = reduced
		? { opacity: 0 }
		: wide
			? YEAR_WIDE_SHUT
			: YEAR_NARROW_SHUT;
	const yearOpen = reduced
		? { opacity: 1 }
		: wide
			? YEAR_WIDE_OPEN
			: YEAR_NARROW_OPEN;

	return (
		<div className="flex max-sm:flex-wrap">
			<div
				className={`${FIELD} focus-within:neu-pressed flex min-w-0 flex-1 items-center max-sm:basis-full`}
			>
				<input
					type="text"
					ref={titleRef}
					placeholder={placeholder}
					onKeyDown={onKeyDown}
					onInput={onInput}
					disabled={searching}
					className="min-w-0 flex-1 bg-transparent py-3 pr-3 pl-4 placeholder-zinc-500 outline-none"
				/>
				{searching && (
					<Loader2
						className={`h-4 w-4 shrink-0 animate-spin text-zinc-500 ${
							open ? "mr-1" : "mr-4"
						}`}
					/>
				)}
				{open && advanced && (
					<span
						aria-hidden
						className={`${TOGGLE_BOX} invisible mr-2`}
					>
						<ToggleFace {...advanced.toggle} />
					</span>
				)}
			</div>
			{advanced && (
				<AnimatePresence initial={false}>
					{open && (
						<motion.div
							key="year"
							initial={yearShut}
							animate={yearOpen}
							exit={yearShut}
							transition={REVEAL}
							// classes only size it for reduced motion -- the animation's inline styles win otherwise
							className="order-2 shrink-0 max-sm:mt-3 max-sm:basis-full max-sm:overflow-clip max-sm:[overflow-clip-margin:1rem] sm:ml-3 sm:w-36"
						>
							<input
								type="number"
								ref={advanced.yearRef}
								placeholder="Release Year"
								onKeyDown={onKeyDown}
								onInput={onInput}
								disabled={searching}
								className={`${FIELD} focus:neu-pressed w-full px-4 py-3 placeholder-zinc-500`}
							/>
						</motion.div>
					)}
				</AnimatePresence>
			)}
			{/* after the year so Tab goes title, year, switch -- a zero-width anchor draws it inside the title */}
			{advanced && (
				<div className="relative order-1 w-0 shrink-0">
					<AnimatePresence initial={false}>
						{open && (
							<motion.button
								key="toggle"
								type="button"
								role="switch"
								aria-checked={advanced.toggle.on}
								initial={{ opacity: 0, x: 6 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: 6 }}
								transition={REVEAL}
								// keeps the caret in the field
								onMouseDown={(e) => e.preventDefault()}
								onClick={advanced.toggle.onChange}
								onKeyDown={(e) => {
									if (e.key === "Enter") e.stopPropagation();
								}}
								disabled={searching}
								title={advanced.toggle.hint}
								className={`${TOGGLE_BOX} group/tog absolute top-1/2 right-2 -translate-y-1/2 outline-none transition-[background,box-shadow] duration-200 ease-out enabled:hover:cursor-pointer enabled:hover:neu-carved-hi focus-visible:neu-carved-hi`}
							>
								<ToggleFace {...advanced.toggle} />
							</motion.button>
						)}
					</AnimatePresence>
				</div>
			)}
		</div>
	);
}

function ToggleFace({ label, on }: SearchToggle) {
	return (
		<>
			<span
				// dimmed here, the button's own opacity belongs to its entrance
				className={`transition-[color,opacity] duration-200 group-disabled/tog:opacity-50 ${
					on
						? "text-zinc-200"
						: "text-zinc-500 group-hover/tog:text-zinc-300"
				}`}
			>
				{label}
			</span>
			<span className="relative h-4.5 w-8 shrink-0 rounded-full neu-carved transition-opacity duration-200 group-disabled/tog:opacity-50">
				<span
					className={`absolute inset-0 rounded-full bg-blue-400/35 transition-opacity duration-200 ${
						on ? "opacity-100" : "opacity-0"
					}`}
				/>
				<span
					className={`absolute top-0.5 left-0.5 h-3.5 w-3.5 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.5)] transition-[translate,background-color] duration-300 ease-arrive ${
						on ? "translate-x-3.5 bg-blue-200" : "bg-zinc-500"
					}`}
				/>
			</span>
		</>
	);
}

export function SearchReason({ text }: { text: string }) {
	const reduced = useReducedMotion();
	const shut = reduced ? { opacity: 0 } : { height: 0, opacity: 0 };
	const open = reduced ? { opacity: 1 } : { height: "auto", opacity: 1 };
	return (
		<AnimatePresence initial={false}>
			{text && (
				<motion.div
					key="reason"
					initial={shut}
					animate={open}
					exit={shut}
					transition={REVEAL}
					className="overflow-clip"
				>
					<p className="pt-3 pl-4 text-sm font-medium text-zinc-400">
						{text}
					</p>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
