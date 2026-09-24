"use client";
import { usePathname } from "next/navigation";
import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import {
	ListingSkeleton,
	type ListingKind,
} from "@/app/views/mediaListing/ListingSkeleton";

// drawn the frame the link is clicked
function useRouteFlash() {
	const pathname = usePathname();
	const [target, setTarget] = useState<ListingKind | null | undefined>(
		undefined,
	);
	const from = useRef<string | null>(null);
	// every bar that mounts announces itself
	const bars = useRef(0);
	const [barCount, setBarCount] = useState(0);
	const barsAtClick = useRef(0);
	const reportBar = useCallback(() => {
		bars.current += 1;
		setBarCount(bars.current);
	}, []);

	useEffect(() => {
		if (target === undefined || from.current === pathname) return;
		if (target) {
			if (barCount > barsAtClick.current) setTarget(undefined);
			return;
		}
		let raf = 0;
		let frames = 0;
		const tick = () => {
			if (++frames >= 2) return setTarget(undefined);
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [pathname, target, barCount]);

	useEffect(() => {
		if (target === undefined) return;
		const bail = window.setTimeout(() => setTarget(undefined), 8000);
		return () => window.clearTimeout(bail);
	}, [target]);

	// the destination's list, when it has one
	const flash = useCallback(
		(listing?: ListingKind) => {
			from.current = pathname;
			barsAtClick.current = bars.current;
			setTarget(listing ?? null);
		},
		[pathname],
	);

	return {
		flashing: target !== undefined,
		target: target ?? undefined,
		flash,
		reportBar,
	};
}

// the page you left, gone
function RouteFlash({
	show,
	listing,
}: {
	show: boolean;
	listing?: ListingKind;
}) {
	if (!show) return null;
	return (
		<div data-route-flash className="fixed inset-0 z-20 bg-zinc-950">
			<ListingSkeleton listing={listing} />
		</div>
	);
}

const FlashContext = createContext<(listing?: ListingKind) => void>(() => {});
const BarContext = createContext<(() => void) | null>(null);

export function useReportListingBar() {
	const report = useContext(BarContext);
	useEffect(() => report?.(), [report]);
}

// what a page calls on its way out
export const useFlash = () => useContext(FlashContext);

export function RouteFlashProvider({ children }: { children: ReactNode }) {
	const { flashing, target, flash, reportBar } = useRouteFlash();
	const value = useMemo(() => flash, [flash]);
	return (
		<FlashContext.Provider value={value}>
			<BarContext.Provider value={reportBar}>
				{children}
			</BarContext.Provider>
			<BarContext.Provider value={null}>
				<RouteFlash show={flashing} listing={target} />
			</BarContext.Provider>
		</FlashContext.Provider>
	);
}
