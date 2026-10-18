import { useState } from "react";

// true from the first render where `on` holds until `key` changes
export function useLatch(on: boolean, key: string) {
	const [latch, setLatch] = useState({ key, latched: on });
	if (latch.key !== key) {
		setLatch({ key, latched: on });
		return on;
	}
	if (on && !latch.latched) setLatch({ key, latched: true });
	return latch.latched || on;
}
