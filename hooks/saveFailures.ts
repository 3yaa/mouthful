import { useSyncExternalStore } from "react";

export type SaveFailure = {
	id: number;
	label: string;
	verb: "save" | "add" | "delete";
	retry?: () => void;
};

const FADE_MS = 4_000;

let failures: SaveFailure[] = [];
let nextId = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((fn) => fn());
const NONE: SaveFailure[] = [];

const subscribe = (fn: () => void) => {
	listeners.add(fn);
	return () => {
		listeners.delete(fn);
	};
};

export const reportFailure = (
	label: string,
	retry?: () => void,
	verb: SaveFailure["verb"] = "save",
) => {
	const id = ++nextId;
	failures = [...failures, { id, label, verb, retry }];
	emit();
	if (!retry)
		setTimeout(() => {
			failures = failures.filter((f) => f.id !== id);
			emit();
		}, FADE_MS);
};

export const retryFailures = () => {
	const all = failures;
	failures = [];
	emit();
	all.forEach((f) => f.retry?.());
};

export const dismissFailures = () => {
	failures = [];
	emit();
};

export const useSaveFailures = () =>
	useSyncExternalStore(
		subscribe,
		() => failures,
		() => NONE,
	);
