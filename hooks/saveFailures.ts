import { useSyncExternalStore } from "react";

export type SaveFailure = {
	id: number;
	label: string;
	verb: "save" | "add" | "delete";
	retry?: () => void;
	// a row save -- a later save of the same fields leaves these stale
	scope?: {
		key: string;
		fields: string[];
		resend: (fields: string[]) => void;
	};
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
	scope?: SaveFailure["scope"],
) => {
	const id = ++nextId;
	failures = [...failures, { id, label, verb, retry, scope }];
	emit();
	if (!retry)
		setTimeout(() => {
			failures = failures.filter((f) => f.id !== id);
			emit();
		}, FADE_MS);
};

// a newer save of these fields landed -- Retry must not replay the failed copy over it
export const supersedeFailures = (key: string, fields: string[]) => {
	let changed = false;
	failures = failures.flatMap((f) => {
		if (f.scope?.key !== key) return [f];
		const left = f.scope.fields.filter((field) => !fields.includes(field));
		if (left.length === f.scope.fields.length) return [f];
		changed = true;
		return left.length
			? [{ ...f, scope: { ...f.scope, fields: left } }]
			: [];
	});
	if (changed) emit();
};

export const retryFailures = () => {
	const all = failures;
	failures = [];
	emit();
	all.forEach((f) =>
		f.scope ? f.scope.resend(f.scope.fields) : f.retry?.(),
	);
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
