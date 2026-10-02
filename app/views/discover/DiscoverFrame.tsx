"use client";
import type { ReactNode } from "react";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { BadgeLink } from "@/app/views/mediaListing/ShowsBadge";
import { useFlash } from "@/app/components/RouteFlash";
import type { ListingKind } from "@/app/views/mediaListing/ListingSkeleton";
import type { DiscoverFeed } from "./useDiscoverPage";

const WIDTH = "max-w-368";

interface DiscoverFrameProps {
	home: { href: string; title: string; listing: ListingKind };
	feed: DiscoverFeed<unknown>;
	controls?: ReactNode;
	emptyText: string;
	overlays: ReactNode;
	children: ReactNode;
}

export function DiscoverFrame({
	home,
	feed,
	controls,
	emptyText,
	overlays,
	children,
}: DiscoverFrameProps) {
	const flash = useFlash();
	const settled = !feed.loading && !feed.error;
	return (
		<div className="relative min-h-screen bg-zinc-950 text-zinc-200">
			<BadgeLink
				href={home.href}
				title={home.title}
				className="absolute right-10 top-0 z-30 hidden lg:block"
				onClick={() => flash(home.listing)}
				heading="home"
			/>
			{/* ACTION BAR */}
			<div className="sticky top-0 z-20 bg-zinc-950/75 backdrop-blur-3xl select-none">
				<div
					className={`${WIDTH} mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5`}
				>
					<div className="flex items-center gap-3">
						<button
							onClick={feed.onPrev}
							className="cursor-pointer text-zinc-600 hover:text-zinc-300 transition-colors duration-200"
						>
							<ChevronLeft
								className="w-4 h-4"
								strokeWidth={2.25}
							/>
						</button>
						<h1 className="min-w-28 text-center text-zinc-300 text-[0.8125rem] uppercase tracking-[0.2em] font-semibold tabular-nums">
							{feed.heading}
						</h1>
						<button
							onClick={feed.onNext}
							disabled={feed.nextDisabled}
							className="cursor-pointer text-zinc-600 hover:text-zinc-300 transition-colors duration-200 disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:text-zinc-600"
						>
							<ChevronRight
								className="w-4 h-4"
								strokeWidth={2.25}
							/>
						</button>
					</div>

					{controls && (
						<div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center sm:gap-2.5">
							{controls}
						</div>
					)}
				</div>
			</div>

			{/* CONTENT */}
			<div className={`${WIDTH} mx-auto px-4 sm:px-6 pb-8 pt-2`}>
				{feed.loading && (
					<div className="flex justify-center items-center py-40">
						<Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
					</div>
				)}

				{feed.error && (
					<div className="flex justify-center py-40">
						<p className="text-zinc-400 text-sm italic">
							Failed to load - {feed.error}
						</p>
					</div>
				)}

				{settled && (
					<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-5">
						{children}
					</div>
				)}

				{settled && feed.items.length === 0 && (
					<p className="text-center text-zinc-400 italic text-sm py-40">
						{emptyText}
					</p>
				)}

				{settled && (
					<div
						className={`mt-3 flex justify-end items-center gap-2 ${feed.items.length === 0 ? "invisible" : ""}`}
					>
						<button
							onClick={() =>
								feed.setPage(Math.max(1, feed.page - 1))
							}
							disabled={feed.page === 1}
							className="cursor-pointer w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-all disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-zinc-500"
						>
							<ChevronLeft
								className="w-3.5 h-3.5"
								strokeWidth={2.25}
							/>
						</button>
						<span className="text-zinc-400 text-[0.6875rem] tabular-nums uppercase tracking-[0.12em] font-semibold min-w-14 text-center">
							{String(feed.page).padStart(2, "0")}
							<span className="text-zinc-700 mx-1">/</span>
							{String(feed.totalPages).padStart(2, "0")}
						</span>
						<button
							onClick={() =>
								feed.setPage(
									Math.min(feed.totalPages, feed.page + 1),
								)
							}
							disabled={feed.page === feed.totalPages}
							className="cursor-pointer w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 transition-all disabled:opacity-25 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-zinc-500"
						>
							<ChevronRight
								className="w-3.5 h-3.5"
								strokeWidth={2.25}
							/>
						</button>
					</div>
				)}
			</div>

			{overlays}
		</div>
	);
}

export function Segmented<T extends string>({
	options,
	value,
	onChange,
}: {
	options: readonly { label: string; code: T }[];
	value: T;
	onChange: (code: T) => void;
}) {
	return (
		<div className="flex w-full sm:w-auto items-center gap-1 p-1 rounded-lg bg-linear-to-br from-zinc-900/80 to-zinc-950/90 border border-zinc-800/60 shadow-md shadow-black/30">
			{options.map((o) => (
				<button
					key={o.code}
					onClick={() => onChange(o.code)}
					className={`flex-1 sm:flex-none px-3 py-1 rounded-md text-[0.6875rem] uppercase tracking-[0.12em] font-semibold transition-all duration-200 cursor-pointer ${
						value === o.code
							? "bg-zinc-700/70 text-zinc-300 shadow-sm"
							: "text-zinc-500 hover:text-zinc-300"
					}`}
				>
					{o.label}
				</button>
			))}
		</div>
	);
}

export function SubTabs({
	show,
	children,
}: {
	show: boolean;
	children: ReactNode;
}) {
	return (
		<AnimatePresence initial={false}>
			{show && (
				<motion.div
					key="sub-tabs"
					initial={{ opacity: 0, x: 8 }}
					animate={{ opacity: 1, x: 0 }}
					exit={{ opacity: 0, x: 8 }}
					transition={{ duration: 0.2, ease: "easeOut" }}
				>
					{children}
				</motion.div>
			)}
		</AnimatePresence>
	);
}
