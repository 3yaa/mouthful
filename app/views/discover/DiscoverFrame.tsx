"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
	ChevronLeft,
	ChevronRight,
	Flame,
	Leaf,
	type LucideIcon,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BadgeLink } from "@/app/views/mediaListing/ShowsBadge";
import { useFlash } from "@/app/components/RouteFlash";
import type { ListingKind } from "@/app/views/mediaListing/ListingSkeleton";
import type { DiscoverFeed } from "./useDiscoverPage";
import { SwapCharm } from "./SwapCharm";
import {
	DroppedList,
	DroppedListSkeleton,
	type DroppedGroup,
} from "./DroppedList";
import { DiscoverCardSkeleton } from "./DiscoverCard";

const WIDTH = "max-w-368";
const GRID =
	"grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-4 gap-y-5";

export type DiscoverSort = "popular" | "rated";

interface DiscoverFrameProps {
	home: { href: string; title: string; listing: ListingKind };
	// the other list's discover, hung opposite the way home
	swap: { href: string; title: string; to: "movie" | "show" };
	feed: DiscoverFeed<unknown, unknown>;
	sort: { value: DiscoverSort; onChange: (sort: DiscoverSort) => void };
	dropped?: DroppedGroup[];
	controls?: ReactNode;
	emptyText: string;
	overlays: ReactNode;
	children: ReactNode;
}

export function DiscoverFrame({
	home,
	swap,
	feed,
	sort,
	dropped,
	controls,
	emptyText,
	overlays,
	children,
}: DiscoverFrameProps) {
	const flash = useFlash();
	// a page on its way empties into placeholders, a cached one shows at once
	const loading = feed.loading && !feed.error;
	const shown = !feed.loading && !feed.error;
	return (
		<div className="relative min-h-screen bg-zinc-950 text-zinc-200">
			{/* ACTION BAR -- below 101rem the margin cannot hold the compass, so the bar makes room */}
			<div className="sticky top-0 z-20 bg-zinc-950/75 backdrop-blur-3xl select-none">
				<div
					className={`${WIDTH} mx-auto px-4 sm:px-6 lg:max-[101rem]:pr-24 py-3.5 flex flex-wrap items-center gap-2.5`}
				>
					<div className="mr-auto flex items-center gap-3">
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

					<SortToggle {...sort} />
					{controls && (
						<div className="order-last flex w-full flex-col-reverse gap-2 sm:order-0 sm:w-auto sm:flex-row sm:items-center sm:gap-2.5">
							{controls}
						</div>
					)}
				</div>
			</div>
			<BadgeLink
				href={home.href}
				title={home.title}
				className="absolute right-10 top-0 z-20 hidden lg:block"
				onClick={() => flash(home.listing)}
				heading="home"
			/>
			<SwapCharm
				to={swap.to}
				href={swap.href}
				title={swap.title}
				className="absolute left-10 top-0 z-20 hidden min-[100rem]:block"
				onClick={() => flash()}
			/>
			{/* CONTENT */}
			<div className={`${WIDTH} relative mx-auto px-4 sm:px-6 pb-8 pt-2`}>
				{loading && (
					<div aria-busy aria-label="Loading" className={GRID}>
						{Array.from({ length: 24 }, (_, i) => (
							<DiscoverCardSkeleton key={i} index={i} />
						))}
					</div>
				)}

				{feed.error && (
					<div className="flex justify-center py-40">
						<p className="text-zinc-400 text-sm italic">
							Failed to load - {feed.error}
						</p>
					</div>
				)}

				{shown && <div className={GRID}>{children}</div>}

				{shown && feed.items.length === 0 && (
					<p className="text-center text-zinc-400 italic text-sm py-40">
						{emptyText}
					</p>
				)}

				{(shown || feed.refreshing) && (
					<div
						className={`mt-3 flex justify-end items-center gap-2 ${shown && feed.items.length === 0 ? "invisible" : ""}`}
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

				{dropped && (loading || shown) && (
					<div className="mt-10 mb-16 min-[120rem]:hidden">
						{loading ? (
							<DroppedListSkeleton layout="section" />
						) : (
							<DroppedList groups={dropped} layout="section" />
						)}
					</div>
				)}
				{dropped && (loading || shown) && (
					<aside
						aria-label="Left out"
						className="absolute left-full top-0 hidden h-full w-44 min-[120rem]:block"
					>
						<FadeScroll className="sticky top-30 mt-14 max-h-[calc(100vh-15rem)]">
							{loading ? (
								<DroppedListSkeleton layout="rail" />
							) : (
								<DroppedList groups={dropped} layout="rail" />
							)}
						</FadeScroll>
					</aside>
				)}
			</div>

			{overlays}
		</div>
	);
}

function FadeScroll({
	className,
	children,
}: {
	className: string;
	children: ReactNode;
}) {
	const scroller = useRef<HTMLDivElement>(null);
	const content = useRef<HTMLDivElement>(null);
	const [edges, setEdges] = useState({ above: false, below: false });
	useEffect(() => {
		const el = scroller.current;
		if (!el) return;
		const update = () => {
			const above = el.scrollTop > 1;
			const below = el.scrollTop + el.clientHeight < el.scrollHeight - 1;
			setEdges((was) =>
				was.above === above && was.below === below
					? was
					: { above, below },
			);
		};
		update();
		el.addEventListener("scroll", update, { passive: true });
		const observer = new ResizeObserver(update);
		observer.observe(el);
		if (content.current) observer.observe(content.current);
		return () => {
			el.removeEventListener("scroll", update);
			observer.disconnect();
		};
	}, []);
	return (
		<div
			ref={scroller}
			data-above={edges.above || undefined}
			data-below={edges.below || undefined}
			className={`fade-scroll overflow-y-auto ${className}`}
		>
			<div ref={content}>{children}</div>
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

// short on the pill, said in full to screen readers
const SORTS: {
	code: DiscoverSort;
	label: string;
	short: string;
	icon: LucideIcon;
	tint: string;
}[] = [
	{
		code: "popular",
		label: "popular",
		short: "pop",
		icon: Flame,
		tint: "text-amber-300/85 fill-amber-300/15",
	},
	// the leaf every card scores with
	{
		code: "rated",
		label: "rated",
		short: "rat",
		icon: Leaf,
		tint: "text-emerald-300/85 fill-emerald-300/15",
	},
];

const SORT_LABEL =
	"pl-1.5 text-[0.6875rem] uppercase tracking-[0.12em] font-semibold whitespace-nowrap";

function SortToggle({
	value,
	onChange,
}: {
	value: DiscoverSort;
	onChange: (sort: DiscoverSort) => void;
}) {
	const reduced = useReducedMotion();
	return (
		// glides along as the sub-tabs beside it come and go
		<motion.div
			layout="position"
			transition={
				reduced ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }
			}
			role="group"
			aria-label="Order"
			className="flex items-center gap-1 p-1 rounded-lg bg-linear-to-br from-zinc-900/80 to-zinc-950/90 border border-zinc-800/60 shadow-md shadow-black/30"
		>
			{SORTS.map(({ code, label, icon: Icon, tint }) => {
				const on = value === code;
				return (
					<button
						key={code}
						aria-pressed={on}
						aria-label={label}
						onClick={() => onChange(code)}
						className={`flex items-center px-2 py-1 rounded-md text-[0.6875rem] transition-colors duration-200 cursor-pointer ${
							on
								? "bg-zinc-700/70 text-zinc-300 shadow-sm"
								: "text-zinc-500 hover:text-zinc-300"
						}`}
					>
						<span className="flex h-[1.5em] items-center">
							<Icon
								className={`w-3.5 h-3.5 shrink-0 transition-colors duration-200 ${on ? tint : ""}`}
								strokeWidth={1.75}
							/>
						</span>
						<span
							aria-hidden
							className={`grid transition-[grid-template-columns,opacity] duration-200 ease-out motion-reduce:transition-none max-[23.75rem]:hidden ${
								on
									? "grid-cols-[1fr] opacity-100"
									: "grid-cols-[0fr] opacity-0"
							}`}
						>
							<span className="min-w-0 overflow-hidden">
								<span className="grid">
									{SORTS.map((word) => (
										<span
											key={word.code}
											className={`${SORT_LABEL} col-start-1 row-start-1 text-center ${
												word.code === code
													? ""
													: "invisible"
											}`}
										>
											{word.short}
										</span>
									))}
								</span>
							</span>
						</span>
					</button>
				);
			})}
		</motion.div>
	);
}

export function SubTabs({
	show,
	id = "sub-tabs",
	children,
}: {
	show: boolean;
	id?: string;
	children: ReactNode;
}) {
	return (
		<AnimatePresence initial={false} mode="popLayout">
			{show && (
				<motion.div
					key={id}
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
