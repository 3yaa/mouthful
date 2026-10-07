"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, MotionConfig } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { BaseMediaProps } from "@/types/media";
import Image from "next/image";
import { StatsBar, StatusSpine } from "../components/StatsBar";
import { isResizable } from "@/utils/image-loader";
import { RecentPoster } from "../components/RecentMedias";

export type FocusSection = {
	name: string;
	key: string;
	href: string;
	icon: LucideIcon;
};
type Stats = Record<string, Record<string, number>>;

export const FOCUS_POSTERS = 7;
const INTENT_MS = 70;
const UNLIGHT_MS = 160;
const REVEAL_STEP_MS = 55;
const REVEAL_WAIT_MS = 1200;
const EASE = [0.16, 1, 0.3, 1] as const;
const CROSSFADE = { duration: 0.42, ease: EASE } as const;

const STATUS_GROUP: Record<string, string> = {
	Watching: "In Progress",
	Reading: "In Progress",
	Playing: "In Progress",
	"Want to Watch": "Planned",
	"Want to Read": "Planned",
};

const splitOf = (raw?: Record<string, number>) => {
	if (!raw) return { counts: undefined, avgScore: undefined };
	const { avgScore, ...counts } = raw;
	return { counts, avgScore };
};
const totalOf = (counts?: Record<string, number>) =>
	counts ? Object.values(counts).reduce((sum, n) => sum + n, 0) : null;

function PosterSkeleton() {
	return (
		// sized exactly like a RecentPoster, so swapping one for the other moves nothing
		<div className="flex flex-col gap-3.5">
			<div className="aspect-2/3 rounded-xl bg-zinc-900 shadow-island" />
			<div className="h-[1.40625rem]" />
		</div>
	);
}

function BarSkeleton() {
	return (
		<div className="flex h-6.5 w-full items-center gap-6">
			<div className="w-40 shrink-0" />
			<div className="h-2.5 flex-1 rounded-full neu-carved" />
			<div className="w-40 shrink-0" />
		</div>
	);
}

export function LandingFocus({
	sections,
	stats,
	recent,
	isLoading,
	onNavigate,
}: {
	sections: FocusSection[];
	stats: Stats | null;
	recent: Record<string, BaseMediaProps[]> | null;
	isLoading: boolean;
	onNavigate: (href: string) => void;
}) {
	const [active, setActive] = useState<string | null>(null);
	// the tab under the cursor presses in at once; the panel still waits out the intent
	const [hovered, setHovered] = useState<string | null>(null);
	const shown = hovered ?? active;
	// the poster under the cursor
	const [lit, setLit] = useState<number | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const dark = useRef<ReturnType<typeof setTimeout> | null>(null);
	const light = (i: number) => {
		if (dark.current) clearTimeout(dark.current);
		setLit(i);
	};
	const unlight = (i: number) => {
		if (dark.current) clearTimeout(dark.current);
		dark.current = setTimeout(
			() => setLit((cur) => (cur === i ? null : cur)),
			UNLIGHT_MS,
		);
	};
	// the posters stay as dark frames until the first row's art has all landed, then fill in at once
	const [revealed, setRevealed] = useState(false);
	const landed = useRef(new Set<number | string>());
	const readied = (id: number | string) => {
		landed.current.add(id);
		if (mixed && landed.current.size >= mixed.length) setRevealed(true);
	};
	useEffect(() => {
		if (!recent) return;
		const id = setTimeout(() => setRevealed(true), REVEAL_WAIT_MS);
		return () => clearTimeout(id);
	}, [recent]);

	const pick = (key: string | null) => {
		setActive(key);
		setLit(null);
	};
	const hold = () => {
		if (timer.current) clearTimeout(timer.current);
		timer.current = null;
	};
	const aim = (key: string | null, delay: number) => {
		hold();
		timer.current = setTimeout(() => pick(key), delay);
	};
	useEffect(
		() => () => {
			if (timer.current) clearTimeout(timer.current);
			if (dark.current) clearTimeout(dark.current);
		},
		[],
	);
	// recent is home -- a click anywhere off the stage goes back to it
	const stageRef = useRef<HTMLDivElement>(null);
	useEffect(() => {
		const away = (e: PointerEvent) => {
			if (stageRef.current?.contains(e.target as Node)) return;
			hold();
			setActive(null);
			setLit(null);
		};
		document.addEventListener("pointerdown", away);
		return () => document.removeEventListener("pointerdown", away);
	}, []);

	const hrefOf = (key: string) =>
		sections.find((section) => section.key === key)!.href;
	const iconOf = (key: string) =>
		sections.find((section) => section.key === key)!.icon;

	// newest across every library
	const mixed = recent
		? Object.entries(recent)
				.flatMap(([key, items]) => items.map((item) => ({ key, item })))
				.sort(
					(a, b) =>
						new Date(b.item.lastUpdated ?? 0).getTime() -
						new Date(a.item.lastUpdated ?? 0).getTime(),
				)
				.slice(0, FOCUS_POSTERS)
		: null;
	// every status summed, so the mixed panel reads the whole collection
	const allCounts = stats
		? Object.values(stats).reduce<Record<string, number>>((sum, raw) => {
				for (const [status, n] of Object.entries(
					splitOf(raw).counts!,
				)) {
					const group = STATUS_GROUP[status] ?? status;
					sum[group] = (sum[group] ?? 0) + n;
				}
				return sum;
			}, {})
		: undefined;

	const panels = [
		{
			key: null,
			title: "Recent",
			counts: allCounts,
			avgScore: undefined,
			items: mixed,
		},
		...sections.map((section) => ({
			key: section.key,
			title: section.name,
			...splitOf(stats?.[section.key]),
			items: recent
				? (recent[section.key] ?? [])
						.slice(0, FOCUS_POSTERS)
						.map((item) => ({ key: section.key, item }))
				: null,
		})),
	];

	const cells = sections.map((section) => ({
		...section,
		counts: splitOf(stats?.[section.key]).counts,
	}));

	return (
		<MotionConfig reducedMotion="user">
			<motion.div
				ref={stageRef}
				className="relative isolate flex w-full max-w-[112rem] flex-col gap-5 px-6 xl:px-12"
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.6, ease: EASE }}
			>
				{/* the lead poster's colour, a soft field behind the whole stage */}
				{panels.map((panel) => {
					const lead = panel.items?.[0]?.item.imageUrl;
					if (!lead) return null;
					return (
						<motion.div
							key={`wash-${panel.key ?? "all"}`}
							aria-hidden
							className="pointer-events-none absolute -inset-x-16 top-1/4 -bottom-16 -z-10 mask-[radial-gradient(ellipse_at_center,black_20%,transparent_70%)]"
							initial={false}
							animate={{ opacity: active === panel.key ? 1 : 0 }}
							transition={{ duration: 1.1, ease: EASE }}
						>
							<Image
								src={lead}
								alt=""
								fill
								sizes="(min-width: 80rem) 15rem, 11rem"
								unoptimized={!isResizable(lead)}
								className="object-cover opacity-[0.13] blur-[90px] saturate-150"
							/>
						</motion.div>
					);
				})}

				{/* LIBARIES */}
				<nav
					aria-label="Libraries"
					onMouseLeave={() => {
						hold();
						setHovered(null);
					}}
					className="relative grid grid-cols-5 rounded-2xl bg-[#0e0e0e] p-1.5 shadow-island"
				>
					{cells.map((cell, i) => {
						const on = shown === cell.key;
						const total = totalOf(cell.counts);
						const body = (
							<>
								{i > 0 && (
									<span
										aria-hidden
										className={`absolute inset-y-4 left-0 w-px bg-linear-to-b from-transparent via-zinc-700/70 to-transparent transition-opacity duration-300 ${
											on || shown === cells[i - 1].key
												? "opacity-0"
												: "opacity-100"
										}`}
									/>
								)}
								<span
									aria-hidden
									className={`absolute inset-0 -z-10 rounded-xl neu-carved-in transition-opacity duration-150 ease-out ${
										on ? "opacity-100" : "opacity-0"
									}`}
								/>
								<cell.icon
									className={`h-4.5 w-4.5 shrink-0 transition-colors duration-200 ${
										on ? "text-zinc-300" : "text-zinc-600"
									}`}
									strokeWidth={1.75}
								/>
								<span
									className={`truncate font-lettering text-[1.25rem] leading-none font-medium tracking-[0.01em] transition-colors duration-200 xl:text-[1.4375rem] ${
										on ? "text-zinc-50" : "text-zinc-400"
									}`}
								>
									{cell.name}
								</span>
								{total != null ? (
									<motion.span
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{
											duration: 0.6,
											ease: EASE,
										}}
										className={`ml-auto text-[0.9375rem] font-medium tabular-nums transition-colors duration-200 ${
											on
												? "text-zinc-300"
												: "text-zinc-600"
										}`}
									>
										{total}
									</motion.span>
								) : null}
								{cell.counts && total ? (
									<motion.span
										aria-hidden
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{
											duration: 0.8,
											ease: EASE,
										}}
										className="absolute inset-x-4 bottom-2 flex h-0.75 items-end xl:inset-x-6"
									>
										<StatusSpine
											data={cell.counts}
											className={`w-full transition-[opacity,height] duration-300 ease-arrive ${
												on
													? "h-0.75 opacity-100"
													: "h-0.5 opacity-35"
											}`}
										/>
									</motion.span>
								) : null}
							</>
						);
						const shape =
							"relative isolate flex h-15 min-w-0 items-center gap-3 rounded-xl px-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 xl:h-16 xl:px-6";
						return (
							<Link
								key={cell.key}
								href={cell.href}
								onNavigate={() => onNavigate(cell.href)}
								onMouseEnter={() => {
									setHovered(cell.key);
									aim(cell.key, INTENT_MS);
								}}
								onFocus={() => aim(cell.key, 0)}
								className={shape}
							>
								{body}
							</Link>
						);
					})}
				</nav>

				<section className="relative grid px-1">
					{panels.map((panel) => {
						const on = active === panel.key;
						const entries =
							panel.items ??
							(!recent || isLoading
								? Array.from(
										{ length: FOCUS_POSTERS },
										() => null,
									)
								: []);
						return (
							<motion.div
								key={panel.key ?? "all"}
								inert={!on}
								aria-hidden={!on}
								aria-label={panel.title}
								className="relative flex flex-col gap-6 [grid-area:1/1]"
								initial={false}
								animate={{ opacity: on ? 1 : 0 }}
								transition={CROSSFADE}
							>
								{panel.counts && totalOf(panel.counts) ? (
									<motion.div
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										transition={{
											duration: 0.6,
											ease: EASE,
										}}
									>
										<StatsBar
											inline
											data={panel.counts}
											avgScore={panel.avgScore}
										/>
									</motion.div>
								) : (
									(!stats || isLoading) && <BarSkeleton />
								)}
								<div className="grid grid-cols-5 gap-7 xl:grid-cols-6 2xl:grid-cols-7">
									{entries.map((entry, i) => (
										<div
											key={
												entry
													? `${entry.key}-${entry.item.id}`
													: i
											}
											className={
												i >= 6
													? "hidden 2xl:block"
													: i === 5
														? "hidden xl:block"
														: ""
											}
										>
											{entry ? (
												<RecentPoster
													item={entry.item}
													mediaType={entry.key}
													href={hrefOf(entry.key)}
													onNavigate={() =>
														onNavigate(
															hrefOf(entry.key),
														)
													}
													icon={
														panel.key
															? undefined
															: iconOf(entry.key)
													}
													priority={!panel.key}
													tone={
														lit == null
															? "rest"
															: lit === i
																? "lit"
																: "dim"
													}
													revealed={revealed}
													revealDelay={
														i * REVEAL_STEP_MS
													}
													onReady={
														panel.key
															? undefined
															: () =>
																	readied(
																		entry
																			.item
																			.id,
																	)
													}
													onHover={(over) =>
														over
															? light(i)
															: unlight(i)
													}
												/>
											) : (
												<PosterSkeleton />
											)}
										</div>
									))}
								</div>
							</motion.div>
						);
					})}
				</section>
			</motion.div>
		</MotionConfig>
	);
}
