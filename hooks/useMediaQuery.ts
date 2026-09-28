import { useCallback, useSyncExternalStore } from "react";

export const DESKTOP_QUERY = "(min-width: 64rem)";
export const PHONE_QUERY = "(width < 40rem)";

// listing rows only exist once the client has its list
const getServerSnapshot = () => false;

export function useMediaQuery(query: string): boolean {
	const subscribe = useCallback(
		(onChange: () => void) => {
			const list = window.matchMedia(query);
			list.addEventListener("change", onChange);
			return () => list.removeEventListener("change", onChange);
		},
		[query],
	);
	const getSnapshot = useCallback(
		() => window.matchMedia(query).matches,
		[query],
	);
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

// which of the two mounted trees is the one on screen
export const useDesktopView = () => useMediaQuery(DESKTOP_QUERY);

// the same question from an effect
export const isDesktopView = () =>
	typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches;
