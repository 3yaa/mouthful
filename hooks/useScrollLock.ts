"use client";
import { useEffect } from "react";

let locks = 0;
let unlock: (() => void) | null = null;

function lock() {
	// already held -- whoever took it first owns the restore
	if (locks++ > 0) return;

	const body = document.body;
	const root = document.documentElement;
	const prevOverscroll = root.style.overscrollBehavior;
	const prev = {
		overflow: body.style.overflow,
		position: body.style.position,
		top: body.style.top,
		width: body.style.width,
		paddingRight: body.style.paddingRight,
	};
	const scrollY = window.scrollY;
	const isPhone = !window.matchMedia("(min-width: 1024px)").matches;

	body.style.overflow = "hidden";
	// pinning sits the page at the top, where any pull reads as pull-to-refresh
	root.style.overscrollBehavior = "none";
	if (isPhone) {
		body.style.position = "fixed";
		body.style.top = `-${scrollY}px`;
		body.style.width = "100%";
	} else {
		// desktop keeps its layout -- pad out the scrollbar that just vanished
		const scrollbar =
			window.innerWidth - document.documentElement.clientWidth;
		if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
	}

	unlock = () => {
		body.style.overflow = prev.overflow;
		body.style.position = prev.position;
		body.style.top = prev.top;
		body.style.width = prev.width;
		body.style.paddingRight = prev.paddingRight;
		root.style.overscrollBehavior = prevOverscroll;
		// pinning the body sent the window to the top -- put it back
		if (isPhone) window.scrollTo(0, scrollY);
	};
}

function release() {
	if (locks === 0) return;
	if (--locks > 0) return;
	unlock?.();
	unlock = null;
}

// freezes the page behind a modal for as long as `enabled` holds
export function useScrollLock(enabled: boolean = true) {
	useEffect(() => {
		if (!enabled) return;
		lock();
		return release;
	}, [enabled]);
}
