export type ListState = {
	rows: unknown[] | null;
	at: number;
	loading: boolean;
};

const ON_RETURN_STALE = 5_000;
export const NO_LIST: ListState = { rows: null, at: 0, loading: false };

const lists = new Map<string, ListState>();
const inFlight = new Map<string, Promise<void>>();
const listeners = new Map<string, Set<() => void>>();
// how each list is fetched, kept so the store can ask again
const fetchers = new Map<string, () => Promise<unknown[]>>();

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
			if (Date.now() - held.at > ON_RETURN_STALE)
				loadList(endpoint, fetcher);
		}
	});
};

const notify = (endpoint: string) =>
	listeners.get(endpoint)?.forEach((fn) => fn());

// a new object each time
const set = (endpoint: string, next: Partial<ListState>) => {
	lists.set(endpoint, { ...(lists.get(endpoint) ?? NO_LIST), ...next });
	notify(endpoint);
};

export const listState = (endpoint: string): ListState =>
	lists.get(endpoint) ?? NO_LIST;

export const subscribeList = (endpoint: string, fn: () => void) => {
	watchReturn();
	const set = listeners.get(endpoint) ?? new Set<() => void>();
	set.add(fn);
	listeners.set(endpoint, set);
	return () => {
		set.delete(fn);
	};
};

// the rows as the app has just changed them -- an optimistic write, its reconcile, or its undo
export const patchList = <T>(endpoint: string, fn: (rows: T[]) => T[]) =>
	set(endpoint, {
		rows: fn((lists.get(endpoint)?.rows ?? []) as T[]) as unknown[],
	});

// one request per endpoint, however many components ask at once
export const loadList = (
	endpoint: string,
	fetcher: () => Promise<unknown[]>,
) => {
	fetchers.set(endpoint, fetcher);
	const already = inFlight.get(endpoint);
	if (already) return already;

	set(endpoint, { loading: true });
	const run = fetcher()
		.then((rows) => set(endpoint, { rows, at: Date.now(), loading: false }))
		.catch((e) => {
			console.error("Error loading " + endpoint, e);
			set(endpoint, {
				rows: lists.get(endpoint)?.rows ?? [],
				loading: false,
			});
		})
		.finally(() => {
			inFlight.delete(endpoint);
		});

	inFlight.set(endpoint, run);
	return run;
};

export const dropLists = () => {
	const held = [...lists.keys()];
	lists.clear();
	inFlight.clear();
	fetchers.clear();
	held.forEach(notify);
};
