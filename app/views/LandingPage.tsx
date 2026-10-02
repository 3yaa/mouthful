"use client";

import Link from "next/link";
import { Book, BookOpen, Film, Tv, Gamepad2, ChevronRight } from "lucide-react";
import dynamic from "next/dynamic";
import { BaseMediaProps } from "@/types/media";
import { useEffect, useState } from "react";
import { useAuthFetch } from "../auth/hooks/useAuthFetch";
import { StatsBar } from "../components/StatsBar";
import { RecentItems, RecentPeek } from "../components/RecentMedias";
import { useFlash } from "../components/RouteFlash";
import { listingOf } from "./mediaListing/ListingSkeleton";
import { PHONE_QUERY, useMediaQuery } from "@/hooks/useMediaQuery";
import { FOCUS_POSTERS, LandingFocus } from "./LandingFocus";
import { Wordmark } from "./Wordmark";
// don't wait for light ray to render
const LightRays = dynamic(() => import("@/app/components/ui/LightRays"), {
	ssr: false,
});

const sections = [
	{ name: "Movies", key: "movies", href: "/movies", icon: Film },
	{ name: "Shows", key: "shows", href: "/shows", icon: Tv },
	{ name: "Books", key: "books", href: "/books", icon: Book },
	{ name: "Manga", key: "manga", href: "/manga", icon: BookOpen },
	{ name: "Games", key: "games", href: "/games", icon: Gamepad2 },
];
type Section = (typeof sections)[number];

const COLUMNS = [["movies"], ["shows"], ["books"], ["games", "manga"]].map(
	(keys) =>
		keys.map((key) => sections.find((section) => section.key === key)!),
);

// a phone opens one library's recent
const PHONE_ROWS = 3;
const FOLD_MS = 300;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function StatsSkeleton() {
	return (
		<div className="w-full space-y-2">
			<div className="flex h-4 items-center justify-between">
				<div className="h-3.5 w-10 animate-pulse rounded bg-zinc-800/40" />
				<div className="h-3.5 w-8 animate-pulse rounded bg-zinc-800/40" />
			</div>
			<div className="h-5.5 w-full animate-pulse rounded-md neu-carved" />
		</div>
	);
}

function RecentSkeleton({ rows }: { rows: number }) {
	return (
		<ul className="flex flex-col gap-2">
			{Array.from({ length: rows }, (_, i) => (
				<li key={i} className="flex items-center gap-3 p-2">
					<div className="h-18 w-12 shrink-0 animate-pulse rounded-md bg-zinc-800/40 p-0.5 shadow-island sm:h-20 sm:w-14" />
					<div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
						<div className="flex items-start justify-between gap-2">
							<div className="h-3.5 w-3/5 animate-pulse rounded bg-zinc-800/40" />
							<div className="h-4.5 w-7 animate-pulse rounded-md bg-zinc-800/40" />
						</div>
						<div className="h-2.5 w-1/4 animate-pulse rounded bg-zinc-800/40" />
						<div className="mt-0.5 h-0.75 w-full animate-pulse rounded-full bg-zinc-800/30" />
					</div>
				</li>
			))}
		</ul>
	);
}

function PeekSkeleton() {
	return (
		<div className="flex h-15 items-center gap-3 rounded-lg neu-carved pr-10 pl-3.5">
			<div className="flex">
				{Array.from({ length: PHONE_ROWS }, (_, i) => (
					<div
						key={i}
						className="-ml-3 h-10 w-7.5 origin-bottom animate-pulse rounded-[0.3rem] bg-zinc-900 shadow-island first:ml-0"
						style={{
							zIndex: PHONE_ROWS - i,
							rotate: `${i * 7}deg`,
						}}
					/>
				))}
			</div>
			<div className="h-3.5 w-12 animate-pulse rounded bg-zinc-800/40" />
		</div>
	);
}

// clipped only while it moves or is shut
function Fold({
	id,
	open,
	duration,
	children,
}: {
	id: string;
	open: boolean;
	duration: number;
	children: React.ReactNode;
}) {
	const [settled, setSettled] = useState(open);
	const [wasOpen, setWasOpen] = useState(open);
	if (open !== wasOpen) {
		setWasOpen(open);
		setSettled(false);
	}
	return (
		<div
			id={id}
			inert={!open}
			onTransitionEnd={(e) => {
				if (
					e.target === e.currentTarget &&
					e.propertyName === "grid-template-rows"
				)
					setSettled(true);
			}}
			className={`grid transition-[grid-template-rows,opacity,visibility] ease-arrive ${
				open
					? "visible grid-rows-[1fr] opacity-100"
					: "invisible grid-rows-[0fr] opacity-0"
			}`}
			style={{ transitionDuration: `${duration}ms` }}
		>
			<div
				className={`min-h-0 ${open && settled ? "" : "overflow-hidden"}`}
			>
				{children}
			</div>
		</div>
	);
}

export default function LandingPage() {
	const { authFetch } = useAuthFetch();
	const [isLoading, setIsLoading] = useState(false);
	const flash = useFlash();
	const [stats, setStats] = useState<Record<
		string,
		Record<string, number>
	> | null>(null);
	const [recentMedias, setRecentMedias] = useState<Record<
		string,
		BaseMediaProps[]
	> | null>(null);

	const getStats = async () => {
		try {
			setIsLoading(true);
			const response = await authFetch(
				`/api/stats?recentLimit=${FOCUS_POSTERS}`,
			);
			if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
			const resJson = await response.json();
			setStats(resJson.data);
			setRecentMedias(resJson.recent);
		} catch (e) {
			console.error("Error fetching stats: ", e);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		getStats();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const phone = useMediaQuery(PHONE_QUERY);
	// 1ms, not 0
	const fold = useMediaQuery(REDUCED_MOTION) ? 1 : FOLD_MS;
	const [openKey, setOpenKey] = useState<string | null>(null);

	// the tapped peek holds still while a library above it folds shut
	const toggleRecent = (key: string, peek: HTMLElement) => {
		const opening = openKey !== key;
		setOpenKey(opening ? key : null);
		const top = peek.getBoundingClientRect().top;
		const until = performance.now() + fold + 50;
		const tick = () => {
			const drift = peek.getBoundingClientRect().top - top;
			if (drift) window.scrollBy(0, drift);
			if (performance.now() < until) requestAnimationFrame(tick);
			else if (opening)
				peek.closest("section")?.scrollIntoView({
					block: "nearest",
					behavior: fold === FOLD_MS ? "smooth" : "auto",
				});
		};
		requestAnimationFrame(tick);
	};

	const libraryButton = (section: Section) => (
		<Link
			href={section.href}
			onNavigate={() => flash(listingOf(section.href))}
			className="group/btn flex items-center justify-between rounded-xl bg-zinc-800/55 px-4 py-4 shadow-island transition-[background-color,box-shadow,transform] duration-200 ease-out hover:bg-zinc-700/50 hover:cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-400 active:translate-y-px active:bg-zinc-800/70 active:shadow-[inset_0_2px_5px_rgba(0,0,0,0.5)] sm:py-5"
		>
			<span className="flex items-center gap-3">
				<section.icon
					className="h-6 w-6 text-zinc-400 transition-colors duration-200 group-hover/btn:text-zinc-200 sm:h-7 sm:w-7"
					strokeWidth={1.5}
				/>
				<span className="text-base font-medium text-zinc-300 transition-colors duration-200 group-hover/btn:text-zinc-100 sm:text-lg">
					{section.name}
				</span>
			</span>
			<ChevronRight className="h-5 w-5 text-zinc-600 transition-all duration-200 group-hover/btn:translate-x-0.5 group-hover/btn:text-zinc-400" />
		</Link>
	);

	// total, average and the status split
	const libraryStats = (section: Section) => {
		const raw = stats?.[section.key];
		const rawEntries = raw ? Object.entries(raw) : [];
		const avgScoreEntry = rawEntries.find(([k]) => k === "avgScore");
		const avgScore = avgScoreEntry ? Number(avgScoreEntry[1]) : undefined;
		const mediaStats = raw
			? Object.fromEntries(rawEntries.filter(([k]) => k !== "avgScore"))
			: undefined;
		const hasStats = mediaStats && Object.keys(mediaStats).length > 0;
		return (
			<div>
				{hasStats ? (
					<StatsBar data={mediaStats} avgScore={avgScore} />
				) : (
					isLoading && <StatsSkeleton />
				)}
			</div>
		);
	};

	// a card per library
	const renderLibrary = (section: Section, rows: number) => {
		const recent = recentMedias?.[section.key]?.slice(
			0,
			phone ? PHONE_ROWS : rows,
		);
		const listId = `recent-${section.key}`;

		return (
			<section
				key={section.name}
				aria-label={section.name}
				className="flex flex-col gap-4 rounded-2xl bg-[#121212] p-4 shadow-island sm:p-5"
			>
				{/* ── button ── */}
				{libraryButton(section)}

				{/* ── library ── */}
				{libraryStats(section)}

				{/* ── what was touched last ── */}
				<div className="-mt-1">
					{recent && recent.length > 0 ? (
						phone ? (
							<>
								<RecentPeek
									items={recent}
									label={section.name}
									open={openKey === section.key}
									controls={listId}
									onToggle={(peek) =>
										toggleRecent(section.key, peek)
									}
								/>
								<Fold
									id={listId}
									open={openKey === section.key}
									duration={fold}
								>
									<div className="pt-2">
										<RecentItems
											items={recent}
											mediaType={section.key}
											href={section.href}
											onNavigate={() =>
												flash(listingOf(section.href))
											}
										/>
									</div>
								</Fold>
							</>
						) : (
							<RecentItems
								items={recent}
								mediaType={section.key}
								href={section.href}
								onNavigate={() =>
									flash(listingOf(section.href))
								}
							/>
						)
					) : (
						isLoading &&
						!recent &&
						(phone ? (
							<PeekSkeleton />
						) : (
							<RecentSkeleton rows={rows} />
						))
					)}
				</div>
			</section>
		);
	};

	return (
		<main className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-black text-white">
			{/* hollow nit nit */}
			<div className="absolute inset-0 hidden sm:block">
				<LightRays
					raysOrigin="top-center"
					raysColor="#ffffff"
					raysSpeed={0.5}
					lightSpread={1.2}
					rayLength={2}
					fadeDistance={0.9}
					saturation={1.0}
					followMouse
					mouseInfluence={0.15}
					noiseAmount={0.05}
					distortion={0.08}
					className="w-full h-full"
				/>
			</div>

			<div className="relative z-10 my-auto flex w-full flex-col items-center">
				{/* HEADER */}
				<Wordmark />

				{/* THE LIBRARIES */}
				<div className="mt-14 hidden w-full justify-center lg:flex">
					<LandingFocus
						sections={sections}
						stats={stats}
						recent={recentMedias}
						isLoading={isLoading}
						onNavigate={(href) => flash(listingOf(href))}
					/>
				</div>
				<div className="mt-6 grid w-full max-w-425 grid-cols-1 items-start gap-5 px-4 sm:mt-10 sm:grid-cols-2 sm:gap-6 sm:px-6 lg:hidden">
					{COLUMNS.map((column) =>
						column.length === 1 ? (
							renderLibrary(column[0], 4)
						) : (
							<div
								key={column
									.map((section) => section.key)
									.join("+")}
								className="flex flex-col gap-5 sm:gap-6"
							>
								{renderLibrary(column[0], 3)}
								{renderLibrary(column[1], 2)}
							</div>
						),
					)}
				</div>
			</div>

			{/* FOOTER */}
			<footer className="relative z-10 shrink-0 pt-10 pb-4 text-sm tracking-wide text-zinc-600">
				© {new Date().getFullYear()} Mouthful
			</footer>
		</main>
	);
}
