"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
	ArrowRight,
	Loader2,
	TriangleAlert,
	type LucideIcon,
} from "lucide-react";
import { mix } from "@/utils/styleUtils";

// form never wait on lightray
const LightRays = dynamic(() => import("@/app/components/ui/LightRays"), {
	ssr: false,
});

export type AuthTone = "emerald" | "blue";

const AUTH_ACCENT: Record<AuthTone, string> = {
	emerald: "#10b981",
	blue: "#3b82f6",
};

interface AuthCardProps {
	tone: AuthTone;
	caption: string;
	error?: string;
	onSubmit: () => void;
	switchTo: { href: string; label: string };
	children: React.ReactNode;
}

export function AuthCard({
	tone,
	caption,
	error,
	onSubmit,
	switchTo,
	children,
}: AuthCardProps) {
	const reduced = useReducedMotion();

	return (
		<main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-black px-4 py-8">
			<div className="absolute inset-0 hidden sm:block">
				<LightRays
					raysOrigin="top-center"
					raysColor="#ffffff"
					raysSpeed={0.45}
					lightSpread={1.1}
					rayLength={1.8}
					fadeDistance={0.85}
					saturation={1}
					followMouse
					mouseInfluence={0.12}
					noiseAmount={0.05}
					distortion={0.08}
					className="h-full w-full"
				/>
			</div>

			{/* THE SLAB */}
			<motion.div
				className="relative z-10 w-full max-w-sm rounded-2xl bg-[#121212] px-6 pt-7 pb-5 shadow-island"
				style={{
					["--tone" as string]: AUTH_ACCENT[tone],
				}}
				initial={
					reduced
						? { opacity: 0 }
						: { opacity: 0, y: 14, scale: 0.98 }
				}
				animate={{ opacity: 1, y: 0, scale: 1 }}
				transition={
					reduced
						? { duration: 0.15 }
						: {
								type: "spring",
								stiffness: 420,
								damping: 34,
								mass: 0.75,
							}
				}
			>
				{/* THE NAME, THE DOOR */}
				<h1 className="text-center font-display text-2xl leading-none font-semibold tracking-[0.2em] text-zinc-100 select-none">
					MOUTHFUL
				</h1>
				<p className="mt-2.5 text-center text-[0.7rem] font-medium tracking-widest text-zinc-500 uppercase select-none">
					{caption}
				</p>

				{/* WHAT WENT WRONG */}
				<AnimatePresence initial={false}>
					{error && (
						<motion.p
							role="alert"
							className="mt-5 flex items-start gap-2 rounded-lg neu-carved px-3 py-2.5 text-xs leading-snug text-red-300/90"
							style={{
								boxShadow: `inset 0 0 0 1px ${mix("#ef4444", 40)}`,
							}}
							initial={
								reduced ? { opacity: 0 } : { opacity: 0, y: -4 }
							}
							animate={{ opacity: 1, y: 0 }}
							exit={
								reduced ? { opacity: 0 } : { opacity: 0, y: -4 }
							}
							transition={{ duration: 0.2, ease: "easeOut" }}
						>
							<TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0 text-red-400/80" />
							{error}
						</motion.p>
					)}
				</AnimatePresence>

				{/* THE FORM */}
				<form
					className="mt-5 flex flex-col gap-2.5"
					onSubmit={(e) => {
						e.preventDefault();
						onSubmit();
					}}
				>
					{children}
				</form>

				{/* THE OTHER DOOR */}
				<div className="mt-5 flex justify-end">
					<Link
						href={switchTo.href}
						className="group inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition-colors duration-200 hover:text-(--tone)"
					>
						{switchTo.label}
						<ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
					</Link>
				</div>
			</motion.div>
		</main>
	);
}

interface AuthSubmitProps {
	label: string;
	icon: LucideIcon;
	busy: boolean;
	// nothing typed yet
	incomplete: boolean;
}

export function AuthSubmit({
	label,
	icon: Icon,
	busy,
	incomplete,
}: AuthSubmitProps) {
	const off = busy || incomplete;
	return (
		<button
			type="submit"
			disabled={off}
			className={`mt-4 flex h-12 w-full items-center justify-center rounded-lg text-sm font-semibold tracking-wide transition-all duration-200 ${
				off
					? "neu-raised-firm text-zinc-600"
					: "neu-raised text-zinc-100 hover:neu-raised-hi hover:cursor-pointer active:neu-pressed"
			} ${busy ? "cursor-default" : "disabled:cursor-not-allowed"}`}
		>
			{busy ? (
				<Loader2 className="h-4.5 w-4.5 animate-spin text-zinc-500" />
			) : (
				<span className="flex items-center gap-2">
					<Icon className="h-4 w-4" />
					{label}
				</span>
			)}
		</button>
	);
}
