"use client";
import {
	ReactNode,
	useState,
	createContext,
	useEffect,
	useCallback,
	useRef,
} from "react";
import { usePathname } from "next/navigation";
import { dropLists } from "@/hooks/mediaStore";

interface AuthContextType {
	authToken: string | null;
	setAuthToken: (authToken: string | null) => void;
	isAuthenticated: boolean;
	isRefreshing: boolean;
	isInitializing: boolean;
	refreshToken: () => Promise<string | null>;
	getRefreshInFlight: () => Promise<string | null> | null;
}

// explicitly rejects the session -- not retryable
class SessionExpiredError extends Error {
	constructor() {
		super("session expired");
		this.name = "SessionExpiredError";
	}
}

// boot retry backoff
const BOOT_RETRY_DELAYS = [500, 1500, 4000];

// auth context
export const AuthTokenContext = createContext<AuthContextType | null>(null);

// Auth Provider Component
export function AuthProvider({ children }: { children: ReactNode }) {
	const [authToken, setAuthToken] = useState<string | null>(null);
	const [isRefreshing, setIsRefreshing] = useState(false);
	const [isInitializing, setIsInitializing] = useState(true);
	const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
	const refreshPromiseRef = useRef<Promise<string | null> | null>(null);
	const pathname = usePathname();
	const isAuthPage = pathname === "/login" || pathname === "/register";

	// parse jwt to find expiration time
	const parseTokenExpiry = useCallback((token: string): number | null => {
		try {
			const payload = JSON.parse(atob(token.split(".")[1]));
			return payload.exp * 1000; //miliseconds -- exp: unix timestamp in seconds
		} catch (e) {
			console.error("failed to parse token: ", e);
			return null;
		}
	}, []);

	// refreshes token 1 min before expiration
	const scheduleNextRefresh = useCallback(
		(token: string, refreshFunc: () => Promise<string | null>) => {
			if (refreshTimerRef.current) {
				clearTimeout(refreshTimerRef.current);
			}
			//
			const expiryTime = parseTokenExpiry(token);
			if (!expiryTime) return;
			//schedules to call the refreshfunc after refreshtime
			const refreshTime = expiryTime - Date.now() - 1 * 60 * 1000;
			if (refreshTime > 0) {
				refreshTimerRef.current = setTimeout(() => {
					refreshFunc();
				}, refreshTime);
			}
		},
		[parseTokenExpiry],
	);

	// call server for new auth token
	const refreshToken = useCallback(async (): Promise<string | null> => {
		if (refreshPromiseRef.current) {
			return refreshPromiseRef.current;
		}
		setIsRefreshing(true);
		// make call
		const refreshPromise = (async () => {
			try {
				const response = await fetch(`/api/auth/refresh`, {
					credentials: "include",
				});
				if (!response.ok) {
					if (response.status === 401 || response.status === 403) {
						setAuthToken(null);
						throw new SessionExpiredError();
					}
					throw new Error("token refresh failed");
				}
				//
				const data = await response.json();
				const newToken = data.accessToken;
				//
				setAuthToken(newToken);
				scheduleNextRefresh(newToken, refreshToken);
				return newToken;
			} catch (e) {
				console.error("Token refresh failed: ", e);
				throw e;
			} finally {
				setIsRefreshing(false);
				refreshPromiseRef.current = null;
			}
		})();

		refreshPromiseRef.current = refreshPromise;
		return refreshPromise;
	}, [scheduleNextRefresh]);

	// ref read, not state -- always current, never a render snapshot
	const getRefreshInFlight = useCallback(() => refreshPromiseRef.current, []);

	// on mount get token -- retries transient failures
	useEffect(() => {
		let cancelled = false;
		//
		const initializeAuth = async () => {
			if (isAuthPage) {
				setIsInitializing(false);
				return;
			}
			try {
				for (let attempt = 0; ; attempt++) {
					try {
						await refreshToken();
						return;
					} catch (e) {
						// server said no -- stop trying
						if (e instanceof SessionExpiredError) throw e;
						if (cancelled || attempt >= BOOT_RETRY_DELAYS.length)
							throw e;
						await new Promise((r) =>
							setTimeout(r, BOOT_RETRY_DELAYS[attempt]),
						);
						if (cancelled) return;
					}
				}
			} catch (e) {
				console.log("No valid session found: ", e);
			} finally {
				if (!cancelled) setIsInitializing(false);
			}
		};
		//
		initializeAuth();
		//
		return () => {
			cancelled = true;
			if (refreshTimerRef.current) {
				clearTimeout(refreshTimerRef.current);
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// handles case when timer goes over bc went to another site
	useEffect(() => {
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible" && authToken) {
				const expiryTime = parseTokenExpiry(authToken);
				if (expiryTime && Date.now() >= expiryTime - 5 * 60 * 1000) {
					refreshToken().catch(() => {});
				}
			}
		};
		//
		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => {
			document.removeEventListener(
				"visibilitychange",
				handleVisibilityChange,
			);
		};
	}, [authToken, refreshToken, parseTokenExpiry]);

	// held lists belong to the session, not to the browser
	useEffect(() => {
		if (!isInitializing && !authToken) dropLists();
	}, [authToken, isInitializing]);

	// sets token with the scheduler
	const setAuthTokenWithScheduling = useCallback(
		(token: string | null) => {
			setAuthToken(token);
			if (token) {
				scheduleNextRefresh(token, refreshToken);
			} else if (refreshTimerRef.current) {
				clearTimeout(refreshTimerRef.current);
			}
		},
		[scheduleNextRefresh, refreshToken],
	);

	const value = {
		authToken,
		setAuthToken: setAuthTokenWithScheduling,
		isAuthenticated: !!authToken,
		isRefreshing,
		isInitializing,
		refreshToken,
		getRefreshInFlight,
	};

	return (
		<AuthTokenContext.Provider value={value}>
			{children}
		</AuthTokenContext.Provider>
	);
}
