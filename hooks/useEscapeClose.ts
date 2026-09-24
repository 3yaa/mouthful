"use client";

import { useEffect, useRef, type RefObject } from "react";

type EscapeRegistration = {
	id: symbol;
	closeRef: RefObject<() => void>;
};

const registrations: EscapeRegistration[] = [];

const handleEscape = (event: KeyboardEvent) => {
	if (event.key !== "Escape" || event.repeat) return;

	// details cards can open another details card == close the most recently
	registrations.at(-1)?.closeRef.current();
};

export function useEscapeClose(onClose: () => void) {
	const closeRef = useRef(onClose);
	closeRef.current = onClose;

	useEffect(() => {
		const registration = { id: Symbol("escape-close"), closeRef };
		registrations.push(registration);

		if (registrations.length === 1) {
			window.addEventListener("keydown", handleEscape);
		}

		return () => {
			const index = registrations.findIndex(
				(item) => item.id === registration.id,
			);
			if (index !== -1) registrations.splice(index, 1);

			if (registrations.length === 0) {
				window.removeEventListener("keydown", handleEscape);
			}
		};
	}, []);
}
