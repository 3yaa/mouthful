"use client";
import { useCallback, useEffect, useRef } from "react";
import { primeLogo } from "./logoMetrics";

// how long the hover has to be
const DWELL_MS = 150;

// load logo
export function useLogoPrime(logoUrl: string | null | undefined) {
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	const stop = useCallback(() => {
		if (!timer.current) return;
		clearTimeout(timer.current);
		timer.current = null;
	}, []);

	// a row scrolled out mid-dwell never wanted its logo
	useEffect(() => stop, [stop]);

	const onPointerEnter = useCallback(() => {
		stop();
		timer.current = setTimeout(() => primeLogo(logoUrl), DWELL_MS);
	}, [logoUrl, stop]);

	const onPointerDown = useCallback(() => {
		stop();
		primeLogo(logoUrl);
	}, [logoUrl, stop]);

	return { onPointerEnter, onPointerLeave: stop, onPointerDown };
}
