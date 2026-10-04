import { dismissFailures } from "./saveFailures";

export type ListState = {
	rows: unknown[] | null;
	at: number;
	loading: boolean;
};

type Rows = unknown[];
// one local change laid over the server's rows
type Op = { id: number; apply: (rows: Rows) => Rows; settledAt: number | null };
type Held = { base: Rows | null; ops: Op[]; state: ListState };

const ON_RETURN_STALE = 5_000;
export const NO_LIST: ListState = { rows: null, at: 0, loading: false };

const lists = new Map<string, Held>();
const inFlight = new Map<string, Promise<void>>();
const listeners = new Map<string, Set<() => void>>();
// how each list is fetched
const fetchers = new Map<string, () => Promise<unknown[]>>();
// orders loads against settles
let clock = 0;
let nextOpId = 0;
// per-item request queues, and their turns still waiting
const lanes = new Map<string, Promise<unknown>>();
const waiting = new Set<() => void>();
let leaving = false;

let watchingReturn = false;
const watchReturn = () => {
	if (watchingReturn || typeof document === "undefined") return;
	watchingReturn = true;
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState !== "visible") return;
		for (const [endpoint, held] of lists) {
			const fetcher = fetchers.get(endpoint);
			// only the lists something is currently reading
			if (!fetcher || !listeners.get(endpoint)?.size) continue;
			if (Date.now() - held.state.at > ON_RETURN_STALE)
				loadList(endpoint, fetcher);
		}
	});
	// a closing page sends whatever is still waiting its turn
	window.addEventListener("pagehide", () => {
		leaving = true;
		waiting.forEach((go) => go());
	});
	window.addEventListener("pageshow", () => {
		leaving = false;
	});
};

const notify = (endpoint: string) =>
	listeners.get(endpoint)?.forEach((fn) => fn());

const heldOf = (endpoint: string): Held => {
	let held = lists.get(endpoint);
	if (!held) {
		held = { base: null, ops: [], state: NO_LIST };
		lists.set(endpoint, held);
	}
	return held;
};

// a new state object each time
const publish = (endpoint: string, next: Partial<ListState>) => {
	const held = heldOf(endpoint);
	held.state = { ...held.state, ...next };
	notify(endpoint);
};

const recompute = (endpoint: string) => {
	const held = heldOf(endpoint);
	if (held.base === null) return;
	publish(endpoint, {
		rows: held.ops.reduce((rows, op) => op.apply(rows), held.base),
	});
};

// settled changes at the front become part of the base
const fold = (endpoint: string) => {
	const held = heldOf(endpoint);
	if (held.base === null || inFlight.has(endpoint)) return;
	while (held.ops.length && held.ops[0].settledAt !== null)
		held.base = held.ops.shift()!.apply(held.base);
};

export const listState = (endpoint: string): ListState =>
	lists.get(endpoint)?.state ?? NO_LIST;

export const subscribeList = (endpoint: string, fn: () => void) => {
	watchReturn();
	const set = listeners.get(endpoint) ?? new Set<() => void>();
	set.add(fn);
	listeners.set(endpoint, set);
	return () => {
		set.delete(fn);
	};
};

// shown at once, kept until the server has it
export const beginOp = <T>(endpoint: string, apply: (rows: T[]) => T[]) => {
	const held = heldOf(endpoint);
	const op: Op = {
		id: ++nextOpId,
		apply: apply as (rows: Rows) => Rows,
		settledAt: null,
	};
	held.ops.push(op);
	if (held.base !== null && held.state.rows)
		publish(endpoint, { rows: op.apply(held.state.rows) });
	return op.id;
};

// a still-unsent change grew -- it moves to the end, being the newest edit now
export const reviseOp = <T>(
	endpoint: string,
	id: number,
	apply: (rows: T[]) => T[],
) => {
	const held = heldOf(endpoint);
	const op = held.ops.find((o) => o.id === id);
	if (!op) return;
	held.ops = [
		...held.ops.filter((o) => o !== op),
		{ ...op, apply: apply as (rows: Rows) => Rows },
	];
	recompute(endpoint);
};

// what the server answered is laid in the change's own place
export const settleOp = <T>(
	endpoint: string,
	id: number,
	answered?: (rows: T[]) => T[],
) => {
	const op = heldOf(endpoint).ops.find((o) => o.id === id);
	if (!op) return;
	op.settledAt = ++clock;
	if (answered) {
		const sent = op.apply;
		op.apply = (rows) => (answered as (rows: Rows) => Rows)(sent(rows));
		recompute(endpoint);
	}
	fold(endpoint);
};

// the change never happened
export const dropOp = (endpoint: string, id: number) => {
	const held = heldOf(endpoint);
	if (!held.ops.some((o) => o.id === id)) return;
	held.ops = held.ops.filter((o) => o.id !== id);
	recompute(endpoint);
};

// one request per endpoint, however many components ask at once
export const loadList = (
	endpoint: string,
	fetcher: () => Promise<unknown[]>,
) => {
	fetchers.set(endpoint, fetcher);
	const already = inFlight.get(endpoint);
	if (already) return already;

	const startedAt = ++clock;
	publish(endpoint, { loading: true });
	const run = fetcher()
		.then((rows) => {
			const held = heldOf(endpoint);
			held.base = rows;
			// a write settled after the ask began may be missing from the answer
			held.ops = held.ops.filter(
				(op) => op.settledAt === null || op.settledAt > startedAt,
			);
			recompute(endpoint);
			publish(endpoint, { at: Date.now(), loading: false });
		})
		.catch((e) => {
			console.error("Error loading " + endpoint, e);
			const held = heldOf(endpoint);
			if (held.base === null) held.base = [];
			recompute(endpoint);
			publish(endpoint, { loading: false });
		})
		.finally(() => {
			inFlight.delete(endpoint);
			fold(endpoint);
		});

	inFlight.set(endpoint, run);
	return run;
};

// bumped on sign-out
let generation = 0;
export const listsGeneration = () => generation;
const onDrop = new Set<() => void>();
export const onDropLists = (fn: () => void) => onDrop.add(fn);

export const dropLists = () => {
	generation++;
	const held = [...lists.keys()];
	lists.clear();
	inFlight.clear();
	fetchers.clear();
	lanes.clear();
	waiting.clear();
	onDrop.forEach((fn) => fn());
	dismissFailures();
	held.forEach(notify);
};

export const inLane = <R>(key: string, run: () => Promise<R>): Promise<R> => {
	if (leaving) return run();
	const ahead = lanes.get(key) ?? Promise.resolve();
	let go!: () => void;
	const turn = new Promise<void>((resolve) => (go = resolve));
	waiting.add(go);
	ahead.then(go, go);
	const result = turn.then(() => {
		waiting.delete(go);
		return run();
	});
	const tail = result.catch(() => undefined);
	lanes.set(key, tail);
	tail.then(() => {
		if (lanes.get(key) === tail) lanes.delete(key);
	});
	return result;
};
