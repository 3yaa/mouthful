"use client";

import { useSyncExternalStore } from "react";

// 96rem is tailwind's 2xl
const WIDE_CARD = "(min-width: 96rem)";

const subscribe = (onChange: () => void) => {
	const list = window.matchMedia(WIDE_CARD);
	list.addEventListener("change", onChange);
	return () => list.removeEventListener("change", onChange);
};
const getSnapshot = () => window.matchMedia(WIDE_CARD).matches;
// nothing here is on screen before a click, so there is nothing to flash
const getServerSnapshot = () => false;

// room to dock a panel beside the card
export function useWideCard(): boolean {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
