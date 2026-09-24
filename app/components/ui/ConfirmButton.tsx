"use client";

import { useEffect } from "react";
import {
	AnimatePresence,
	motion,
	useReducedMotion,
	type Variants,
} from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { bloomIn, mix } from "@/utils/styleUtils";

export type ConfirmTone = "emerald" | "blue" | "orange" | "red" | "purple";

const CONFIRM_TONE: Record<ConfirmTone, { hex: string; text: string }> = {
	emerald: { hex: "#10b981", text: "text-emerald-300" },
	blue: { hex: "#3b82f6", text: "text-blue-300" },
	orange: { hex: "#f97316", text: "text-orange-300" },
	red: { hex: "#ef4444", text: "text-red-300" },
	purple: { hex: "#a855f7", text: "text-purple-300" },
};

const ANSWER_FILL =
	"linear-gradient(to bottom, rgba(0,0,0,0.46) 0%, rgba(0,0,0,0.30) 55%, rgba(0,0,0,0.22) 100%)";

const ANSWER_CUT = [
	"inset 0 1px 0 rgba(0,0,0,0.55)",
	"inset 0 2px 5px rgba(0,0,0,0.32)",
	"inset 0 -1px 0 rgba(255,255,255,0.07)",
	"0 1px 0 rgba(255,255,255,0.035)",
].join(", ");

const rim = (hex: string, toward: "top right" | "top") =>
	`linear-gradient(to ${toward}, ${mix(hex, 10)}, ${mix(hex, 22)} 48%, ${mix(hex, 46)})`;

const KeyHint = ({ children }: { children: string }) => (
	<kbd className="hidden shrink-0 rounded-[0.3rem] border border-white/10 bg-black/30 px-1 font-sans text-[0.5625rem] font-bold leading-[0.85rem] tracking-wide text-zinc-400/80 select-none sm:block">
		{children}
	</kbd>
);

interface ConfirmPromptProps {
	isOpen: boolean;
	title: string;
	confirmLabel?: string;
	cancelLabel?: string;
	tone?: ConfirmTone;
	icon?: LucideIcon;
	// "bottom" mobile, "center" desktop
	placement?: "bottom" | "center";
	onConfirm: () => void;
	onCancel: () => void;
}

export function ConfirmPrompt({
	isOpen,
	title,
	confirmLabel = "Confirm",
	cancelLabel = "Cancel",
	tone = "red",
	icon: Icon,
	placement = "bottom",
	onConfirm,
	onCancel,
}: ConfirmPromptProps) {
	const reduced = useReducedMotion();

	useEffect(() => {
		if (!isOpen) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key !== "Escape" && e.key !== "Enter") return;
			e.preventDefault();
			e.stopPropagation();
			(e.key === "Escape" ? onCancel : onConfirm)();
		};
		window.addEventListener("keydown", onKey, true);
		return () => window.removeEventListener("keydown", onKey, true);
	}, [isOpen, onCancel, onConfirm]);

	const isCenter = placement === "center";
	const { hex, text } = CONFIRM_TONE[tone];

	const stagger = reduced
		? {}
		: { delayChildren: 0.09, staggerChildren: 0.055 };
	const rise: Variants = reduced
		? { hidden: { opacity: 0 }, shown: { opacity: 1 } }
		: {
				hidden: { opacity: 0, y: 8 },
				shown: {
					opacity: 1,
					y: 0,
					transition: {
						duration: 0.4,
						ease: [0.16, 1, 0.3, 1] as const,
					},
				},
			};

	return (
		<AnimatePresence>
			{isOpen && (
				<motion.div
					role="dialog"
					aria-modal="true"
					data-modal
					className={`fixed inset-0 z-50 flex justify-center ${
						isCenter ? "items-center" : "items-end"
					}`}
					initial="hidden"
					animate="shown"
					exit="hidden"
					variants={{ hidden: {}, shown: {} }}
				>
					{/* BACKDROP */}
					<motion.div
						onClick={onCancel}
						className={`absolute inset-0 ${
							isCenter
								? "bg-black/50 backdrop-blur-[3px]"
								: "bg-black/60 backdrop-blur-[2px]"
						}`}
						variants={{
							hidden: { opacity: 0 },
							shown: {
								opacity: 1,
								transition: { duration: 0.22, ease: "easeOut" },
							},
						}}
					/>
					{/* THE FRAME  */}
					<motion.div
						className={`relative p-1.5 shadow-2xl shadow-black/70 ${
							isCenter
								? "w-full max-w-sm mx-4 rounded-[1.375rem]"
								: "w-full max-w-sm mx-3 rounded-[1.375rem]"
						}`}
						style={{
							background: rim(
								hex,
								isCenter ? "top right" : "top",
							),
							...(isCenter
								? {}
								: {
										marginBottom:
											"calc(0.75rem + env(safe-area-inset-bottom))",
									}),
						}}
						variants={{
							hidden: reduced
								? { opacity: 0 }
								: isCenter
									? { opacity: 0, scale: 0.94, y: 6 }
									: { opacity: 0, y: 28 },
							shown: {
								opacity: 1,
								scale: 1,
								y: 0,
								transition: reduced
									? { duration: 0.15 }
									: {
											type: "spring",
											stiffness: 460,
											damping: 32,
											mass: 0.7,
											...stagger,
										},
							},
						}}
					>
						<span
							aria-hidden
							className="pointer-events-none absolute inset-0 -z-10 rounded-[1.375rem]"
							style={{
								boxShadow: `0 0 38px -16px ${mix(hex, 45)}`,
							}}
						/>
						<div className="relative overflow-hidden rounded-2xl bg-[#121212] px-5 pb-4 pt-5">
							{/* THE MARK */}
							{Icon && (
								<motion.div
									variants={rise}
									className="relative mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full neu-carved"
								>
									<span
										aria-hidden
										className="pointer-events-none absolute inset-0 rounded-full"
										style={{
											background: bloomIn(mix(hex, 88)),
										}}
									/>
									{!reduced && (
										<motion.span
											aria-hidden
											className="pointer-events-none absolute inset-0 rounded-full"
											style={{
												border: `1px solid ${mix(hex, 70)}`,
											}}
											initial={{ opacity: 0.9, scale: 1 }}
											animate={{
												opacity: 0,
												scale: 1.75,
											}}
											transition={{
												duration: 0.9,
												delay: 0.16,
												ease: "easeOut",
											}}
										/>
									)}
									<motion.span
										initial={
											reduced
												? false
												: { scale: 0.35, rotate: -18 }
										}
										animate={{ scale: 1, rotate: 0 }}
										transition={{
											type: "spring",
											stiffness: 520,
											damping: 18,
											delay: 0.1,
										}}
									>
										<Icon
											className={`h-[1.15rem] w-[1.15rem] ${text}`}
											strokeWidth={2}
										/>
									</motion.span>
								</motion.div>
							)}
							{/* THE QUESTION */}
							<motion.h2
								variants={rise}
								className="text-pretty px-1 text-center text-[0.9rem] font-semibold leading-snug text-zinc-100 select-none"
							>
								{title}
							</motion.h2>
							{/* CANCEL | CONFIRM */}
							<motion.div
								variants={rise}
								className="mt-4 flex items-center gap-2"
							>
								<button
									type="button"
									onClick={onCancel}
									className={`flex-1 h-10 rounded-xl neu-carved text-zinc-300/90 text-sm font-semibold transition-all duration-150 ${
										isCenter
											? "cursor-pointer hover:text-zinc-100 hover:brightness-125"
											: "active:scale-[0.98]"
									}`}
								>
									<span className="flex items-center justify-center gap-1.5 px-2">
										<span className="min-w-0 truncate">
											{cancelLabel}
										</span>
										<KeyHint>esc</KeyHint>
									</span>
								</button>
								<button
									type="button"
									onClick={onConfirm}
									style={{
										background: ANSWER_FILL,
										boxShadow: ANSWER_CUT,
									}}
									className={`group relative flex-1 h-10 overflow-hidden rounded-xl text-sm font-semibold text-zinc-50 transition-all duration-150 ${
										isCenter
											? "cursor-pointer active:brightness-90"
											: "active:scale-[0.98]"
									}`}
								>
									{/* THE ACTION'S COLOUR */}
									<span
										aria-hidden
										className="pointer-events-none absolute inset-0 rounded-xl"
										style={{
											boxShadow: `inset 0 0 0 1px ${mix(hex, 48)}`,
										}}
									/>
									<span
										aria-hidden
										className="pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100"
										style={{
											boxShadow: `inset 0 0 0 1px ${mix(hex, 90)}, inset 0 -10px 14px -10px ${mix(hex, 30)}`,
										}}
									/>
									<span
										className="relative flex items-center justify-center gap-1.5 px-2"
										style={{
											textShadow:
												"0 1px 2px rgba(0,0,0,0.55)",
										}}
									>
										<span className="min-w-0 truncate">
											{confirmLabel}
										</span>
										<KeyHint>↵</KeyHint>
									</span>
								</button>
							</motion.div>
						</div>
					</motion.div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
